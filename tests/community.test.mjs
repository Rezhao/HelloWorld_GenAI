import assert from 'node:assert/strict'
import test from 'node:test'
import { canReadCommunity, validateCommunity } from '../app/utils/community.ts'

const community = { id: 'community', name: 'Columbia', description: '', visibility: 'private', created_by: 'owner', created_at: '', is_member: false }
test('public communities are readable before joining', () => assert.equal(canReadCommunity({ ...community, visibility: 'public' }, 'visitor'), true))
test('private communities hide posts from nonmembers, including pending applicants', () => assert.equal(canReadCommunity(community, 'visitor'), false))
test('private communities are readable by their owner and approved members', () => {
  assert.equal(canReadCommunity(community, 'owner'), true)
  assert.equal(canReadCommunity({ ...community, is_member: true }, 'member'), true)
})
test('community input normalizes names and descriptions', () => assert.deepEqual(validateCommunity('  Columbia   Creatives  ', '  Share your work.  ', 'private'), { name: 'Columbia Creatives', description: 'Share your work.', visibility: 'private' }))
test('invalid visibility and overlong content are rejected', () => {
  assert.throws(() => validateCommunity('Columbia', '', 'invalid'))
  assert.throws(() => validateCommunity('x', '', 'public'))
  assert.throws(() => validateCommunity('x'.repeat(51), '', 'public'))
  assert.throws(() => validateCommunity('Columbia', 'x'.repeat(501), 'public'))
})
