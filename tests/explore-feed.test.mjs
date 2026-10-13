import assert from 'node:assert/strict'
import test from 'node:test'
import { buildExploreFeed } from '../app/utils/explore-feed.ts'

const posts = [
  ...Array.from({ length: 8 }, (_, i) => ({ id: `a-${i}`, community_id: 'a' })),
  { id: 'b-1', community_id: 'b' },
  { id: 'c-1', community_id: 'c' },
  { id: 'private-1', community_id: 'private' },
  { id: 'legacy-1', community_id: null },
]

test('Home excludes private and unassigned posts', () => {
  const feed = buildExploreFeed(posts, ['a', 'b', 'c'])
  assert.equal(feed.length, 10)
  assert.ok(feed.every((post) => ['a', 'b', 'c'].includes(post.community_id)))
})

test('each available community appears before a busy community repeats', () => {
  const feed = buildExploreFeed(posts, ['a', 'b', 'c'], 3, () => 0.5)
  assert.equal(new Set(feed.map((post) => post.community_id)).size, 3)
})

test('shuffling preserves posts without duplication or changing the input', () => {
  const original = structuredClone(posts)
  const feed = buildExploreFeed(posts, ['a', 'b', 'c'])
  assert.equal(new Set(feed.map((post) => post.id)).size, feed.length)
  assert.deepEqual(posts, original)
})

test('different random draws produce different feed orders', () => {
  const first = buildExploreFeed(posts, ['a', 'b', 'c'], 100, () => 0)
  const second = buildExploreFeed(posts, ['a', 'b', 'c'], 100, () => 0.99)
  assert.notDeepEqual(first.map((post) => post.id), second.map((post) => post.id))
})

test('empty public communities and feed limits are handled', () => {
  assert.deepEqual(buildExploreFeed(posts, []), [])
  assert.deepEqual(buildExploreFeed([], ['a']), [])
  assert.equal(buildExploreFeed(posts, ['a', 'b', 'c'], 4).length, 4)
  assert.deepEqual(buildExploreFeed(posts, ['a'], 0), [])
})
