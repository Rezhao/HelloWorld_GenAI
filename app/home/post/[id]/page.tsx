import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient, getCommunities, getProfileCards, getUserProfile } from '../../../utils/server'
import { isPostId } from '../../../utils/comments'
import HomeNav from '../../home-nav'
import CommunitySidebar from '../../community-sidebar'
import PostCard from '../../post-card'
import type { Generation } from '../../home-workspace'
import CommentThread from '../comment-thread'

export default async function PostPage({ params, searchParams }: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ page?: string }>
}) {
  const { id } = await params
  if (!isPostId(id)) notFound()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  // Query through the viewer's RLS session before loading media or comments.
  const { data: post, error: postError } = await supabase.from('ai_generations')
    .select('id, image_path, prompt, caption, created_at, user_id, community_id')
    .eq('id', id).maybeSingle() as { data: Generation | null; error: { message: string } | null }
  if (postError) throw new Error(postError.message)
  if (!post) notFound()

  const { page: pageParam } = await searchParams
  const page = pageParam && /^\d{1,6}$/.test(pageParam) ? Math.max(1, Number(pageParam)) : 1
  const pageSize = 50
  const [profile, communities, commentsResult, votesResult, imageResult] = await Promise.all([
    getUserProfile(user),
    getCommunities(),
    supabase.from('generation_comments').select('id, user_id, body, created_at', { count: 'exact' })
      .eq('generation_id', id).order('created_at', { ascending: false }).order('id', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1),
    supabase.from('generation_votes').select('user_id, vote').eq('generation_id', id),
    supabase.storage.from('generated-media').createSignedUrl(post.image_path, 60 * 60),
  ])
  if (commentsResult.error) throw new Error(commentsResult.error.message)
  if (votesResult.error) throw new Error(votesResult.error.message)
  const total = commentsResult.count ?? 0
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  if (page > totalPages) redirect(`/home/post/${id}?page=${totalPages}#comments`)
  const commentRows = commentsResult.data ?? []
  const authors = await getProfileCards([...new Set([post.user_id, ...commentRows.map((comment) => comment.user_id)])])
  const nameFor = (userId: string) => [authors[userId]?.first_name, authors[userId]?.last_name].filter(Boolean).join(' ') || 'Community member'
  const votes = votesResult.data ?? []
  const generation = {
    ...post,
    image_url: imageResult.data?.signedUrl ?? '',
    author_name: nameFor(post.user_id),
    author_avatar_url: authors[post.user_id]?.avatar_url ?? null,
    likes_count: votes.filter((vote) => vote.vote === 1).length,
    user_vote: (votes.find((vote) => vote.user_id === user.id)?.vote ?? 0) as -1 | 0 | 1,
  }
  const community = communities.find((community) => community.id === post.community_id)
  const comments = commentRows.map((comment) => ({
    ...comment,
    author_name: nameFor(comment.user_id),
    author_avatar_url: authors[comment.user_id]?.avatar_url ?? null,
  }))
  const currentName = [profile.first_name, profile.last_name].filter(Boolean).join(' ') || 'Community member'

  return (
    <main className="min-h-screen bg-background">
      <HomeNav profile={profile} active={null} />
      <div className="grid w-full gap-8 lg:grid-cols-[260px_minmax(0,1fr)]">
        <CommunitySidebar communities={communities} activeCommunityId={community?.id} />
        <div className="mx-auto w-full max-w-3xl min-w-0 px-5 py-8 sm:px-8 lg:mx-0 lg:pl-0">
          <Link href={community ? `/home/community/${community.id}` : '/home'} className="mb-5 inline-block text-sm font-semibold text-melon-muted transition hover:text-melon-green-dark">← {community ? `Back to ${community.name}` : 'Back to Melon'}</Link>
          <PostCard generation={generation} community={community} userId={user.id} isDetail commentCount={total} />
          <section id="comments" aria-labelledby="comments-heading" className="mt-8 scroll-mt-24">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id="comments-heading" className="text-xl font-bold text-melon-heading">Comments <span className="text-melon-muted">({total})</span></h2>
              <p className="text-xs text-melon-muted">Newest first</p>
            </div>
            <CommentThread postId={id} userId={user.id} comments={comments} currentName={currentName} currentAvatar={profile.avatar_url} />
            {totalPages > 1 && <nav aria-label="Comment pages" className="mt-6 flex items-center justify-between gap-3 text-sm">
              {page > 1 ? <Link href={`/home/post/${id}?page=${page - 1}#comments`} className="font-semibold text-melon-green-dark hover:underline">← Newer comments</Link> : <span />}
              <span className="text-xs text-melon-muted">Page {page} of {totalPages}</span>
              {page < totalPages ? <Link href={`/home/post/${id}?page=${page + 1}#comments`} className="font-semibold text-melon-green-dark hover:underline">Older comments →</Link> : <span />}
            </nav>}
          </section>
        </div>
      </div>
    </main>
  )
}
