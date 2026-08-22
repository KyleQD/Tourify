import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"
import { canManageHiring } from "@/lib/auth/hiring-permissions"
import {
  fetchVenueIdentityBridge,
  upsertVenueIdentityBridge,
} from "@/lib/venue/identity-bridge"

export type VenuePermission =
  | "manage_bookings"
  | "manage_events"
  | "manage_ticketing"
  | "manage_team"
  | "manage_documents"
  | "view_analytics"
  | "view_finances"
  | "manage_finances"
  | "door_check_in"

export interface VenueAccessResult {
  allowed: boolean
  reason?: string
}

export interface VenueContext {
  id: string
  venueProfileId: string
  venuesId?: string | null
  venuesV2Id?: string | null
  operationalOrgId?: string | null
  venue_name?: string | null
  displayName?: string | null
  url_slug?: string | null
  city?: string | null
  state?: string | null
  address?: string | null
  capacity?: number | null
  capacity_total?: number | null
  avatar_url?: string | null
  cover_image_url?: string | null
  contact_info?: Record<string, unknown> | null
  settings?: Record<string, unknown> | null
  role: "owner" | "team"
  permissions: Record<string, boolean>
}

const OWNER_SELECT =
  "id, venue_name, url_slug, city, state, address, capacity, capacity_total, avatar_url, cover_image_url, contact_info, settings"

const DEFAULT_OWNER_PERMISSIONS: Record<string, boolean> = {
  manage_bookings: true,
  manage_events: true,
  manage_ticketing: true,
  manage_team: true,
  manage_documents: true,
  view_analytics: true,
  view_finances: true,
  manage_finances: true,
  door_check_in: true,
}

function normalizeSettings(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {}
  return value as Record<string, unknown>
}

function normalizePermissions(value: unknown): Record<string, boolean> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {}
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, allowed]) => [key, Boolean(allowed)]),
  )
}

function buildSlug(input: string, suffix?: string) {
  const base = (input || "venue")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 48)
  return [base || "venue", suffix].filter(Boolean).join("-")
}

function buildVenueContext(row: any, role: "owner" | "team", permissions: Record<string, boolean>): VenueContext {
  const settings = normalizeSettings(row?.settings)
  const venueProfileId = row.id
  const venuesId = typeof settings.venues_id === "string" ? settings.venues_id : null
  const venuesV2Id = typeof settings.venues_v2_id === "string" ? settings.venues_v2_id : null
  const operationalOrgId = typeof settings.operational_org_id === "string" ? settings.operational_org_id : null

  return {
    ...(row as any),
    id: venueProfileId,
    venueProfileId,
    venuesId,
    venuesV2Id,
    operationalOrgId,
    displayName: row?.venue_name || row?.name || "Venue",
    role,
    permissions,
    settings,
  }
}

function canSatisfyPermission(permissions: Record<string, boolean>, permission?: VenuePermission) {
  if (!permission) return true
  if (permissions[permission]) return true
  if (permission === "manage_ticketing" && permissions.manage_events) return true
  if (permission === "door_check_in" && permissions.manage_ticketing) return true
  return false
}

export async function getManageableVenueIds(
  supabase: SupabaseClient,
  userId: string,
  permission?: VenuePermission,
) {
  const [{ data: ownerRows }, { data: teamRows }, { data: staffRows }, { data: assignmentRows }] = await Promise.all([
    supabase
      .from("venue_profiles")
      .select("id")
      .or(`user_id.eq.${userId},main_profile_id.eq.${userId}`),
    supabase
      .from("venue_team_members")
      .select("venue_id, permissions")
      .eq("user_id", userId)
      .eq("status", "active"),
    supabase
      .from("staff_members")
      .select("venue_id, employer_entity_id, permissions")
      .eq("user_id", userId)
      .eq("status", "active")
      .eq("employer_entity_type", "venue"),
    supabase
      .from("employment_assignments")
      .select("venue_id, employer_entity_id, permissions")
      .eq("user_id", userId)
      .in("status", ["confirmed", "active"])
      .eq("employer_entity_type", "venue"),
  ])

  const ownerIds = (ownerRows || []).map((row: any) => row.id).filter(Boolean)
  const staffIds = (staffRows || [])
    .filter((row: any) => canSatisfyPermission(normalizePermissions(row.permissions), permission))
    .map((row: any) => row.employer_entity_id || row.venue_id)
    .filter(Boolean)
  const assignmentIds = (assignmentRows || [])
    .filter((row: any) => canSatisfyPermission(normalizePermissions(row.permissions), permission))
    .map((row: any) => row.employer_entity_id || row.venue_id)
    .filter(Boolean)
  const teamIds = (teamRows || [])
    .filter((row: any) => canSatisfyPermission(normalizePermissions(row.permissions), permission))
    .map((row: any) => row.venue_id)
    .filter(Boolean)

  return Array.from(new Set([...ownerIds, ...staffIds, ...assignmentIds, ...teamIds]))
}

