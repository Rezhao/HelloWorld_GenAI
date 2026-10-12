'use client'

import { useState } from 'react'

type ProfilePost = {
  id: string
  image_url: string
  caption: string
  prompt: string
  created_at: string
  community_name: string | null
  likes_count: number
  vote: 1 | -1 | 0
}

type FeedTab = 'posts' | 'upvoted' | 'downvoted'

const tabs: Array<{ id: FeedTab; label: string }> = [
  { id: 'posts', label: 'Posts' },
  { id: 'upvoted', label: 'Upvoted' },
  { id: 'downvoted', label: 'Downvoted' },
]

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value))
}

export default function ProfileFeed({
  posts,
  upvoted,
  downvoted,
}: {
  posts: ProfilePost[]
  upvoted: ProfilePost[]
  downvoted: ProfilePost[]
}) {
  const [activeTab, setActiveTab] = useState<FeedTab>('posts')
  const content = activeTab === 'posts' ? posts : activeTab === 'upvoted' ? upvoted : downvoted
  const emptyMessages: Record<FeedTab, string> = {
    posts: 'You have not made any posts yet.',
    upvoted: 'Posts you upvote will appear here.',
    downvoted: 'Posts you downvote will appear here.',
  }

  return (
    <section className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <nav className="flex overflow-x-auto border-b border-slate-200 px-2 sm:px-4" aria-label="Profile content">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            aria-selected={activeTab === tab.id}
            role="tab"
            className={`shrink-0 border-b-2 px-4 py-4 text-sm font-semibold transition ${activeTab === tab.id ? 'border-teal-500 text-slate-950' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {content.length === 0 ? (
        <div className="px-6 py-20 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-2xl text-slate-400" aria-hidden="true">○</div>
          <h2 className="mt-5 text-xl font-bold text-slate-950">Nothing here yet</h2>
          <p className="mt-2 text-sm text-slate-500">{emptyMessages[activeTab]}</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {content.map((post) => (
            <article key={post.id} className="flex gap-4 p-5 transition hover:bg-slate-50 sm:p-6">
              <div className="flex w-10 shrink-0 flex-col items-center gap-1 pt-1 text-xs font-semibold text-slate-500">
                <span className={post.vote === 1 ? 'text-teal-600' : ''} aria-label={`${post.likes_count} upvotes`}>▲</span>
                <span>{post.likes_count}</span>
                <span className={post.vote === -1 ? 'text-rose-600' : ''} aria-label="Downvote">▼</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                  <span className="font-semibold text-slate-700">{post.community_name ?? 'Community post'}</span>
                  <span aria-hidden="true">•</span>
                  <span>{formatDate(post.created_at)}</span>
                  {post.vote === 1 && <span className="text-teal-600">• Upvoted</span>}
                  {post.vote === -1 && <span className="text-rose-600">• Downvoted</span>}
                </div>
                <h2 className="mt-2 text-lg font-bold leading-7 text-slate-950">{post.caption}</h2>
                <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">Prompt: {post.prompt}</p>
                <p className="mt-3 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">{post.likes_count} {post.likes_count === 1 ? 'upvote' : 'upvotes'}</p>
              </div>
              {post.image_url && (
                <img src={post.image_url} alt="" className="h-20 w-20 shrink-0 rounded-xl object-cover sm:h-24 sm:w-24" />
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
