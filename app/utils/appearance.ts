export const APPEARANCE_BUCKET = 'appearance-images'
export const MAX_APPEARANCE_BYTES = 5 * 1024 * 1024

export function appearanceTarget(target: string, kind: string, communityId?: string | null) {
  if (target === 'profile' && kind === 'banner') return { target, kind, communityId: null } as const
  if (target === 'community' && (kind === 'avatar' || kind === 'banner') && typeof communityId === 'string'
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(communityId)) {
    return { target, kind, communityId } as const
  }
  throw new Error('Choose a valid photo type and community.')
}

export async function validateAppearanceImage(file: unknown) {
  if (!(file instanceof File) || file.size === 0) throw new Error('Choose a photo to upload.')
  if (file.size > MAX_APPEARANCE_BYTES) throw new Error('Photos must be 5 MB or smaller.')
  const bytes = new Uint8Array(await file.arrayBuffer())
  let contentType: string
  let extension: string
  if (bytes.length >= 8 && [137,80,78,71,13,10,26,10].every((value,index) => bytes[index] === value)) {
    contentType = 'image/png'; extension = 'png'
  } else if (bytes.length >= 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) {
    contentType = 'image/jpeg'; extension = 'jpg'
  } else if (bytes.length >= 12 && String.fromCharCode(...bytes.slice(0,4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8,12)) === 'WEBP') {
    contentType = 'image/webp'; extension = 'webp'
  } else throw new Error('Choose a PNG, JPEG, or WebP photo.')
  return { bytes, contentType, extension }
}
