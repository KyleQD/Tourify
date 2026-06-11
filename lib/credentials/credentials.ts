/**
 * Credentialing OS helpers — PHYSICAL access credentials.
 *
 * Tables (migration 20260610000300):
 *   credential_templates  — reusable badge definitions
 *   credentials           — issued instance (per event + holder)
 *   credential_access     — zones a credential opens, with windows
 *
 * Physical credentials control physical access to event_zones. They are distinct
 * from RBAC (digital permissions), profile_certifications / staff_documents
 * (verified docs), and role_templates.required_credentials (onboarding reqs).
 *
 * See: docs/domain/live-events-ontology.md §8 (Credentials & Access)
 */

import type { SupabaseClient } from '@supabase/supabase-js'

export type CredentialClass =
  | 'artist'
  | 'vip'
  | 'vendor'
  | 'production'
  | 'medical'
  | 'security'
  | 'crew'
  | 'press'
  | 'staff'
  | 'guest'
  | 'other'

export type CredentialStatus = 'issued' | 'active' | 'revoked' | 'expired' | 'lost'

export type CredentialHolderType =
  | 'general'
  | 'artist'
  | 'service'
  | 'venue'
  | 'organization'
  | 'guest'

export type ZoneAccessLevel = 'entry' | 'escort_required' | 'restricted'

