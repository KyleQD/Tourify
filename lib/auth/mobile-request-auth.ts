import { createClient } from "@supabase/supabase-js"
import type { NextRequest } from "next/server"
import { createClient as createServerClient } from "@/lib/supabase/server"
import type { Database } from "@/lib/database.types"

interface AuthResult {
  user: any
  supabase: any
}

function getBearerToken(request: NextRequest) {
  const authorization = request.headers.get("authorization")
  if (!authorization) return null
  const [scheme, token] = authorization.split(" ")
  if (scheme?.toLowerCase() !== "bearer") return null
  if (!token) return null
  return token
}

async function authenticateWithBearer(request: NextRequest): Promise<AuthResult | null> {
  const token = getBearerToken(request)
  if (!token) return null

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseAnonKey) return null

  const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
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

  const {
    data: { user }
  } = await supabase.auth.getUser()
  if (!user) return null
  return { user, supabase }
}

async function authenticateWithCookies(): Promise<AuthResult | null> {
  const supabase = await createServerClient()
  const {
    data: { user }
  } = await supabase.auth.getUser()
  if (!user) return null
  return { user, supabase }
}

export async function authenticateRequestWithBearerFallback(request: NextRequest): Promise<AuthResult | null> {
  const bearerResult = await authenticateWithBearer(request)
  if (bearerResult) return bearerResult
  return authenticateWithCookies()
}
