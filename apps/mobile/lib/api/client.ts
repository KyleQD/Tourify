import { env } from "@/lib/config/env"
import { supabase } from "@/lib/supabase/client"

interface ApiRequestOptions extends RequestInit {
  authRequired?: boolean
}

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = "ApiError"
    this.status = status
  }
}

async function buildHeaders(options?: ApiRequestOptions) {
  const headers = new Headers(options?.headers)
  if (options?.body && !(options.body instanceof FormData) && !headers.has("Content-Type"))
    headers.set("Content-Type", "application/json")

  const authRequired = options?.authRequired ?? true
  if (!authRequired) return headers

  const { data } = await supabase.auth.getSession()
  const accessToken = data.session?.access_token
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`)
  return headers
}

export async function apiRequest<T>(path: string, options?: ApiRequestOptions): Promise<T> {
  const headers = await buildHeaders(options)
  const response = await fetch(`${env.apiBaseUrl}${path}`, {
    ...options,
    headers
  })

  if (!response.ok) {
    const rawMessage = await response.text()
    const parsedMessage = tryExtractErrorMessage(rawMessage)
    const message = parsedMessage || rawMessage || `API request failed: ${response.status}`
    throw new ApiError(message, response.status)
  }

  return response.json() as Promise<T>
}

function tryExtractErrorMessage(payload: string) {
  try {
    const parsed = JSON.parse(payload) as { error?: string; details?: string; message?: string }
    return parsed.error || parsed.details || parsed.message || null
  } catch {
    return null
  }
}
