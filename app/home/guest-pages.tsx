import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getPublicCommunities, getPublicPosts, getPublicComments } from '../utils/public-browsing'
import { isPostId } from '../utils/comments'
import Avatar from '../avatar'
import HeaderBanner from '../header-banner'
import HomeNav from './home-nav'
import CommunitySidebar from './community-sidebar'
import HomeWorkspace from './home-workspace'
import PostCard from './post-card'
import CommentThread from './post/comment-thread'
import { MembershipControl } from './community/community-controls'

export async function GuestCommunityPage({ id }: { id: string }) {
  if (!isPostId(id)) notFound()
  const communities = await getPublicCommunities()
  const community = communities.find((item) => item.id === id)
  if (!community) notFound()
  const posts = await getPublicPosts(id)
  return (
    <main className="min-h-screen bg-background">
      <HomeNav profile={null} active={null} />
      <div className="grid w-full gap-8 lg:grid-cols-[260px_minmax(0,1fr)]">
        <CommunitySidebar communities={communities} activeCommunityId={id} isSignedIn={false} />
        <section className="mx-auto w-full max-w-5xl min-w-0 px-5 py-8 sm:px-8 lg:pl-0">
          <HeaderBanner src={community.banner_url} className="h-40 sm:h-52" />
          <header className="my-6 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4"><Avatar src={community.avatar_url} name={community.name} className="h-16 w-16 text-2xl" /><div><h1 className="text-3xl font-bold text-melon-heading">{community.name}</h1><p className="mt-1 text-sm text-melon-muted">Public community</p></div></div>
            <MembershipControl communityId={id} visibility="public" isMember={false} isOwner={false} requestStatus={null} isSignedIn={false} />
          </header>
          <p className="mb-8 whitespace-pre-wrap break-words text-sm leading-6 text-melon-muted">{community.description}</p>
          <HomeWorkspace generations={posts} communities={[community]} userId={null} sectionTitle="Posts" initialPostView="vertical" emptyMessage="No posts yet in this community." />
        </section>
      </div>
    </main>
  )
}

export async function GuestPostPage({ id, pageParam }: { id: string; pageParam?: string }) {
  const [communities, posts] = await Promise.all([getPublicCommunities(), getPublicPosts(null, id)])
  const post = posts[0]
  if (!post) notFound()
  const community = communities.find((item) => item.id === post.community_id)
  const page = pageParam && /^\d{1,5}$/.test(pageParam) ? Math.max(1, Number(pageParam)) : 1
  const comments = await getPublicComments(id, page)
  const totalPages = Math.max(1, Math.ceil(comments.total / 50))
  if (page > totalPages) redirect(`/home/post/${id}?page=${totalPages}#comments`)
  return (
    <main className="min-h-screen bg-background">
      <HomeNav profile={null} active={null} />
      <div className="grid w-full gap-8 lg:grid-cols-[260px_minmax(0,1fr)]">
        <CommunitySidebar communities={communities} activeCommunityId={community?.id} isSignedIn={false} />
        <div className="mx-auto w-full max-w-3xl min-w-0 px-5 py-8 sm:px-8 lg:mx-0 lg:pl-0">
          <Link href={community ? `/home/community/${community.id}` : '/home'} className="mb-5 inline-block text-sm font-semibold text-melon-heading hover:underline">← {community?.name ?? 'Back to Melon'}</Link>
          <PostCard generation={post} community={community} userId={null} isDetail commentCount={comments.total} />
          <section id="comments" className="mt-8 scroll-mt-24" aria-labelledby="comments-heading">
            <h2 id="comments-heading" className="text-xl font-bold text-melon-heading">Comments ({comments.total})</h2>
            <CommentThread postId={id} userId={null} comments={comments.items} currentName="" currentAvatar={null} />
            {totalPages > 1 && <nav aria-label="Comment pages" className="mt-5 flex items-center justify-between text-sm text-melon-heading">
              {page > 1 ? <Link href={`/home/post/${id}?page=${page - 1}#comments`}>← Newer comments</Link> : <span />}
              <span>Page {page} of {totalPages}</span>
              {page < totalPages ? <Link href={`/home/post/${id}?page=${page + 1}#comments`}>Older comments →</Link> : <span />}
            </nav>}
          </section>
        </div>
      </div>
    </main>
  )
}
