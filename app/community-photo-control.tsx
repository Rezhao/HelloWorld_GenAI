'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { saveAppearancePhoto } from './utils/save-photo'

export default function CommunityPhotoControl({ communityId, kind, initialUrl, className = '' }: {
  communityId: string; kind: 'avatar' | 'banner'; initialUrl?: string | null; className?: string
}) {
  const router = useRouter()
  const id = useId()
  const container = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const [url, setUrl] = useState(initialUrl)
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const label = kind === 'banner' ? 'cover photo' : 'community profile photo'

  useEffect(() => {
    if (!open) return
    function outside(event: PointerEvent) {
      if (event.target instanceof Node && !container.current?.contains(event.target)) setOpen(false)
    }
    function escape(event: KeyboardEvent) {
      if (event.key === 'Escape') { setOpen(false); container.current?.querySelector('button')?.focus() }
    }
    document.addEventListener('pointerdown', outside)
    document.addEventListener('keydown', escape)
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape) }
  }, [open])

  async function save(file?: File, remove = false) {
    if (!file && !remove) return
    setBusy(true); setError(''); setMessage('')
    try {
      const result = await saveAppearancePhoto(kind, file, remove, communityId)
      setUrl(result.url)
      setMessage(result.warning || (remove ? 'Photo removed.' : 'Photo saved.'))
      setOpen(Boolean(result.warning))
      router.refresh()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to save photo.'); setOpen(true)
    } finally { setBusy(false) }
  }

  return (
    <div ref={container} className={`absolute z-30 ${className}`}>
      <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" aria-label={`Upload ${label}`} disabled={busy} onChange={(event) => {
        const file = event.currentTarget.files?.[0]; event.currentTarget.value = ''; void save(file)
      }} />
      <button type="button" disabled={busy} aria-label={busy ? `Saving ${label}` : `Edit ${label}`} aria-expanded={open} aria-controls={id}
        onClick={() => { if (url || error) setOpen((value) => !value); else input.current?.click() }}
        className={`flex items-center justify-center gap-2 border-2 border-melon-cream bg-melon-pink text-melon-yellow transition hover:bg-melon-yellow hover:text-melon-pink disabled:cursor-wait disabled:opacity-60 ${kind === 'banner' ? 'rounded-full px-3 py-2 text-xs font-semibold sm:px-4' : 'h-8 w-8 rounded-full'}`}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={`h-4 w-4 shrink-0 ${busy ? 'animate-pulse' : ''}`} aria-hidden="true"><path d="M4 6h4l2-3h4l2 3h4a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1Z" /><circle cx="12" cy="12" r="4" /></svg>
        {kind === 'banner' && <span>{busy ? 'Saving…' : 'Edit cover photo'}</span>}
      </button>
      {open && (
        <div id={id} role="group" aria-label={`${label} options`} className={`absolute top-full mt-2 w-60 rounded-xl border border-melon-border bg-white p-3 text-melon-ink ${kind === 'banner' ? 'right-0' : 'left-0'}`}>
          <p className="px-2 pb-2 text-xs leading-5 text-melon-muted">PNG, JPEG, or WebP · up to 5 MB</p>
          <button type="button" disabled={busy} onClick={() => input.current?.click()} className="block w-full rounded-lg px-3 py-2 text-left text-sm font-semibold hover:bg-melon-yellow hover:text-melon-pink disabled:opacity-60">{url ? 'Change photo' : 'Upload photo'}</button>
          {url && <button type="button" disabled={busy} onClick={() => void save(undefined, true)} className="block w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-melon-berry hover:bg-melon-blush disabled:opacity-60">Remove photo</button>}
          {error && <p role="alert" className="mt-2 px-2 text-xs leading-5 text-melon-berry">{error}</p>}
          {message && <p role="status" className="mt-2 px-2 text-xs leading-5 text-melon-green-dark">{message}</p>}
        </div>
      )}
      {!open && <span className="sr-only" role="status">{busy ? 'Saving photo…' : message}</span>}
    </div>
  )
}
