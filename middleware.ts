import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { getLegacyVenueProfileRedirect } from '@/lib/venue/routing'
import { userHasAdminSurfaceAccess } from '@/lib/auth/admin'
import { pathnameRequiresArtistAccount } from '@/lib/artist/protected-routes'

export async function middleware(request: NextRequest) {
  const { supabaseResponse, user, supabase } = await updateSession(request)
  const { pathname } = request.nextUrl

  const authRoutes = [
    '/login',
    '/auth/signin',
  ]

  const protectedRoutes = [
    '/dashboard',
    '/onboarding',
    '/profile',
    '/settings',
    '/events',
    '/messages',
    '/analytics',
    '/feed',
    '/music',
    '/connect',
    '/create',
    '/bookings',
    '/documents',
    '/projects',
    '/team',
    '/admin',
    '/artist',
    '/business',
    '/venue',
    '/debug',
    '/migrations',
  ]

  const productionBlockedPrefixes = ['/debug', '/migrations/sql']

  const isAuthRoute = authRoutes.includes(pathname)
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))
  const isRootRoute = pathname === '/'

  const isProduction = process.env.NODE_ENV === 'production'
  const isProductionBlockedRoute = productionBlockedPrefixes.some(prefix =>
    pathname.startsWith(prefix)
  )

  if (isProduction && isProductionBlockedRoute) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Root route should route users to their primary experience:
  // authenticated users -> dashboard, anonymous users -> login.
  if (isRootRoute) {
    if (user) {
      const redirectUrl = new URL('/dashboard', request.url)
      return NextResponse.redirect(redirectUrl)
    }
    // Anonymous users: marketing landing at `/` (aligned with demo.tourify.live); CTAs go to signup.
    return supabaseResponse
  }

  // Canonical public venue profiles now live under /venues/[slug].
  // Keep /venue/* reserved for authenticated venue account surfaces.
  const venueProfileRedirect = getLegacyVenueProfileRedirect(pathname)
  if (venueProfileRedirect) {
    const redirectUrl = new URL(venueProfileRedirect, request.url)
    return NextResponse.redirect(redirectUrl)
  }

  // Redirect authenticated users away from auth pages
  if (user && isAuthRoute) {
    const redirectUrl = new URL('/dashboard', request.url)
    return NextResponse.redirect(redirectUrl)
  }

  if (!user && isProtectedRoute) {
    const redirectUrl = new URL('/login', request.url)
    const targetPath = `${pathname}${request.nextUrl.search || ''}`
    redirectUrl.searchParams.set('redirectTo', targetPath)
    return NextResponse.redirect(redirectUrl)
  }

  if (user && (pathname.startsWith('/admin') || pathname.startsWith('/api/admin'))) {
    try {
      const hasAdminAccess = await userHasAdminSurfaceAccess(supabase as never, user.id)
      if (!hasAdminAccess) {
        if (pathname.startsWith('/api/')) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }
    } catch {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  // Block unauthenticated access to /api/admin routes entirely
  if (!user && pathname.startsWith('/api/admin')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (user && pathnameRequiresArtistAccount(pathname)) {
    try {
      const [{ data: artistProfile }, { data: accountProfile }] = await Promise.all([
        supabase.from('artist_profiles').select('id').eq('user_id', user.id).limit(1).maybeSingle(),
        supabase
          .from('profiles')
          .select('account_type')
          .eq('id', user.id)
          .limit(1)
          .maybeSingle(),
      ])

      const hasArtistSurface =
        Boolean(artistProfile?.id) || accountProfile?.account_type === 'artist'

      if (!hasArtistSurface) {
        const redirectUrl = new URL('/dashboard', request.url)
        redirectUrl.searchParams.set('error', 'artist-account-required')
        return NextResponse.redirect(redirectUrl)
      }
    } catch {
      // Allow through; pages may still gate UX
    }
  }

  // Handle legacy routes
  if (pathname === '/auth/signin' || pathname === '/signin') {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (pathname === '/auth/signup') {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Redirect /signup to /login
  if (pathname === '/signup') {
    const redirectUrl = new URL('/login', request.url)
    redirectUrl.searchParams.set('tab', 'signup')
    request.nextUrl.searchParams.forEach((value, key) => {
      if (key === 'tab') return
      redirectUrl.searchParams.set(key, value)
    })
    return NextResponse.redirect(redirectUrl)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|api/debug/|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}