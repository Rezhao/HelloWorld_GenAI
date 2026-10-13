import Link from 'next/link'
import Avatar from '../avatar'
import { redirect } from 'next/navigation'
import { createClient, getCommunities, getUserProfile } from '../utils/server'
import HomeNav from '../home/home-nav'
import CommunitySidebar from '../home/community-sidebar'
import ProfileFeed from './profile-feed'

interface GenerationRow {
  id: string
  image_path: string
  prompt: string
  caption: string
  created_at: string
  user_id: string
  community_id: string | null
}

interface VoteRow {
  generation_id: string
  user_id: string
  vote: 1 | -1
}

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/sign-in')
  }

  const [profile, communities, postsResult, userVotesResult] = await Promise.all([
    getUserProfile(user),
    getCommunities(),
    supabase
      .from('ai_generations')
      .select('id, image_path, prompt, caption, created_at, user_id, community_id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100),
    supabase
      .from('generation_votes')
      .select('generation_id, user_id, vote')
      .eq('user_id', user.id),
  ])

  const posts = (postsResult.data ?? []) as GenerationRow[]
  const userVotes = (userVotesResult.data ?? []) as VoteRow[]
  const votedIds = userVotes.map((vote) => vote.generation_id)
  const votedGenerationRows = votedIds.length === 0
    ? []
    : ((await supabase
      .from('ai_generations')
      .select('id, image_path, prompt, caption, created_at, user_id, community_id')
      .in('id', votedIds)
      .order('created_at', { ascending: false }))
      .data ?? []) as GenerationRow[]
  const allRows = [...posts, ...votedGenerationRows.filter((row) => !posts.some((post) => post.id === row.id))]
  const generationIds = allRows.map((row) => row.id)
  const { data: allVoteRows } = generationIds.length === 0
    ? { data: [] as VoteRow[] }
    : await supabase
      .from('generation_votes')
      .select('generation_id, user_id, vote')
      .in('generation_id', generationIds) as { data: VoteRow[] | null }
  const communityNames = new Map(communities.map((community) => [community.id, community.name]))

  const decoratedRows = await Promise.all(allRows.map(async (row) => {
    const { data } = await supabase.storage
      .from('generated-media')
      .createSignedUrl(row.image_path, 60 * 60)
    const generationVotes = (allVoteRows ?? []).filter((vote) => vote.generation_id === row.id)
    const userVote = generationVotes.find((vote) => vote.user_id === user.id)?.vote ?? 0

    return {
      id: row.id,
      image_url: data?.signedUrl ?? '',
      caption: row.caption,
      prompt: row.prompt,
      created_at: row.created_at,
      community_name: row.community_id ? communityNames.get(row.community_id) ?? null : null,
      likes_count: generationVotes.filter((vote) => vote.vote === 1).length,
      vote: userVote as 1 | -1 | 0,
    }
  }))

  const decoratedById = new Map(decoratedRows.map((row) => [row.id, row]))
  const profilePosts = posts.map((post) => decoratedById.get(post.id)).filter((post) => post !== undefined)
  const upvoted = userVotes
    .filter((vote) => vote.vote === 1)
    .map((vote) => decoratedById.get(vote.generation_id))
    .filter((post) => post !== undefined)
  const downvoted = userVotes
    .filter((vote) => vote.vote === -1)
    .map((vote) => decoratedById.get(vote.generation_id))
    .filter((post) => post !== undefined)
  const fullName = [profile.first_name, profile.last_name].filter(Boolean).join(' ') || 'Your profile'

  return (
    <main className="min-h-screen bg-background">
      <HomeNav profile={profile} active={null} />
      <div className="grid w-full gap-8 lg:grid-cols-[220px_minmax(0,1fr)]">
        <CommunitySidebar communities={communities} />
        <div className="min-w-0 px-5 pt-4 pb-12 lg:pr-8">
          <section className="mx-auto max-w-6xl rounded-2xl bg-linear-to-r from-melon-pink via-melon-yellow to-melon-green px-5 py-10 text-melon-forest sm:px-8 sm:py-14">
            <div className="mx-auto flex w-full max-w-5xl items-center gap-5">
              <Avatar src={profile.avatar_url} name={[profile.first_name, profile.last_name].filter(Boolean).join(' ')} className="h-24 w-24 border-4 border-white/80 text-3xl sm:h-28 sm:w-28" />
              <div className="min-w-0">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-melon-forest">Profile</p>
                <h1 className="text-melon-heading mt-1 truncate text-3xl font-bold sm:text-4xl">{fullName}</h1>
                <p className="mt-2 truncate text-sm text-melon-ink">{profile.email ?? user.email}</p>
              </div>
            </div>
          </section>
          <section className="mx-auto w-full max-w-5xl px-5 py-8 sm:px-8">
            <div className="flex items-center justify-between gap-4">
              <Link href="/home" className="text-sm font-semibold text-melon-green-dark hover:text-melon-green-dark">Back to Melon</Link>
              <Link href="/settings" className="text-sm font-semibold text-melon-muted hover:text-melon-forest">Edit profile</Link>
            </div>
            <ProfileFeed posts={profilePosts} upvoted={upvoted} downvoted={downvoted} />
          </section>
        </div>
      </div>
    </main>
  )
}
