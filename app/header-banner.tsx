'use client'

import Image from 'next/image'
import { useState, type ReactNode } from 'react'

export default function HeaderBanner({ src, className = '', children }: { src?: string | null; className?: string; children?: ReactNode }) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  return (
    <div className={`relative isolate overflow-hidden rounded-2xl bg-linear-to-r from-melon-pink via-melon-yellow to-melon-green ${className}`}>
      {src && src !== failedSrc && <Image src={src} alt="" fill unoptimized sizes="100vw" className="-z-10 object-cover" onError={() => setFailedSrc(src)} />}
      {children}
    </div>
  )
}
