// Accept only Melon pages, never an external URL or another authentication route.
export function safeReturnPath(value: unknown): string {
  if (typeof value !== 'string' || !value.startsWith('/') || /[\\\u0000-\u0020]/.test(value)) return '/home'
  try {
    const url = new URL(value, 'https://melon.invalid')
    if (url.origin !== 'https://melon.invalid') return '/home'
    if (!/^\/(?:home(?:\/|$)|profile(?:\/|$)|settings(?:\/|$))/.test(url.pathname) && url.pathname !== '/') return '/home'
    return `${url.pathname}${url.search}${url.hash}`
  } catch { return '/home' }
}

export function signInHref(returnTo: string): string {
  return `/sign-in?next=${encodeURIComponent(safeReturnPath(returnTo))}`
}
