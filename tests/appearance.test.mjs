import assert from 'node:assert/strict'
import test from 'node:test'
import { appearanceTarget, validateAppearanceImage, MAX_APPEARANCE_BYTES } from '../app/utils/appearance.ts'
import { resolveUserProfile } from '../app/utils/profile.ts'

test('photo target validation rejects arbitrary fields and malformed community IDs', () => {
  assert.deepEqual(appearanceTarget('profile','banner'), { target:'profile',kind:'banner',communityId:null })
  assert.throws(() => appearanceTarget('profile','avatar'))
  assert.throws(() => appearanceTarget('community','is_superadmin','10000000-0000-0000-0000-000000000001'))
  assert.throws(() => appearanceTarget('community','banner','not-an-id'))
  assert.equal(appearanceTarget('community','avatar','10000000-0000-0000-0000-000000000001').kind,'avatar')
})
test('photos use actual image signatures, not user-provided filenames or MIME types', async () => {
  const png = new File([new Uint8Array([137,80,78,71,13,10,26,10])],'misleading.svg',{type:'text/html'})
  assert.equal((await validateAppearanceImage(png)).contentType,'image/png')
  assert.equal((await validateAppearanceImage(new File([new Uint8Array([255,216,255])],'photo.jpg'))).extension,'jpg')
  assert.equal((await validateAppearanceImage(new File(['RIFF1234WEBP'],'photo.webp'))).contentType,'image/webp')
  await assert.rejects(validateAppearanceImage(new File(['<svg onload="alert(1)"></svg>'],'photo.png',{type:'image/png'})))
  await assert.rejects(validateAppearanceImage(new File(['<html></html>'],'photo.jpg',{type:'image/jpeg'})))
})
test('photos reject missing, empty, and oversized files', async () => {
  await assert.rejects(validateAppearanceImage(null))
  await assert.rejects(validateAppearanceImage(new File([],'empty.png')))
  await assert.rejects(validateAppearanceImage(new File([new Uint8Array(MAX_APPEARANCE_BYTES+1)],'large.png')))
})
test('saved backgrounds survive subsequent Google profile synchronization', () => {
  const user = { id:'user',identities:[{provider:'google'}],user_metadata:{banner_path:'untrusted/banner.png'} }
  const saved = { id:'user',email:null,first_name:'Rebecca',last_name:null,avatar_url:'custom.jpg',banner_path:'profiles/user/banner/custom.png' }
  assert.equal(resolveUserProfile(user,saved).banner_path,saved.banner_path)
  assert.equal(resolveUserProfile(user,saved).avatar_url,'custom.jpg')
  assert.equal(resolveUserProfile(user,null).banner_path,null)
})
