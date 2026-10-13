import Link from 'next/link'
import Login from '../login'

interface Profile {
  id: string
  email: string | null
  first_name: string | null
  last_name: string | null
  avatar_url: string | null
}

export default function HomeNav({
  profile,
  active,
}: {
  profile: Profile | null
  active: 'home' | 'create' | null
}) {
  return (
    <header className="sticky top-0 z-50 flex min-h-16 w-full items-center bg-melon-green px-3 py-3 sm:px-4">
      <div className="flex w-full items-center justify-between gap-2 sm:gap-4">
      <nav className="flex items-center gap-1" aria-label="Main navigation">
        <Link
          href="/home"
          aria-current={active === 'home' ? 'page' : undefined}
          className="flex items-center gap-2 rounded-lg px-2 py-1 text-2xl font-extrabold tracking-tight text-melon-heading transition hover:text-melon-pink sm:px-3"
        >
          <svg viewBox="0 0 32 32" fill="none" className="h-8 w-8" aria-hidden="true">
            <path d="M4 10a12 12 0 0 0 24 0H4Z" fill="#389548" />
            <path d="M7 10a9 9 0 0 0 18 0H7Z" fill="currentColor" className="text-melon-pink" />
            <path d="m11 13 1 2m4-2v3m5-3-1 2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" className="text-melon-forest" />
          </svg>
          Melon
        </Link>
      </nav>
      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <Link
          href="/home/create"
          aria-current={active === 'create' ? 'page' : undefined}
          className="flex items-center gap-2 rounded-full bg-melon-pink px-3 py-2 text-sm font-semibold text-melon-yellow transition hover:bg-melon-yellow hover:text-melon-pink sm:px-4"
        >
          <span className="text-xl font-normal leading-none" aria-hidden="true">+</span>
          Create
        </Link>
        <Login profile={profile} isSignedIn />
      </div>
      </div>
    </header>
  )
}
