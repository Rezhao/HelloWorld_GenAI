'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import Avatar from '../../avatar'
import { addComment, deleteComment } from '../../utils/server'

export interface PostComment {
  id: string
  user_id: string
  body: string
  created_at: string
  author_name: string
  author_avatar_url: string | null
}

export default function CommentThread({ postId, userId, comments, currentName, currentAvatar }: {
  postId: string
  userId: string
  comments: PostComment[]
  currentName: string
  currentAvatar: string | null
}) {
  const router = useRouter()
  const [body, setBody] = useState('')
  const [isPosting, setIsPosting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isPosting || !body.trim()) return
    setIsPosting(true)
    setError('')
    setStatus('')
    try {
      await addComment(postId, body)
      setBody('')
      setStatus('Comment posted.')
      router.replace(`/home/post/${postId}#comments`, { scroll: false })
      router.refresh()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to post your comment. Try again.')
    } finally { setIsPosting(false) }
  }

  async function remove(commentId: string) {
    if (deletingId || !window.confirm('Delete your comment?')) return
    setDeletingId(commentId)
    setError('')
    setStatus('')
    try {
      await deleteComment(postId, commentId)
      setStatus('Comment deleted.')
      router.refresh()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to delete your comment.')
    } finally { setDeletingId(null) }
  }

  return (
    <>
      <form onSubmit={submit} className="mt-5 rounded-2xl border border-melon-border bg-white p-4" aria-busy={isPosting}>
        <div className="mb-3 flex items-center gap-2">
          <Avatar src={currentAvatar} name={currentName} className="h-7 w-7 text-xs" />
          <p className="text-xs text-melon-muted">Comment as <span className="font-semibold text-melon-ink">{currentName}</span></p>
        </div>
        <label htmlFor="comment-body" className="sr-only">Write a comment</label>
        <textarea id="comment-body" name="body" value={body} onChange={(event) => setBody(event.target.value)} disabled={isPosting} required maxLength={2000} placeholder="Join the conversation" aria-describedby="comment-limit" className="min-h-28 w-full resize-y rounded-xl border border-melon-border p-3 text-sm leading-6 text-melon-forest outline-none transition placeholder:text-melon-muted focus:border-melon-green focus:ring-2 focus:ring-melon-mint disabled:opacity-60" />
        <div className="mt-3 flex items-center justify-between gap-3">
          <p id="comment-limit" className="text-xs text-melon-muted">{body.length}/2,000</p>
          <button type="submit" disabled={isPosting || !body.trim()} className="rounded-full bg-melon-pink px-5 py-2.5 text-sm font-semibold text-melon-yellow transition hover:bg-melon-yellow hover:text-melon-pink disabled:cursor-not-allowed disabled:opacity-50">{isPosting ? 'Posting…' : 'Comment'}</button>
        </div>
      </form>
      {error && <p role="alert" className="mt-4 text-sm text-melon-berry">{error}</p>}
      {status && <p role="status" className="mt-4 text-sm text-melon-green-dark">{status}</p>}
      {comments.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-dashed border-melon-border bg-white px-5 py-10 text-center text-sm text-melon-muted">No comments yet. Start the conversation.</p>
      ) : (
        <ol className="mt-6 divide-y divide-melon-border rounded-2xl border border-melon-border bg-white px-5">
          {comments.map((comment) => (
            <li key={comment.id} id={`comment-${comment.id}`} className="flex gap-3 py-5">
              <Avatar src={comment.author_avatar_url} name={comment.author_name} className="h-8 w-8 text-xs" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                  <span className="font-semibold text-melon-forest">{comment.author_name}</span>
                  <time dateTime={comment.created_at} className="text-melon-muted">{new Date(comment.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'America/New_York' })}</time>
                  {comment.user_id === userId && <span className="font-semibold text-melon-green-dark">You</span>}
                </div>
                <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-melon-ink">{comment.body}</p>
                {comment.user_id === userId && <button type="button" onClick={() => void remove(comment.id)} disabled={deletingId !== null} className="mt-3 text-xs font-semibold text-melon-muted transition hover:text-melon-berry disabled:opacity-50">{deletingId === comment.id ? 'Deleting…' : 'Delete'}</button>}
              </div>
            </li>
          ))}
        </ol>
      )}
    </>
  )
}
