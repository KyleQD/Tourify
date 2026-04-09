import { createClient } from '@supabase/supabase-js'

interface StaffingTelemetryInput {
  endpoint: string
  requestId: string
  venueId?: string
  userId?: string
  statusCode: number
  latencyMs: number
  dataSource?: string
  errorCode?: string
}

function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export async function logStaffingApiTelemetry(input: StaffingTelemetryInput) {
  try {
    const admin = createServiceClient()
    if (!admin) return
    await admin.from('staffing_api_telemetry').insert({
      endpoint: input.endpoint,
      request_id: input.requestId,
      venue_id: input.venueId || null,
      user_id: input.userId || null,
      status_code: input.statusCode,
      latency_ms: input.latencyMs,
      data_source: input.dataSource || null,
      error_code: input.errorCode || null,
      created_at: new Date().toISOString(),
    })
  } catch (error) {
    console.warn('[staffing observability] telemetry insert skipped:', error)
  }
}

export function buildStaffingResponseHeaders(input: {
  requestId: string
  startedAt: number
  rateLimitRemaining?: number
  rateLimitReset?: number
  dataSource?: string
}) {
  const headers: Record<string, string> = {
    'x-request-id': input.requestId,
    'x-response-time-ms': String(Math.max(Date.now() - input.startedAt, 0)),
  }
  if (typeof input.rateLimitRemaining === 'number')
    headers['x-ratelimit-remaining'] = String(input.rateLimitRemaining)
  if (typeof input.rateLimitReset === 'number')
    headers['x-ratelimit-reset'] = String(input.rateLimitReset)
  if (input.dataSource) headers['x-data-source'] = input.dataSource
  return headers
}
