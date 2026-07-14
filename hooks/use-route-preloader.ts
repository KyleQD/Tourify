import { useRouter } from 'next/navigation'
import { useCallback, useRef, useState } from 'react'

interface RoutePreloaderOptions {
  preloadDelay?: number
  retryAttempts?: number
  retryDelay?: number
}

interface PreloadResult {
  success: boolean
  route: string
  error?: Error
}

export function useRoutePreloader(options: RoutePreloaderOptions = {}) {
  const router = useRouter()
  const {
    preloadDelay = 100,
    retryAttempts = 3,
    retryDelay = 500
  } = options

  const [isPreloading, setIsPreloading] = useState(false)
  const [preloadedRoutes, setPreloadedRoutes] = useState<Set<string>>(new Set())
  const abortController = useRef<AbortController | null>(null)

  // Preload a single route with retry logic
  const preloadRoute = useCallback(async (route: string): Promise<PreloadResult> => {
    if (preloadedRoutes.has(route)) {
      return { success: true, route }
    }

    let lastError: Error | null = null

    for (let attempt = 0; attempt < retryAttempts; attempt++) {
      try {
        // Cancel previous preload if any
        if (abortController.current) {
          abortController.current.abort()
        }

        // Create new abort controller
        abortController.current = new AbortController()

        // Preload the route
        await router.prefetch(route)

        // Small delay to ensure chunks are loaded
        await new Promise(resolve => setTimeout(resolve, preloadDelay))

        // Check if operation was aborted
        if (abortController.current?.signal.aborted) {
          throw new Error('Preload aborted')
        }

        // Mark as preloaded
        setPreloadedRoutes(prev => new Set([...prev, route]))

        return { success: true, route }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown preload error')
        
        // Don't retry if aborted
        if (lastError.message === 'Preload aborted') {
          break
        }

        // Wait before retry
        if (attempt < retryAttempts - 1) {
          await new Promise(resolve => setTimeout(resolve, retryDelay))
        }
      }
    }

    return { success: false, route, error: lastError || new Error('Failed to preload route') }
  }, [router, preloadDelay, retryAttempts, retryDelay, preloadedRoutes])

  // Preload multiple routes
  const preloadRoutes = useCallback(async (routes: string[]): Promise<PreloadResult[]> => {
    setIsPreloading(true)
    
    try {
      const results = await Promise.allSettled(
        routes.map(route => preloadRoute(route))
      )

      return results.map((result, index) => {
        if (result.status === 'fulfilled') {
          return result.value
        } else {
          return {
            success: false,
            route: routes[index],
            error: result.reason instanceof Error ? result.reason : new Error('Unknown error')
          }
        }
      })
    } finally {
      setIsPreloading(false)
    }
  }, [preloadRoute])

  // Navigate with preloading
  const navigateWithPreload = useCallback(async (route: string): Promise<boolean> => {
    setIsPreloading(true)
    
    try {
      // First preload the route
      const preloadResult = await preloadRoute(route)
      
      if (!preloadResult.success) {
        console.warn('Failed to preload route, using fallback navigation:', preloadResult.error)
        // Use fallback navigation
        window.location.href = route
        return false
      }

      // Navigate using router
      router.push(route)
      return true
    } catch (error) {
      console.error('Navigation error:', error)
      // Fallback to hard navigation
      window.location.href = route
      return false
    } finally {
      setIsPreloading(false)
    }
  }, [router, preloadRoute])

  // Cancel preloading
  const cancelPreload = useCallback(() => {
    if (abortController.current) {
      abortController.current.abort()
      abortController.current = null
    }
    setIsPreloading(false)
  }, [])

  // Clear preloaded routes cache
  const clearPreloadedRoutes = useCallback(() => {
    setPreloadedRoutes(new Set())
  }, [])

  // Get account-specific routes for preloading
  const getAccountRoutes = useCallback((accountType: string): string[] => {
    const commonRoutes = ['/dashboard', '/news', '/community', '/search', '/create', '/profile', '/settings']
    
    switch (accountType) {
      case 'artist':
        return [...commonRoutes, '/artist', '/artist/events', '/artist/business', '/artist/content', '/artist/community']
      case 'venue':
        return [...commonRoutes, '/venue', '/venue/events', '/venue/analytics', '/venue/dashboard']
      case 'admin':
        return [...commonRoutes, '/admin/dashboard', '/admin/dashboard/tours', '/admin/dashboard/events']
      default:
        return commonRoutes
    }
  }, [])

  return {
    preloadRoute,
    preloadRoutes,
    navigateWithPreload,
    cancelPreload,
    clearPreloadedRoutes,
    getAccountRoutes,
    isPreloading,
    preloadedRoutes: Array.from(preloadedRoutes)
  }
} 
