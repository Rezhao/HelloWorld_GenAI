'use client'

import { useId, useState } from 'react'
import { useRouter } from 'next/navigation'
import Avatar from './avatar'
import HeaderBanner from './header-banner'
import { updateAppearance } from './utils/server'
import { preparePhoto } from './utils/prepare-photo'

export default function AppearanceEditor({ communityId, name = 'Your profile', avatarUrl, bannerUrl }: {
  communityId?: string; name?: string; avatarUrl?: string | null; bannerUrl?: string | null
}) {
  const router = useRouter()
  const id = useId()
  const [photos, setPhotos] = useState({ avatar: avatarUrl ?? null, banner: bannerUrl ?? null })
  const [busy, setBusy] = useState<'avatar' | 'banner' | null>(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  async function changePhoto(kind: 'avatar' | 'banner', file?: File, remove = false) {
    if (!file && !remove) return
    setBusy(kind); setError(''); setMessage('')
    try {
      const form = new FormData()
      form.set('target', communityId ? 'community' : 'profile'); form.set('kind', kind)
      if (communityId) form.set('communityId', communityId)
      if (remove) form.set('remove', 'true')
      else if (file) form.set('image', await preparePhoto(file, kind))
      const result = await updateAppearance(form)
      setPhotos((current) => ({ ...current, [kind]: result.url }))
      setMessage(result.warning || (remove ? 'Photo removed. The default appearance has been restored.' : 'Photo saved.'))
      router.refresh()
    } catch (error) { setError(error instanceof Error ? error.message : 'Unable to update your photo.') }
    finally { setBusy(null) }
  }
  return (
    <section className="rounded-2xl border border-melon-border bg-white p-5" aria-label={communityId ? 'Community photos' : 'Profile background'}>
      <h2 className="text-lg font-bold text-melon-heading">{communityId ? 'Community photos' : 'Profile background'}</h2>
      <p className="mt-2 text-xs leading-5 text-melon-muted">PNG, JPEG, or WebP, up to 5 MB. Large photos may be resized. Changes save immediately. Backgrounds look best as wide photos.</p>
      <fieldset disabled={busy !== null} className="mt-5 grid gap-5 disabled:opacity-60">
        {(communityId ? ['avatar', 'banner'] as const : ['banner'] as const).map((kind) => (
          <div key={kind} className="min-w-0">
            <label htmlFor={`${id}-${kind}`} className="block text-sm font-semibold text-melon-ink">{kind === 'avatar' ? 'Community profile photo' : 'Background photo'}</label>
            <div className="mt-3">{kind === 'avatar' ? <Avatar src={photos.avatar} name={name} className="h-16 w-16 text-xl" /> : <HeaderBanner src={photos.banner} className="h-28 sm:h-36" />}</div>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <input id={`${id}-${kind}`} type="file" accept="image/png,image/jpeg,image/webp" className="min-w-0 max-w-full text-xs text-melon-muted file:mr-3 file:cursor-pointer file:rounded-full file:border-0 file:bg-melon-pink file:px-4 file:py-2 file:font-semibold file:text-melon-yellow hover:file:bg-melon-yellow hover:file:text-melon-pink" onChange={(event) => { const file = event.currentTarget.files?.[0]; event.currentTarget.value = ''; void changePhoto(kind, file) }} />
              {photos[kind] && <button type="button" onClick={() => void changePhoto(kind, undefined, true)} className="text-xs font-semibold text-melon-muted hover:text-melon-berry">Remove {kind === 'avatar' ? 'profile photo' : 'background'}</button>}
            </div>
          </div>
        ))}
      </fieldset>
      {busy && <p className="mt-4 text-sm text-melon-muted" role="status">Saving photo…</p>}
      {error && <p className="mt-4 text-sm text-melon-berry" role="alert">{error}</p>}
      {message && <p className="mt-4 text-sm text-melon-green-dark" role="status">{message}</p>}
    </section>
  )
}
