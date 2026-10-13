export function isPostId(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
}

export function validateComment(body: string) {
  if (typeof body !== 'string' || !body.trim()) throw new Error('Write a comment before posting.')
  const normalized = body.trim()
  if (normalized.length > 2000) throw new Error('Comments must be 2,000 characters or fewer.')
  return normalized
}
