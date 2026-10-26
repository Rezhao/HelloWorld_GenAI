import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { stripTypeScriptTypes } from 'node:module'
const source=stripTypeScriptTypes(await readFile(new URL('../app/utils/caption-pipeline.ts',import.meta.url),'utf8'),{mode:'transform',disableExperimentalWarning:true})
const {beginCaptionPlan,executeCaptionPlan,renderCaptionPrompt,finishCaptionPost,failCaptionPlan}=await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`)
const step={id:'step-1',model_key:'gemini-flash-lite-latest',temperature:0.7,system_prompt:'One sentence.',user_prompt:'{{prompt}}'}
const plan={request_id:'request-1',steps:[step]}
const input={prompt:'A campus caption',imageBase64:'test-image',mime:'image/png',apiKey:'test-only-secret'}
const success=text=>new Response(JSON.stringify({candidates:[{content:{parts:[{text}]}}],usageMetadata:{promptTokenCount:12,candidatesTokenCount:8}}),{status:200})
test('authorization/configuration errors cannot silently fall back to untracked posting',async()=>{
  const client={rpc:async()=>({data:null,error:{code:'42501',message:'Membership required'}})}
  await assert.rejects(beginCaptionPlan(client,'Valid prompt','community'),/Membership required/)
})
test('multi-step execution records each response and passes actual previous output forward',async()=>{
  const records=[];const calls=[]
  const client={rpc:async(name,args)=>{records.push({name,args});return {data:null,error:null}}}
  let clock=100
  const caption=await executeCaptionPlan(client,{...plan,steps:[step,{...step,id:'step-2',temperature:0.4,user_prompt:'Refine {{previous_response}} for {{prompt}}'}]},input,{now:()=>clock++,fetch:async(url,options)=>{calls.push({url,body:JSON.parse(options.body)});return success(calls.length===1?'First caption.':'Final caption.')}})
  assert.equal(caption,'Final caption.')
  assert.equal(records.length,2)
  assert.deepEqual(records.map(record=>[record.name,record.args.target_step,record.args.input_token_count,record.args.output_token_count]),[['record_caption_response_details','step-1',12,8],['record_caption_response_details','step-2',12,8]])
  assert.match(calls[1].body.contents[0].parts[0].text,/Refine First caption\. for A campus caption/)
  assert.equal(calls[1].body.generationConfig.temperature,0.4)
  assert.ok(calls.every(call=>call.url.startsWith('https://generativelanguage.googleapis.com/v1beta/models/')))
})
test('missing provider usage stays null, and thought text never becomes a published caption',async()=>{
  let saved
  const client={rpc:async(_name,args)=>{saved=args;return {data:null,error:null}}}
  const caption=await executeCaptionPlan(client,plan,input,{fetch:async()=>new Response(JSON.stringify({candidates:[{content:{parts:[{text:'Hidden reasoning',thought:true},{text:'Published sentence.'}]}}]}))})
  assert.equal(caption,'Published sentence.')
  assert.equal(saved.input_token_count,null)
  assert.equal(saved.output_token_count,null)
})
test('transient errors retry once; terminal errors do not create successful response logs',async()=>{
  let attempts=0;let records=0;const sleeps=[]
  const client={rpc:async()=>{records++;return {data:null,error:null}}}
  assert.equal(await executeCaptionPlan(client,plan,input,{fetch:async()=>++attempts===1?new Response('',{status:503}):success('Recovered.'),sleep:async ms=>{sleeps.push(ms)}}),'Recovered.')
  assert.equal(attempts,2);assert.equal(records,1);assert.deepEqual(sleeps,[500])
  await assert.rejects(executeCaptionPlan(client,plan,input,{fetch:async()=>new Response('',{status:403})}),/Gemini could not/)
  assert.equal(records,1)
})
test('a lost publish response is recovered without creating or deleting another post',async()=>{
  const names=[]
  const client={rpc:async name=>{names.push(name);return name==='finish_caption_request'?{data:null,error:{code:'NETWORK'}}:{data:{status:'completed',generation_id:'post-1'},error:null}}}
  assert.equal(await finishCaptionPost(client,'request-1','owned/image.png'),'post-1')
  assert.deepEqual(names,['finish_caption_request','caption_request_state'])
})
test('unknown commit state preserves the upload; a confirmed failed operation allows cleanup',async()=>{
  await assert.rejects(finishCaptionPost({rpc:async()=>({data:null,error:{code:'NETWORK'}})},'request-1','path'),error=>error.safeToRemoveUpload===false)
  const client={rpc:async name=>name==='finish_caption_request'?{data:null,error:{code:'ERROR'}}:{data:{status:'processing'},error:null}}
  await assert.rejects(finishCaptionPost(client,'request-1','path'),error=>error.safeToRemoveUpload===true)
})
test('user text and previous captions cannot recursively expand prompt placeholders',()=>{
  assert.equal(renderCaptionPrompt({...step,system_prompt:'',user_prompt:'{{prompt}} / {{previous_response}}'},'{{previous_response}}','{{prompt}}'),'{{previous_response}} / {{prompt}}')
})
test('failure recording is scoped to its request and bounded',async()=>{
  let saved
  await failCaptionPlan({rpc:async(name,args)=>{saved={name,args};return {data:null,error:null}}},plan,'x'.repeat(3000))
  assert.equal(saved.name,'fail_caption_request');assert.equal(saved.args.target_request,'request-1');assert.equal(saved.args.failure_message.length,2000)
})

test('thrown transport errors also recover commit state and preserve committed image files',async()=>{
  const client={rpc:async name=>{if(name==='finish_caption_request')throw Error('Transport failed');return {data:{status:'completed',generation_id:'saved-post'},error:null}}}
  assert.equal(await finishCaptionPost(client,'request-1','path'),'saved-post')
  await assert.rejects(finishCaptionPost({rpc:async()=>{throw Error('Transport failed')}},'request-1','path'),error=>error.safeToRemoveUpload===false)
})

test('exact submitted text is logged and unsupported temperature is omitted',async()=>{
 let logged,body
 const client={rpc:async(name,args)=>{logged={name,args};return {data:null,error:null}}}
 await executeCaptionPlan(client,{...plan,steps:[{...step,temperature_supported:false}]},input,{fetch:async(_url,options)=>{body=JSON.parse(options.body);return success('Caption.')}})
 assert.equal(logged.args.sent_prompt,body.contents[0].parts[0].text)
 assert.equal('temperature' in body.generationConfig,false)
})
test('only a missing details endpoint falls back to legacy response tracking',async()=>{
 const names=[]
 const client={rpc:async name=>{names.push(name);return {data:null,error:name==='record_caption_response_details'?{code:'PGRST202'}:null}}}
 await executeCaptionPlan(client,plan,input,{fetch:async()=>success('Caption.')})
 assert.deepEqual(names,['record_caption_response_details','record_caption_response'])
 await assert.rejects(executeCaptionPlan({rpc:async()=>({data:null,error:{code:'42501'}})},plan,input,{fetch:async()=>success('Caption.')}),/could not be recorded/)
})
