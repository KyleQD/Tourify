import { createClient } from "@supabase/supabase-js"
import type { NextRequest } from "next/server"
import { createClient as createServerClient } from "@/lib/supabase/server"
import type { Database } from "@/lib/database.types"
import { parseSessionFromRequestCookieHeader } from "@/lib/supabase/tourify-session-cookie"

type AuthSource = "bearer" | "browser_session_cookie" | "cookie_session"

interface AuthResult {
  user: any
  supabase: any
  accessToken?: string
  source: AuthSource
}

function getBearerToken(request: NextRequest) {
  const authorization = request.headers.get("authorization")
  if (!authorization) return null
  const [scheme, token] = authorization.split(" ")
  if (scheme?.toLowerCase() !== "bearer") return null
  if (!token) return null
  return token
}

function createJwtSupabaseClient(token: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseAnonKey) return null

  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    global: {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  })
}

async function authenticateWithAccessToken(
  token: string | null,
  source: AuthSource
): Promise<AuthResult | null> {
  if (!token) return null

  const supabase = createJwtSupabaseClient(token)
  if (!supabase) return null

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token)
  if (error) return null
  if (!user) return null
  return { user, supabase, accessToken: token, source }
}

async function authenticateWithBearer(request: NextRequest): Promise<AuthResult | null> {
  return authenticateWithAccessToken(getBearerToken(request), "bearer")
}

async function authenticateWithBrowserSessionCookie(request: NextRequest): Promise<AuthResult | null> {
  const session = parseSessionFromRequestCookieHeader(request.headers.get("cookie"))
  return authenticateWithAccessToken(session?.access_token || null, "browser_session_cookie")
}

async function authenticateWithCookies(): Promise<AuthResult | null> {
  const supabase = await createServerClient()
  const {
    data: { user }
  } = await supabase.auth.getUser()
  if (!user) return null
  return { user, supabase, source: "cookie_session" }
}

export async function authenticateRequestWithExplicitJwt(request: NextRequest): Promise<AuthResult | null> {
  const bearerResult = await authenticateWithBearer(request)
  if (bearerResult) return bearerResult

  return authenticateWithBrowserSessionCookie(request)
}

export async function authenticateRequestWithBearerFallback(request: NextRequest): Promise<AuthResult | null> {
  const explicitJwtResult = await authenticateRequestWithExplicitJwt(request)
  if (explicitJwtResult) return explicitJwtResult

  return authenticateWithCookies()
}
