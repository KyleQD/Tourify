import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { canReviewStaffingApplications } from '@/lib/auth/hiring-permissions'
import { z } from 'zod'
import { createRateLimiter } from '@/lib/utils/rate-limit'

async function doesTableExist(supabase: any, table: string) {
  const { error } = await supabase.from(table).select('id', { head: true, count: 'exact' }).limit(1)
  return !error || !String(error.message || '').toLowerCase().includes('does not exist')
}

async function countRows(query: PromiseLike<{ count: number | null; error: any }>) {
  const { count, error } = await query
  if (error) return 0
  return count || 0
}

const querySchema = z.object({
  venue_id: z.string().uuid(),
})

const limiter = createRateLimiter({
  namespace: 'staffing-overview',
  limit: 120,
  windowSec: 60,
})

export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID()
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user)
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401, headers: { 'x-request-id': requestId } })

    const parsed = querySchema.safeParse({
      venue_id: new URL(request.url).searchParams.get('venue_id'),
    })
    if (!parsed.success)
      return NextResponse.json({ success: false, error: 'venue_id is required' }, { status: 400, headers: { 'x-request-id': requestId } })
    const venueId = parsed.data.venue_id

    const canView = await canReviewStaffingApplications({ userId: user.id, venueId })
    if (!canView)
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403, headers: { 'x-request-id': requestId } })

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    const rl = await limiter.check(`${user.id}:${ip}:${venueId}`)
    if (!rl.success)
      return NextResponse.json(
        { success: false, error: 'Rate limit exceeded' },
        {
          status: 429,
          headers: {
            'x-request-id': requestId,
            'x-ratelimit-remaining': String(rl.remaining ?? 0),
            'x-ratelimit-reset': String(rl.reset ?? 0),
          },
        }
      )

    const hasStaffMembers = await doesTableExist(supabase, 'staff_members')
    const hasApplications = await doesTableExist(supabase, 'job_applications')
    const hasCandidates = await doesTableExist(supabase, 'staff_onboarding_candidates')
    const hasStaffDocs = await doesTableExist(supabase, 'staff_documents')
    const hasAgreements = await doesTableExist(supabase, 'agreement_acceptances')
    const hasRbacAssignments = await doesTableExist(supabase, 'rbac_user_entity_roles')
    const hasOverviewCache = await doesTableExist(supabase, 'staffing_overview_cache')
    const hasTelemetry = await doesTableExist(supabase, 'staffing_api_telemetry')
    const isOverviewCacheEnabled = process.env.FEATURE_STAFFING_OVERVIEW_CACHE !== '0'
    const isAutoBypassEnabled = process.env.FEATURE_STAFFING_OVERVIEW_CACHE_AUTO_BYPASS !== '0'
    const bypassErrorRateThreshold = Number(
      process.env.STAFFING_OVERVIEW_CACHE_BYPASS_ERROR_RATE || 0.2
    )
    const bypassWindowMinutes = Number(
      process.env.STAFFING_OVERVIEW_CACHE_BYPASS_WINDOW_MINUTES || 5
    )
    let shouldBypassCache = false
    let bypassReason: string | null = null

    if (isAutoBypassEnabled && hasTelemetry) {
      const telemetryWindowStart = new Date(
        Date.now() - bypassWindowMinutes * 60 * 1000
      ).toISOString()
      const { data: recentTelemetry } = await supabase
        .from('staffing_api_telemetry')
        .select('status_code')
        .eq('venue_id', venueId)
        .eq('endpoint', '/api/staffing/employee-overview')
        .gte('created_at', telemetryWindowStart)

      const rows = recentTelemetry || []
      const total = rows.length
      const errors = rows.filter((row: any) => Number(row.status_code) >= 500).length
      const errorRate = total > 0 ? errors / total : 0
      if (total >= 10 && errorRate >= bypassErrorRateThreshold) {
        shouldBypassCache = true
        bypassReason = `error_rate_${(errorRate * 100).toFixed(1)}pct`
      }
    }

    // Read-through cache (hot path for dashboards).
    const useCache = new URL(request.url).searchParams.get('use_cache') !== '0'
    if (useCache && isOverviewCacheEnabled && hasOverviewCache && !shouldBypassCache) {
      const staleCutoff = new Date(Date.now() - 90 * 1000).toISOString()
      const { data: cached } = await supabase
        .from('staffing_overview_cache')
        .select('*')
        .eq('venue_id', venueId)
        .gte('refreshed_at', staleCutoff)
        .maybeSingle()

      if (cached) {
        return NextResponse.json({
          success: true,
          data: {
            staffing: {
              total_staff: Number((cached as any).total_staff || 0),
              active_staff: Number((cached as any).active_staff || 0),
              pending_applications: Number((cached as any).pending_applications || 0),
              onboarding_in_progress: Number((cached as any).onboarding_in_progress || 0),
            },
            compliance: {
              agreements_pending: Number((cached as any).agreements_pending || 0),
              documents_pending_verification: Number((cached as any).documents_pending_verification || 0),
              credentials_expiring_30_days: Number((cached as any).credentials_expiring_30_days || 0),
            },
            roles: {
              active_assignments: Number((cached as any).active_assignments || 0),
              unique_roles: Number((cached as any).unique_roles || 0),
            },
          },
        }, {
          headers: {
            'cache-control': 'private, max-age=15',
            'x-request-id': requestId,
            'x-data-source': 'cache',
            ...(shouldBypassCache && bypassReason
              ? { 'x-cache-bypass-reason': bypassReason }
              : {}),
            'x-ratelimit-remaining': String(rl.remaining ?? 0),
            'x-ratelimit-reset': String(rl.reset ?? 0),
          },
        })
      }
    }

    // Fast path: DB-side aggregate RPC for production scale (if migration applied).
    try {
      const { data: rpcRows, error: rpcError } = await supabase.rpc('staffing_overview_counts', {
        p_venue_id: venueId,
      })
      if (!rpcError && Array.isArray(rpcRows) && rpcRows[0]) {
        const row: any = rpcRows[0]
        const candidateResp = hasCandidates
          ? await supabase
              .from('staff_onboarding_candidates')
              .select('user_id')
              .eq('venue_id', venueId)
              .not('user_id', 'is', null)
          : { data: [], error: null }
        const candidateUserIds = (candidateResp.data || [])
          .map((candidate: any) => candidate.user_id)
          .filter((id: string | null) => Boolean(id))
        let agreementsPendingCount = 0
        if (hasAgreements && candidateUserIds.length > 0) {
          const { data: acceptedRows } = await supabase
            .from('agreement_acceptances')
            .select('user_id')
            .eq('organization_id', venueId)
            .in('user_id', candidateUserIds)
          const acceptedAgreementUsers = new Set((acceptedRows || []).map((it: any) => it.user_id))
          agreementsPendingCount = candidateUserIds.filter(
            (userId: string) => !acceptedAgreementUsers.has(userId)
          ).length
        }

        const payload = {
          success: true,
          data: {
            staffing: {
              total_staff: Number(row.total_staff || 0),
              active_staff: Number(row.active_staff || 0),
              pending_applications: Number(row.pending_applications || 0),
              onboarding_in_progress: Number(row.onboarding_in_progress || 0),
            },
            compliance: {
              agreements_pending: agreementsPendingCount,
              documents_pending_verification: Number(row.documents_pending_verification || 0),
              credentials_expiring_30_days: Number(row.credentials_expiring_30_days || 0),
            },
            roles: {
              active_assignments: Number(row.active_assignments || 0),
              unique_roles: Number(row.unique_roles || 0),
            },
          },
        }
        if (isOverviewCacheEnabled && hasOverviewCache) {
          await supabase.from('staffing_overview_cache').upsert({
            venue_id: venueId,
            total_staff: Number(row.total_staff || 0),
            active_staff: Number(row.active_staff || 0),
            pending_applications: Number(row.pending_applications || 0),
            onboarding_in_progress: Number(row.onboarding_in_progress || 0),
            documents_pending_verification: Number(row.documents_pending_verification || 0),
            credentials_expiring_30_days: Number(row.credentials_expiring_30_days || 0),
            active_assignments: Number(row.active_assignments || 0),
            unique_roles: Number(row.unique_roles || 0),
            agreements_pending: agreementsPendingCount,
            refreshed_at: new Date().toISOString(),
          })
        }
        return NextResponse.json(payload, {
          headers: {
            'cache-control': 'private, max-age=15',
            'x-request-id': requestId,
            'x-data-source': 'rpc',
            ...(shouldBypassCache && bypassReason
              ? { 'x-cache-bypass-reason': bypassReason }
              : {}),
            'x-ratelimit-remaining': String(rl.remaining ?? 0),
            'x-ratelimit-reset': String(rl.reset ?? 0),
          },
        })
      }
    } catch {}

    const nowIso = new Date().toISOString()
    const inThirtyDaysIso = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

    const [
      totalStaffCount,
      activeStaffCount,
      pendingApplicationsCount,
      onboardingInProgressCount,
      pendingDocsCount,
      expiringDocsCount,
      activeAssignmentsCount,
      roleAssignmentsResp,
      candidatesResp,
    ] = await Promise.all([
      hasStaffMembers
        ? countRows(supabase.from('staff_members').select('id', { head: true, count: 'exact' }).eq('venue_id', venueId))
        : Promise.resolve(0),
      hasStaffMembers
        ? countRows(
            supabase
              .from('staff_members')
              .select('id', { head: true, count: 'exact' })
              .eq('venue_id', venueId)
              .eq('status', 'active')
          )
        : Promise.resolve(0),
      hasApplications
        ? countRows(
            supabase
              .from('job_applications')
              .select('id', { head: true, count: 'exact' })
              .eq('venue_id', venueId)
              .eq('status', 'pending')
          )
        : Promise.resolve(0),
      hasCandidates
        ? countRows(
            supabase
              .from('staff_onboarding_candidates')
              .select('id', { head: true, count: 'exact' })
              .eq('venue_id', venueId)
              .in('status', ['in_progress', 'pending'])
          )
        : Promise.resolve(0),
      hasStaffDocs
        ? countRows(
            supabase
              .from('staff_documents')
              .select('id', { head: true, count: 'exact' })
              .eq('organization_id', venueId)
              .eq('verified_status', 'pending')
          )
        : Promise.resolve(0),
      hasStaffDocs
        ? countRows(
            supabase
              .from('staff_documents')
              .select('id', { head: true, count: 'exact' })
              .eq('organization_id', venueId)
              .gte('expires_at', nowIso)
              .lte('expires_at', inThirtyDaysIso)
          )
        : Promise.resolve(0),
      hasRbacAssignments
        ? countRows(
            supabase
              .from('rbac_user_entity_roles')
              .select('id', { head: true, count: 'exact' })
              .eq('entity_type', 'Venue')
              .eq('entity_id', venueId)
              .eq('is_active', true)
          )
        : Promise.resolve(0),
      hasRbacAssignments
        ? supabase
            .from('rbac_user_entity_roles')
            .select('role_id')
            .eq('entity_type', 'Venue')
            .eq('entity_id', venueId)
            .eq('is_active', true)
        : Promise.resolve({ data: [], error: null }),
      hasCandidates
        ? supabase
            .from('staff_onboarding_candidates')
            .select('user_id')
            .eq('venue_id', venueId)
            .not('user_id', 'is', null)
        : Promise.resolve({ data: [], error: null }),
    ])

    const candidateUserIds = (candidatesResp.data || [])
      .map((candidate: any) => candidate.user_id)
      .filter((id: string | null) => Boolean(id))

    let acceptedAgreementUsers = new Set<string>()
    if (hasAgreements && candidateUserIds.length > 0) {
      const { data: acceptedRows } = await supabase
        .from('agreement_acceptances')
        .select('user_id')
        .eq('organization_id', venueId)
        .in('user_id', candidateUserIds)

      acceptedAgreementUsers = new Set((acceptedRows || []).map((row: any) => row.user_id))
    }

    const agreementsPendingCount = candidateUserIds.filter(
      (userId: string) => !acceptedAgreementUsers.has(userId)
    ).length

    const roleAssignments = roleAssignmentsResp.data || []
    const payload = {
      success: true,
      data: {
        staffing: {
          total_staff: totalStaffCount,
          active_staff: activeStaffCount,
          pending_applications: pendingApplicationsCount,
          onboarding_in_progress: onboardingInProgressCount,
        },
        compliance: {
          agreements_pending: agreementsPendingCount,
          documents_pending_verification: pendingDocsCount,
          credentials_expiring_30_days: expiringDocsCount,
        },
        roles: {
          active_assignments: activeAssignmentsCount,
          unique_roles: new Set(roleAssignments.map((assignment: any) => assignment.role_id)).size,
        },
      },
    }
    if (isOverviewCacheEnabled && hasOverviewCache) {
      await supabase.from('staffing_overview_cache').upsert({
        venue_id: venueId,
        total_staff: totalStaffCount,
        active_staff: activeStaffCount,
        pending_applications: pendingApplicationsCount,
        onboarding_in_progress: onboardingInProgressCount,
        documents_pending_verification: pendingDocsCount,
        credentials_expiring_30_days: expiringDocsCount,
        active_assignments: activeAssignmentsCount,
        unique_roles: new Set(roleAssignments.map((assignment: any) => assignment.role_id)).size,
        agreements_pending: agreementsPendingCount,
        refreshed_at: new Date().toISOString(),
      })
    }
    return NextResponse.json(payload, {
      headers: {
        'cache-control': 'private, max-age=15',
        'x-request-id': requestId,
        'x-data-source': 'live',
        ...(shouldBypassCache && bypassReason
          ? { 'x-cache-bypass-reason': bypassReason }
          : {}),
        'x-ratelimit-remaining': String(rl.remaining ?? 0),
        'x-ratelimit-reset': String(rl.reset ?? 0),
      },
    })
  } catch (error) {
    console.error('[staffing/employee-overview]', error)
    return NextResponse.json({ success: false, error: 'Failed to load employee overview' }, { status: 500, headers: { 'x-request-id': requestId } })
  }
}