export async function canManageVenue(
  supabase: SupabaseClient,
  userId: string,
  venueId: string,
  permission?: VenuePermission,
): Promise<VenueAccessResult> {
  if (!userId || !venueId) return { allowed: false, reason: "Missing user or venue." }

  const { data: ownerRow } = await supabase
    .from("venue_profiles")
    .select("id")
    .eq("id", venueId)
    .or(`user_id.eq.${userId},main_profile_id.eq.${userId}`)
    .maybeSingle()

  if (ownerRow?.id) return { allowed: true }

  const [{ data: staffRows }, { data: assignmentRows }] = await Promise.all([
    supabase
      .from("staff_members")
      .select("id, venue_id, employer_entity_id, permissions")
      .eq("user_id", userId)
      .eq("status", "active")
      .eq("employer_entity_type", "venue")
      .limit(5),
    supabase
      .from("employment_assignments")
      .select("id, venue_id, employer_entity_id, permissions")
      .eq("user_id", userId)
      .in("status", ["confirmed", "active"])
      .eq("employer_entity_type", "venue")
      .limit(5),
  ])

  const canonicalAllowed = [...(staffRows || []), ...(assignmentRows || [])].some((row: any) => {
    const rowVenueId = row.employer_entity_id || row.venue_id
    return rowVenueId === venueId && canSatisfyPermission(normalizePermissions(row.permissions), permission)
  })
  if (canonicalAllowed) return { allowed: true }

  const { data: teamRows } = await supabase
    .from("venue_team_members")
    .select("id, permissions")
    .eq("venue_id", venueId)
    .eq("user_id", userId)
    .eq("status", "active")
    .limit(5)

  const teamAllowed = (teamRows || []).some((row: any) =>
    canSatisfyPermission(normalizePermissions(row.permissions), permission),
  )
  if (teamAllowed) return { allowed: true }

  if (permission === "manage_team") {
    const hiringResult = await canManageHiring({
      supabase,
      userId,
      employer: {
        entityType: "venue",
        entityId: venueId,
        displayName: `venue:${venueId}`,
      },
    })
    if (hiringResult.ok && hiringResult.data.allowed) return { allowed: true }
  }

  return { allowed: false, reason: "You do not have permission for this venue." }
}

