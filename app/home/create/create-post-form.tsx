'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FormEvent, useEffect, useState } from 'react'
import { createGeneration } from '../../utils/server'
import { prepareImage } from './prepare-image'

export default function CreatePostForm({
  communities,
}: {
  communities: { id: string; name: string }[]
}) {
  const router = useRouter()
  const [communityId, setCommunityId] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [message, setMessage] = useState('')
  const destination = communityId ? `/home/community/${encodeURIComponent(communityId)}` : '/home'

  useEffect(() => {
    if (!previewUrl) return
    return () => URL.revokeObjectURL(previewUrl)
  }, [previewUrl])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isGenerating) return
    const formData = new FormData(event.currentTarget)
    setIsGenerating(true)
    setMessage('')
    try {
      if (!communities.some((community) => community.id === communityId)) {
        throw new Error('Choose a community for your post.')
      }
      if (!file) throw new Error('Choose an image before generating a caption.')
      formData.set('image', await prepareImage(file))
      await createGeneration(formData)
      router.push(destination)
      router.refresh()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to create your post. Try again.')
      setIsGenerating(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 rounded-3xl border border-melon-border border-t-4 border-t-melon-pink bg-white p-6 shadow-sm sm:p-8" aria-busy={isGenerating}>
      <fieldset disabled={isGenerating} className="min-w-0 space-y-6">
        <label className="block text-sm font-semibold text-melon-ink">
          Community
          <select name="communityId" required value={communityId} onChange={(event) => setCommunityId(event.target.value)} className="mt-2 block w-full rounded-xl border border-melon-border bg-white px-3 py-3 text-base text-melon-forest focus:border-melon-green focus:outline-none focus:ring-2 focus:ring-melon-mint">
            <option value="" disabled>Select community</option>
            {communities.map((community) => <option key={community.id} value={community.id}>{community.name}</option>)}
          </select>
        </label>
        {communities.length === 0 && <p className="text-sm text-melon-muted">No communities available for posting. Join a public community or request access to a private one. <Link href="/home" className="font-semibold text-melon-green-dark underline">Create a community from Melon</Link> to start posting.</p>}
        <div>
          <label className="block text-sm font-semibold text-melon-ink">
            Image
            <input name="image" type="file" accept="image/*" required aria-describedby="image-help" onChange={(event) => {
              const selected = event.target.files?.[0] ?? null
              if (selected && !selected.type.startsWith('image/')) {
                event.target.value = ''
                setFile(null)
                setPreviewUrl('')
                setMessage('Choose an image file.')
                return
              }
              setFile(selected)
              setPreviewUrl(selected ? URL.createObjectURL(selected) : '')
              setMessage('')
            }} className="mt-2 block w-full cursor-pointer rounded-xl border border-dashed border-melon-border bg-melon-cream p-4 text-sm text-melon-muted file:mr-3 file:rounded-lg file:border-0 file:bg-melon-mint file:px-3 file:py-2 file:font-semibold file:text-melon-green-dark hover:file:bg-melon-mint" />
          </label>
          <p id="image-help" className="mt-2 text-xs text-melon-muted">Images are optimized before upload. Maximum upload size: 10 MB.</p>
          {file && previewUrl && (
            <div className="mt-4 overflow-hidden rounded-xl border border-melon-border bg-melon-cream">
              {/* eslint-disable-next-line @next/next/no-img-element -- Local image preview before upload. */}
              <img src={previewUrl} alt="Preview of your post image" className="max-h-80 w-full object-contain" />
              <p className="truncate border-t border-melon-border px-4 py-3 text-xs text-melon-muted">{file.name}</p>
            </div>
          )}
        </div>
        <label className="block text-sm font-semibold text-melon-ink">
          Caption direction
          <textarea name="prompt" required minLength={5} maxLength={500} defaultValue="Write one short, clever caption that feels at home in a Columbia student's group chat." className="mt-2 min-h-32 w-full resize-y rounded-xl border border-melon-border px-4 py-3 text-base font-normal text-melon-forest focus:border-melon-green focus:outline-none focus:ring-2 focus:ring-melon-mint" />
          <span className="mt-2 block text-xs font-normal text-melon-muted">Tell AI the tone or idea you have in mind. 5–500 characters.</span>
        </label>
        <div className="border-t border-melon-border pt-5">
          <p className="text-sm leading-6 text-melon-muted">Your image and generated caption will be posted to the selected community.</p>
          <div className="mt-5 flex flex-wrap justify-end gap-3">
            <button type="button" onClick={() => router.push(destination)} className="rounded-full border border-melon-border px-5 py-2.5 text-sm font-semibold text-melon-ink transition hover:bg-melon-cream disabled:opacity-50">Cancel</button>
            <button type="submit" disabled={!communityId || !file || isGenerating} className="rounded-full bg-melon-pink px-5 py-2.5 text-sm font-semibold text-melon-yellow transition hover:bg-melon-yellow hover:text-melon-pink disabled:cursor-not-allowed disabled:opacity-50">{isGenerating ? 'Generating and posting…' : 'Generate caption & post'}</button>
          </div>
        </div>
      </fieldset>
      {isGenerating && <p role="status" className="mt-4 text-sm text-melon-green-dark">Creating your caption. You’ll be taken to your community when it’s posted.</p>}
      {message && <p role="alert" className="mt-4 text-sm text-melon-berry">{message}</p>}
    </form>
  )
}
