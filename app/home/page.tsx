import Link from 'next/link'
import { buildExploreFeed } from '../utils/explore-feed'
import { redirect } from 'next/navigation'
import { createClient, getCommunities, getProfileCards, getUserProfile } from '../utils/server'
import HomeNav from './home-nav'
import CommunitySidebar from './community-sidebar'
import HomeWorkspace, { type Generation } from './home-workspace'

interface Vote {
  generation_id: string
  user_id: string
  vote: 1 | -1
}

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/sign-in')
  }

  const profile = await getUserProfile(user)
  const communities = await getCommunities()
  const publicCommunities = communities.filter((community) => community.visibility === 'public')
  const publicCommunityIds = publicCommunities.map((community) => community.id)
  const { data: generationRows, error: generationError } = publicCommunityIds.length > 0
    ? await supabase.from('ai_generations')
      .select('id, image_path, prompt, caption, created_at, user_id, community_id')
      .in('community_id', publicCommunityIds)
      .order('created_at', { ascending: false })
      .limit(500) as { data: Generation[] | null; error: { message: string } | null }
    : { data: [], error: null }
  if (generationError) throw new Error(generationError.message)
  const selectedPosts = buildExploreFeed(generationRows ?? [], publicCommunityIds)
  const generationIds = selectedPosts.map((post) => post.id)
  const { data: votes, error: votesError } = generationIds.length > 0
    ? await supabase.from('generation_votes')
      .select('generation_id, user_id, vote').in('generation_id', generationIds) as { data: Vote[] | null; error: { message: string } | null }
    : { data: [], error: null }
  if (votesError) throw new Error(votesError.message)
  const profileCards = await getProfileCards(selectedPosts.map((generation) => generation.user_id))

  const generations = await Promise.all(selectedPosts.map(async (generation) => {
    const { data } = await supabase.storage
      .from('generated-media')
      .createSignedUrl(generation.image_path, 60 * 60)

    const generationVotes = (votes ?? []).filter((vote) => vote.generation_id === generation.id)
    const author = profileCards[generation.user_id]
    const authorName = [author?.first_name, author?.last_name].filter(Boolean).join(' ') || 'Anonymous'
    return {
      ...generation,
      author_name: authorName,
      author_avatar_url: author?.avatar_url ?? null,
      image_url: data?.signedUrl ?? '',
      likes_count: generationVotes.filter((vote) => vote.vote === 1).length,
      user_vote: (generationVotes.find((vote) => vote.user_id === user.id)?.vote ?? 0) as -1 | 0 | 1,
    }
  }))

  return (
    <main className="min-h-screen bg-background">
      <HomeNav profile={profile} active="home" />
      <div className="grid w-full gap-8 pt-0 lg:grid-cols-[260px_minmax(0,1fr)]">
        <CommunitySidebar communities={communities} />
        <section className="mx-auto w-full max-w-6xl min-w-0 px-5 py-8 sm:px-8 lg:mx-0 lg:pl-0 lg:pr-8">
          <header className="mb-8">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-melon-green-dark">A fresh slice of your community</p>
            <h1 className="mt-2 text-4xl font-extrabold tracking-tight text-melon-heading">Melon</h1>
            <p className="mt-2 text-sm leading-6 text-melon-muted">Fresh perspectives from public communities. Discover a caption, find your people.</p>
          </header>
          <div className="grid items-start gap-8 xl:grid-cols-[minmax(0,1fr)_280px]">
            <div className="min-w-0">
              <HomeWorkspace generations={generations} userId={user.id} communities={publicCommunities} sectionTitle="Explore" eyebrow="Public community posts" emptyMessage="No public posts yet. Create a post in a public community to start the conversation." initialPostView="vertical" allowShuffle />
            </div>
            <aside className="hidden rounded-2xl border border-melon-border border-t-4 border-t-melon-pink bg-melon-blush p-5 xl:block" aria-labelledby="discover-heading">
              <h2 id="discover-heading" className="text-xs font-bold uppercase tracking-wider text-melon-pink">Discover communities</h2>
              <p className="mt-3 text-sm leading-6 text-melon-muted">Find your next favorite corner of the community.</p>
              <nav className="mt-4 divide-y divide-melon-cream" aria-label="Discover public communities">
                {publicCommunities.slice(0, 6).map((community) => (
                  <div key={community.id}>
                    <Link href={`/home/community/${community.id}`} className="group flex items-start gap-3 rounded-lg px-3 py-4 transition hover:bg-melon-pink">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-melon-yellow text-sm font-bold text-melon-forest" aria-hidden="true">{community.name.slice(0, 1).toUpperCase()}</span>
                      <span className="min-w-0"><span className="block truncate text-sm font-bold text-melon-forest group-hover:text-melon-yellow">{community.name}</span><span className="mt-1 line-clamp-2 block text-xs leading-5 text-melon-muted group-hover:text-melon-yellow">{community.description || 'Explore posts and share your own captions.'}</span></span>
                    </Link>
                  </div>
                ))}
              </nav>
              {publicCommunities.length === 0 && <p className="mt-4 text-sm text-melon-muted">New public communities will appear here.</p>}
            </aside>
          </div>
        </section>
      </div>
    </main>
  )
}
