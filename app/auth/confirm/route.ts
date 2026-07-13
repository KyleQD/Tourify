import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getRequestPublicOrigin } from "@/lib/auth/request-public-origin"
import type { EmailOtpType } from "@supabase/supabase-js"

const ALLOWED_OTP_TYPES = new Set<EmailOtpType>([
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
])

/**
 * Handles Supabase email links that use token_hash + type (non-PKCE templates).
 * PKCE confirmation links continue to use /auth/callback?code=...
 */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const publicOrigin = getRequestPublicOrigin(request)
  const tokenHash = requestUrl.searchParams.get("token_hash")
  const typeParam = requestUrl.searchParams.get("type") || "signup"
  const nextParam = requestUrl.searchParams.get("next") || requestUrl.searchParams.get("redirectTo")

  if (!tokenHash || !ALLOWED_OTP_TYPES.has(typeParam as EmailOtpType)) {
    return NextResponse.redirect(
      `${publicOrigin}/auth/verification?error=true&type=${encodeURIComponent(typeParam)}&message=invalid_token`
    )
  }

  const type = typeParam as EmailOtpType

  try {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    })

    if (error) {
      console.error("[Auth Confirm] verifyOtp failed:", error.message)
      return NextResponse.redirect(
        `${publicOrigin}/auth/verification?error=true&type=${encodeURIComponent(type)}&message=${encodeURIComponent(error.message)}`
      )
    }

    if (type === "recovery") {
      return NextResponse.redirect(`${publicOrigin}/reset-password`)
    }

    if (type === "signup" || type === "invite" || type === "email" || type === "email_change") {
      if (data.session?.user) {
        return NextResponse.redirect(`${publicOrigin}/dashboard?welcome=true`)
      }

      const email = data.user?.email
      const emailQuery = email ? `&email=${encodeURIComponent(email)}` : ""
      return NextResponse.redirect(
        `${publicOrigin}/login?message=email_confirmed${emailQuery}`
      )
    }

    const safeNext = normalizeConfirmRedirect(nextParam)
    return NextResponse.redirect(`${publicOrigin}${safeNext}`)
  } catch (err) {
    console.error("[Auth Confirm] Unexpected error:", err)
    return NextResponse.redirect(
      `${publicOrigin}/auth/verification?error=true&type=${encodeURIComponent(type)}&message=confirm_error`
    )
  }
}

function normalizeConfirmRedirect(target: string | null): string {
  if (!target || !target.startsWith("/")) return "/dashboard"
  if (target === "/" || target.startsWith("/login") || target.startsWith("/auth"))
    return "/dashboard"
  return target
}
