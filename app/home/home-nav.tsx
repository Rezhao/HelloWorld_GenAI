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
  active: 'home' | 'my-posts'
}) {
  return (
    <header className="sticky top-0 z-50 flex min-h-16 w-full items-center bg-slate-950 px-4 py-3">
      <div className="flex w-full items-center justify-between gap-4">
      <nav className="flex items-center gap-1" aria-label="Main navigation">
        <Link
          href="/home"
          aria-current={active === 'home' ? 'page' : undefined}
          className={`px-3 py-2 text-sm font-semibold transition ${active === 'home' ? 'bg-teal-400 text-slate-950' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}
        >
          Home
        </Link>
        <Link
          href="/home/my-posts"
          aria-current={active === 'my-posts' ? 'page' : undefined}
          className={`px-3 py-2 text-sm font-semibold transition ${active === 'my-posts' ? 'bg-teal-400 text-slate-950' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}
        >
          My posts
        </Link>
      </nav>
      <Login profile={profile} isSignedIn />
      </div>
    </header>
  )
}