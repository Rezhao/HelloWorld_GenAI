'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import Avatar from '../avatar'
import { deleteGeneration, voteOnGeneration } from '../utils/server'
import type { DisplayGeneration } from './home-workspace'

export default function PostCard({ generation, community, userId, postView = 'vertical', isDetail = false, commentCount }: {
  generation: DisplayGeneration
  community?: { id: string; name: string }
  userId: string
  postView?: 'gallery' | 'vertical'
  isDetail?: boolean
  commentCount?: number
}) {
  const router = useRouter()
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  async function handleVote(vote: 1 | -1) {
    if (busy) return
    setBusy(true)
    setMessage('')
    try {
      await voteOnGeneration(generation.id, vote)
      router.refresh()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to save your vote.')
    } finally { setBusy(false) }
  }
  async function handleDelete() {
    if (busy || !window.confirm('Delete this post and its image?')) return
    setBusy(true)
    setMessage('')
    try {
      await deleteGeneration(generation.id)
      if (isDetail) router.push(community ? `/home/community/${community.id}` : '/profile')
      router.refresh()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to delete the post.')
    } finally { setBusy(false) }
  }
  return (
    <article className="relative flex flex-col overflow-hidden rounded-2xl border border-melon-border bg-white">
      <div className="flex flex-1 flex-col p-5">
        <div className="mb-4 flex items-center gap-3">
          <Avatar src={generation.author_avatar_url} name={generation.author_name} className="h-8 w-8 text-xs" />
          <div className="min-w-0">
            {community && <Link href={`/home/community/${community.id}`} className="relative z-10 block truncate text-sm font-bold text-melon-forest transition hover:text-melon-green-dark hover:underline">{community.name}</Link>}
            <p className="text-xs text-melon-muted">{generation.author_name} · <time dateTime={generation.created_at}>{new Date(generation.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'America/New_York' })}</time></p>
          </div>
        </div>
        {isDetail ? <h1 className="text-2xl font-bold leading-8 text-melon-ink">{generation.caption}</h1> : <h2 className="text-lg font-semibold leading-7 text-melon-ink"><Link href={`/home/post/${generation.id}`} className="outline-offset-4"><span className="absolute inset-0 rounded-2xl" aria-hidden="true" />{generation.caption}</Link></h2>}
        {generation.image_url && <img src={generation.image_url} alt="Captioned community submission" className={`mt-4 max-h-[560px] w-full rounded-xl bg-melon-blush object-contain ${postView === 'gallery' ? 'lg:aspect-16/10 lg:max-h-none lg:object-cover' : ''}`} />}
        <details className="relative z-10 mt-4 text-xs leading-5 text-melon-muted">
          <summary className="w-fit cursor-pointer transition hover:text-melon-forest">Caption direction</summary>
          <p className="mt-2">{generation.prompt}</p>
        </details>
        <div className="relative z-10 mt-auto flex flex-wrap items-center justify-between gap-3 pt-5">
          <div className="flex items-center gap-3">
            <Link href={`/home/post/${generation.id}#comments`} className="rounded-full bg-melon-blush px-3 py-2 text-xs font-semibold text-melon-muted transition hover:bg-melon-mint hover:text-melon-green-dark">{commentCount === undefined ? 'Comments' : `${commentCount} ${commentCount === 1 ? 'comment' : 'comments'}`}</Link>
            {generation.user_id === userId && (
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleDelete()}
                className="text-sm font-semibold text-melon-berry transition hover:text-melon-berry"
              >
                Delete
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleVote(1)}
              aria-label="Upvote caption"
              title="Upvote caption"
              className={`flex items-center gap-1.5 rounded-lg border px-2 py-2 transition ${generation.user_vote === 1 ? 'border-melon-green bg-melon-mint text-melon-green-dark' : 'border-melon-border text-melon-muted hover:border-melon-green hover:text-melon-green-dark'}`}
            >
              <span className="text-sm font-semibold">{generation.likes_count}</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 10v10H4V10h3Zm0 10h9.5a2 2 0 0 0 1.94-1.515l1.2-4.8A2 2 0 0 0 17.7 11H14l.55-3.3A2.3 2.3 0 0 0 12.28 5L7 10v10Z" />
              </svg>
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleVote(-1)}
              aria-label="Downvote caption"
              title="Downvote caption"
              className={`rounded-lg border p-2 transition ${generation.user_vote === -1 ? 'border-melon-pink bg-melon-blush text-melon-berry' : 'border-melon-border text-melon-muted hover:border-melon-pink hover:text-melon-berry'}`}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 14V4h3v10h-3Zm0-10H7.5a2 2 0 0 0-1.94 1.515l-1.2 4.8A2 2 0 0 0 6.3 13H10l-.55 3.3A2.3 2.3 0 0 0 11.72 19L17 14V4Z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
      {message && <p role="alert" className="relative z-10 px-5 pb-5 text-sm text-melon-berry">{message}</p>}
    </article>
  )
}
