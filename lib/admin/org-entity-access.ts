export class OrgEntityAccessError extends Error {
  constructor(
    message: string,
    public readonly status: 404 | 422 | 503,
    public readonly code: string,
  ) {
    super(message)
    this.name = 'OrgEntityAccessError'
  }
}

interface OrgEntityReferences {
  eventId?: string | null
  tourId?: string | null
  requireEventTourRelation?: boolean
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClient = any

async function requireOrgRecord(
  supabase: SupabaseClient,
  table: 'events_v2' | 'tours',
  id: string,
  orgId: string,
  label: 'Event' | 'Tour',
) {
  const { data, error } = await supabase
    .from(table)
    .select('id')
    .eq('id', id)
    .eq('org_id', orgId)
    .maybeSingle()

  if (error) {
    throw new OrgEntityAccessError(
      `Unable to verify ${label.toLowerCase()} scope.`,
      503,
      'entity_scope_unavailable',
    )
  }
  if (!data?.id) {
    throw new OrgEntityAccessError(
      `${label} not found.`,
      404,
      'entity_not_found',
    )
  }
}

/** Verify optional event/tour references against the acting organization. */
export async function assertOrgEntityReferences(
  supabase: SupabaseClient,
  orgId: string,
  references: OrgEntityReferences,
): Promise<void> {
  const eventId = references.eventId || null
  const tourId = references.tourId || null

  await Promise.all([
    eventId ? requireOrgRecord(supabase, 'events_v2', eventId, orgId, 'Event') : Promise.resolve(),
    tourId ? requireOrgRecord(supabase, 'tours', tourId, orgId, 'Tour') : Promise.resolve(),
  ])

  if (eventId && tourId && references.requireEventTourRelation !== false) {
    const { data, error } = await supabase
      .from('tour_events')
      .select('tour_id')
      .eq('tour_id', tourId)
      .eq('event_id', eventId)
      .maybeSingle()

    if (error) {
      throw new OrgEntityAccessError(
        'Unable to verify the tour stop relationship.',
        503,
        'entity_scope_unavailable',
      )
    }
    if (!data) {
      throw new OrgEntityAccessError(
        'The event is not attached to the selected tour.',
        422,
        'entity_relationship_invalid',
      )
    }
  }
}

export async function listOrgEventIds(
  supabase: SupabaseClient,
  orgId: string,
): Promise<string[]> {
  const { data, error } = await supabase
    .from('events_v2')
    .select('id')
    .eq('org_id', orgId)

  if (error) {
    throw new OrgEntityAccessError(
      'Unable to load organization events.',
      503,
      'entity_scope_unavailable',
    )
  }

  return (data || [])
    .map((row: { id?: string | null }) => row.id)
    .filter((id: string | null | undefined): id is string => Boolean(id))
}
