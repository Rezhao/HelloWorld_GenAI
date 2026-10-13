export interface Community {
  id: string
  name: string
  description: string
  visibility: 'public' | 'private'
  created_by: string
  created_at: string
  is_member: boolean
}

export function canReadCommunity(community: Community, userId: string) {
  return community.visibility === 'public' || community.created_by === userId || community.is_member
}

export function validateCommunity(name: string, description: string, visibility: string) {
  const normalizedName = name.trim().replace(/\s+/g, ' ')
  if (normalizedName.length < 2 || normalizedName.length > 50) throw new Error('Community names must be between 2 and 50 characters.')
  if (description.trim().length > 500) throw new Error('Descriptions must be 500 characters or fewer.')
  if (visibility !== 'public' && visibility !== 'private') throw new Error('Choose a public or private community.')
  return { name: normalizedName, description: description.trim(), visibility: visibility as 'public' | 'private' }
}
