import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withAuth } from '@/lib/auth/api-auth'
import { createRateLimiter } from '@/lib/utils/rate-limit'
import { buildStaffingResponseHeaders, logStaffingApiTelemetry } from '@/lib/staffing/api-observability'
import { ensureThreadForScope } from '@/lib/workflows/workflow-threads'
import { hasWorkflowScopeAccess } from '@/lib/workflows/workflow-permissions'

const listQuerySchema = z.object({
  scope_type: z.enum(['event', 'tour']).optional(),
  scope_id: z.string().uuid().optional(),
  status: z.enum(['active', 'archived', 'closed']).optional(),
})

const createThreadSchema = z.object({
  scope_type: z.enum(['event', 'tour']),
  scope_id: z.string().uuid(),
  org_id: z.string().uuid().optional(),
  title: z.string().min(1).max(180).optional(),
  description: z.string().max(2000).optional(),
})

const threadRateLimiter = createRateLimiter({
  namespace: 'workflow_threads',
  limit: 120,
  windowSec: 60,
})

function isWorkflowEnabled() {
  return process.env.FEATURE_UNIFIED_WORKFLOW_THREADS === '1'
}

export const GET = withAuth(async (request, { supabase, user }) => {
  if (!isWorkflowEnabled())
    return NextResponse.json({ error: 'Workflow threads are disabled' }, { status: 404 })

  const startedAt = Date.now()
  const requestId = crypto.randomUUID()

  try {
    const url = new URL(request.url)
    const parsed = listQuerySchema.safeParse({
      scope_type: url.searchParams.get('scope_type') ?? undefined,
      scope_id: url.searchParams.get('scope_id') ?? undefined,
      status: url.searchParams.get('status') ?? undefined,
    })

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid query', details: parsed.error.flatten() },
        { status: 400, headers: buildStaffingResponseHeaders({ requestId, startedAt }) }
      )
    }

    const rateLimit = await threadRateLimiter.check(`get:${user.id}`)
    const rateLimitRemaining = 'remaining' in rateLimit ? rateLimit.remaining : undefined
    const rateLimitReset = 'reset' in rateLimit ? rateLimit.reset : undefined
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        {
          status: 429,
          headers: buildStaffingResponseHeaders({
            requestId,
            startedAt,
            rateLimitRemaining,
            rateLimitReset,
          }),
        }
      )
    }

    let query = supabase
      .from('workflow_threads')
      .select('id, scope_type, scope_id, org_id, title, description, status, created_by, created_at, updated_at')
      .order('updated_at', { ascending: false })
      .limit(100)

    if (parsed.data.scope_type) query = query.eq('scope_type', parsed.data.scope_type)
    if (parsed.data.scope_id) query = query.eq('scope_id', parsed.data.scope_id)
    if (parsed.data.status) query = query.eq('status', parsed.data.status)

    const { data, error } = await query
    if (error) throw error

    const scopedThreads = data || []
    const accessChecks = await Promise.all(
      scopedThreads.map((thread: any) =>
        hasWorkflowScopeAccess({
          supabase,
          userId: user.id,
          scopeType: thread.scope_type,
          scopeId: thread.scope_id,
          permission: 'read',
        })
      )
    )
    const threads = scopedThreads.filter((_thread: any, index: number) => accessChecks[index])

    const response = NextResponse.json(
      { success: true, threads },
      {
        headers: buildStaffingResponseHeaders({
          requestId,
          startedAt,
          rateLimitRemaining,
          rateLimitReset,
        }),
      }
    )

    await logStaffingApiTelemetry({
      endpoint: '/api/workflows/threads',
      requestId,
      userId: user.id,
      statusCode: 200,
      latencyMs: Date.now() - startedAt,
      dataSource: 'db',
    })

    return response
  } catch (error) {
    console.error('[workflows/threads GET]', error)
    await logStaffingApiTelemetry({
      endpoint: '/api/workflows/threads',
      requestId,
      userId: user.id,
      statusCode: 500,
      latencyMs: Date.now() - startedAt,
      errorCode: 'threads_fetch_failed',
    })
    return NextResponse.json(
      { error: 'Failed to list workflow threads' },
      { status: 500, headers: buildStaffingResponseHeaders({ requestId, startedAt }) }
    )
  }
})

export const POST = withAuth(async (request, { supabase, user }) => {
  if (!isWorkflowEnabled())
    return NextResponse.json({ error: 'Workflow threads are disabled' }, { status: 404 })

  const startedAt = Date.now()
  const requestId = crypto.randomUUID()

  try {
    const body = await request.json()
    const parsed = createThreadSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid payload', details: parsed.error.flatten() },
        { status: 400, headers: buildStaffingResponseHeaders({ requestId, startedAt }) }
      )
    }

    const rateLimit = await threadRateLimiter.check(`post:${user.id}`)
    const rateLimitRemaining = 'remaining' in rateLimit ? rateLimit.remaining : undefined
    const rateLimitReset = 'reset' in rateLimit ? rateLimit.reset : undefined
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        {
          status: 429,
          headers: buildStaffingResponseHeaders({
            requestId,
            startedAt,
            rateLimitRemaining,
            rateLimitReset,
          }),
        }
      )
    }

    const canManageScope = await hasWorkflowScopeAccess({
      supabase,
      userId: user.id,
      scopeType: parsed.data.scope_type,
      scopeId: parsed.data.scope_id,
      permission: 'manage',
    })

    if (!canManageScope) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403, headers: buildStaffingResponseHeaders({ requestId, startedAt }) }
      )
    }

    const thread = await ensureThreadForScope({
      supabase,
      scopeType: parsed.data.scope_type,
      scopeId: parsed.data.scope_id,
      orgId: parsed.data.org_id ?? null,
      userId: user.id,
      title: parsed.data.title,
    })

    if (parsed.data.description) {
      await supabase
        .from('workflow_threads')
        .update({ description: parsed.data.description })
        .eq('id', thread.id)
    }

    await supabase.from('workflow_events_audit').insert({
      thread_id: thread.id,
      actor_user_id: user.id,
      action: 'thread.created',
      entity_type: 'thread',
      entity_id: thread.id,
      metadata: { scope_type: parsed.data.scope_type, scope_id: parsed.data.scope_id },
    })

    await logStaffingApiTelemetry({
      endpoint: '/api/workflows/threads',
      requestId,
      userId: user.id,
      statusCode: 201,
      latencyMs: Date.now() - startedAt,
      dataSource: 'db',
    })

    return NextResponse.json(
      { success: true, thread },
      { status: 201, headers: buildStaffingResponseHeaders({ requestId, startedAt }) }
    )
  } catch (error) {
    console.error('[workflows/threads POST]', error)
    await logStaffingApiTelemetry({
      endpoint: '/api/workflows/threads',
      requestId,
      userId: user.id,
      statusCode: 500,
      latencyMs: Date.now() - startedAt,
      errorCode: 'thread_create_failed',
    })
    return NextResponse.json(
      { error: 'Failed to create workflow thread' },
      { status: 500, headers: buildStaffingResponseHeaders({ requestId, startedAt }) }
    )
  }
})