export interface Credential {
  id: string
  template_id: string | null
  event_id: string | null
  venue_id: string | null
  credential_class: CredentialClass
  label: string | null
  holder_user_id: string | null
  holder_profile_id: string | null
  holder_type: CredentialHolderType | null
  holder_name: string | null
  code: string | null
  status: CredentialStatus
  valid_from: string | null
  valid_until: string | null
  issued_by: string | null
  issued_at: string
  revoked_at: string | null
  revoked_reason: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface IssueCredentialInput {
  eventId?: string | null
  venueId?: string | null
  templateId?: string | null
  credentialClass: CredentialClass
  label?: string | null
  holderUserId?: string | null
  holderProfileId?: string | null
  holderType?: CredentialHolderType | null
  holderName?: string | null
  code?: string | null
  validFrom?: string | null
  validUntil?: string | null
  issuedBy?: string | null
  /** Zones this credential opens. Pass a single null zoneId for an all-access pass. */
  zones?: Array<{ zoneId: string | null; accessLevel?: ZoneAccessLevel }>
  metadata?: Record<string, unknown>
  /** Issue as immediately active rather than the default 'issued'. */
  activate?: boolean
}

const CREDENTIALS = 'credentials'
const CREDENTIAL_ACCESS = 'credential_access'

/** Generate a reasonably unique scannable code (caller may override). */
export function generateCredentialCode(prefix = 'CRED'): string {
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase()
  const ts = Date.now().toString(36).toUpperCase().slice(-5)
  return `${prefix}-${ts}-${rand}`
}

/**
 * Issue a credential and (optionally) its zone access rows.
 * Throws a user-friendly error on failure.
 */
export async function issueCredential(
  supabase: SupabaseClient,
  input: IssueCredentialInput
): Promise<Credential> {
  if (!input.eventId && !input.venueId) {
    throw new Error('A credential must be scoped to an event or a venue')
  }

  const { data: credential, error } = await supabase
    .from(CREDENTIALS)
    .insert({
      template_id: input.templateId ?? null,
      event_id: input.eventId ?? null,
      venue_id: input.venueId ?? null,
      credential_class: input.credentialClass,
      label: input.label ?? null,
      holder_user_id: input.holderUserId ?? null,
      holder_profile_id: input.holderProfileId ?? null,
      holder_type: input.holderType ?? null,
      holder_name: input.holderName ?? null,
      code: input.code ?? generateCredentialCode(),
      status: input.activate ? 'active' : 'issued',
      valid_from: input.validFrom ?? null,
      valid_until: input.validUntil ?? null,
      issued_by: input.issuedBy ?? null,
      metadata: input.metadata ?? {},
    })
    .select('*')
    .single()

  if (error) throw new Error(`Failed to issue credential: ${error.message}`)

  if (input.zones && input.zones.length > 0) {
    const rows = input.zones.map(z => ({
      credential_id: (credential as Credential).id,
      zone_id: z.zoneId,
      access_level: z.accessLevel ?? 'entry',
    }))
    const { error: accessError } = await supabase.from(CREDENTIAL_ACCESS).insert(rows)
    if (accessError) {
      throw new Error(`Credential issued but zone access failed: ${accessError.message}`)
    }
  }

  return credential as Credential
}

/** Activate an issued credential (issued → active). */
export async function activateCredential(
  supabase: SupabaseClient,
  credentialId: string
): Promise<void> {
  const { error } = await supabase
    .from(CREDENTIALS)
    .update({ status: 'active' })
    .eq('id', credentialId)
  if (error) throw new Error(`Failed to activate credential: ${error.message}`)
}

/** Revoke a credential with an optional reason. */
export async function revokeCredential(
  supabase: SupabaseClient,
  credentialId: string,
  reason?: string
): Promise<void> {
  const { error } = await supabase
    .from(CREDENTIALS)
    .update({
      status: 'revoked',
      revoked_at: new Date().toISOString(),
      revoked_reason: reason ?? null,
    })
    .eq('id', credentialId)
  if (error) throw new Error(`Failed to revoke credential: ${error.message}`)
}

/** Grant a credential access to a zone (null zoneId = all-access). */
export async function grantZoneAccess(
  supabase: SupabaseClient,
  credentialId: string,
  zoneId: string | null,
  accessLevel: ZoneAccessLevel = 'entry'
): Promise<void> {
  const { error } = await supabase
    .from(CREDENTIAL_ACCESS)
    .insert({ credential_id: credentialId, zone_id: zoneId, access_level: accessLevel })
  if (error) throw new Error(`Failed to grant zone access: ${error.message}`)
}

/** Revoke a credential's access to a specific zone. */
export async function revokeZoneAccess(
  supabase: SupabaseClient,
  credentialId: string,
  zoneId: string | null
): Promise<void> {
  let query = supabase.from(CREDENTIAL_ACCESS).delete().eq('credential_id', credentialId)
  query = zoneId === null ? query.is('zone_id', null) : query.eq('zone_id', zoneId)
  const { error } = await query
  if (error) throw new Error(`Failed to revoke zone access: ${error.message}`)
}

/**
 * Gate check: does a credential currently open a zone? Uses the DB function so the
 * window/status logic stays in one place. Best-effort false on error.
 */
export async function credentialOpensZone(
  supabase: SupabaseClient,
  credentialId: string,
  zoneId: string,
  at: Date = new Date()
): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('credential_opens_zone', {
      p_credential_id: credentialId,
      p_zone_id: zoneId,
      p_at: at.toISOString(),
    })
    if (error) return false
    return Boolean(data)
  } catch {
    return false
  }
}

/** Look up a credential by its scannable code (for gate scanning). */
export async function getCredentialByCode(
  supabase: SupabaseClient,
  code: string
): Promise<Credential | null> {
  const { data, error } = await supabase
    .from(CREDENTIALS)
    .select('*')
    .eq('code', code)
    .maybeSingle()
  if (error) throw new Error(`Failed to look up credential: ${error.message}`)
  return (data as Credential) ?? null
}

/** List credentials for an event or venue scope. */
export async function listCredentials(
  supabase: SupabaseClient,
  scope: { eventId?: string | null; venueId?: string | null; holderUserId?: string | null }
): Promise<Credential[]> {
  let query = supabase.from(CREDENTIALS).select('*').order('issued_at', { ascending: false })
  if (scope.eventId) query = query.eq('event_id', scope.eventId)
  if (scope.venueId) query = query.eq('venue_id', scope.venueId)
  if (scope.holderUserId) query = query.eq('holder_user_id', scope.holderUserId)
  const { data, error } = await query
  if (error) throw new Error(`Failed to list credentials: ${error.message}`)
  return (data ?? []) as Credential[]
}
