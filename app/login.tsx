'use client'

import Link from 'next/link'
import { useState } from 'react'
import { signOut } from './utils/server'
import Avatar from './avatar'

interface Profile {
  id: string
  email: string | null
  first_name: string | null
  last_name: string | null
  avatar_url: string | null
}

export default function Login({
  profile,
  isSignedIn,
}: {
  profile: Profile | null
  isSignedIn: boolean
}) {
  const [isOpen, setIsOpen] = useState(false)

  const profileName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || 'Your profile'
  async function handleSignOut() {
    try {
      await signOut()
    } catch (error) {
      console.error(error)
    }
  }

  return (
    <div className="relative">
      {isSignedIn ? (
        <button
          type="button"
          onClick={() => setIsOpen((open) => !open)}
          className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-melon-green-dark text-sm font-bold text-white shadow-md ring-1 ring-melon-border transition hover:ring-melon-green"
          aria-label={`Open ${profileName} profile menu`}
          aria-expanded={isOpen}
          aria-controls="profile-menu"
        >
          <Avatar src={profile?.avatar_url} name={[profile?.first_name, profile?.last_name].filter(Boolean).join(' ')} className="h-full w-full text-sm" />
        </button>
      ) : (
        <Link
          href="/sign-in"
          className="rounded-full bg-melon-pink px-4 py-2 text-sm font-semibold text-melon-yellow shadow-sm transition hover:bg-melon-yellow hover:text-melon-pink"
        >
          Sign in
        </Link>
      )}

      {isSignedIn && isOpen ? (
        <div
          id="profile-menu"
          className="absolute right-0 top-14 z-10 w-56 rounded-2xl border border-melon-border bg-white p-4 shadow-xl shadow-melon-plum/10"
        >
          <p className="truncate text-sm font-semibold text-melon-forest">{profileName}</p>
          <p className="mt-1 truncate text-xs text-melon-muted">{profile?.email || 'Email not loaded'}</p>
          <Link
            href="/profile"
            onClick={() => setIsOpen(false)}
            className="mt-4 block rounded-lg border border-melon-border px-4 py-2.5 text-center text-sm font-semibold text-melon-ink transition hover:bg-melon-cream"
          >
            Profile
          </Link>
          <Link
            href="/settings"
            onClick={() => setIsOpen(false)}
            className="mt-3 block rounded-lg border border-melon-border px-4 py-2.5 text-center text-sm font-semibold text-melon-ink transition hover:bg-melon-cream"
          >
            Settings
          </Link>
          <button
            type="button"
            onClick={handleSignOut}
            className="mt-3 w-full rounded-lg bg-melon-pink px-4 py-2.5 text-sm font-semibold text-melon-yellow transition hover:bg-melon-yellow hover:text-melon-pink"
          >
            Sign out
          </button>
        </div>
      ) : null}
    </div>
  )
}
