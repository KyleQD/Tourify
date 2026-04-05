import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import type { User } from "@supabase/supabase-js"
import { buildSafeMobileRedirect } from "@/lib/auth/mobile-redirect"

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  // Get the redirect parameter if it exists
  const requestedRedirect =
    requestUrl.searchParams.get("redirect") ||
    requestUrl.searchParams.get("redirectTo") ||
    "/dashboard"
  const redirectTo = normalizeAuthCallbackRedirect(requestedRedirect)
  const mobileRedirectUri = requestUrl.searchParams.get("mobile_redirect_uri")
  // Check if this is from a signup flow
  const type = requestUrl.searchParams.get("type") || "verification"
  const authType = requestUrl.searchParams.get("authType") || "email"
  // Check if email was confirmed
  const emailConfirmed = requestUrl.searchParams.get("email_confirmed") === "true"
  
  console.log(`[Auth Callback] Processing callback with code: ${code ? 'exists' : 'missing'}, redirect: ${redirectTo}, type: ${type}, email_confirmed: ${emailConfirmed}`)
  console.log(`[Auth Callback] Full URL: ${request.url}`)

  if (code) {
    try {
      console.log(`[Auth Callback] Exchanging code for session`)
      const cookieStore = cookies()
      const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
      
      // Exchange the auth code for a session
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)
      
      if (error) {
        console.error(`[Auth Callback] Error exchanging code:`, error)
        return NextResponse.redirect(
          `${requestUrl.origin}/login?oauth_error=${encodeURIComponent(error.message)}&redirectTo=${encodeURIComponent(redirectTo)}`
        )
      } else {
        console.log(`[Auth Callback] Session established for user: ${data?.session?.user?.id || 'unknown'}`)
        console.log(`[Auth Callback] Session token expires at: ${data?.session?.expires_at ? new Date(data.session.expires_at * 1000).toISOString() : 'unknown'}`)
        const sessionUser = data?.session?.user

        if (authType === "social" && sessionUser) {
          if (mobileRedirectUri)
            return NextResponse.redirect(
              buildSafeMobileRedirect(mobileRedirectUri, {
                success: "true",
                next: redirectTo,
              })
            )
          if (needsSocialAccountSetup(sessionUser))
            return NextResponse.redirect(
              `${requestUrl.origin}/onboarding?force=1&source=social&next=${encodeURIComponent(redirectTo)}`
            )
          return NextResponse.redirect(`${requestUrl.origin}${redirectTo}`)
        }
        
        // For email verification flows, redirect to login page for sign in
        if (emailConfirmed || type === "signup") {
          if (mobileRedirectUri)
            return NextResponse.redirect(
              buildSafeMobileRedirect(mobileRedirectUri, {
                success: "true",
                type,
              })
            )
          console.log(`[Auth Callback] Email confirmed, checking if user is authenticated`)
          
          // Check if user is already authenticated (some email confirmations auto-sign-in)
          if (data?.session?.user) {
            console.log(`[Auth Callback] User is authenticated after email confirmation, redirecting to dashboard`)
            return NextResponse.redirect(`${requestUrl.origin}/dashboard?welcome=true`)
          } else {
            console.log(`[Auth Callback] User needs to sign in, redirecting to login page`)
            return NextResponse.redirect(`${requestUrl.origin}/login?message=email_confirmed&email=${encodeURIComponent(data?.session?.user?.email || '')}`)
          }
        }
        
        // If this is from signup flow, redirect to login page
        if (type === "signup") {
          console.log(`[Auth Callback] Signup flow completed, redirecting to login page`)
          return NextResponse.redirect(`${requestUrl.origin}/login?message=account_created&email=${encodeURIComponent(data?.session?.user?.email || '')}`)
        }
      }
    } catch (err) {
      console.error(`[Auth Callback] Exception during code exchange:`, err)
      // If there's an exception, redirect to verification page with error state
      return NextResponse.redirect(`${requestUrl.origin}/auth/verification?error=true&type=${type}&message=exchange_error`)
    }
  } else {
    console.log(`[Auth Callback] No code provided in request`)
    const authErrorDescription =
      requestUrl.searchParams.get("error_description") || requestUrl.searchParams.get("error")
    if (authErrorDescription) {
      return NextResponse.redirect(
        `${requestUrl.origin}/login?oauth_error=${encodeURIComponent(authErrorDescription)}&redirectTo=${encodeURIComponent(redirectTo)}`
      )
    }
  }

  // Check if we have a session now
  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    const { data: { session } } = await supabase.auth.getSession()
    
    console.log(`[Auth Callback] Final session check - Session exists: ${!!session}, User ID: ${session?.user?.id || 'none'}`)
    
    // If we have a session but no code was provided, this might be a direct navigation
    if (session && !code) {
      console.log(`[Auth Callback] Session exists but no code - redirecting to dashboard`)
      // Avoid obsolete onboarding route
      return NextResponse.redirect(`${requestUrl.origin}/dashboard`)
    }
  } catch (err) {
    console.error(`[Auth Callback] Error checking final session:`, err)
  }

  // URL to redirect to after sign in process completes - use the redirect parameter if provided
  console.log(`[Auth Callback] Redirecting to: ${requestUrl.origin}${redirectTo}`)
  if (mobileRedirectUri)
    return NextResponse.redirect(
      buildSafeMobileRedirect(mobileRedirectUri, {
        success: "true",
        next: redirectTo,
      })
    )

  return NextResponse.redirect(`${requestUrl.origin}${redirectTo}`)
}

function normalizeAuthCallbackRedirect(target: string): string {
  if (!target.startsWith('/')) return '/dashboard'
  if (target === '/' || target.startsWith('/login') || target.startsWith('/auth')) return '/dashboard'
  return target
}

function needsSocialAccountSetup(user: User): boolean {
  const metadata = user.user_metadata || {}
  const fullName = metadata.full_name || metadata.name || metadata.display_name
  const username = metadata.username || metadata.user_name || metadata.preferred_username
  return !fullName || !username
}