export async function getCurrentVenueContext(
  supabase: SupabaseClient,
  userId: string,
  requestedVenueId?: string | null,
): Promise<VenueContext | null> {
  let ownerQuery = supabase
    .from("venue_profiles")
    .select(OWNER_SELECT)
    .or(`user_id.eq.${userId},main_profile_id.eq.${userId}`)
    .order("created_at", { ascending: true })
    .limit(1)

  if (requestedVenueId) ownerQuery = ownerQuery.eq("id", requestedVenueId)
  const { data: ownerRows } = await ownerQuery
  const owner = ownerRows?.[0]

  if (owner?.id) {
    return buildVenueContext(owner, "owner", DEFAULT_OWNER_PERMISSIONS)
  }

  let staffQuery = supabase
    .from("staff_members")
    .select("venue_id, employer_entity_id, permissions")
    .eq("user_id", userId)
    .eq("status", "active")
    .eq("employer_entity_type", "venue")
    .limit(1)

  if (requestedVenueId) staffQuery = staffQuery.eq("employer_entity_id", requestedVenueId)
  const { data: staffRows } = await staffQuery
  const staffRow = staffRows?.[0] as any
  const staffVenueId = staffRow?.employer_entity_id || staffRow?.venue_id
  const { data: staffVenue } = staffVenueId
    ? await supabase.from("venue_profiles").select(OWNER_SELECT).eq("id", staffVenueId).maybeSingle()
    : { data: null as any }

  if (staffVenue?.id) return buildVenueContext(staffVenue, "team", normalizePermissions(staffRow.permissions))

  let teamQuery = supabase
    .from("venue_team_members")
    .select(`venue_id, permissions, venue_profiles:venue_id (${OWNER_SELECT})`)
    .eq("user_id", userId)
    .eq("status", "active")
    .limit(1)

  if (requestedVenueId) teamQuery = teamQuery.eq("venue_id", requestedVenueId)
  const { data: teamRows } = await teamQuery
  const teamRow = teamRows?.[0] as any
  const venue = Array.isArray(teamRow?.venue_profiles) ? teamRow.venue_profiles[0] : teamRow?.venue_profiles

  if (!venue?.id) return null

  return buildVenueContext(venue, "team", normalizePermissions(teamRow.permissions))
}

export async function ensureVenueOperationalContext(
  service: SupabaseClient,
  venue: VenueContext,
  userId: string,
) {
  const settings = normalizeSettings(venue.settings)
  // ADR-0001: prefer the relational identity bridge over settings JSON.
  const bridge = await fetchVenueIdentityBridge(service, venue.id)
  let venuesV2Id = bridge?.venuesV2Id || venue.venuesV2Id || null
  let operationalOrgId = bridge?.operationalOrgId || venue.operationalOrgId || null

  if (!operationalOrgId) {
    const baseSlug = buildSlug(venue.url_slug || venue.venue_name || venue.id, `venue-${venue.id.slice(0, 8)}`)
    const { data: org } = await service
      .from("organizations")
      .upsert(
        {
          name: `${venue.displayName || venue.venue_name || "Venue"} Operations`,
          slug: baseSlug,
          settings: {
            source: "venue",
            venue_profile_id: venue.id,
          },
          created_by: userId,
        },
        { onConflict: "slug" },
      )
      .select("id")
      .single()

    operationalOrgId = org?.id || null

    if (operationalOrgId) {
      await service.from("org_members").upsert(
        {
          org_id: operationalOrgId,
          user_id: userId,
          role: "owner",
          invited_by: userId,
        },
        { onConflict: "org_id,user_id" },
      )
    }
  }

  if (!venuesV2Id) {
    const baseSlug = buildSlug(venue.url_slug || venue.venue_name || venue.id, venue.id.slice(0, 8))
    const { data: venuesV2 } = await service
      .from("venues_v2")
      .upsert(
        {
          name: venue.displayName || venue.venue_name || "Venue",
          slug: baseSlug,
          created_by: userId,
        },
        { onConflict: "slug" },
      )
      .select("id")
      .single()

    venuesV2Id = venuesV2?.id || null
  }

  const nextSettings = {
    ...settings,
    ...(venuesV2Id ? { venues_v2_id: venuesV2Id } : {}),
    ...(operationalOrgId ? { operational_org_id: operationalOrgId } : {}),
  }

  if (venuesV2Id !== venue.venuesV2Id || operationalOrgId !== venue.operationalOrgId) {
    await service.from("venue_profiles").update({ settings: nextSettings }).eq("id", venue.id)
  }

  // Write-through to the relational bridge (ADR-0001 migration window dual-write).
  if (venuesV2Id || operationalOrgId) {
    const bridgeChanged =
      !bridge ||
      bridge.venuesV2Id !== venuesV2Id ||
      bridge.operationalOrgId !== operationalOrgId
    if (bridgeChanged) {
      await upsertVenueIdentityBridge(
        service,
        { venueProfileId: venue.id, venuesV2Id, operationalOrgId },
        "runtime",
      )
    }
  }

  return {
    ...venue,
    venuesV2Id,
    operationalOrgId,
    settings: nextSettings,
  }
}
