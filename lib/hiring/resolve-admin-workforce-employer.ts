import "server-only"

import { isOrganizationType, normalizeAccountType } from "@/lib/accounts/account-types"
import { loadUserAccountsForSession } from "@/lib/accounts/server-load-accounts"
import { buildEmployerFromSearchParams } from "@/lib/hiring/employer-search-params"
import { normalizeHiringEntityId } from "@/lib/hiring/hiring-entity-id"
import type { UserAccount } from "@/lib/services/account-management.service"
import type { HiringEntity, HiringEntityType } from "@/types/hiring-entity"

interface ResolveAdminWorkforceEmployerArgs {
  searchParams: Record<string, string | string[] | undefined>
  fallbackDisplayName?: string
}

function getDisplayName(account: UserAccount): string {
  const profile = account.profile_data as Record<string, unknown> | null | undefined
  const candidates = [
    account.profile_data?.display_name,
    profile?.organization_name,
    profile?.venue_name,
    profile?.artist_name,
    profile?.stage_name,
    profile?.name,
  ]

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim().length > 0) return candidate
  }

  return "Selected account"
}

function getHiringEntityType(accountType: string | undefined): HiringEntityType | null {
  const normalized = normalizeAccountType(accountType)
  if (normalized === "venue") return "venue"
  if (normalized === "artist" || normalized === "service") return "artist"
  if (isOrganizationType(normalized)) return "organization"
  return null
}

function toHiringEntity(account: UserAccount): HiringEntity | null {
  const entityType = getHiringEntityType(account.account_type)
  if (!entityType || !account.profile_id) return null

  const entityId = normalizeHiringEntityId(account.profile_id)

  return {
    entityType,
    entityId,
    displayName: getDisplayName(account),
    scope: entityType === "venue" ? { venueId: entityId } : undefined,
  }
}

function findActiveAccount(accounts: UserAccount[], activeProfileId?: string): UserAccount | null {
  if (activeProfileId) {
    const activeAccount = accounts.find((account) => account.profile_id === activeProfileId && account.is_active)
    if (activeAccount) return activeAccount
  }

  return (
    accounts.find((account) => isOrganizationType(account.account_type) && account.is_active) ??
    accounts.find((account) => getHiringEntityType(account.account_type) && account.is_active) ??
    null
  )
}

export async function resolveAdminWorkforceEmployer({
  searchParams,
  fallbackDisplayName,
}: ResolveAdminWorkforceEmployerArgs): Promise<HiringEntity | null> {
  const searchEmployer = buildEmployerFromSearchParams({ searchParams, fallbackDisplayName })
  if (searchEmployer) return searchEmployer

  const loaded = await loadUserAccountsForSession()
  if (!loaded) return null

  const activeAccount = findActiveAccount(loaded.accounts, loaded.activeSession?.active_profile_id)
  if (!activeAccount) return null

  return toHiringEntity(activeAccount)
}
