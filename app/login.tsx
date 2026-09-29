'use client'

import Link from 'next/link'
import { useState } from 'react'
import { signOut } from './utils/server'

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
  const initials = [profile?.first_name, profile?.last_name]
    .filter(Boolean)
    .map((name) => name?.[0])
    .join('')
    .toUpperCase() || '?'

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
          className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-teal-600 text-sm font-bold text-white shadow-md ring-1 ring-slate-200 transition hover:ring-teal-400"
          aria-label={`Open ${profileName} profile menu`}
          aria-expanded={isOpen}
          aria-controls="profile-menu"
        >
          {profile?.avatar_url ? (
            <span
              className="h-full w-full bg-cover bg-center"
              style={{ backgroundImage: `url(${profile.avatar_url})` }}
              role="img"
              aria-label={`${profileName} avatar`}
            />
          ) : (
            initials
          )}
        </button>
      ) : (
        <Link
          href="/sign-in"
          className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
        >
          Sign in
        </Link>
      )}

      {isSignedIn && isOpen ? (
        <div
          id="profile-menu"
          className="absolute right-0 top-14 z-10 w-56 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl shadow-slate-900/10"
        >
          <p className="truncate text-sm font-semibold text-slate-950">{profileName}</p>
          <p className="mt-1 truncate text-xs text-slate-500">{profile?.email || 'Email not loaded'}</p>
          <Link
            href="/settings"
            onClick={() => setIsOpen(false)}
            className="mt-4 block rounded-lg border border-slate-200 px-4 py-2.5 text-center text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Settings
          </Link>
          <button
            type="button"
            onClick={handleSignOut}
            className="mt-3 w-full rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Sign out
          </button>
        </div>
      ) : null}
    </div>
  )
}
