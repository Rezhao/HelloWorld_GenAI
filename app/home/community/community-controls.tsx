'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import Avatar from '../../avatar'
import { joinCommunity, reviewCommunityRequest } from '../../utils/server'

export function MembershipControl({ communityId, visibility, isMember, isOwner, requestStatus, showCreatePost = true }: {
  communityId: string
  visibility: 'public' | 'private'
  isMember: boolean
  isOwner: boolean
  requestStatus: string | null
  showCreatePost?: boolean
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  async function join() {
    setBusy(true)
    setMessage('')
    try {
      await joinCommunity(communityId)
      router.refresh()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to join. Try again.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        {showCreatePost && isMember && <Link href="/home/create" className="rounded-full border border-melon-border bg-white px-5 py-2.5 text-sm font-semibold text-melon-forest transition hover:bg-melon-cream">+ Create post</Link>}
        {isOwner ? <span className="rounded-full bg-melon-mint px-5 py-2.5 text-sm font-semibold text-melon-green-dark">Owner</span>
          : isMember ? <span className="rounded-full border border-melon-green bg-melon-mint px-5 py-2.5 text-sm font-semibold text-melon-green-dark">✓ Joined</span>
          : requestStatus === 'pending' ? <span role="status" className="rounded-full border border-melon-gold bg-melon-yellow-soft px-5 py-2.5 text-sm font-semibold text-melon-ink">Request pending</span>
          : requestStatus === 'rejected' ? <span role="status" className="rounded-full bg-melon-blush px-5 py-2.5 text-sm font-semibold text-melon-muted">Request declined</span>
          : <button type="button" disabled={busy} onClick={() => void join()} className="rounded-full bg-melon-pink px-6 py-2.5 text-sm font-bold text-melon-yellow transition hover:bg-melon-yellow hover:text-melon-pink disabled:opacity-50">{busy ? 'Submitting…' : visibility === 'private' ? 'Request to join' : 'Join community'}</button>}
      </div>
      {message && <p role="alert" className="mt-3 text-sm text-melon-berry">{message}</p>}
    </div>
  )
}

export function JoinRequests({ communityId, requests }: {
  communityId: string
  requests: { user_id: string; name: string; avatar_url: string | null; requested_at: string }[]
}) {
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  async function review(userId: string, approve: boolean) {
    setBusy(userId)
    setMessage('')
    try {
      await reviewCommunityRequest(communityId, userId, approve)
      router.refresh()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to review request.')
    } finally {
      setBusy(null)
    }
  }
  return (
    <section className="mt-6 rounded-2xl border border-melon-green bg-white p-5" aria-labelledby="requests-heading">
      <p className="text-xs font-semibold uppercase tracking-wider text-melon-green-dark">Owner tools</p>
      <h2 id="requests-heading" className="mt-2 text-lg font-bold text-melon-heading">Join requests <span className="text-melon-muted">({requests.length})</span></h2>
      {requests.length === 0 ? <p className="mt-3 text-sm text-melon-muted">You’re all caught up. New requests will appear here.</p> : (
        <ul className="mt-4 divide-y divide-melon-border">
          {requests.map((request) => (
            <li key={request.user_id} className="flex flex-wrap items-center justify-between gap-3 py-4">
              <div className="flex min-w-0 items-center gap-3">
                <Avatar src={request.avatar_url} name={request.name} className="h-9 w-9 text-xs" />
                <div><p className="text-sm font-semibold text-melon-forest">{request.name}</p><p className="text-xs text-melon-muted">Requested {new Date(request.requested_at).toLocaleDateString('en-US', { timeZone: 'America/New_York' })}</p></div>
              </div>
              <div className="flex gap-2">
                <button disabled={busy !== null} onClick={() => void review(request.user_id, false)} className="rounded-full border border-melon-border px-4 py-2 text-xs font-semibold text-melon-muted hover:bg-melon-cream disabled:opacity-50">Decline</button>
                <button disabled={busy !== null} onClick={() => void review(request.user_id, true)} className="rounded-full bg-melon-pink px-4 py-2 text-xs font-semibold text-melon-yellow hover:bg-melon-yellow hover:text-melon-pink disabled:opacity-50">{busy === request.user_id ? 'Saving…' : 'Approve'}</button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {message && <p role="alert" className="mt-3 text-sm text-melon-berry">{message}</p>}
    </section>
  )
}
