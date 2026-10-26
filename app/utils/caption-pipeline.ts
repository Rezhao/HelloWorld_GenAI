export const DEFAULT_CAPTION_INSTRUCTIONS = 'Return only one complete sentence between 8 and 20 words. Do not use bullets, labels, quotation marks, emojis, or markdown. Finish the sentence before stopping.'
export interface CaptionStep { id: string; model_key: string; temperature: number; temperature_supported?: boolean; system_prompt: string; user_prompt: string }
export interface CaptionPlan { request_id: string | null; steps: CaptionStep[] }
export interface CaptionRpcClient {
  rpc(name: string, args?: Record<string, unknown>): PromiseLike<{ data: unknown; error: { code?: string; message?: string } | null }>
}
export class CaptionPublishError extends Error {
  constructor(message: string, public readonly safeToRemoveUpload: boolean) { super(message) }
}
export async function beginCaptionPlan(client: CaptionRpcClient, prompt: string, communityId: string): Promise<CaptionPlan> {
  const { data, error } = await client.rpc('begin_caption_request', { caption_prompt: prompt.trim(), target_community: communityId })
  if (error?.code === 'PGRST202') {
    // Keep posting available during rollout until the owner applies migration 005.
    console.warn('Caption tracking unavailable: apply Admin_GenAI/supabase/005-connect-generation-pipeline.sql.')
    return { request_id: null, steps: [{ id: '', model_key: 'gemini-flash-lite-latest', temperature: 0.7, system_prompt: DEFAULT_CAPTION_INSTRUCTIONS, user_prompt: '{{prompt}}' }] }
  }
  if (error) throw new Error(error.message || 'Unable to start caption generation.')
  const plan = data as CaptionPlan | null
  if (!plan?.request_id || !Array.isArray(plan.steps) || !plan.steps.length || plan.steps.length > 5) throw new Error('The caption pipeline is not configured correctly.')
  return plan
}
export function renderCaptionPrompt(step: CaptionStep, prompt: string, previous: string) {
  const template = step.user_prompt.replace(/\{\{(prompt|previous_response)\}\}/g, (_, key: string) => key === 'prompt' ? prompt.trim() : previous)
  return `${template}\n\n${step.system_prompt}`.trim()
}
export async function executeCaptionPlan(client: CaptionRpcClient, plan: CaptionPlan, input: { prompt: string; imageBase64: string; mime: string; apiKey: string }, dependencies: { fetch?: typeof fetch; now?: () => number; sleep?: (ms: number) => Promise<void> } = {}) {
  const request = dependencies.fetch ?? fetch
  const now = dependencies.now ?? Date.now
  const sleep = dependencies.sleep ?? ((ms: number) => new Promise(resolve => setTimeout(resolve,ms)))
  const deadline = now() + 90000
  let caption = ''
  for (const step of plan.steps) {
    if (!/^[a-zA-Z0-9._-]+$/.test(step.model_key) || !Number.isFinite(Number(step.temperature)) || Number(step.temperature)<0 || Number(step.temperature)>2) throw new Error('Invalid model configuration. Ask an admin to check the caption pipeline.')
    // Always send the key to Google's fixed endpoint; provider records cannot redirect credentials.
    const submittedPrompt = renderCaptionPrompt(step,input.prompt,caption)
    const body = JSON.stringify({ contents: [{ parts: [{ text: submittedPrompt }, { inline_data: { mime_type: input.mime,data: input.imageBase64 } }] }], generationConfig: { maxOutputTokens:300,...(step.temperature_supported===false?{}:{temperature:Number(step.temperature)}) } })
    const started = now()
    let response: Response | null = null
    for (let attempt=0; attempt<2; attempt++) {
      const remaining = deadline-now()
      if (remaining <= 0) throw new Error('Caption generation timed out. Please try again.')
      response = await request(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(step.model_key)}:generateContent`, { method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':input.apiKey},body,signal:AbortSignal.timeout(Math.min(30000,remaining)) })
      if (response.ok || ![429,500,503].includes(response.status) || attempt===1) break
      await response.body?.cancel()
      await sleep(500*(attempt+1))
    }
    if (!response?.ok) throw new Error('Gemini could not generate a caption. Please try again shortly.')
    const data = await response.json() as { candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] };finishReason?:string }[];promptFeedback?:{blockReason?:string};usageMetadata?:{promptTokenCount?:number;candidatesTokenCount?:number} }
    const candidate = data.candidates?.[0]
    caption = candidate?.content?.parts?.filter(part=>!part.thought).map(part=>part.text??'').join('').trim() ?? ''
    if (!caption) {
      const reason = candidate?.finishReason || data.promptFeedback?.blockReason
      throw new Error(reason ? `Gemini did not return a caption (${reason}). Try another image or prompt.` : 'Gemini returned an empty caption. Try another image.')
    }
    if (plan.request_id) {
      const args = { target_request:plan.request_id,target_step:step.id,output_text:caption,input_token_count:data.usageMetadata?.promptTokenCount??null,output_token_count:data.usageMetadata?.candidatesTokenCount??null,elapsed_ms:Math.min(3600000,Math.max(0,Math.round(now()-started))) }
      let { error } = await client.rpc('record_caption_response_details',{...args,sent_prompt:submittedPrompt})
      if (error?.code==='PGRST202') ({error}=await client.rpc('record_caption_response',args))
      if (error) throw new Error('The caption response could not be recorded. Please try again.')
    }
  }
  return caption
}
export async function finishCaptionPost(client: CaptionRpcClient, requestId: string, imagePath: string) {
  try {
    const {data,error} = await client.rpc('finish_caption_request',{target_request:requestId,uploaded_path:imagePath})
    if (!error && typeof data==='string') return data
  } catch { /* Recover the commit state before deciding whether cleanup is safe. */ }
  // A lost response can follow a successful commit. Lock/read the request before cleanup.
  try {
    const recovered = await client.rpc('caption_request_state',{target_request:requestId})
    const state = recovered.data as {status?:string;generation_id?:string}|null
    if (!recovered.error && state?.status==='completed' && state.generation_id) return state.generation_id
    throw new CaptionPublishError('Your post could not be confirmed. Refresh your community before retrying.', !recovered.error && Boolean(state))
  } catch (error) {
    if (error instanceof CaptionPublishError) throw error
    throw new CaptionPublishError('Your post could not be confirmed. Refresh your community before retrying.',false)
  }
}
export async function failCaptionPlan(client: CaptionRpcClient, plan: CaptionPlan, message: string) {
  if (!plan.request_id) return
  try {
    const {error} = await client.rpc('fail_caption_request',{target_request:plan.request_id,failure_message:message.slice(0,2000)})
    if (error) console.warn('Unable to mark caption request as failed.',error.code)
  } catch { console.warn('Unable to mark caption request as failed.') }
}
