import { canReadCommunity } from '../../../utils/community'
import { MembershipControl, JoinRequests } from '../community-controls'
import { notFound, redirect } from 'next/navigation'
import { createClient, getCommunities, getProfileCards, getUserProfile } from '../../../utils/server'
import CommunitySidebar from '../../community-sidebar'
import HomeNav from '../../home-nav'
import HomeWorkspace, { type Generation } from '../../home-workspace'
import Avatar from '../../../avatar'
import HeaderBanner from '../../../header-banner'
import CommunityPhotoControl from '../../../community-photo-control'

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

  const isOwner = community.created_by === user.id
  const canRead = canReadCommunity(community, user.id)
  const { data: request, error: requestError } = await supabase.from('community_join_requests')
    .select('status').eq('community_id', id).eq('user_id', user.id).maybeSingle()
  if (requestError) throw new Error(requestError.message)
  const { count: memberCount, error: memberError } = canRead
    ? await supabase.from('community_members').select('*', { count: 'exact', head: true }).eq('community_id', id)
    : { count: null, error: null }
  if (memberError) throw new Error(memberError.message)
  const { data: pendingRequests, error: pendingError } = isOwner
    ? await supabase.from('community_join_requests').select('user_id, requested_at').eq('community_id', id).eq('status', 'pending').order('requested_at')
    : { data: [], error: null }
  if (pendingError) throw new Error(pendingError.message)
  const requesterProfiles = await getProfileCards((pendingRequests ?? []).map((item) => item.user_id))
  const requests = (pendingRequests ?? []).map((item) => ({
    ...item,
    name: [requesterProfiles[item.user_id]?.first_name, requesterProfiles[item.user_id]?.last_name].filter(Boolean).join(' ') || 'Community member',
    avatar_url: requesterProfiles[item.user_id]?.avatar_url ?? null,
  }))

  const { data: generationRows, error: generationError } = canRead ? await supabase
    .from('ai_generations')
    .select('id, image_path, prompt, caption, created_at, user_id, community_id')
    .eq('community_id', id)
    .order('created_at', { ascending: false })
    .limit(100) as { data: Generation[] | null; error: { message: string } | null } : { data: [], error: null }
  if (generationError) throw new Error(generationError.message)
  const generationIds = (generationRows ?? []).map((generation) => generation.id)
  const { data: votes } = generationIds.length > 0 ? await supabase
    .from('generation_votes')
    .select('generation_id, user_id, vote').in('generation_id', generationIds) as { data: Vote[] | null } : { data: [] }
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
    <main className="min-h-screen bg-background">
      <HomeNav profile={profile} active="home" />
      <div className="grid w-full gap-8 pt-0 lg:grid-cols-[260px_minmax(0,1fr)]">
        <CommunitySidebar communities={communities} activeCommunityId={id} />
        <section className="min-w-0 pb-12 lg:pr-8">
          <div className="relative mx-5 mt-4">
            <HeaderBanner src={community.banner_url} className="h-32 sm:h-44" />
            {isOwner && <CommunityPhotoControl key={`${id}-banner`} communityId={id} kind="banner" initialUrl={community.banner_url} className="bottom-4 right-4" />}
          </div>
          <div className="relative mx-auto max-w-6xl px-5 sm:px-8">
            <header className="border-b border-melon-border pb-6">
              <div className="-mt-9 flex flex-wrap items-end justify-between gap-5">
                <div className="min-w-0">
                  <div className="relative w-fit">
                    <Avatar src={community.avatar_url} name={community.name} className="h-20 w-20 border-4 border-melon-cream text-3xl" />
                    {isOwner && <CommunityPhotoControl key={`${id}-avatar`} communityId={id} kind="avatar" initialUrl={community.avatar_url} className="-bottom-1 -right-1" />}
                  </div>
                  <h1 className="mt-4 break-words text-3xl font-bold tracking-tight text-melon-heading sm:text-4xl">{community.name}</h1>
                  <p className="mt-2 text-sm text-melon-muted">{community.visibility === 'private' ? 'Private community · Approval required' : 'Public community · Open to everyone signed in'}</p>
                </div>
                <MembershipControl communityId={id} visibility={community.visibility} isMember={community.is_member} isOwner={isOwner} requestStatus={request?.status ?? null} />
              </div>
            </header>
            <div className="grid items-start gap-8 pt-6 xl:grid-cols-[minmax(0,1fr)_280px]">
              <div className="min-w-0">
                {canRead ? (
                  <HomeWorkspace generations={generations} userId={user.id} communities={communities} sectionTitle="Community posts" emptyMessage="Be the first to share a caption with this community." initialPostView="vertical" />
                ) : (
                  <section className="rounded-2xl border border-melon-border bg-white px-6 py-14 text-center">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-melon-blush text-melon-muted" aria-hidden="true">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6"><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>
                    </div>
                    <h2 className="mt-5 text-xl font-bold text-melon-heading">This community is private</h2>
                    <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-melon-muted">{request?.status === 'pending' ? 'Your request is with the owner. Once approved, you can view posts and share your own.' : request?.status === 'rejected' ? 'The owner declined your join request. Posts are available to approved members only.' : 'Request to join above. The owner needs to approve your membership before you can view or share posts.'}</p>
                  </section>
                )}
                {isOwner && community.visibility === 'private' && <JoinRequests communityId={id} requests={requests} />}
              </div>
              <aside className="order-first rounded-2xl border border-melon-border bg-white p-5 xl:order-last">
                <h2 className="text-xs font-bold uppercase tracking-wider text-melon-heading">About this community</h2>
                <h3 className="mt-4 break-words text-lg font-bold text-melon-heading">{community.name}</h3>
                <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-melon-muted">{community.description || 'A place to share images, create captions, and find out what lands.'}</p>
                <p className="mt-4 text-xs text-melon-muted">Created {new Date(community.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'America/New_York' })}</p>
                <div className="mt-5 border-t border-melon-border pt-5">
                  {memberCount !== null && <p className="text-2xl font-bold text-melon-forest">{memberCount}<span className="ml-2 text-xs font-normal text-melon-muted">{memberCount === 1 ? 'member' : 'members'}</span></p>}
                  <p className="mt-3 text-sm font-semibold capitalize text-melon-green-dark">{community.visibility}</p>
                  <p className="mt-1 text-xs leading-5 text-melon-muted">{community.visibility === 'private' ? 'Membership is approved by the community owner.' : 'Join to start sharing your own posts.'}</p>
                </div>
              </aside>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
