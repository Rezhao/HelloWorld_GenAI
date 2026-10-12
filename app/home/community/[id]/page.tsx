import { notFound, redirect } from 'next/navigation'
import { createClient, getCommunities, getProfileCards, getUserProfile } from '../../../utils/server'
import CommunitySidebar from '../../community-sidebar'
import HomeNav from '../../home-nav'
import HomeWorkspace, { type Generation } from '../../home-workspace'

interface Profile {
  first_name: string | null
  last_name: string | null
  email: string | null
  avatar_url: string | null
}

interface Vote {
  generation_id: string
  user_id: string
  vote: 1 | -1
}

export default async function CommunityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/sign-in')

  const profile = await getUserProfile(user)
  const communities = await getCommunities()
  const community = communities.find((item) => item.id === id)

  if (!community) notFound()

  const { data: generationRows } = await supabase
    .from('ai_generations')
    .select('id, image_path, prompt, caption, created_at, user_id, community_id')
    .eq('community_id', id)
    .order('created_at', { ascending: false })
    .limit(100) as { data: Generation[] | null }
  const { data: votes } = await supabase
    .from('generation_votes')
    .select('generation_id, user_id, vote') as { data: Vote[] | null }
  const profileCards = await getProfileCards((generationRows ?? []).map((generation) => generation.user_id))

  const generations = await Promise.all((generationRows ?? []).map(async (generation) => {
    const { data } = await supabase.storage.from('generated-media').createSignedUrl(generation.image_path, 60 * 60)
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
    <main className="min-h-screen bg-slate-50">
      <HomeNav profile={profile} active="home" />
      <div className="grid w-full gap-8 pt-0 lg:grid-cols-[220px_minmax(0,1fr)]">
        <CommunitySidebar communities={communities} activeCommunityId={id} />
        <section className="mx-auto w-full max-w-5xl min-w-0 px-5 pt-8 sm:px-8 sm:pt-12 lg:mx-0 lg:px-0 lg:pr-8">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-600">Community</p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">{community.name}</h1>
          <p className="mt-4 text-base leading-7 text-slate-600">Generate a caption and post it directly to this community.</p>
          <HomeWorkspace generations={generations} userId={user.id} communities={communities} communityId={id} sectionTitle="Community posts" emptyMessage="No posts in this community yet." />
        </section>
      </div>
    </main>
  )
}