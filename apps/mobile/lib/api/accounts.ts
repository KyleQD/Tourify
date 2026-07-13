import { apiRequest } from "@/lib/api/client"

export type MobileAccountType = "general" | "artist" | "service" | "venue" | "organization" | "staff"

export interface UserAccountProfileData {
  username?: string | null
  custom_url?: string | null
  full_name?: string | null
  artist_name?: string | null
  venue_name?: string | null
  organization_name?: string | null
  avatar_url?: string | null
  is_verified?: boolean | null
  [key: string]: unknown
}

export interface UserAccount {
  account_type: MobileAccountType
  profile_id: string
  profile_data: UserAccountProfileData
}

export interface ActiveSession {
  active_profile_id: string
  active_account_type: MobileAccountType
}

interface AccountsResponse {
  accounts: UserAccount[]
  activeSession: ActiveSession | null
  success: boolean
}

export async function getUserAccounts() {
  const payload = await apiRequest<AccountsResponse>("/api/accounts")
  return {
    accounts: Array.isArray(payload.accounts) ? payload.accounts : [],
    activeSession: payload.activeSession ?? null,
  }
}

export async function switchAccountOnServer(profileId: string, accountType: MobileAccountType) {
  return apiRequest<{ success: boolean }>("/api/accounts", {
    method: "POST",
    body: JSON.stringify({ action: "switch_account", profileId, accountType }),
  })
}

export function getAccountDisplayName(account: Pick<UserAccount, "account_type" | "profile_data">): string {
  const data = account.profile_data ?? {}
  switch (account.account_type) {
    case "artist":
    case "service":
      return data.artist_name || "Artist Account"
    case "venue":
      return data.venue_name || "Venue Account"
    case "organization":
      return data.organization_name || "Organization"
    default:
      return data.full_name || data.username || "Personal Account"
  }
}

const accountTypeLabels: Record<MobileAccountType, string> = {
  general: "Personal",
  artist: "Artist",
  service: "Service Provider",
  venue: "Venue",
  organization: "Organization",
  staff: "Staff",
}

export function getAccountTypeLabel(type: MobileAccountType): string {
  return accountTypeLabels[type] ?? type
}

/** Username/custom_url used to build a public profile route for an account. */
export function getAccountUsername(account: Pick<UserAccount, "profile_data">): string | null {
  const data = account.profile_data ?? {}
  return data.custom_url || data.username || null
}
