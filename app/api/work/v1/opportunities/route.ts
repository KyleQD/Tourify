import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { toPublicArtistWorkOpportunity, type PublicWorkOpportunity } from '@/lib/work/public-work-opportunity'

export const dynamic = 'force-dynamic'

type Cursor = { createdAt: string; id: string }
const UUID = /^[a-f\d]{8}-[a-f\d]{4}-[1-8][a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/i

function parseCursor(encoded: string | null): Cursor | null {
  if (!encoded || encoded.length > 256) return null
  try {
    const value = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as Record<string, unknown>
    if (typeof value.createdAt !== 'string' || typeof value.id !== 'string') return null
    const date = new Date(value.createdAt)
    if (!Number.isFinite(date.getTime()) || date.toISOString() !== value.createdAt) return null
    if (!UUID.test(value.id)) return null
    return { createdAt: value.createdAt, id: value.id }
  } catch {
    return null
  }
}

function encodeCursor(cursor: Cursor): string {
  return Buffer.from(JSON.stringify(cursor)).toString('base64url')
}

/**
 * An isolated, feature-flagged Work v1 discovery canary.
 *
 * Phase 0 deliberately supports *only* genuine unpaid artist collaborations.
 * Paid jobs MUST NOT be exposed here before account-scoped protected employer
 * approval and subscription grants have been implemented and audited.
 *
 * Does not replace GET /api/jobs or alter existing employer hiring operations.
 */
export async function GET(request: NextRequest) {
  if (process.env.WORK_DISCOVERY_V1_ENABLED !== 'true')
    return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })

  const url = request.nextUrl
  const kind = url.searchParams.get('kind') ?? 'creative_collaboration'
  if (kind !== 'creative_collaboration') {
    return NextResponse.json(
      { success: false, error: 'Paid work discovery is not enabled on this preview API.' },
      { status: 501 }
    )
  }

  const rawLimit = url.searchParams.get('limit') ?? '20'
  const limit = Number(rawLimit)
  if (!Number.isInteger(limit) || limit < 1 || limit > 40)
    return NextResponse.json({ success: false, error: 'limit must be an integer between 1 and 40' }, { status: 400 })

  const afterParam = url.searchParams.get('after')
  const after = parseCursor(afterParam)
  if (afterParam && !after)
    return NextResponse.json({ success: false, error: 'Invalid pagination cursor' }, { status: 400 })

  try {
    // Public RLS-scoped client: do NOT use the service-role bypass here.
    const supabase = await createClient()
    const batchSize = Math.min(100, Math.max(40, limit * 3))
    let query = supabase
      .from('artist_jobs')
      .select('id, title, description, created_at, expires_at, status, job_type, payment_type, payment_amount, location, city, state, country, location_type, required_skills, posted_by_type, posted_by, poster_profile_id')
      .eq('status', 'open')
      .eq('job_type', 'collaboration')
      .in('payment_type', ['unpaid', 'exposure'])
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(batchSize)

    // All components are normalized and validated before entering the PostgREST expression.
    if (after)
      query = query.or(
        `created_at.lt.${after.createdAt},and(created_at.eq.${after.createdAt},id.lt.${after.id})`
      )

    const { data: rows, error } = await query
    if (error) throw error
    const sourceRows = rows ?? []
    const profileIds = [...new Set(
      sourceRows.map((row) => row.poster_profile_id).filter((value): value is string => typeof value === 'string')
    )]

    const authorMap = new Map<string, string>()
    if (profileIds.length) {
      const { data: authors, error: authorError } = await supabase
        .from('artist_profiles')
        .select('id, user_id')
        .in('id', profileIds)
      if (authorError) throw authorError
      for (const author of authors ?? []) {
        if (author.id && author.user_id) authorMap.set(author.id, author.user_id)
      }
    }

    const items: PublicWorkOpportunity[] = []
    let consumed = -1
    const now = new Date()
    for (let i = 0; i < sourceRows.length; i++) {
      consumed = i
      const row = sourceRows[i]
      const authorId = row.poster_profile_id ? authorMap.get(row.poster_profile_id) : undefined
      const authorVerifiedAsArtist = row.posted_by_type === 'artist' && Boolean(authorId && authorId === row.posted_by)
      const projected = toPublicArtistWorkOpportunity(
        row as Record<string, unknown>,
        { isEligibleArtist: authorVerifiedAsArtist },
        now
      )
      if (projected?.kind === 'creative_collaboration') items.push(projected)
      if (items.length >= limit) break
    }

    const hasMore = consumed < sourceRows.length - 1 || sourceRows.length === batchSize
    const last = consumed >= 0 ? sourceRows[consumed] : null
    const nextCursor = hasMore && last
      ? encodeCursor({ createdAt: new Date(last.created_at).toISOString(), id: last.id })
      : null

    return NextResponse.json({
      success: true,
      version: 1,
      kind: 'creative_collaboration',
      items,
      nextCursor,
      // No total-count claim: legacy eligibility checks can suppress source rows.
      hasMore: nextCursor !== null,
    }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    console.error('[WorkDiscoveryV1] Read failed', error)
    return NextResponse.json(
      { success: false, error: 'Work opportunities are temporarily unavailable.' },
      { status: 503 }
    )
  }
}
