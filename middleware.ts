import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { getLegacyVenueProfileRedirect } from '@/lib/venue/routing'
import { userHasAdminSurfaceAccess } from '@/lib/auth/admin'
import { pathnameRequiresArtistAccount } from '@/lib/artist/protected-routes'
import { accountTypeMatchesSection } from '@/lib/navigation/account-dashboard-routes'
import { isPublicShareRoute } from '@/lib/routing/public-share-routes'
import { handleApiCorsPreflight, withApiCors } from '@/lib/api/cors'

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
  '/news',
  '/community',
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
  '/marketplace',
  '/groups',
  '/notifications',
  '/tickets',
  '/calendar',
  '/collaboration',
  '/contracts',
  '/friends',
  '/achievements',
  '/advance',
  '/epk',
  '/organization',
  '/orgs',
  '/jobs',
]

const productionBlockedPrefixes = [
  '/auth-test',
  '/debug',
  '/migrations',
  '/setup',
  '/admin/debug',
  '/admin/setup',
  '/admin/create-tables',
  '/api/debug',
  '/api/debug-auth',
  '/api/auth-debug',
  '/api/migrations',
  '/api/setup-storage',
  '/api/marketplace/migrations',
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isApiRoute = pathname.startsWith('/api/')
  const isAuthRoute = authRoutes.includes(pathname)
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))
  const isAnonymousPublicShareRoute = isPublicShareRoute(pathname)
  const isRootRoute = pathname === '/'
  const isAdminApiRoute = pathname.startsWith('/api/admin')

  const corsPreflight = handleApiCorsPreflight(request)
  if (corsPreflight) return corsPreflight

  const isProduction = process.env.NODE_ENV === 'production'
  const isProductionBlockedRoute = productionBlockedPrefixes.some(prefix =>
    pathname.startsWith(prefix)
  )

  if (isProduction && isProductionBlockedRoute) {
    return new NextResponse(null, { status: 404 })
  }

  if (pathname === '/News' || pathname.startsWith('/News/')) {
    const redirectUrl = new URL('/news', request.url)
    redirectUrl.search = request.nextUrl.search
    return NextResponse.redirect(redirectUrl)
  }

  // Canonical public venue profiles now live under /venues/[slug].
  // Keep /venue/* reserved for authenticated venue account surfaces.
  const venueProfileRedirect = getLegacyVenueProfileRedirect(pathname)
  if (venueProfileRedirect) {
    const redirectUrl = new URL(venueProfileRedirect, request.url)
    return NextResponse.redirect(redirectUrl)
  }

  // Public routes can pass through without touching Supabase auth on the hot path.
  const requiresSession =
    isRootRoute ||
    isAuthRoute ||
    isAdminApiRoute ||
    (isProtectedRoute && !isAnonymousPublicShareRoute) ||
    pathnameRequiresArtistAccount(pathname)

  if (!requiresSession) {
    const response = NextResponse.next()
    return isApiRoute ? withApiCors(request, response) : response
  }

  const { supabaseResponse, user, supabase } = await updateSession(request)

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

  // Redirect authenticated users away from auth pages
  if (user && isAuthRoute) {
    const redirectUrl = new URL('/dashboard', request.url)
    return NextResponse.redirect(redirectUrl)
  }

  if (!user && isProtectedRoute && !isAnonymousPublicShareRoute) {
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
          return withApiCors(
            request,
            NextResponse.json({ error: 'Forbidden', code: 'forbidden' }, { status: 403 })
          )
        }
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }
    } catch {
      if (pathname.startsWith('/api/')) {
        return withApiCors(
          request,
          NextResponse.json({ error: 'Forbidden', code: 'forbidden' }, { status: 403 })
        )
      }
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  // Block unauthenticated access to /api/admin routes entirely
  if (!user && pathname.startsWith('/api/admin')) {
    return withApiCors(
      request,
      NextResponse.json({ error: 'Unauthorized', code: 'unauthorized' }, { status: 401 })
    )
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

      // Align with getCompatibleAccountTypesForSection('artist') → artist | service
      const hasArtistSurface =
        Boolean(artistProfile?.id) ||
        accountTypeMatchesSection(accountProfile?.account_type, 'artist')

      if (!hasArtistSurface) {
        const redirectUrl = new URL('/dashboard', request.url)
        redirectUrl.searchParams.set('error', 'artist-account-required')
        return NextResponse.redirect(redirectUrl)
      }
    } catch {
      // Fail closed: do not grant artist surfaces when the gate cannot be evaluated.
      const redirectUrl = new URL('/dashboard', request.url)
      redirectUrl.searchParams.set('error', 'artist-account-required')
      return NextResponse.redirect(redirectUrl)
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

  return isApiRoute ? withApiCors(request, supabaseResponse) : supabaseResponse
}

export const config = {
  matcher: [
    // Include api/debug so productionBlockedPrefixes can 404 those routes.
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
