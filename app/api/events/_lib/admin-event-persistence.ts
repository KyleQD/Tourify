import { randomUUID } from 'crypto'
import { createClient } from '@supabase/supabase-js'

function createServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceKey) {
    throw new Error('Missing Supabase service configuration')
  }

  return createClient(supabaseUrl, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

function slugifyOrgName(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 40) || 'organizer'
}

async function buildUniqueOrgSlug(serviceSupabase: any, name: string) {
  const base = slugifyOrgName(name)
  let slug = base
  let suffix = 2

  while (suffix < 100) {
    const { data, error } = await serviceSupabase
      .from('organizations')
      .select('id')
      .eq('slug', slug)
      .maybeSingle()

    if (error) {
      throw new Error(`Failed to verify organization slug: ${error.message}`)
    }
    if (!data) return slug

    slug = `${base}-${suffix}`
    suffix += 1
  }

  return `${base}-${randomUUID().slice(0, 8)}`
}

async function ensureOrgMembership(serviceSupabase: any, orgId: string, userId: string) {
  const { data: existing, error: lookupError } = await serviceSupabase
    .from('org_members')
    .select('org_id')
    .eq('org_id', orgId)
    .eq('user_id', userId)
    .maybeSingle()

  if (lookupError) {
    throw new Error(`Failed to verify organization membership: ${lookupError.message}`)
  }
  if (existing) return

  const { error: insertError } = await serviceSupabase
    .from('org_members')
    .insert({
      org_id: orgId,
      user_id: userId,
      role: 'owner',
      invited_by: userId,
    })

  if (insertError) {
    throw new Error(`Failed to create organization membership: ${insertError.message}`)
  }
}

export async function resolveAdminOrgIdForUser(
  supabase: { from: (table: string) => any },
  userId: string,
  tourId?: string | null,
): Promise<string | null> {
  // Prefer service role for org lookups so RLS on org_members/tours cannot block admin flows.
  let lookupClient = supabase
  try {
    lookupClient = createServiceClient()
  } catch {
    lookupClient = supabase
  }

  if (tourId) {
    const { data: tour, error } = await lookupClient
      .from('tours')
      .select('org_id')
      .eq('id', tourId)
      .maybeSingle()

    if (error) {
      console.error('[admin-event-persistence] tour org lookup failed:', error)
      return null
    }
    if (tour?.org_id) return tour.org_id as string
  }

  const { data: membership, error } = await lookupClient
    .from('org_members')
    .select('org_id')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('[admin-event-persistence] org member lookup failed:', error)
    return null
  }

  return (membership?.org_id as string | undefined) ?? null
}

export async function ensureAdminOrgScope(
  supabase: { from: (table: string) => any },
  userId: string,
  tourId?: string | null,
): Promise<string> {
  const existingOrgId = await resolveAdminOrgIdForUser(supabase, userId, tourId)
  if (existingOrgId) {
    await ensureOrgMembership(createServiceClient(), existingOrgId, userId)
    return existingOrgId
  }

  const serviceSupabase = createServiceClient()
  const { data: organizer, error: organizerError } = await serviceSupabase
    .from('organizer_accounts')
    .select('id, organization_name, contact_info')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (organizerError) {
    throw new Error(`Failed to load organizer account: ${organizerError.message}`)
  }
  if (!organizer) {
    throw new Error('No active organizer account found. Please set up your organizer account first.')
  }

  const organizationName = organizer.organization_name || 'Organizer'
  const slug = await buildUniqueOrgSlug(serviceSupabase, organizationName)

  const orgPayload: Record<string, unknown> = {
    name: organizationName,
    created_by: userId,
  }
  // slug may be absent on older organizations schemas; include when available
  orgPayload.slug = slug

  let { data: createdOrg, error: orgError } = await serviceSupabase
    .from('organizations')
    .insert(orgPayload)
    .select('id')
    .single()

  if (orgError && /slug/i.test(orgError.message || '')) {
    delete orgPayload.slug
    const retry = await serviceSupabase
      .from('organizations')
      .insert(orgPayload)
      .select('id')
      .single()
    createdOrg = retry.data
    orgError = retry.error
  }

  if (orgError || !createdOrg?.id) {
    throw new Error(`Failed to create organization scope: ${orgError?.message || 'No organization returned'}`)
  }

  await ensureOrgMembership(serviceSupabase, createdOrg.id, userId)
  return createdOrg.id as string
}

export async function verifyEventsV2Row(
  supabase: { from: (table: string) => any },
  eventId: string,
  userId: string,
) {
  const { data, error } = await supabase
    .from('events_v2')
    .select('id, title, status, start_at, end_at, venue_id, capacity, settings, created_at, updated_at, created_by, org_id')
    .eq('id', eventId)
    .eq('created_by', userId)
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to verify event persistence: ${error.message}`)
  }
  if (!data?.id) {
    throw new Error('Event publish did not create a verified events_v2 row')
  }

  return data
}

export async function ensureEventOrganizerRole(userId: string, eventId: string) {
  const serviceSupabase = createServiceClient()

  const { data: role, error: roleError } = await serviceSupabase
    .from('rbac_roles')
    .select('id')
    .eq('name', 'Organizer')
    .maybeSingle()

  if (roleError) {
    throw new Error(`Failed to load Organizer role: ${roleError.message}`)
  }
  if (!role?.id) {
    throw new Error('Organizer role is not configured')
  }

  const { data: existing, error: existingError } = await serviceSupabase
    .from('rbac_user_entity_roles')
    .select('id')
    .eq('user_id', userId)
    .eq('entity_type', 'Event')
    .eq('entity_id', eventId)
    .eq('role_id', role.id)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle()

  if (existingError) {
    throw new Error(`Failed to verify event role assignment: ${existingError.message}`)
  }
  if (existing) return

  const { error: insertError } = await serviceSupabase
    .from('rbac_user_entity_roles')
    .insert({
      user_id: userId,
      entity_type: 'Event',
      entity_id: eventId,
      role_id: role.id,
      is_active: true,
    })

  if (insertError) {
    throw new Error(`Failed to assign event organizer role: ${insertError.message}`)
  }
}
