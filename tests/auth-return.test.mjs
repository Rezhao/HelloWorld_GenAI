import assert from 'node:assert/strict'
import test from 'node:test'
import { safeReturnPath, signInHref } from '../app/utils/auth-return.ts'

test('preserves Melon pages, search parameters, and comment anchors through sign-in URLs', () => {
  for (const path of ['/home', '/home/explore', '/home/post/123?page=2#comments', '/home/community/abc', '/home/create?community=abc', '/profile', '/settings']) {
    const login = new URL(signInHref(path), 'https://melon.test')
    assert.equal(safeReturnPath(login.searchParams.get('next')), path)
    const callback = new URL('/auth/callback', 'https://melon.test')
    callback.searchParams.set('next', safeReturnPath(login.searchParams.get('next')))
    assert.equal(safeReturnPath(callback.searchParams.get('next')), path)
  }
})

test('rejects external redirects, auth loops, malformed values, and URL normalization tricks', () => {
  for (const path of [null, undefined, ['//evil.test'], '', 'https://evil.test', '//evil.test/home', '/\\evil.test', '/\nevil.test', 'javascript:alert(1)', '/sign-in?next=/home', '/auth/callback', '/home/../sign-in', '/%2f%2fevil.test', '/home\r\nLocation:evil']) {
    assert.equal(safeReturnPath(path), '/home', String(path))
  }
})
