import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { canReviewStaffingApplications } from '@/lib/auth/hiring-permissions'
import { z } from 'zod'
import { createRateLimiter } from '@/lib/utils/rate-limit'
import {
  buildStaffingResponseHeaders,
  logStaffingApiTelemetry,
} from '@/lib/staffing/api-observability'

async function doesTableExist(supabase: any, table: string) {
  const { error } = await supabase.from(table).select('id', { head: true, count: 'exact' }).limit(1)
  return !error || !String(error.message || '').toLowerCase().includes('does not exist')
}

const querySchema = z.object({
  venue_id: z.string().uuid(),
  query: z.string().optional().default(''),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  cursor: z.string().optional(),
  status: z.enum(['active', 'on_leave', 'terminated']).optional(),
  department: z.string().optional(),
  sort_by: z.enum(['created_at', 'hire_date', 'name']).optional().default('created_at'),
  sort_order: z.enum(['asc', 'desc']).optional().default('desc'),
})

const limiter = createRateLimiter({
  namespace: 'staffing-employees',
  limit: 180,
  windowSec: 60,
})

export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID()
  const startedAt = Date.now()
  let userId: string | undefined
  let venueId: string | undefined
  async function send(input: {
    status: number
    body: Record<string, any>
    rateLimitRemaining?: number
    rateLimitReset?: number
    dataSource?: string
    errorCode?: string
  }) {
    await logStaffingApiTelemetry({
      endpoint: '/api/staffing/employees',
      requestId,
      venueId,
      userId,
      statusCode: input.status,
      latencyMs: Date.now() - startedAt,
      dataSource: input.dataSource,
      errorCode: input.errorCode,
    })
    return NextResponse.json(input.body, {
      status: input.status,
      headers: {
        ...buildStaffingResponseHeaders({
          requestId,
          startedAt,
          rateLimitRemaining: input.rateLimitRemaining,
          rateLimitReset: input.rateLimitReset,
          dataSource: input.dataSource,
        }),
        'cache-control': 'private, max-age=10',
      },
    })
  }
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    userId = user?.id

    if (authError || !user)
      return send({
        status: 401,
        body: { success: false, error: 'Authentication required' },
        errorCode: 'AUTH_REQUIRED',
      })

    const parsed = querySchema.safeParse(
      Object.fromEntries(new URL(request.url).searchParams.entries())
    )
    if (!parsed.success)
      return send({
        status: 400,
        body: { success: false, error: 'Invalid query parameters' },
        errorCode: 'INVALID_QUERY',
      })

    const {
      venue_id: venueIdParam,
      query: rawQuery,
      page,
      limit,
      cursor,
      status,
      department,
      sort_by: sortBy,
      sort_order: sortOrder,
    } = parsed.data
    venueId = venueIdParam
    const offset = (page - 1) * limit
    const query = rawQuery.trim().toLowerCase()

    const canReview = await canReviewStaffingApplications({ userId: user.id, venueId })
    if (!canReview)
      return send({
        status: 403,
        body: { success: false, error: 'Forbidden' },
        errorCode: 'FORBIDDEN',
      })

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    const rl = await limiter.check(`${user.id}:${ip}:${venueId}`)
    if (!rl.success)
      return send({
        status: 429,
        body: { success: false, error: 'Rate limit exceeded' },
        rateLimitRemaining: rl.remaining,
        rateLimitReset: rl.reset,
        errorCode: 'RATE_LIMIT',
      })

    const hasStaffMembers = await doesTableExist(supabase, 'staff_members')
    const hasCandidates = await doesTableExist(supabase, 'staff_onboarding_candidates')
    const hasDocs = await doesTableExist(supabase, 'staff_documents')
    const hasAgreements = await doesTableExist(supabase, 'agreement_acceptances')

    if (!hasStaffMembers)
      return send({
        status: 200,
        body: {
          success: true,
          data: [],
          pagination: { page, limit, total: 0 },
        },
        rateLimitRemaining: rl.remaining,
        rateLimitReset: rl.reset,
        dataSource: 'empty',
      })

    let staffQuery = supabase
      .from('staff_members')
      .select('id, user_id, venue_id, name, email, phone, role, department, status, hire_date, created_at', {
        count: 'exact',
      })
      .eq('venue_id', venueId)
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range(offset, offset + limit - 1)

    if (query) staffQuery = staffQuery.or(`name.ilike.%${query}%,email.ilike.%${query}%,role.ilike.%${query}%`)
    if (status) staffQuery = staffQuery.eq('status', status)
    if (department) staffQuery = staffQuery.eq('department', department)
    if (cursor && (sortBy === 'created_at' || sortBy === 'hire_date')) {
      if (sortOrder === 'asc') staffQuery = staffQuery.gt(sortBy, cursor)
      else staffQuery = staffQuery.lt(sortBy, cursor)
    }

    const { data: staffRows, error: staffError, count: total } = await staffQuery
    if (staffError)
      return send({
        status: 500,
        body: { success: false, error: staffError.message },
        rateLimitRemaining: rl.remaining,
        rateLimitReset: rl.reset,
        errorCode: 'STAFF_QUERY_FAILED',
      })

    const staff = staffRows || []
    const userIds = staff.map((row: any) => row.user_id).filter(Boolean)

    const [candidateResp, docsResp, agreementsResp] = await Promise.all([
      hasCandidates && userIds.length > 0
        ? supabase
            .from('staff_onboarding_candidates')
            .select('id, user_id, status, stage, onboarding_progress, approved_at')
            .eq('venue_id', venueId)
            .in('user_id', userIds)
        : Promise.resolve({ data: [], error: null }),
      hasDocs && userIds.length > 0
        ? supabase
            .from('staff_documents')
            .select('id, owner_user_id, verified_status, expires_at, document_type')
            .eq('organization_id', venueId)
            .in('owner_user_id', userIds)
        : Promise.resolve({ data: [], error: null }),
      hasAgreements && userIds.length > 0
        ? supabase
            .from('agreement_acceptances')
            .select('id, user_id, accepted_at')
            .eq('organization_id', venueId)
            .in('user_id', userIds)
        : Promise.resolve({ data: [], error: null }),
    ])

    const candidateByUser = new Map<string, any>()
    ;(candidateResp.data || []).forEach((row: any) => {
      if (!candidateByUser.has(row.user_id)) candidateByUser.set(row.user_id, row)
    })

    const docsByUser = new Map<string, any[]>()
    ;(docsResp.data || []).forEach((row: any) => {
      const current = docsByUser.get(row.owner_user_id) || []
      current.push(row)
      docsByUser.set(row.owner_user_id, current)
    })

    const agreementsByUser = new Map<string, any[]>()
    ;(agreementsResp.data || []).forEach((row: any) => {
      const current = agreementsByUser.get(row.user_id) || []
      current.push(row)
      agreementsByUser.set(row.user_id, current)
    })

    const rows = staff.map((row: any) => {
      const candidate = row.user_id ? candidateByUser.get(row.user_id) : null
      const docs = row.user_id ? docsByUser.get(row.user_id) || [] : []
      const agreements = row.user_id ? agreementsByUser.get(row.user_id) || [] : []
      const pendingDocs = docs.filter((doc: any) => doc.verified_status === 'pending').length
      const expiringSoon = docs.filter((doc: any) => {
        if (!doc.expires_at) return false
        const expiresAt = new Date(doc.expires_at).getTime()
        const now = Date.now()
        const thirtyDays = 30 * 24 * 60 * 60 * 1000
        return expiresAt >= now && expiresAt <= now + thirtyDays
      }).length

      return {
        ...row,
        onboarding: candidate
          ? {
              status: candidate.status,
              stage: candidate.stage,
              progress: candidate.onboarding_progress,
              approved_at: candidate.approved_at,
            }
          : null,
        compliance: {
          agreements_accepted: agreements.length,
          pending_docs: pendingDocs,
          expiring_docs_30_days: expiringSoon,
        },
      }
    })

    const lastRow = rows[rows.length - 1]
    const nextCursor =
      rows.length === limit && (sortBy === 'created_at' || sortBy === 'hire_date')
        ? String((lastRow as any)?.[sortBy] || '')
        : null

    return send({
      status: 200,
      body: {
        success: true,
        data: rows,
        pagination: {
          page,
          limit,
          total: total || 0,
          next_cursor: nextCursor,
        },
      },
      rateLimitRemaining: rl.remaining,
      rateLimitReset: rl.reset,
      dataSource: 'live',
    })
  } catch (error) {
    console.error('[staffing/employees]', error)
    return send({
      status: 500,
      body: { success: false, error: 'Failed to load employees' },
      errorCode: 'UNEXPECTED',
    })
  }
}
