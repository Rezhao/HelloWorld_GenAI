'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import type { ComponentProps } from 'react'
import { signInHref } from './utils/auth-return'

// Guest links capture the current query and fragment at click time, including
// comment pagination, without putting search-param hooks in every page's shell.
export default function AuthLink({ isSignedIn = false, href = '/sign-in', ...props }: Omit<ComponentProps<typeof Link>, 'href' | 'onClick'> & { href?: string; isSignedIn?: boolean }) {
  const pathname = usePathname()
  const router = useRouter()
  return <Link {...props} href={isSignedIn ? href : signInHref(pathname)} onClick={(event) => {
    if (isSignedIn || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    router.push(signInHref(window.location.pathname + window.location.search + window.location.hash))
  }} />
}
