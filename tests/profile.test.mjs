import assert from 'node:assert/strict'
import test from 'node:test'
import { resolveUserProfile } from '../app/utils/profile.ts'

const googleUser = {
  id: 'google-user',
  email: 'student@example.com',
  user_metadata: { full_name: 'Rebecca Zhang', avatar_url: 'https://example.com/metadata-photo.jpg' },
  identities: [{ provider: 'google', identity_data: { picture: 'https://example.com/google-photo.jpg' } }],
}

test('Google sign-in defaults to the photo from the Google identity', () => {
  const profile = resolveUserProfile(googleUser, null)
  assert.equal(profile.avatar_url, 'https://example.com/google-photo.jpg')
  assert.equal(profile.first_name, 'Rebecca')
  assert.equal(profile.last_name, 'Zhang')
})

test('Google sign-in falls back to provider metadata when identity has no photo', () => {
  const profile = resolveUserProfile({ ...googleUser, identities: [{ provider: 'google' }] }, null)
  assert.equal(profile.avatar_url, googleUser.user_metadata.avatar_url)
})

test('custom uploads survive subsequent Google sign-ins and profile reads', () => {
  const saved = { ...resolveUserProfile(googleUser, null), avatar_url: 'https://example.com/uploads/custom.jpg' }
  assert.equal(resolveUserProfile(googleUser, saved).avatar_url, saved.avatar_url)
  const updated = { ...saved, avatar_url: 'https://example.com/uploads/new.jpg' }
  assert.equal(resolveUserProfile(googleUser, updated).avatar_url, updated.avatar_url)
})

test('email sign-in uses name fields for initials and has no provider photo', () => {
  const user = {
    id: 'email-user',
    user_metadata: { first_name: 'Rebecca', last_name: 'Zhang', avatar_url: 'https://example.com/unrelated.jpg' },
    identities: [{ provider: 'email' }],
  }
  const profile = resolveUserProfile(user, null)
  assert.equal(profile.avatar_url, null)
  assert.equal(profile.first_name, 'Rebecca')
  assert.equal(profile.last_name, 'Zhang')
  const saved = { ...profile, avatar_url: 'https://example.com/uploads/email-user.jpg' }
  assert.equal(resolveUserProfile(user, saved).avatar_url, saved.avatar_url)
})

test('saved profile names survive provider metadata changes', () => {
  const saved = { ...resolveUserProfile(googleUser, null), first_name: 'Becca', last_name: 'Z' }
  const profile = resolveUserProfile(googleUser, saved)
  assert.equal(profile.first_name, 'Becca')
  assert.equal(profile.last_name, 'Z')
})

test('missing Google photo and blank saved values safely fall back', () => {
  const user = { id: 'no-photo', identities: [{ provider: 'google' }] }
  const saved = { id: user.id, email: null, first_name: null, last_name: null, avatar_url: '   ' }
  assert.equal(resolveUserProfile(user, saved).avatar_url, null)
})
