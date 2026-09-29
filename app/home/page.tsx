import { redirect } from 'next/navigation'
import { createClient } from '../utils/server'
import Login from '../login'

interface Profile {
  first_name: string | null
  last_name: string | null
  email: string | null
  avatar_url: string | null
}

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/sign-in')
  }

  const { data: profileById } = await supabase
    .from('profiles')
    .select('first_name, last_name, email, avatar_url')
    .eq('id', user.id)
    .maybeSingle() as { data: Profile | null }

  const { data: profileByEmail } = profileById || !user.email
    ? { data: null }
    : await supabase
      .from('profiles')
      .select('first_name, last_name, email, avatar_url')
      .eq('email', user.email)
      .maybeSingle() as { data: Profile | null }

  const profile = profileById ?? profileByEmail
  const displayName = [profile?.first_name, profile?.last_name]
    .filter(Boolean)
    .join(' ') || user.user_metadata?.full_name || user.email || 'there'

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-6 sm:px-8 sm:py-8">
      <header className="mx-auto flex w-full max-w-5xl justify-end">
        <Login
          profile={profile ? { id: user.id, ...profile } : null}
          isSignedIn
        />
      </header>
      <section className="mx-auto w-full max-w-5xl pt-14 sm:pt-20">
        <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
          Welcome, {displayName}
        </h1>
      </section>
    </main>
  )
}
