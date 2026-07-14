'use client'

import { usePathname } from 'next/navigation'
import { useMemo } from 'react'

export interface RouteAccountContext {
  accountType: 'primary' | 'artist' | 'venue' | 'business' | 'admin'
  routeContext: string
  displayContext: string
}

/**
 * Hook to detect the current route and return the appropriate account context
 * for posting. This enables route-based multi-account posting where:
 * - /community → Primary account
 * - /artist/feed → Artist account  
 * - /venue/feed → Venue account
 * - /business/feed → Business account
 * - /admin/feed → Admin account
 */
export function useRouteAccountContext(): RouteAccountContext {
  const pathname = usePathname()
  
  const accountContext = useMemo((): RouteAccountContext => {
    // Determine account type based on current route
    if (pathname.includes('/artist/') || pathname.includes('artist')) {
      return {
        accountType: 'artist',
        routeContext: pathname,
        displayContext: 'Artist Account'
      }
    } else if (pathname.includes('/venue/') || pathname.includes('venue')) {
      return {
        accountType: 'venue',
        routeContext: pathname,
        displayContext: 'Venue Account'
      }
    } else if (pathname.includes('/business/') || pathname.includes('business')) {
      return {
        accountType: 'business',
        routeContext: pathname,
        displayContext: 'Business Account'
      }
    } else if (pathname.includes('/admin/') || pathname.includes('admin')) {
      return {
        accountType: 'admin',
        routeContext: pathname,
        displayContext: 'Admin Account'
      }
    } else {
      return {
        accountType: 'primary',
        routeContext: pathname,
        displayContext: 'Primary Account'
      }
    }
  }, [pathname])

  return accountContext
}

/**
 * Helper function to get account type from any route string
 */
export function getAccountTypeFromRoute(route: string): RouteAccountContext['accountType'] {
  if (route.includes('/artist/') || route.includes('artist')) {
    return 'artist'
  } else if (route.includes('/venue/') || route.includes('venue')) {
    return 'venue'
  } else if (route.includes('/business/') || route.includes('business')) {
    return 'business'
  } else if (route.includes('/admin/') || route.includes('admin')) {
    return 'admin'
  } else {
    return 'primary'
  }
} 
