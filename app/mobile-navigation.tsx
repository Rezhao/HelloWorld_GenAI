'use client'

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'

const MobileNavigationContext = createContext<{
  isOpen: boolean; openMenu: () => void; closeMenu: () => void
} | null>(null)

export function MobileNavigationProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const [state, setState] = useState({ pathname, open: false })
  // Reset during rendering when the route changes, so a drawer never carries
  // over to another page or reopens after navigating back.
  if (state.pathname !== pathname) setState({ pathname, open: false })
  const openMenu = useCallback(() => setState({ pathname, open: true }), [pathname])
  const closeMenu = useCallback(() => setState((current) => current.open ? { ...current, open: false } : current), [])
  const isOpen = state.pathname === pathname && state.open
  const value = useMemo(() => ({ isOpen, openMenu, closeMenu }), [isOpen, openMenu, closeMenu])
  return <MobileNavigationContext.Provider value={value}>{children}</MobileNavigationContext.Provider>
}

export function useMobileNavigation() {
  const value = useContext(MobileNavigationContext)
  if (!value) throw new Error('Mobile navigation must be inside its provider.')
  return value
}

export function MobileMenuButton() {
  const { isOpen, openMenu, closeMenu } = useMobileNavigation()
  return (
    <button type="button" onClick={isOpen ? closeMenu : openMenu} aria-label={isOpen ? 'Close navigation menu' : 'Open navigation menu'} aria-expanded={isOpen} aria-controls="mobile-community-menu" aria-haspopup="dialog" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-melon-heading transition hover:bg-melon-yellow hover:text-melon-pink lg:hidden">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="h-6 w-6" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
    </button>
  )
}
