import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '../utils/server'
import SettingsForm from './settings-form'

interface Profile {
  first_name: string | null
  last_name: string | null
  email: string | null
  avatar_url: string | null
}

export default async function SettingsPage() {
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

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-8 sm:px-8">
      <section className="mx-auto w-full max-w-2xl">
        <Link href="/home" className="text-sm font-semibold text-teal-600 hover:text-teal-700">
          Back to workspace
        </Link>
        <div className="mt-8">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-600">Account</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Profile settings</h1>
          <p className="mt-2 text-sm text-slate-500">Update the details shown on your profile.</p>
          <SettingsForm
            hasPassword={
              user.identities?.some((identity) => identity.provider === 'email')
              || user.user_metadata?.password_set === true
              || false
            }
            initialValues={{
              firstName: profile?.first_name ?? '',
              lastName: profile?.last_name ?? '',
              email: profile?.email ?? user.email ?? '',
              avatarUrl: profile?.avatar_url ?? '',
            }}
          />
        </div>
      </section>
    </main>
  )
}
