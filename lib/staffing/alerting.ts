import { createClient } from '@supabase/supabase-js'

interface StaffingAlertInput {
  venueId: string
  eventKey: string
  severity: 'info' | 'warning' | 'critical'
  title: string
  message: string
  metadata?: Record<string, unknown>
}

interface SelfHealInput {
  venueId: string
  reason: string
}

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

function severityValue(severity: 'info' | 'warning' | 'critical') {
  if (severity === 'critical') return 3
  if (severity === 'warning') return 2
  return 1
}

function shouldEmitBySeverity(severity: 'info' | 'warning' | 'critical') {
  const min = (process.env.STAFFING_ALERT_MIN_SEVERITY || 'critical').toLowerCase()
  const minValue =
    min === 'info' ? 1 : min === 'warning' ? 2 : 3
  return severityValue(severity) >= minValue
}

function getCooldownSeconds() {
  return Math.max(Number(process.env.STAFFING_ALERT_COOLDOWN_SEC || 900), 30)
}

function getSelfHealCooldownSeconds() {
  return Math.max(Number(process.env.STAFFING_SELF_HEAL_COOLDOWN_SEC || 300), 30)
}

function buildWebhookPayload(input: StaffingAlertInput) {
  const metadata = input.metadata || {}
  const deepLink = typeof metadata.deep_link === 'string' ? metadata.deep_link : null
  const deepLinkLabel =
    typeof metadata.deep_link_label === 'string'
      ? metadata.deep_link_label
      : inferDeepLinkLabel({
          eventKey: input.eventKey,
          metadata,
          deepLink,
        })

  return {
    source: 'tourify_staffing_health',
    severity: input.severity,
    title: input.title,
    message: input.message,
    venue_id: input.venueId,
    event_key: input.eventKey,
    metadata,
    deep_link: deepLink,
    deep_link_label: deepLinkLabel,
    at: new Date().toISOString(),
    text: `[${input.severity.toUpperCase()}] ${input.title} (${input.venueId}) - ${input.message}`,
  }
}

function inferDeepLinkLabel(input: {
  eventKey: string
  metadata: Record<string, unknown>
  deepLink: string | null
}) {
  if (!input.deepLink) return null
  const deepLinkType = typeof input.metadata.deep_link_type === 'string'
    ? input.metadata.deep_link_type
    : null

  if (deepLinkType === 'workflow_task') return 'Inspect blocked tasks'
  if (deepLinkType === 'workflow_message') return 'Open message timeline'
  if (deepLinkType === 'workflow_participant') return 'Review participant changes'
  if (deepLinkType === 'workflow_automation') return 'Open automation timeline'
  if (deepLinkType === 'staffing_cache') return 'Review cache health'
  if (deepLinkType === 'staffing_health') return 'Open staffing health details'

  if (input.eventKey.includes('workflow')) return 'Open workflow activity'
  if (input.eventKey.includes('cache')) return 'Review cache health'
  return 'Open related view'
}

async function hasCooldownExpired(input: { venueId: string; eventKey: string; cooldownSec: number }) {
  const admin = getServiceClient()
  if (!admin) return false
  const { data } = await admin
    .from('staffing_alert_events')
    .select('last_triggered_at')
    .eq('venue_id', input.venueId)
    .eq('event_key', input.eventKey)
    .maybeSingle()
  if (!data?.last_triggered_at) return true
  const elapsed = Date.now() - new Date(data.last_triggered_at).getTime()
  return elapsed >= input.cooldownSec * 1000
}

async function upsertAlertEvent(input: { venueId: string; eventKey: string; severity: string; payload: Record<string, unknown> }) {
  const admin = getServiceClient()
  if (!admin) return

  const { data: existing } = await admin
    .from('staffing_alert_events')
    .select('trigger_count')
    .eq('venue_id', input.venueId)
    .eq('event_key', input.eventKey)
    .maybeSingle()

  const nextCount = Number(existing?.trigger_count || 0) + 1

  await admin
    .from('staffing_alert_events')
    .upsert({
      venue_id: input.venueId,
      event_key: input.eventKey,
      severity: input.severity,
      trigger_count: nextCount,
      last_triggered_at: new Date().toISOString(),
      last_payload: input.payload,
    }, { onConflict: 'venue_id,event_key' })
}

export async function emitStaffingAlertIfNeeded(input: StaffingAlertInput) {
  if (!shouldEmitBySeverity(input.severity)) return { sent: false, reason: 'severity-filtered' as const }
  const url = process.env.STAFFING_ALERT_WEBHOOK_URL
  if (!url) return { sent: false, reason: 'webhook-missing' as const }

  const cooldownSec = getCooldownSeconds()
  const canEmit = await hasCooldownExpired({
    venueId: input.venueId,
    eventKey: input.eventKey,
    cooldownSec,
  })
  if (!canEmit) return { sent: false, reason: 'cooldown-active' as const }

  const payload = buildWebhookPayload(input)
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!response.ok) return { sent: false, reason: 'webhook-failed' as const, status: response.status }
    await upsertAlertEvent({
      venueId: input.venueId,
      eventKey: input.eventKey,
      severity: input.severity,
      payload,
    })
    return { sent: true, reason: 'sent' as const }
  } catch {
    return { sent: false, reason: 'webhook-exception' as const }
  }
}

export async function trySelfHealStaffingCache(input: SelfHealInput) {
  if (process.env.FEATURE_STAFFING_SELF_HEAL !== '1')
    return { attempted: false, success: false, reason: 'disabled' as const }
  const admin = getServiceClient()
  if (!admin)
    return { attempted: false, success: false, reason: 'service-client-missing' as const }

  const eventKey = 'self_heal_staffing_cache'
  const canRun = await hasCooldownExpired({
    venueId: input.venueId,
    eventKey,
    cooldownSec: getSelfHealCooldownSeconds(),
  })
  if (!canRun) return { attempted: false, success: false, reason: 'cooldown-active' as const }

  const { error } = await admin.rpc('refresh_staffing_overview_cache', {
    p_venue_id: input.venueId,
  })
  const payload = {
    reason: input.reason,
    success: !error,
  }
  await upsertAlertEvent({
    venueId: input.venueId,
    eventKey,
    severity: error ? 'warning' : 'info',
    payload,
  })
  if (error) return { attempted: true, success: false, reason: error.message as string }
  return { attempted: true, success: true, reason: 'refreshed' as const }
}
