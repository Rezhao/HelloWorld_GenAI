'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FormEvent, useEffect, useState } from 'react'
import { createCommunity } from '../utils/server'

interface Community {
  id: string
  name: string
}

export default function CommunitySidebar({
  communities,
  activeCommunityId,
}: {
  communities: Community[]
  activeCommunityId?: string
}) {
  const randomCommunity = communities.find((community) => community.name.toLowerCase() === 'random')
  const router = useRouter()
  const [name, setName] = useState('')
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
      const community = await createCommunity(name)
      setName('')
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
    <aside className="relative z-40 h-fit border-r border-slate-200 bg-white p-4 lg:min-h-[calc(100vh-4rem)] lg:sticky lg:top-16 lg:pt-12">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-slate-700">Communities</h2>
        <span className="text-xs text-slate-400">{communities.length}</span>
      </div>
      <nav className="mt-4 space-y-1" aria-label="Communities">
        {randomCommunity && (
          <Link
            href={`/home/community/${randomCommunity.id}`}
            className={`block truncate rounded-lg px-3 py-2 text-sm font-semibold transition ${activeCommunityId === randomCommunity.id ? 'bg-teal-50 text-teal-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'}`}
          >
            Random
          </Link>
        )}
        {communities.filter((community) => community.id !== randomCommunity?.id).map((community) => (
          <Link
            key={community.id}
            href={`/home/community/${community.id}`}
            className={`block truncate rounded-lg px-3 py-2 text-sm font-semibold transition ${activeCommunityId === community.id ? 'bg-teal-50 text-teal-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'}`}
          >
            {community.name}
          </Link>
        ))}
      </nav>
      <button
        type="button"
        onClick={() => {
          setMessage('')
          setIsModalOpen(true)
        }}
        className="mt-5 w-full border-t border-slate-100 pt-4 text-left text-sm font-semibold text-slate-950 transition"
      >
        <span className="flex items-center gap-2 rounded-lg bg-teal-400 px-3 py-3 hover:bg-teal-300">
          <span className="text-xl font-normal leading-none" aria-hidden="true">+</span>
          Add new community
        </span>
      </button>

      {isModalOpen && (
        <div
          className="fixed inset-0 z-1000 flex items-center justify-center bg-slate-950/60 px-5"
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
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 id="new-community-title" className="text-lg font-bold text-slate-950">Create a community</h3>
                <p className="mt-1 text-sm text-slate-500">Give your new space a name.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                aria-label="Close create community dialog"
                className="text-2xl leading-none text-slate-400 transition hover:text-slate-700"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleCreate} className="mt-5">
              <label className="block text-sm font-semibold text-slate-700" htmlFor="new-community">Community name</label>
              <input
                id="new-community"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Columbia Creatives"
                maxLength={50}
                autoFocus
                required
                className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
              />
              {message && <p className="mt-2 text-xs text-rose-600" role="status">{message}</p>}
              <div className="mt-5 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating || name.trim().length < 2}
                  className="rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isCreating ? 'Creating...' : 'Create community'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </aside>
  )
}