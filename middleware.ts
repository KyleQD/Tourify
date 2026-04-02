import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request)
  const { pathname } = request.nextUrl

  console.log(`[Main Middleware] Processing: ${pathname}`)
  console.log(`[Main Middleware] User authenticated: ${!!user}`)
  console.log(`[Main Middleware] User ID: ${user?.id || 'none'}`)

  // Define route categories
  const publicRoutes = [
    '/login',
    '/auth/callback',
    '/auth/verification',
    '/forgot-password',
    '/reset-password',
    '/terms',
    '/privacy',
    '/auth-demo', // Add the demo page
    '/auth-test', // Add the test page
  ]

  const authRoutes = [
    '/login',
    '/auth/signin', // Keep for backward compatibility
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
    '/create',
    '/bookings',
    '/documents',
    '/projects',
    '/team',
    '/admin',
    '/artist',
    '/business',
    '/venue',
  ]

  const isPublicRoute = publicRoutes.includes(pathname)
  const isAuthRoute = authRoutes.includes(pathname)
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))
  const isRootRoute = pathname === '/'

  console.log(`[Main Middleware] Route type - Public: ${isPublicRoute}, Auth: ${isAuthRoute}, Protected: ${isProtectedRoute}, Root: ${isRootRoute}`)

  // Root route should route users to their primary experience:
  // authenticated users -> dashboard, anonymous users -> login.
  if (isRootRoute) {
    if (user) {
      console.log(`[Main Middleware] Authenticated user accessing root, redirecting to dashboard`)
      const redirectUrl = new URL('/dashboard', request.url)
      return NextResponse.redirect(redirectUrl)
    }

    console.log(`[Main Middleware] Unauthenticated user accessing root, redirecting to login`)
    const redirectUrl = new URL('/login', request.url)
    return NextResponse.redirect(redirectUrl)
  }

  // Redirect authenticated users away from auth pages
  if (user && isAuthRoute) {
    console.log(`[Main Middleware] Authenticated user accessing auth page, redirecting to dashboard`)
    const redirectUrl = new URL('/dashboard', request.url)
    return NextResponse.redirect(redirectUrl)
  }

  if (!user && isProtectedRoute) {
    console.log(`[Main Middleware] Unauthenticated request to protected route, redirecting to login`)
    const redirectUrl = new URL('/login', request.url)
    const targetPath = `${pathname}${request.nextUrl.search || ''}`
    redirectUrl.searchParams.set('redirectTo', targetPath)
    return NextResponse.redirect(redirectUrl)
  }

  // Handle legacy routes
  if (pathname === '/auth/signin' || pathname === '/signin') {
    console.log(`[Main Middleware] Legacy route redirect: ${pathname} -> /login`)
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (pathname === '/auth/signup') {
    console.log(`[Main Middleware] Legacy route redirect: ${pathname} -> /login`)
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Redirect /signup to /login
  if (pathname === '/signup') {
    console.log(`[Main Middleware] Redirecting /signup to /login`)
    return NextResponse.redirect(new URL('/login', request.url))
  }

  console.log(`[Main Middleware] Allowing access to: ${pathname}`)
  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}