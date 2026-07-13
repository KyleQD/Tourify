'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'

/**
 * Dev / opt-in navigation performance marks for Phase 1 baselines.
 * Enable in production with NEXT_PUBLIC_PERF_MARKS=1.
 */
export function NavigationPerfMarks() {
  const pathname = usePathname()
  const prevPathRef = useRef<string | null>(null)
  const enabled =
    process.env.NODE_ENV !== 'production' ||
    process.env.NEXT_PUBLIC_PERF_MARKS === '1'

  useEffect(() => {
    if (!enabled || typeof performance === 'undefined') return

    const prev = prevPathRef.current
    prevPathRef.current = pathname

    if (prev && prev !== pathname) {
      const markName = `route_content_ready:${pathname}`
      try {
        performance.mark(markName)
        performance.measure(
          `route_transition:${prev}->${pathname}`,
          `route_change_start:${prev}`,
          markName
        )
      } catch {
        // Missing start mark on first transition is expected
      }
    }

    try {
      performance.mark(`route_change_start:${pathname}`)
    } catch {
      // ignore
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log('[perf:nav]', { pathname, from: prev })
    }
  }, [pathname, enabled])

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return

    function onLoginSubmit() {
      try {
        performance.mark('login_submit')
      } catch {
        // ignore
      }
    }

    window.addEventListener('tourify:login_submit', onLoginSubmit)
    return () => window.removeEventListener('tourify:login_submit', onLoginSubmit)
  }, [enabled])

  useEffect(() => {
    if (!enabled || typeof performance === 'undefined') return
    if (!pathname.startsWith('/dashboard') && !pathname.startsWith('/admin/dashboard'))
      return

    try {
      performance.mark('dashboard_interactive')
      performance.measure('login_to_dashboard', 'login_submit', 'dashboard_interactive')
    } catch {
      // login_submit may not exist for non-login navigations
    }
  }, [pathname, enabled])

  return null
}
