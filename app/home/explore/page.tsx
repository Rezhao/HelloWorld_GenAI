import { redirect } from 'next/navigation'
import { createClient, getCommunities, getUserProfile } from '../../utils/server'
import HomeNav from '../home-nav'
import CommunitySidebar from '../community-sidebar'
import CommunityDirectory from './community-directory'

export default async function ExplorePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const [profile, communities, requests] = await Promise.all([
    getUserProfile(user),
    getCommunities(),
    supabase.from('community_join_requests').select('community_id, status').eq('user_id', user.id),
  ])
  if (requests.error) throw new Error(requests.error.message)
  const requestStatuses = Object.fromEntries((requests.data ?? []).map((request) => [request.community_id, request.status]))

  return (
    <main className="min-h-screen bg-background">
      <HomeNav profile={profile} active={null} />
      <div className="grid w-full gap-8 lg:grid-cols-[260px_minmax(0,1fr)]">
        <CommunitySidebar communities={communities} />
        <section className="min-w-0 px-5 py-8 sm:px-8 lg:pr-8">
          <div className="mx-auto max-w-6xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-melon-green-dark">Find your people</p>
            <h1 className="mt-2 text-4xl font-bold tracking-tight text-melon-heading">Explore communities</h1>
            <p className="mt-3 text-sm leading-6 text-melon-muted">Discover a new corner of Melon. Join public communities instantly or request to join private ones.</p>
            <CommunityDirectory communities={communities} userId={user.id} requestStatuses={requestStatuses} />
          </div>
        </section>
      </div>
    </main>
  )
}
