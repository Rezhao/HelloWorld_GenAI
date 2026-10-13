'use client'

import Link from 'next/link'
import { useState } from 'react'
import type { Community } from '../../utils/community'
import { MembershipControl } from '../community/community-controls'

export default function CommunityDirectory({ communities, userId, requestStatuses }: {
  communities: Community[]
  userId: string
  requestStatuses: Record<string, string>
}) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'public' | 'private' | 'joined'>('all')
  const search = query.trim().toLowerCase()
  const visibleCommunities = communities.filter((community) => (
    (filter === 'all' || (filter === 'joined' ? community.is_member : community.visibility === filter))
    && (!search || `${community.name} ${community.description}`.toLowerCase().includes(search))
  ))

  return (
    <div className="mt-6">
      <label htmlFor="community-search" className="block text-sm font-semibold text-melon-ink">Search communities</label>
      <input id="community-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by name or description" className="mt-2 w-full rounded-xl border border-melon-border bg-white px-4 py-3 text-sm outline-none focus:border-melon-green-dark focus:ring-2 focus:ring-melon-mint" />
      <div className="mt-4 flex flex-wrap gap-2" aria-label="Filter communities">
        {(['all', 'public', 'private', 'joined'] as const).map((value) => (
          <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)} className={`rounded-full px-4 py-2 text-sm font-semibold capitalize transition ${filter === value ? 'bg-melon-pink text-melon-yellow' : 'border border-melon-border bg-white text-melon-ink hover:bg-melon-yellow hover:text-melon-pink'}`}>{value === 'all' ? 'All communities' : value}</button>
        ))}
      </div>
      <p className="mt-5 text-xs text-melon-muted" role="status">{visibleCommunities.length} {visibleCommunities.length === 1 ? 'community' : 'communities'}</p>
      {visibleCommunities.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-dashed border-melon-border p-8 text-center text-sm text-melon-muted">{communities.length === 0 ? 'No communities yet. Use Add new community to start one.' : 'No communities match. Try another search or filter.'}</p>
      ) : (
        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          {visibleCommunities.map((community) => (
            <article key={community.id} className="flex flex-col rounded-2xl border border-melon-border bg-white p-5">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-melon-green text-xl font-bold text-melon-heading" aria-hidden="true">{community.name.slice(0, 1).toUpperCase()}</span>
                <div className="min-w-0">
                  <h2 className="break-words text-lg font-bold text-melon-heading"><Link href={`/home/community/${community.id}`} className="hover:text-melon-pink hover:underline">{community.name}</Link></h2>
                  <p className="mt-1 text-xs capitalize text-melon-muted">{community.visibility === 'private' ? 'Private · Approval required' : 'Public · Open to join'}</p>
                </div>
              </div>
              <p className="mt-4 flex-1 whitespace-pre-wrap break-words text-sm leading-6 text-melon-muted">{community.description || 'Explore posts and share your own captions.'}</p>
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-melon-border pt-4">
                <Link href={`/home/community/${community.id}`} className="text-sm font-semibold text-melon-heading hover:underline">View community</Link>
                <MembershipControl communityId={community.id} visibility={community.visibility} isMember={community.is_member} isOwner={community.created_by === userId} requestStatus={requestStatuses[community.id] ?? null} showCreatePost={false} />
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
