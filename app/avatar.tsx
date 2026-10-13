'use client'

import { useState } from 'react'

export default function Avatar({
  src,
  name,
  className = '',
}: {
  src?: string | null
  name: string
  className?: string
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const initials = name.trim().split(/\s+/).filter(Boolean).map((part) => part[0]).slice(0, 2).join('').toUpperCase() || '?'

  return (
    <span className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-melon-pink font-bold text-melon-forest ${className}`}>
      {src && src !== failedSrc ? (
        // eslint-disable-next-line @next/next/no-img-element -- Supports provider photos and uploaded avatars with an initials fallback.
        <img key={src} src={src} alt={`${name || 'User'} avatar`} referrerPolicy="no-referrer" className="h-full w-full object-cover" onError={() => setFailedSrc(src)} />
      ) : <span aria-label={`${name || 'User'} initials`}>{initials}</span>}
    </span>
  )
}
