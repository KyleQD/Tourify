'use client'

import dynamic from 'next/dynamic'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { JukeboxProvider } from '@/contexts/jukebox-context'
import { AchievementUnlockProvider } from '@/components/achievements/achievement-unlock-provider'
import { getAppChromeVisibility } from '@/lib/routing/app-chrome-visibility'

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
  const { hideRootNav, hidePlayer, isAdminRoute, isVenueRoute } =
    getAppChromeVisibility(pathname)

  return (
    <JukeboxProvider>
      <AchievementUnlockProvider>
        <div className="flex min-h-screen w-full min-w-0 flex-col overflow-x-clip">
          {!hideRootNav ? <Nav /> : null}
          <main className={`min-w-0 flex-1 ${isAdminRoute || isVenueRoute ? '' : 'pb-[var(--player-height,0px)]'}`}>
            {children}
          </main>
          {!hidePlayer ? (
            <>
              <PersistentPlayerBar />
              <FullPlayerView />
            </>
          ) : null}
        </div>
      </AchievementUnlockProvider>
    </JukeboxProvider>
  )
}
