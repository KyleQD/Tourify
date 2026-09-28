import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  createRateLimiter,
  clientKeyFromRequest,
  isRateLimitingActive,
} from '@/lib/utils/rate-limit'

const PRIVATE_DOCS_BUCKET = 'private-docs'
// Supabase createSignedUploadUrl tokens currently have a fixed two-hour TTL.
const SIGNED_UPLOAD_TTL_SECONDS = 2 * 60 * 60

function decodePathSegment(value: string): string | null {
  let decoded = value
  try {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const next = decodeURIComponent(decoded)
      if (next === decoded) break
      decoded = next
    }
    return decoded
  } catch {
    return null
  }
}

function validatedUserPath(rawPath: string, userId: string): string | null {
  if (!rawPath || rawPath.length > 1024 || rawPath !== rawPath.trim()) return null
  if (rawPath.includes('\\') || /[\u0000-\u001f\u007f]/.test(rawPath)) return null

  const segments = rawPath.split('/')
  if (segments.length < 2 || segments[0] !== userId) return null

  for (const segment of segments) {
    if (!segment) return null
    const decoded = decodePathSegment(segment)
    if (
      decoded === null ||
      decoded === '.' ||
      decoded === '..' ||
      decoded.includes('/') ||
      decoded.includes('\\') ||
      /[\u0000-\u001f\u007f]/.test(decoded)
    ) return null
  }

  return rawPath
}

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === 'production' && !isRateLimitingActive()) {
    return NextResponse.json({ error: 'upload_signing_unavailable' }, { status: 503 })
  }

  const rl = createRateLimiter({ namespace: 'upload-signing', limit: 20, windowSec: 60 })
  let rateLimitAllowed = false
  try {
    rateLimitAllowed = (await rl.check(clientKeyFromRequest(req))).success
  } catch {
    return NextResponse.json({ error: 'upload_signing_unavailable' }, { status: 503 })
  }
  if (!rateLimitAllowed) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }

  const supabase = await createClient()
  const { data: user } = await supabase.auth.getUser()
  if (!user?.user) return NextResponse.json({ error: 'not_authenticated' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const rawFilePath: unknown = body?.filePath
  if (typeof rawFilePath !== 'string' || !rawFilePath)
    return NextResponse.json({ error: 'filePath required' }, { status: 400 })
  if (
    body?.expiresInSec !== undefined &&
    body.expiresInSec !== SIGNED_UPLOAD_TTL_SECONDS
  ) {
    return NextResponse.json(
      { error: `expiresInSec is fixed at ${SIGNED_UPLOAD_TTL_SECONDS}` },
      { status: 400 },
    )
  }

  // SECURITY: callers may only sign uploads into their own prefix. Without
  // this check any authenticated user could overwrite another user's private
  // documents anywhere in the bucket.
  const validatedPath = validatedUserPath(rawFilePath, user.user.id)
  if (!validatedPath)
    return NextResponse.json(
      { error: "filePath must be a traversal-free path under your own '<user-id>/' prefix" },
      { status: 403 },
    )

  const { data, error } = await supabase.storage
    .from(PRIVATE_DOCS_BUCKET)
    .createSignedUploadUrl(validatedPath)

  if (error || !data) return NextResponse.json({ error: 'failed' }, { status: 500 })
  return NextResponse.json(
    {
      bucket: PRIVATE_DOCS_BUCKET,
      path: validatedPath,
      url: data.signedUrl,
      token: data.token,
      expiresInSec: SIGNED_UPLOAD_TTL_SECONDS,
    },
    { headers: { 'Cache-Control': 'private, no-store, max-age=0' } },
  )
}
