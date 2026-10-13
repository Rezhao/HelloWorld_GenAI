import { redirect } from 'next/navigation'
import { createClient, getCommunities, getUserProfile } from '../../utils/server'
import HomeNav from '../home-nav'
import CommunitySidebar from '../community-sidebar'
import CreatePostForm from './create-post-form'

export default async function CreatePostPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const profile = await getUserProfile(user)
  const communities = await getCommunities()

  return (
    <main className="min-h-screen bg-background">
      <HomeNav profile={profile} active="create" />
      <div className="grid w-full gap-8 lg:grid-cols-[260px_minmax(0,1fr)]">
        <CommunitySidebar communities={communities} />
        <div className="min-w-0">
          <section className="mx-auto w-full max-w-3xl px-5 py-8 sm:px-8 sm:py-12">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-melon-green-dark">Share with your community</p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-melon-heading sm:text-4xl">Create a post</h1>
            <p className="mt-3 text-base leading-7 text-melon-muted">Choose a community, add an image, and give your caption a direction.</p>
            <CreatePostForm communities={communities.filter((community) => community.visibility === 'public' || community.is_member)} />
          </section>
        </div>
      </div>
    </main>
  )
}
