'use client'

import { updateAppearance } from './server'
import { preparePhoto } from './prepare-photo'

export async function saveAppearancePhoto(kind: 'avatar' | 'banner', file?: File, remove = false, communityId?: string) {
  const form = new FormData()
  form.set('target', communityId ? 'community' : 'profile')
  form.set('kind', kind)
  if (communityId) form.set('communityId', communityId)
  if (remove) form.set('remove', 'true')
  else if (file) form.set('image', await preparePhoto(file, kind))
  return updateAppearance(form)
}
