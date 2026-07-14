import type { MobileAccountType } from "@/lib/api/accounts"

/**
 * Build acting-context headers so the web API attributes feed/post actions to the
 * currently active account. Mirrors `lib/auth/acting-context.ts` on the web side,
 * which reads `x-acting-profile-id` / `x-acting-account-type`.
 */
export function buildActingHeaders(active: {
  profileId: string
  accountType: MobileAccountType
} | null): Record<string, string> {
  if (!active?.profileId) return {}
  return {
    "x-acting-profile-id": active.profileId,
    "x-acting-account-type": active.accountType,
  }
}
