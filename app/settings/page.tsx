import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient, getCommunities, getUserProfile } from '../utils/server'
import SettingsForm from './settings-form'
import HomeNav from '../home/home-nav'
import CommunitySidebar from '../home/community-sidebar'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/sign-in')
  }

  const [profile, communities] = await Promise.all([getUserProfile(user), getCommunities()])

  return (
    <main className="min-h-screen bg-background">
      <HomeNav profile={profile} active={null} />
      <div className="grid w-full gap-8 lg:grid-cols-[260px_minmax(0,1fr)]">
        <CommunitySidebar communities={communities} />
        <div className="min-w-0 px-5 py-8 sm:px-8">
          <section className="mx-auto w-full max-w-2xl">
            <Link href="/home" className="text-sm font-semibold text-melon-green-dark hover:text-melon-green-dark">
              Back to Melon
            </Link>
            <div className="mt-8">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-melon-green-dark">Account</p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-melon-heading">Profile settings</h1>
              <p className="mt-2 text-sm text-melon-muted">Update the details shown on your profile.</p>
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
        </div>
      </div>
    </main>
  )
}
