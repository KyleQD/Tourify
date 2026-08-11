import { describe, expect, it } from "vitest"
import {
  buildOrgPlatformAnalyticsMap,
  resolveOrgIntegrationStatus,
} from "@/lib/admin/content-hub/build-platform-analytics"
import { sanitizeOrganizationSocialIntegration } from "@/lib/admin/content-hub/sanitize-integration"
import {
  decodeSocialOAuthState,
  encodeSocialOAuthState,
} from "@/lib/admin/content-hub/oauth-state"
import type { OrganizationSocialIntegration } from "@/types/organization-social-integrations.type"

function makeIntegration(
  overrides: Partial<OrganizationSocialIntegration> &
    Pick<OrganizationSocialIntegration, "platform">,
): OrganizationSocialIntegration {
  return {
    id: "int-1",
    organizer_account_id: "org-profile-1",
    ops_org_id: "ops-1",
    account_handle: "dreamstream",
    token_expires_at: null,
    is_connected: true,
    last_sync: new Date().toISOString(),
    analytics: {},
    connected_by: "user-1",
    created_at: "",
    updated_at: "",
    has_token: true,
    has_refresh_token: false,
    ...overrides,
  }
}

describe("admin content hub oauth state", () => {
  it("round-trips organization admin state", () => {
    const encoded = encodeSocialOAuthState({
      nonce: "abc123",
      scope: "organization",
      returnTo: "admin",
      organizerAccountId: "org-profile-1",
      opsOrgId: "ops-1",
      platform: "instagram",
    })
    const decoded = decodeSocialOAuthState(encoded)
    expect(decoded).toEqual({
      nonce: "abc123",
      scope: "organization",
      returnTo: "admin",
      organizerAccountId: "org-profile-1",
      opsOrgId: "ops-1",
      platform: "instagram",
    })
  })

  it("returns null for invalid state", () => {
    expect(decodeSocialOAuthState("not-valid")).toBeNull()
    expect(decodeSocialOAuthState(null)).toBeNull()
  })
})

describe("admin content hub analytics honesty", () => {
  it("marks Meta synced metrics and YT/TT/X as unsupported", () => {
    const platforms = buildOrgPlatformAnalyticsMap([
      makeIntegration({
        platform: "instagram",
        analytics: {
          status: "synced",
          followers: 2400,
          impressions: 900,
          reach: 700,
          engagement: 12,
          synced_at: "2026-07-19T00:00:00.000Z",
        },
      }),
      makeIntegration({
        platform: "youtube",
        analytics: { status: "unsupported" },
      }),
      makeIntegration({
        platform: "tiktok",
        analytics: { status: "unsupported", followers: 99999 },
      }),
    ])

    expect(platforms.instagram.status).toBe("synced")
    expect(platforms.instagram.followers).toBe(2400)
    expect(platforms.youtube.status).toBe("unsupported")
    expect(platforms.youtube.followers).toBe(0)
    expect(platforms.tiktok.status).toBe("unsupported")
    expect(platforms.tiktok.followers).toBe(0)
  })

  it("flags expired tokens as needs_oauth", () => {
    const status = resolveOrgIntegrationStatus(
      makeIntegration({
        platform: "facebook",
        token_expires_at: "2020-01-01T00:00:00.000Z",
        has_token: true,
      }),
    )
    expect(status.status).toBe("needs_oauth")
  })
})

describe("admin content hub credential sanitization", () => {
  it("never exposes access_token or envelopes in sanitized output", () => {
    const safe = sanitizeOrganizationSocialIntegration({
      id: "int-1",
      organizer_account_id: "org-profile-1",
      ops_org_id: "ops-1",
      platform: "instagram",
      account_handle: "dreamstream",
      access_token: "secret-token",
      refresh_token: "secret-refresh",
      token_envelope: { version: "v1" },
      refresh_token_envelope: { version: "v1" },
      token_expires_at: null,
      is_connected: true,
      last_sync: null,
      analytics: { status: "synced", followers: 10 },
      connected_by: "user-1",
      created_at: "",
      updated_at: "",
    })

    expect(safe).not.toHaveProperty("access_token")
    expect(safe).not.toHaveProperty("refresh_token")
    expect(safe).not.toHaveProperty("token_envelope")
    expect(safe).not.toHaveProperty("refresh_token_envelope")
    expect(JSON.stringify(safe)).not.toContain("secret-token")
    expect(safe.has_token).toBe(true)
    expect(safe.has_refresh_token).toBe(true)
  })
})

describe("admin content hub org post scoping contract", () => {
  it("org posts helper filters by posted_as_profile_id", async () => {
    const source = await import("node:fs").then((fs) =>
      fs.readFileSync("lib/admin/content-hub/org-posts.ts", "utf8"),
    )
    expect(source).toContain('.eq("posted_as_profile_id", args.organizerAccountId)')
    expect(source).toContain("assertOrgOwnsPost")
  })

  it("moderation patch requires org ownership", async () => {
    const source = await import("node:fs").then((fs) =>
      fs.readFileSync("app/api/admin/content-hub/moderation/[id]/route.ts", "utf8"),
    )
    expect(source).toContain("assertOrgOwnsPost")
    expect(source).toContain('.eq("posted_as_profile_id", admin.profileId)')
  })

  it("legacy content posts route is org-scoped", async () => {
    const source = await import("node:fs").then((fs) =>
      fs.readFileSync("app/api/admin/content/posts/route.ts", "utf8"),
    )
    expect(source).toContain("listOrgScopedPosts")
    expect(source).toContain("withAdminCapability")
  })
})
