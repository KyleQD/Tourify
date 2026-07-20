export type CredentialStatus = "active" | "suspended" | "revoked" | "expired" | "replaced"

export function canUseCredential(input: { status: CredentialStatus; checkedAt: Date; statusFreshUntil: Date }): { allowed: boolean; reason: string } {
  if (input.checkedAt.getTime() > input.statusFreshUntil.getTime()) return { allowed: false, reason: "status_stale" }
  if (input.status !== "active") return { allowed: false, reason: `credential_${input.status}` }
  return { allowed: true, reason: "active_and_fresh" }
}
