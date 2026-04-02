import type { SupabaseClient } from '@supabase/supabase-js'

const UI_STATUSES = [
  'scheduled',
  'confirmed',
  'in_progress',
  'completed',
  'cancelled',
  'postponed',
] as const

export type AdminUiEventStatus = (typeof UI_STATUSES)[number]

export function mapV2StatusToUi(status: string): AdminUiEventStatus {
  switch (status) {
    case 'hold':
    case 'offer':
    case 'inquiry':
      return 'scheduled'
    case 'confirmed':
    case 'advancing':
      return 'confirmed'
    case 'onsite':
      return 'in_progress'
    case 'settled':
      return 'completed'
    case 'archived':
      return 'completed'
    default:
      return 'scheduled'
  }
}

export function mapIncomingStatusToV2(status: string | undefined): string {
  const s = (status || '').toLowerCase()
  if (s === 'draft' || s === 'scheduled') return 'inquiry'
  if (s === 'postponed') return 'hold'
  if (s === 'confirmed') return 'confirmed'
  if (s === 'in_progress') return 'onsite'
  if (s === 'completed') return 'settled'
  if (s === 'cancelled') return 'archived'
  if (
    ['inquiry', 'hold', 'offer', 'confirmed', 'advancing', 'onsite', 'settled', 'archived'].includes(s)
  ) {
    return s
  }
  return 'inquiry'
}

export function mapUiStatusToV2ForPatch(status: AdminUiEventStatus): string {
  switch (status) {
    case 'scheduled':
      return 'inquiry'
    case 'postponed':
      return 'hold'
    case 'confirmed':
      return 'confirmed'
    case 'in_progress':
      return 'onsite'
    case 'completed':
      return 'settled'
    case 'cancelled':
      return 'archived'
    default:
      return 'inquiry'
  }
}

export async function resolveVenueName(
  supabase: SupabaseClient,
  venueId: string | null | undefined
): Promise<string | null> {
  if (!venueId) return null
  const { data } = await supabase.from('venues_v2').select('name').eq('id', venueId).maybeSingle()
  return data?.name ?? null
}

export function mapV2RowToAdminEvent(row: any, venueName: string | null): Record<string, unknown> {
  const settings = (row?.settings && typeof row.settings === 'object' ? row.settings : {}) as Record<
    string,
    unknown
  >
  const description = typeof settings.description === 'string' ? settings.description : ''
  const venueLabel = typeof settings.venue_label === 'string' ? settings.venue_label : ''
  const start = row?.start_at ? new Date(row.start_at) : new Date()
  const eventDate = Number.isNaN(start.getTime()) ? new Date().toISOString().slice(0, 10) : start.toISOString().slice(0, 10)
  const eventTime = Number.isNaN(start.getTime())
    ? '00:00'
    : `${String(start.getUTCHours()).padStart(2, '0')}:${String(start.getUTCMinutes()).padStart(2, '0')}`

  const cap = row?.capacity != null ? Number(row.capacity) : 0

  return {
    id: row.id,
    name: row.title,
    description,
    tour_id: undefined,
    venue_name: venueName || venueLabel || 'Venue',
    venue_address: undefined,
    event_date: eventDate,
    event_time: eventTime,
    doors_open: undefined,
    duration_minutes: undefined,
    status: mapV2StatusToUi(row.status),
    capacity: cap,
    tickets_sold: 0,
    ticket_price: undefined,
    vip_price: undefined,
    expected_revenue: 0,
    actual_revenue: 0,
    expenses: 0,
    venue_contact_name: undefined,
    venue_contact_email: undefined,
    venue_contact_phone: undefined,
    sound_requirements: undefined,
    lighting_requirements: undefined,
    stage_requirements: undefined,
    special_requirements: undefined,
    load_in_time: undefined,
    sound_check_time: undefined,
    tour: undefined,
  }
}

function slugBaseFromTitle(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48)
  return base || 'event'
}

function randomSuffix(len: number): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let out = ''
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)]
  return out
}

export async function buildUniqueEventSlug(
  supabase: SupabaseClient,
  orgId: string,
  title: string
): Promise<string> {
  const base = slugBaseFromTitle(title)
  for (let attempt = 0; attempt < 8; attempt++) {
    const slug = `${base}-${randomSuffix(6 + attempt)}`
    const { data, error } = await supabase
      .from('events_v2')
      .select('id')
      .eq('org_id', orgId)
      .eq('slug', slug)
      .maybeSingle()

    if (error) {
      console.error('[buildUniqueEventSlug]', error)
      return `${base}-${randomSuffix(12)}`
    }
    if (!data) return slug
  }
  return `${base}-${randomSuffix(14)}`
}
