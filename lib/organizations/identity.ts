/**
 * Canonical organization identity contract.
 *
 * An organization has one tenant identity and may have several projections:
 *
 * - `organizations.id` is the tenant identity and the scope key.
 * - `org_members` is the authorization boundary for that tenant.
 * - `organizer_accounts.id` is the public/ops profile identity, linked to the
 *   tenant by `organizer_accounts.ops_org_id`.
 * - `accounts` is a compatibility/search projection of the public profile;
 *   it is never an authorization grant and is not a second organization.
 *
 * Keep this mapping in one place while legacy account rows are still present.
 * Database migrations remain the source of truth for the underlying schema.
 */

import { ORGANIZATION_ACCOUNT_TYPE_ALIASES } from '@/lib/accounts/account-types'

export const ORGANIZATION_IDENTITY_TABLES = {
  tenant: 'organizations',
  membership: 'org_members',
  publicProfile: 'organizer_accounts',
  accountProjection: 'accounts',
} as const

export interface CanonicalOrganizationIdentity {
  kind: 'organization'
  /** `organizations.id`, used for tenant scope and authorization. */
  organizationId: string
  /** `organizer_accounts.id`, used for the public/ops profile. */
  organizerAccountId: string
  /** Optional `accounts.id` compatibility/search projection. */
  accountProjectionId: string | null
}

export interface OrganizerAccountIdentityRow {
  id: string | null | undefined
  ops_org_id: string | null | undefined
}

export interface AccountProjectionIdentityRow {
  id?: string | null
  account_type?: string | null
  profile_table?: string | null
  profile_id?: string | null
}

/**
 * Build the canonical identity from the tenant/profile bridge.
 * A public profile without an ops tenant is a legacy/unscoped record and
 * must not be used for organization-scoped authorization.
 */
export function createCanonicalOrganizationIdentity(input: {
  organizerAccountId: string | null | undefined
  organizationId: string | null | undefined
  accountProjectionId?: string | null | undefined
}): CanonicalOrganizationIdentity | null {
  const organizerAccountId = input.organizerAccountId?.trim()
  const organizationId = input.organizationId?.trim()
  if (!organizerAccountId || !organizationId) return null

  return {
    kind: 'organization',
    organizationId,
    organizerAccountId,
    accountProjectionId: input.accountProjectionId?.trim() || null,
  }
}

export function organizationIdentityFromOrganizerAccount(
  row: OrganizerAccountIdentityRow,
  accountProjectionId?: string | null,
): CanonicalOrganizationIdentity | null {
  return createCanonicalOrganizationIdentity({
    organizerAccountId: row.id,
    organizationId: row.ops_org_id,
    accountProjectionId,
  })
}

/**
 * `accounts` may mirror an organization profile for discovery and switcher
 * compatibility. It must point back to the organizer profile and use an
 * accepted legacy/canonical organization account type.
 */
export function isOrganizationAccountProjection(
  row: AccountProjectionIdentityRow | null | undefined,
  organizerAccountId: string,
): row is AccountProjectionIdentityRow & { id: string; profile_id: string } {
  return Boolean(
    row?.id &&
      row.profile_table === ORGANIZATION_IDENTITY_TABLES.publicProfile &&
      row.profile_id === organizerAccountId &&
      typeof row.account_type === 'string' &&
      (ORGANIZATION_ACCOUNT_TYPE_ALIASES as readonly string[]).includes(row.account_type),
  )
}

