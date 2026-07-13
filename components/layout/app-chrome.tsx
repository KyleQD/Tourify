'use client'

import dynamic from 'next/dynamic'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { JukeboxProvider } from '@/contexts/jukebox-context'

const Nav = dynamic(() => import('@/components/nav').then((mod) => ({ default: mod.Nav })))
const PersistentPlayerBar = dynamic(() =>
  import('@/components/jukebox/persistent-player-bar').then((mod) => ({ default: mod.PersistentPlayerBar }))
)
const FullPlayerView = dynamic(() =>
  import('@/components/jukebox/full-player-view').then((mod) => ({ default: mod.FullPlayerView }))
)

interface AppChromeProps {
  children: ReactNode
}

/**
 * Route-aware chrome with a stable provider tree.
 * Keep JukeboxProvider mounted across /dashboard ↔ /admin soft navigations
 * so App Router RSC fetches are not raced by provider remounts.
 * Only Nav / player UI visibility changes by route.
 * Global Nav stays visible on /admin/* (matches artist/venue) — only auth routes hide it.
 */
export function AppChrome({ children }: AppChromeProps) {
  const pathname = usePathname() || ''
  const isAdminRoute = pathname.startsWith('/admin')
  const hideRootNav =
    pathname.startsWith('/auth') ||
    pathname.startsWith('/login')

  return (
    <JukeboxProvider>
      <div className="flex min-h-screen flex-col">
        {!hideRootNav ? <Nav /> : null}
        <main className={`flex-1 ${isAdminRoute ? '' : 'pb-[var(--player-height,0px)]'}`}>
          {children}
        </main>
        {!isAdminRoute ? (
          <>
            <PersistentPlayerBar />
            <FullPlayerView />
          </>
        ) : null}
      </div>
    </JukeboxProvider>
  )
}
