'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import PostCard from './post-card'

type PostView = 'gallery' | 'vertical'

export interface Generation {
  id: string
  user_id: string
  image_path: string
  prompt: string
  caption: string
  created_at: string
  community_id: string | null
  author_name: string
  author_avatar_url: string | null
}

interface Community {
  id: string
  name: string
}

export interface DisplayGeneration extends Generation {
  image_url: string
  likes_count: number
  user_vote: -1 | 0 | 1
}

export default function HomeWorkspace({
  generations,
  userId,
  sectionTitle = 'Does it land?',
  emptyMessage = 'The queue is waiting for its first image.',
  communities = [],
  initialPostView = 'gallery',
  eyebrow = 'Community queue',
  allowShuffle = false,
}: {
  generations: DisplayGeneration[]
  userId: string
  sectionTitle?: string
  emptyMessage?: string
  communities?: Community[]
  initialPostView?: PostView
  eyebrow?: string
  allowShuffle?: boolean
}) {
  const router = useRouter()
  const [isShuffling, startShuffle] = useTransition()
  const [postView, setPostView] = useState<PostView>(initialPostView)
  const communityById = new Map(communities.map((community) => [community.id, community]))

  return (
    <div className={initialPostView === 'vertical' ? '' : 'mt-12'}>
      <section aria-labelledby="vote-heading">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-melon-green-dark">{eyebrow}</p>
            <h2 id="vote-heading" className="mt-2 text-2xl font-bold text-melon-heading">{sectionTitle}</h2>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {allowShuffle && <button type="button" onClick={() => startShuffle(() => router.refresh())} disabled={isShuffling} className="rounded-full border border-melon-pink bg-melon-pink px-3 py-2 text-xs font-semibold text-melon-yellow transition hover:bg-melon-yellow hover:text-melon-pink hover:border-melon-yellow disabled:opacity-50">{isShuffling ? 'Shuffling…' : 'Shuffle feed'}</button>}
            <span className="text-sm text-melon-muted">{generations.length} {generations.length === 1 ? 'post' : 'posts'}</span>
            <div className="flex rounded-lg border border-melon-border bg-white p-1" aria-label="Post view options">
              <button
                type="button"
                onClick={() => setPostView('gallery')}
                aria-label="Gallery view"
                title="Gallery view"
                aria-pressed={postView === 'gallery'}
                className={`rounded-md p-2 transition ${postView === 'gallery' ? 'bg-melon-pink text-melon-yellow' : 'text-melon-muted hover:bg-melon-blush hover:text-melon-forest'}`}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden="true">
                  <rect x="4" y="4" width="6" height="6" rx="1" />
                  <rect x="14" y="4" width="6" height="6" rx="1" />
                  <rect x="4" y="14" width="6" height="6" rx="1" />
                  <rect x="14" y="14" width="6" height="6" rx="1" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => setPostView('vertical')}
                aria-label="Vertical feed view"
                title="Vertical feed view"
                aria-pressed={postView === 'vertical'}
                className={`rounded-md p-2 transition ${postView === 'vertical' ? 'bg-melon-pink text-melon-yellow' : 'text-melon-muted hover:bg-melon-blush hover:text-melon-forest'}`}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden="true">
                  <rect x="4" y="4" width="16" height="4" rx="1" />
                  <rect x="4" y="10" width="16" height="4" rx="1" />
                  <rect x="4" y="16" width="16" height="4" rx="1" />
                </svg>
              </button>
            </div>
          </div>
        </div>
        {generations.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-melon-border bg-white p-8 text-center text-sm text-melon-muted">
            {emptyMessage}
          </div>
        ) : (
          <div className={`mt-6 grid gap-5 ${postView === 'gallery' ? 'sm:grid-cols-2 lg:grid-cols-3' : 'mx-auto max-w-2xl grid-cols-1'}`}>
            {generations.map((generation) => {
              const community = generation.community_id ? communityById.get(generation.community_id) : undefined
              return (
              <PostCard key={generation.id} generation={generation} community={community} userId={userId} postView={postView} />
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}