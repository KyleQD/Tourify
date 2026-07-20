export interface LogisticsActivityEntry {
  eventId?: string | null
  tourId?: string | null
  actorUserId: string
  action: string
  entityType: string
  entityId: string
  summary: string
  metadata?: Record<string, unknown>
}

/** Redact sensitive keys from audit metadata. */
export function sanitizeActivityMetadata(
  metadata: Record<string, unknown> | null | undefined
): Record<string, unknown> {
  if (!metadata) return {}
  const blocked = new Set([
    'passport',
    'ssn',
    'card_number',
    'cvv',
    'password',
    'secret',
    'token',
    'medical',
    'allergy_detail',
  ])
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(metadata)) {
    if (blocked.has(key.toLowerCase())) {
      out[key] = '[redacted]'
      continue
    }
    out[key] = value
  }
  return out
}

export function buildLogisticsActivityInsert(entry: LogisticsActivityEntry) {
  return {
    event_id: entry.eventId || null,
    tour_id: entry.tourId || null,
    actor_user_id: entry.actorUserId,
    action: entry.action,
    entity_type: entry.entityType,
    entity_id: entry.entityId,
    summary: entry.summary,
    metadata: sanitizeActivityMetadata(entry.metadata),
  }
}
