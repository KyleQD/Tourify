import { isOrganizationType, normalizeAccountType } from "@/lib/accounts/account-types"
import { normalizeHiringEntityId } from "@/lib/hiring/hiring-entity-id"
import type { HiringEntity, HiringEntityType } from "@/types/hiring-entity"

export interface AccountLikeForHiring {
  account_type?: string | null
  profile_id?: string | null
  profile_data?: Record<string, unknown> | null
  display_name?: string | null
  username?: string | null
}

function getHiringEntityType(accountType: string | undefined | null): HiringEntityType | null {
  const normalized = normalizeAccountType(accountType)
  if (normalized === "venue") return "venue"
  if (normalized === "artist" || normalized === "service") return "artist"
  if (isOrganizationType(normalized) || normalized === "organization") return "organization"
  return null
}

function getDisplayName(account: AccountLikeForHiring): string {
  const profile = account.profile_data ?? {}
  const candidates = [
    account.display_name,
    typeof profile.display_name === "string" ? profile.display_name : null,
    typeof profile.organization_name === "string" ? profile.organization_name : null,
    typeof profile.venue_name === "string" ? profile.venue_name : null,
    typeof profile.artist_name === "string" ? profile.artist_name : null,
    typeof profile.stage_name === "string" ? profile.stage_name : null,
    typeof profile.name === "string" ? profile.name : null,
    account.username,
  ]

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim().length > 0) return candidate
  }

  return "Selected account"
}

/**
 * Build a HiringEntity from the client acting account (useMultiAccount).
 * Returns null for personal/general accounts that cannot hire.
 */
export function hiringEntityFromAccount(account: AccountLikeForHiring | null | undefined): HiringEntity | null {
  if (!account?.profile_id) return null
  const entityType = getHiringEntityType(account.account_type)
  if (!entityType) return null

  const entityId = normalizeHiringEntityId(account.profile_id)

  return {
    entityType,
    entityId,
    displayName: getDisplayName(account),
    scope: entityType === "venue" ? { venueId: entityId } : undefined,
  }
}

export function isHiringEntityShape(value: unknown): value is HiringEntity {
  return Boolean(
    value &&
      typeof value === "object" &&
      "entityType" in value &&
      "entityId" in value &&
      "displayName" in value &&
      typeof (value as HiringEntity).entityType === "string" &&
      typeof (value as HiringEntity).entityId === "string" &&
      typeof (value as HiringEntity).displayName === "string",
  )
}
