'use client'

import { FormEvent, useState } from 'react'
import { createGeneration, deleteGeneration, voteOnGeneration } from '../utils/server'

export interface Generation {
  id: string
  user_id: string
  image_path: string
  prompt: string
  caption: string
  created_at: string
}

interface DisplayGeneration extends Generation {
  image_url: string
  score: number
  user_vote: -1 | 0 | 1
}

async function prepareImage(file: File) {
  const image = new Image()
  const objectUrl = URL.createObjectURL(file)

  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve()
      image.onerror = () => reject(new Error('The selected image could not be read.'))
      image.src = objectUrl
    })

    const maxDimension = 1600
    const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale))
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))
    canvas.getContext('2d')?.drawImage(image, 0, 0, canvas.width, canvas.height)

    const compressed = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', 0.82)
    })

    if (!compressed || compressed.size >= file.size) return file
    return new File([compressed], `${file.name.replace(/\.[^.]+$/, '')}.jpg`, { type: 'image/jpeg' })
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

export default function HomeWorkspace({
  generations,
  userId,
}: {
  generations: DisplayGeneration[]
  userId: string
}) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [message, setMessage] = useState('')
  const [selectedFileName, setSelectedFileName] = useState('')

  async function handleGenerate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    setIsGenerating(true)
    setMessage('')

    try {
      const formData = new FormData(form)
      const image = formData.get('image')
      if (image instanceof File && image.size > 0) {
        formData.set('image', await prepareImage(image))
      }
      await createGeneration(formData)
      form.reset()
      setSelectedFileName('')
      setMessage('Caption created. It is now in the vote.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to create a caption.')
    } finally {
      setIsGenerating(false)
    }
  }

  async function handleVote(id: string, vote: 1 | -1) {
    try {
      await voteOnGeneration(id, vote)
      window.location.reload()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to save your vote.')
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Delete this post and its image?')) return

    try {
      await deleteGeneration(id)
      window.location.reload()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to delete the post.')
    }
  }

  return (
    <div className="mt-12 grid gap-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:items-start">
      <form onSubmit={handleGenerate} className="rounded-3xl bg-slate-950 p-6 text-white shadow-xl shadow-slate-900/10 sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-300">New generation</p>
        <h2 className="mt-3 text-2xl font-bold">Give your camera roll a point of view.</h2>
        <label className="mt-7 block text-sm font-semibold text-slate-200">
          Image
          <input
            name="image"
            type="file"
            accept="image/*"
            required
            onChange={(event) => setSelectedFileName(event.target.files?.[0]?.name ?? '')}
            className="mt-2 block w-full cursor-pointer rounded-xl border border-slate-700 bg-slate-900 p-3 text-sm text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-teal-400 file:px-3 file:py-2 file:font-semibold file:text-slate-950 hover:file:bg-teal-300"
          />
          {selectedFileName && <span className="mt-2 block truncate text-xs text-slate-400">{selectedFileName}</span>}
        </label>
        <label className="mt-5 block text-sm font-semibold text-slate-200">
          Caption direction
          <textarea
            name="prompt"
            required
            minLength={5}
            maxLength={500}
            defaultValue="Write one short, clever caption that feels at home in a Columbia student's group chat."
            className="mt-2 min-h-28 w-full resize-y rounded-xl border border-slate-700 bg-slate-900 px-3 py-3 text-sm font-normal text-white outline-none transition placeholder:text-slate-500 focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20"
          />
        </label>
        <button
          type="submit"
          disabled={isGenerating}
          className="mt-6 w-full rounded-xl bg-teal-400 px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-teal-300 disabled:cursor-wait disabled:opacity-60"
        >
          {isGenerating ? 'Asking Gemini...' : 'Generate caption'}
        </button>
        {message && <p className="mt-4 text-sm text-teal-200" role="status">{message}</p>}
      </form>

      <section aria-labelledby="vote-heading">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-600">Community queue</p>
            <h2 id="vote-heading" className="mt-2 text-2xl font-bold text-slate-950">Does it land?</h2>
          </div>
          <span className="text-sm text-slate-500">{generations.length} {generations.length === 1 ? 'submission' : 'submissions'}</span>
        </div>
        {generations.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
            The queue is waiting for its first image.
          </div>
        ) : (
          <div className="mt-6 space-y-5">
            {generations.map((generation) => (
              <article key={generation.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                {generation.image_url && <img src={generation.image_url} alt="User submission" className="aspect-16/10 w-full object-cover" />}
                <div className="p-5">
                  <p className="text-lg font-semibold leading-7 text-slate-950">“{generation.caption}”</p>
                  <p className="mt-3 text-xs leading-5 text-slate-500">Prompt: {generation.prompt}</p>
                  <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-slate-600">Score: {generation.score}</span>
                      {generation.user_id === userId && (
                        <button
                          type="button"
                          onClick={() => void handleDelete(generation.id)}
                          className="text-sm font-semibold text-rose-600 transition hover:text-rose-800"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => void handleVote(generation.id, 1)} aria-label="Upvote caption" className={`rounded-lg border px-3 py-2 text-sm font-bold transition ${generation.user_vote === 1 ? 'border-teal-600 bg-teal-50 text-teal-700' : 'border-slate-200 text-slate-600 hover:border-teal-400 hover:text-teal-700'}`}>Upvote</button>
                      <button type="button" onClick={() => void handleVote(generation.id, -1)} aria-label="Downvote caption" className={`rounded-lg border px-3 py-2 text-sm font-bold transition ${generation.user_vote === -1 ? 'border-rose-500 bg-rose-50 text-rose-700' : 'border-slate-200 text-slate-600 hover:border-rose-300 hover:text-rose-700'}`}>Downvote</button>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}