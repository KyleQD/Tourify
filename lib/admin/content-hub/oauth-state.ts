export interface OrgSocialOAuthState {
  nonce: string
  scope: "organization" | "artist"
  returnTo: "admin" | "artist"
  organizerAccountId?: string
  opsOrgId?: string
  platform: string
}

export function encodeSocialOAuthState(state: OrgSocialOAuthState): string {
  return Buffer.from(JSON.stringify(state), "utf8").toString("base64url")
}

export function decodeSocialOAuthState(raw: string | null | undefined): OrgSocialOAuthState | null {
  if (!raw) return null
  try {
    const decoded = Buffer.from(raw, "base64url").toString("utf8")
    const parsed = JSON.parse(decoded) as Partial<OrgSocialOAuthState>
    if (!parsed.platform || !parsed.scope || !parsed.returnTo || !parsed.nonce) return null
    return {
      nonce: String(parsed.nonce),
      scope: parsed.scope === "organization" ? "organization" : "artist",
      returnTo: parsed.returnTo === "admin" ? "admin" : "artist",
      organizerAccountId: parsed.organizerAccountId ? String(parsed.organizerAccountId) : undefined,
      opsOrgId: parsed.opsOrgId ? String(parsed.opsOrgId) : undefined,
      platform: String(parsed.platform),
    }
  } catch {
    return null
  }
}
