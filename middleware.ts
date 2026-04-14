import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { getLegacyVenueProfileRedirect } from '@/lib/venue/routing'

export async function middleware(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request)
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

  if (user && pathname.startsWith('/admin')) {
    try {
      const { createClient } = await import('@/lib/supabase/server')
      const supabase = await createClient()
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, account_type, account_settings')
        .eq('id', user.id)
        .single()

      const hasAdminRole = profile?.role === 'admin' || profile?.account_type === 'admin'
      const hasOrganizerAccounts =
        Array.isArray(profile?.account_settings?.organizer_accounts) &&
        profile.account_settings.organizer_accounts.length > 0
      const hasLegacyOrganizerData =
        !!profile?.account_settings?.organizer_data?.organization_name

      if (!hasAdminRole && !hasOrganizerAccounts && !hasLegacyOrganizerData) {
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }
    } catch {
      // On error, allow through -- individual API routes have their own guards
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