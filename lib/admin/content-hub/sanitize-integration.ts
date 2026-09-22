import type {
  OrganizationSocialIntegration,
  OrganizationSocialIntegrationRow,
} from "@/types/organization-social-integrations.type"

export function sanitizeOrganizationSocialIntegration(
  row: OrganizationSocialIntegrationRow,
): OrganizationSocialIntegration {
  const {
    access_token: accessToken,
    refresh_token: refreshToken,
    token_envelope: tokenEnvelope,
    refresh_token_envelope: refreshTokenEnvelope,
    ...safe
  } = row

  return {
    ...safe,
    analytics: (safe.analytics || {}) as Record<string, unknown>,
    has_token: Boolean(tokenEnvelope || accessToken),
    has_refresh_token: Boolean(refreshTokenEnvelope || refreshToken),
  }
}

export function sanitizeOrganizationSocialIntegrations(
  rows: OrganizationSocialIntegrationRow[],
): OrganizationSocialIntegration[] {
  return rows.map(sanitizeOrganizationSocialIntegration)
}
