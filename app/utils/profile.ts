export interface UserProfile {
  id: string
  email: string | null
  first_name: string | null
  last_name: string | null
  avatar_url: string | null
}

interface AuthUser {
  id: string
  email?: string
  user_metadata?: Record<string, unknown>
  identities?: Array<{ provider?: string; identity_data?: Record<string, unknown> | null }>
}

function firstText(...values: unknown[]): string | null {
  return values.find((value): value is string => typeof value === 'string' && value.trim().length > 0)?.trim() ?? null
}

export function resolveUserProfile(user: AuthUser, saved: UserProfile | null): UserProfile {
  const google = user.identities?.find((identity) => identity.provider === 'google')
  const identity = google?.identity_data ?? {}
  const metadata = user.user_metadata ?? {}
  const name = firstText(identity.full_name, identity.name, metadata.full_name, metadata.name) ?? ''
  const [firstName, ...lastName] = name.split(/\s+/)

  return {
    id: user.id,
    email: saved?.email || user.email || null,
    first_name: firstText(saved?.first_name, metadata.first_name, identity.given_name, metadata.given_name, firstName),
    last_name: firstText(saved?.last_name, metadata.last_name, identity.family_name, metadata.family_name, lastName.join(' ')),
    // Saved photos include user uploads and must never be replaced during sign-in.
    // Only Google accounts get a provider photo; email accounts default to initials.
    avatar_url: firstText(saved?.avatar_url) ?? (google
      ? firstText(identity.picture, identity.avatar_url, metadata.picture, metadata.avatar_url)
      : null),
  }
}
