import { NextRequest, NextResponse } from "next/server"
import { randomBytes } from "crypto"
import { createClient } from "@/lib/supabase/server"
import { createSignedOAuthState } from "@/lib/admin/content-hub/oauth-state"
import { isKnownProvider } from "@/lib/integrations/provider-catalog"

/**
 * VEN-268 — OAuth start with signed, expiring, user-bound state and real
 * PKCE S256 for Twitter. Session required: the state binds to the initiating
 * actor, so callbacks cannot be completed by a different user.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  const user = userData?.user
  if (!user) {
    return NextResponse.redirect(new URL("/login?next=/settings/integrations", request.url))
  }

  const params = new URL(request.url).searchParams
  const provider = params.get("provider") || params.get("platform") || ""
  if (!isKnownProvider(provider)) {
    return NextResponse.json({ error: "Unknown provider" }, { status: 400 })
  }

  // PKCE verifier travels inside the signed state; only this server reads it.
  const codeVerifier = randomBytes(32).toString("base64url")
  const { state, codeChallenge } = createSignedOAuthState({
    userId: user.id,
    platform: provider,
    codeVerifier,
    ...(params.get("scope") === "organization" ? { scope: "organization" as const } : {}),
    ...(params.get("return_to") === "admin" ? { returnTo: "admin" as const } : {}),
    ...(params.get("organizer_account_id") ? { organizerAccountId: params.get("organizer_account_id")! } : {}),
    ...(params.get("ops_org_id") ? { opsOrgId: params.get("ops_org_id")! } : {}),
  })

  let authUrl: URL | null = null
  const origin = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin
  const redirectUri = `${new URL(request.url).origin}/api/social/oauth/callback`

  if (provider === "instagram" || provider === "facebook") {
    const appId = process.env.FACEBOOK_APP_ID
    if (!appId) return NextResponse.json({ error: "Provider not configured" }, { status: 503 })
    authUrl = new URL("https://www.facebook.com/v19.0/dialog/oauth")
    authUrl.searchParams.set("client_id", appId)
    authUrl.searchParams.set("redirect_uri", redirectUri)
    authUrl.searchParams.set("scope", provider === "instagram" ? "instagram_basic,instagram_content_publish,pages_show_list" : "pages_manage_posts,pages_read_engagement,pages_show_list")
  } else if (provider === "youtube") {
    const clientId = process.env.GOOGLE_CLIENT_ID
    if (!clientId) return NextResponse.json({ error: "Provider not configured" }, { status: 503 })
    authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth")
    authUrl.searchParams.set("client_id", clientId)
    authUrl.searchParams.set("redirect_uri", redirectUri)
    authUrl.searchParams.set("scope", "https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly")
    authUrl.searchParams.set("access_type", "offline")
    authUrl.searchParams.set("prompt", "consent")
  } else if (provider === "tiktok") {
    const key = process.env.TIKTOK_CLIENT_KEY
    if (!key) return NextResponse.json({ error: "Provider not configured" }, { status: 503 })
    authUrl = new URL("https://www.tiktok.com/v2/auth/authorize/")
    authUrl.searchParams.set("client_key", key)
    authUrl.searchParams.set("redirect_uri", redirectUri)
    authUrl.searchParams.set("scope", "video.publish,video.list,user.info.basic")
  } else if (provider === "twitter") {
    const clientId = process.env.TWITTER_CLIENT_ID
    if (!clientId) return NextResponse.json({ error: "Provider not configured" }, { status: 503 })
    authUrl = new URL("https://twitter.com/i/oauth2/authorize")
    authUrl.searchParams.set("client_id", clientId)
    authUrl.searchParams.set("redirect_uri", redirectUri)
    authUrl.searchParams.set("scope", "tweet.read tweet.write users.read offline.access")
    // VEN-268 — real S256 challenge replaces the 'challenge'/'plain' placeholder.
    authUrl.searchParams.set("code_challenge", codeChallenge || "")
    authUrl.searchParams.set("code_challenge_method", "S256")
  }

  if (!authUrl) return NextResponse.json({ error: "Unsupported provider" }, { status: 400 })
  authUrl.searchParams.set("response_type", "code")
  authUrl.searchParams.set("state", state)

  return NextResponse.redirect(authUrl.toString())
}
