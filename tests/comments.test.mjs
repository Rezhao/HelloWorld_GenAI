import assert from 'node:assert/strict'
import test from 'node:test'
import { isPostId, validateComment } from '../app/utils/comments.ts'

test('comments trim surrounding whitespace while retaining content and line breaks', () => {
  assert.equal(validateComment('  Great caption!\nSecond line.  '), 'Great caption!\nSecond line.')
  assert.equal(validateComment('🎉 Love this'), '🎉 Love this')
})
test('empty comments and whitespace-only comments are rejected', () => {
  for (const value of ['', '   ', '\n\t', null, undefined, 42]) assert.throws(() => validateComment(value))
})
test('comment length is enforced at the 2,000-character boundary', () => {
  assert.equal(validateComment('a'.repeat(2000)).length, 2000)
  assert.throws(() => validateComment('a'.repeat(2001)))
})
test('post paths accept UUIDs and reject malformed or injected IDs', () => {
  assert.equal(isPostId('30000000-0000-0000-0000-000000000001'), true)
  for (const value of ['', '123', '../profile', '<script>', '30000000-0000-0000-0000-000000000001/other']) assert.equal(isPostId(value), false)
})
