import { NextRequest, NextResponse } from "next/server"

const DEFAULT_ALLOWED_ORIGINS = [
  "https://tourify.app",
  "https://www.tourify.app",
]

function getAllowedOrigins() {
  const fromEnv = (process.env.CORS_ALLOWED_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)

  const origins = fromEnv.length ? fromEnv : [...DEFAULT_ALLOWED_ORIGINS]

  if (process.env.NODE_ENV !== "production") {
    origins.push("http://localhost:3000", "http://127.0.0.1:3000")
  }

  return new Set(origins)
}

export function resolveAllowedCorsOrigin(request: NextRequest) {
  const origin = request.headers.get("origin")
  if (!origin) return null
  if (!getAllowedOrigins().has(origin)) return null
  return origin
}

export function withApiCors(request: NextRequest, response: NextResponse) {
  const allowedOrigin = resolveAllowedCorsOrigin(request)
  if (!allowedOrigin) return response

  response.headers.set("Access-Control-Allow-Origin", allowedOrigin)
  response.headers.set("Vary", "Origin")
  response.headers.set(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, PATCH, DELETE, OPTIONS"
  )
  response.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, x-acting-profile-id, x-acting-account-type"
  )
  response.headers.set("Access-Control-Max-Age", "86400")
  return response
}

export function handleApiCorsPreflight(request: NextRequest) {
  if (request.method !== "OPTIONS") return null
  if (!request.nextUrl.pathname.startsWith("/api/")) return null

  const response = new NextResponse(null, { status: 204 })
  return withApiCors(request, response)
}
