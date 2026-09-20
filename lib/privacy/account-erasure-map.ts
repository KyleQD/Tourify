/**
 * Bounded GDPR account-erasure map.
 *
 * This is deliberately a map, not an executor. The account deletion route is
 * the only current mutation path; entries marked `explicit_delete_pending`
 * must not be added to that path until the active schema and ownership
 * contract are verified.
 */

export type ErasureHandling =
  | 'scrub'
  | 'cascade'
  | 'explicit_delete_pending'
  | 'review_required'

export type AccountErasureMapEntry = {
  table: string
  userColumn: string
  handling: ErasureHandling
  piiSurface: string
  evidence: string
}

/**
 * The first bounded slice of the user-owned data map.
 *
 * `cascade` is included only where an active migration explicitly declares an
 * auth.users foreign key with ON DELETE CASCADE. It is not inferred from the
 * generated TypeScript relationship metadata.
 */
export const ACCOUNT_ERASURE_MAP: readonly AccountErasureMapEntry[] = [
  {
    table: 'job_applications',
    userColumn: 'applicant_id',
    handling: 'scrub',
    piiSurface: 'applicant_email, applicant_phone',
    evidence: 'app/api/account/delete/route.ts PII survivor scrub',
  },
  {
    table: 'artist_dashboard_layouts',
    userColumn: 'user_id',
    handling: 'cascade',
    piiSurface: 'per-user dashboard layout JSON',
    evidence: 'supabase/migrations/20250325120000_artist_dashboard_layouts.sql',
  },
  {
    table: 'user_active_profiles',
    userColumn: 'user_id',
    handling: 'cascade',
    piiSurface: 'active profile selection',
    evidence: 'supabase/migrations/20250100000000_create_missing_auth_tables.sql',
  },
  {
    table: 'portfolio_items',
    userColumn: 'user_id',
    handling: 'cascade',
    piiSurface: 'portfolio title, description, links, and media metadata',
    evidence: 'supabase/migrations/20250819102000_profile_content_core.sql',
  },
  {
    table: 'profile_experiences',
    userColumn: 'user_id',
    handling: 'cascade',
    piiSurface: 'experience title, organization, and description',
    evidence: 'supabase/migrations/20250819102000_profile_content_core.sql',
  },
  {
    table: 'profile_certifications',
    userColumn: 'user_id',
    handling: 'cascade',
    piiSurface: 'certification name, authority, credential, and URL',
    evidence: 'supabase/migrations/20250819102000_profile_content_core.sql',
  },
  {
    table: 'user_skills',
    userColumn: 'user_id',
    handling: 'review_required',
    piiSurface: 'user skill and endorsement records',
    evidence: 'lib/achievements/achievement-reads.ts; no active user_skills migration found',
  },
  {
    table: 'agent_identities',
    userColumn: 'auth_user_id',
    handling: 'review_required',
    piiSurface: 'service-principal linkage and identity metadata',
    evidence: 'supabase/migrations/20260908130000_agent_service_identities.sql uses ON DELETE SET NULL',
  },
] as const

export const ERASURE_MAP_PENDING_EXPLICIT_DELETE = ACCOUNT_ERASURE_MAP.filter(
  (entry) => entry.handling === 'explicit_delete_pending'
)
