import { MAX_APPEARANCE_BYTES } from './appearance'

// Keep multipart requests below Vercel's request limit while accepting 5 MB
// source photos. Small files retain their original encoding and transparency.
export async function preparePhoto(file: File, kind: 'avatar' | 'banner') {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('Choose a PNG, JPEG, or WebP photo.')
  if (file.size > MAX_APPEARANCE_BYTES) throw new Error('Photos must be 5 MB or smaller.')
  if (file.size <= 3 * 1024 * 1024) return file
  const bitmap = await createImageBitmap(file)
  try {
    const maxDimension = kind === 'avatar' ? 1024 : 2560
    const ratio = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(bitmap.width * ratio))
    canvas.height = Math.max(1, Math.round(bitmap.height * ratio))
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Unable to prepare your photo. Try a smaller file.')
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    for (const quality of [0.9, 0.75, 0.6]) {
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', quality))
      if (blob && blob.size <= 3 * 1024 * 1024) return new File([blob], 'photo.webp', { type: blob.type })
    }
    throw new Error('This photo is too large to save. Try a smaller photo.')
  } finally { bitmap.close() }
}
