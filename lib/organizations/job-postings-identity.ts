/**
 * Organization display-name resolution for job posting surfaces
 * (SIM-20260922-ORG-003 / ORG-008).
 *
 * Organization-owned rows in `job_posting_templates` carry
 * `employer_entity_type = 'organization'` and `employer_entity_id` = the owning
 * tenant id (`organizations.id`, see ORG-002 canonical identity model).
 *
 * The unified jobs board can be read with the request-scoped client (fallback
 * path), where `organizations` RLS (`orgs_select`) only exposes rows to org
 * members. A worker viewer therefore resolves display identity through the
 * public brand profile (`organizer_accounts`, public-select policy for active
 * public brands) bridged by `ops_org_id`, falling back to the canonical tenant
 * name when no public brand row exists.
 *
 * Derivation is server-side only. A client-supplied label is never used as
 * display identity, and an org without a resolvable profile is emitted with a
 * null name rather than a fabricated label.
 */

export interface OrganizationDisplayNameRow {
  ops_org_id: string | null | undefined
  organization_name: string | null | undefined
}

export interface OrganizationTenantNameRow {
  id: string
  name: string | null | undefined
}

/** Minimal client shape satisfied by the Supabase query builder used in routes. */
export interface OrganizationIdentityClient {
  from: (table: 'organizer_accounts' | 'organizations') => {
    select: (columns: string) => any
  }
}

function asOrganizationDisplayNameRow(value: unknown): OrganizationDisplayNameRow | null {
  if (!value || typeof value !== 'object') return null
  const row = value as Record<string, unknown>
  const opsOrgId = typeof row.ops_org_id === 'string' ? row.ops_org_id : null
  const name = typeof row.organization_name === 'string' ? row.organization_name : null
  return { ops_org_id: opsOrgId, organization_name: name }
}

function asOrganizationTenantNameRow(value: unknown): OrganizationTenantNameRow | null {
  if (!value || typeof value !== 'object') return null
  const row = value as Record<string, unknown>
  const id = typeof row.id === 'string' ? row.id : null
  const name = typeof row.name === 'string' ? row.name : null
  return id ? { id, name } : null
}

/**
 * Resolve display names for a set of owning organization tenant ids.
 *
 * Prefers the public brand name from `organizer_accounts` (readable by worker
 * viewers), then the canonical `organizations.name`. Degrades to an empty map
 * (null names downstream) instead of failing the whole job board when either
 * source is unavailable.
 */
export async function resolveOrganizationDisplayNames(
  client: OrganizationIdentityClient,
  organizationIds: string[]
): Promise<Map<string, string>> {
  const ids = Array.from(
    new Set((organizationIds || []).map((id) => String(id).trim()).filter(Boolean))
  )
  const names = new Map<string, string>()
  if (!ids.length) return names

  try {
    const brands = await client
      .from('organizer_accounts')
      .select('ops_org_id, organization_name')
      .in('ops_org_id', ids)

    for (const raw of (brands?.data ?? []) as unknown[]) {
      const brand = asOrganizationDisplayNameRow(raw)
      const orgId = brand?.ops_org_id
      const name = brand?.organization_name
      if (orgId && name) names.set(orgId, name)
    }
  } catch (error) {
    console.warn(
      '[organization identity] organizer_accounts name resolution failed; falling back to tenant names.',
      error
    )
  }

  const missing = ids.filter((id) => !names.has(id))
  if (missing.length) {
    try {
      const tenants = await client
        .from('organizations')
        .select('id, name')
        .in('id', missing)

      for (const raw of (tenants?.data ?? []) as unknown[]) {
        const tenant = asOrganizationTenantNameRow(raw)
        if (tenant?.id && tenant.name) names.set(tenant.id, tenant.name)
      }
    } catch (error) {
      console.warn('[organization identity] organizations name resolution failed.', error)
    }
  }

  return names
}