import { NextRequest, NextResponse } from "next/server"
import { buildSafeMobileRedirect } from "@/lib/auth/mobile-redirect"

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const mobileRedirectUri = requestUrl.searchParams.get("mobile_redirect_uri")
  const success = requestUrl.searchParams.get("success") === "true"
  const canceled = requestUrl.searchParams.get("canceled") === "true"
  const bookingId = requestUrl.searchParams.get("booking_id")
  const sessionId = requestUrl.searchParams.get("session_id")

  const redirectUrl = buildSafeMobileRedirect(mobileRedirectUri, {
    ...(success ? { payment_success: "true" } : {}),
    ...(canceled ? { payment_canceled: "true" } : {}),
    ...(bookingId ? { booking_id: bookingId } : {}),
    ...(sessionId ? { session_id: sessionId } : {}),
  })

  try {
    return NextResponse.redirect(redirectUrl)
  } catch (error) {
    // Some runtimes can reject custom deep-link schemes in redirect helpers.
    // Fall back to a raw redirect response so mobile callbacks never crash.
    if (/^tourify:\/\//i.test(redirectUrl)) {
      return new NextResponse(null, {
        status: 307,
        headers: {
          Location: redirectUrl,
          "Cache-Control": "no-store",
        },
      })
    }

    console.error("Mobile callback redirect failed:", error)
    return NextResponse.redirect(`${requestUrl.origin}/login?error=mobile_redirect_failed`)
  }
}
