import { createClient } from '@/lib/supabase/server'
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import type { User } from "@supabase/supabase-js"
import { buildSafeMobileRedirect } from "@/lib/auth/mobile-redirect"
import { getRequestPublicOrigin } from "@/lib/auth/request-public-origin"

function authCallbackLog(message: string, detail?: Record<string, unknown>) {
  if (process.env.NODE_ENV !== "development") return
  if (detail) console.log(`[Auth Callback] ${message}`, detail)
  else console.log(`[Auth Callback] ${message}`)
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const publicOrigin = getRequestPublicOrigin(request)
  const code = requestUrl.searchParams.get("code")
  const requestedRedirect =
    requestUrl.searchParams.get("redirect") ||
    requestUrl.searchParams.get("redirectTo") ||
    "/dashboard"
  const redirectTo = normalizeAuthCallbackRedirect(requestedRedirect)
  const mobileRedirectUri = requestUrl.searchParams.get("mobile_redirect_uri")
  const type = requestUrl.searchParams.get("type") || "verification"
  const authType = requestUrl.searchParams.get("authType") || "email"
  const emailConfirmed = requestUrl.searchParams.get("email_confirmed") === "true"

  authCallbackLog("Processing callback", {
    hasCode: Boolean(code),
    redirectTo,
    type,
    emailConfirmed,
    publicOrigin,
  })

  if (code) {
    try {
      authCallbackLog("Exchanging code for session")
      const supabase = await createClient()
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)

      if (error) {
        console.error(`[Auth Callback] Error exchanging code:`, error)
        return NextResponse.redirect(
          `${publicOrigin}/login?oauth_error=${encodeURIComponent(error.message)}&redirectTo=${encodeURIComponent(redirectTo)}`
        )
      }

      authCallbackLog("Session established", {
        userId: data?.session?.user?.id,
        expiresAt: data?.session?.expires_at,
      })
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
            `${publicOrigin}/onboarding?force=1&source=social&next=${encodeURIComponent(redirectTo)}`
          )
        return NextResponse.redirect(`${publicOrigin}${redirectTo}`)
      }

      if (emailConfirmed || type === "signup") {
        if (mobileRedirectUri)
          return NextResponse.redirect(
            buildSafeMobileRedirect(mobileRedirectUri, {
              success: "true",
              type,
            })
          )

        const confirmedUserEmail =
          data.session?.user?.email ?? data.user?.email ?? ""

        if (data.session?.user) {
          return NextResponse.redirect(`${publicOrigin}/dashboard?welcome=true`)
        }

        const emailQuery = confirmedUserEmail
          ? `&email=${encodeURIComponent(confirmedUserEmail)}`
          : ""
        return NextResponse.redirect(
          `${publicOrigin}/login?message=email_confirmed${emailQuery}`
        )
      }
    } catch (err) {
      console.error(`[Auth Callback] Exception during code exchange:`, err)
      return NextResponse.redirect(
        `${publicOrigin}/auth/verification?error=true&type=${encodeURIComponent(type)}&message=exchange_error`
      )
    }
  } else {
    authCallbackLog("No code in callback URL")
    const authErrorDescription =
      requestUrl.searchParams.get("error_description") || requestUrl.searchParams.get("error")
    if (authErrorDescription) {
      return NextResponse.redirect(
        `${publicOrigin}/login?oauth_error=${encodeURIComponent(authErrorDescription)}&redirectTo=${encodeURIComponent(redirectTo)}`
      )
    }
  }

  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()

    authCallbackLog("Final session check", {
      hasSession: Boolean(session),
      userId: session?.user?.id,
    })

    if (session && !code) {
      return NextResponse.redirect(`${publicOrigin}/dashboard`)
    }
  } catch (err) {
    console.error(`[Auth Callback] Error checking final session:`, err)
  }

  authCallbackLog("Default redirect", { redirectTo })
  if (mobileRedirectUri)
    return NextResponse.redirect(
      buildSafeMobileRedirect(mobileRedirectUri, {
        success: "true",
        next: redirectTo,
      })
    )

  return NextResponse.redirect(`${publicOrigin}${redirectTo}`)
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
