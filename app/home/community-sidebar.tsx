'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { FormEvent, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Community } from '../utils/community'
import { createCommunity } from '../utils/server'

export default function CommunitySidebar({
  communities,
  activeCommunityId,
}: {
  communities: Community[]
  activeCommunityId?: string
}) {
  const joinedCommunities = communities.filter((community) => community.is_member)
  const communitySections = [
    { label: 'Communities', communities: joinedCommunities.filter((community) => community.visibility === 'public') },
    { label: 'Private', communities: joinedCommunities.filter((community) => community.visibility === 'private') },
  ]
  const router = useRouter()
  const pathname = usePathname()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [visibility, setVisibility] = useState<'public' | 'private'>('public')
  const [isCreating, setIsCreating] = useState(false)
  const [message, setMessage] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)

  useEffect(() => {
    if (!isModalOpen) return

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsModalOpen(false)
    }

    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', closeOnEscape)

    return () => {
      document.body.style.overflow = ''
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [isModalOpen])

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsCreating(true)
    setMessage('')

    try {
      const community = await createCommunity(name, description, visibility)
      setName('')
      setDescription('')
      setVisibility('public')
      setIsModalOpen(false)
      router.push(`/home/community/${community.id}`)
      router.refresh()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to create the community.')
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <aside className="relative z-40 h-fit bg-melon-blush p-4 lg:h-[calc(100dvh-4rem)] lg:overflow-y-auto lg:sticky lg:top-16 lg:pt-12">
      <nav className="space-y-1" aria-label="Browse Melon">
        {[{ label: 'Home', href: '/home' }, { label: 'Explore', href: '/home/explore' }].map((item) => (
          <Link key={item.href} href={item.href} aria-current={pathname === item.href ? 'page' : undefined} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${pathname === item.href ? 'bg-melon-pink text-melon-yellow' : 'text-melon-ink hover:bg-melon-yellow hover:text-melon-pink'}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 shrink-0" aria-hidden="true">
              {item.label === 'Home' ? (
                <path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1V10Z" />
              ) : (
                <><circle cx="12" cy="12" r="9" /><path d="m16 8-2.5 5.5L8 16l2.5-5.5L16 8Z" /></>
              )}
            </svg>
            {item.label}
          </Link>
        ))}
      </nav>
      <button
        type="button"
        onClick={() => {
          setMessage('')
          setIsModalOpen(true)
        }}
        className="mt-1 flex w-full items-center gap-3 whitespace-nowrap rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-melon-ink transition hover:bg-melon-yellow hover:text-melon-pink"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="h-5 w-5 shrink-0" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
        Add new community
      </button>
      {communitySections.map((section) => (
        <section key={section.label} className="mt-6 border-t border-melon-yellow pt-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-melon-pink">{section.label}</h2>
            <span className="text-xs text-melon-muted">{section.communities.length}</span>
          </div>
          {section.communities.length > 0 ? (
            <nav className="mt-4 space-y-1" aria-label={section.label === 'Private' ? 'Private communities' : 'Joined communities'}>
              {section.communities.map((community) => (
                <Link
                  key={community.id}
                  href={`/home/community/${community.id}`}
                  aria-current={activeCommunityId === community.id ? 'page' : undefined}
                  className={`block truncate rounded-lg px-3 py-2 text-sm font-semibold transition ${activeCommunityId === community.id ? 'bg-melon-pink text-melon-yellow' : 'text-melon-muted hover:bg-melon-yellow hover:text-melon-pink'}`}
                >
                  {community.name.toLowerCase() === 'random' ? 'Random' : community.name}
                </Link>
              ))}
            </nav>
          ) : (
            <p className="mt-3 text-xs leading-5 text-melon-muted">{section.label === 'Private' ? 'No private communities joined yet.' : 'Join a public community to see it here.'}</p>
          )}
        </section>
      ))}


      {isModalOpen && createPortal(
        <div
          className="fixed inset-0 z-1000 flex items-center justify-center bg-gray-900/60 px-5"
          role="presentation"
          onClick={(event) => {
            if (event.target === event.currentTarget) setIsModalOpen(false)
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-community-title"
            onClick={(event) => event.stopPropagation()}
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 id="new-community-title" className="text-lg font-bold text-melon-heading">Create a community</h3>
                <p className="mt-1 text-sm text-melon-muted">Give your new space a name.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                aria-label="Close create community dialog"
                className="text-2xl leading-none text-melon-muted transition hover:text-melon-ink"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleCreate} className="mt-5">
              <fieldset disabled={isCreating}>
              <label className="block text-sm font-semibold text-melon-ink" htmlFor="new-community">Community name</label>
              <input
                id="new-community"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Columbia Creatives"
                maxLength={50}
                autoFocus
                required
                className="mt-2 w-full rounded-lg border border-melon-border px-3 py-3 text-sm text-melon-forest outline-none transition placeholder:text-melon-muted focus:border-melon-green focus:ring-2 focus:ring-melon-mint"
              />
              <label className="mt-5 block text-sm font-semibold text-melon-ink" htmlFor="community-description">Description</label>
              <textarea id="community-description" value={description} onChange={(event) => setDescription(event.target.value)} maxLength={500} placeholder="What is your community about?" className="mt-2 min-h-24 w-full rounded-lg border border-melon-border px-3 py-3 text-sm text-melon-forest focus:border-melon-green focus:outline-none focus:ring-2 focus:ring-melon-mint" />
              <p className="mt-1 text-right text-xs text-melon-muted">{description.length}/500</p>
              <fieldset className="mt-5 space-y-2">
                <legend className="mb-2 text-sm font-semibold text-melon-ink">Community type</legend>
                {(['public', 'private'] as const).map((type) => (
                  <label key={type} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 ${visibility === type ? 'border-melon-green bg-melon-mint' : 'border-melon-border'}`}>
                    <input type="radio" name="visibility" value={type} checked={visibility === type} onChange={() => setVisibility(type)} className="mt-1 accent-melon-green" />
                    <span><span className="block text-sm font-semibold capitalize text-melon-forest">{type}</span><span className="mt-1 block text-xs leading-5 text-melon-muted">{type === 'public' ? 'Anyone signed in can view posts and join.' : 'Only approved members can view and post. You approve join requests.'}</span></span>
                  </label>
                ))}
              </fieldset>
              {message && <p className="mt-2 text-xs text-melon-berry" role="status">{message}</p>}
              <div className="mt-5 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-lg border border-melon-border px-4 py-2.5 text-sm font-semibold text-melon-muted transition hover:bg-melon-blush"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating || name.trim().length < 2}
                  className="rounded-lg bg-melon-pink px-4 py-2.5 text-sm font-semibold text-melon-yellow transition hover:bg-melon-yellow hover:text-melon-pink disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isCreating ? 'Creating...' : 'Create community'}
                </button>
              </div>
              </fieldset>
            </form>
          </div>
        </div>,
        document.body
      )}
    </aside>
  )
}
