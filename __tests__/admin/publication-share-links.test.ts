import { describe, expect, it } from "vitest"

import {
  PUBLICATION_SHARE_TOKEN_BYTES,
  buildPublicationSharePath,
  evaluatePublicationShareGate,
  generatePublicationShareToken,
  hashPublicationShareSecret,
  validateCreateShareLinkInput,
  verifyPublicationShareSecret,
} from "@/lib/admin/publication-share-links"

const baseToken = {
  id: "tok-1",
  orgId: "org-1",
  snapshotId: "snap-1",
  tokenHash: "hash",
  name: "Crew link",
  scope: { sections: ["overview", "itinerary"] },
  expiresAt: null as string | null,
  passcodeHash: null as string | null,
  allowDownload: false,
  maxUses: null as number | null,
  useCount: 0,
  revokedAt: null as string | null,
}

const committedSnapshot = {
  id: "snap-1",
  status: "committed" as const,
  retractedAt: null,
}

describe("PUB-206 secure share links", () => {
  it("generates high-entropy tokens and stores only hashes", () => {
    const token = generatePublicationShareToken()
    expect(token.length).toBeGreaterThanOrEqual(40)
    const hash = hashPublicationShareSecret(token)
    expect(hash).toHaveLength(64)
    expect(hash).not.toContain(token)
    expect(verifyPublicationShareSecret(token, hash)).toBe(true)
    expect(verifyPublicationShareSecret("wrong", hash)).toBe(false)
    expect(PUBLICATION_SHARE_TOKEN_BYTES).toBeGreaterThanOrEqual(32)
    expect(buildPublicationSharePath(token)).toBe(`/p/${encodeURIComponent(token)}`)
  })

  it("enforces expiry, revocation, max-use, passcode, download, and scope", () => {
    expect(
      evaluatePublicationShareGate({
        token: { ...baseToken, revokedAt: "2026-07-01T00:00:00.000Z" },
        snapshot: committedSnapshot,
        action: "view",
      }).ok,
    ).toBe(false)

    expect(
      evaluatePublicationShareGate({
        token: { ...baseToken, expiresAt: "2020-01-01T00:00:00.000Z" },
        snapshot: committedSnapshot,
        action: "view",
        nowMs: Date.parse("2026-07-20T00:00:00.000Z"),
      }),
    ).toMatchObject({ ok: false, reason: "expired" })

    expect(
      evaluatePublicationShareGate({
        token: { ...baseToken, maxUses: 1, useCount: 1 },
        snapshot: committedSnapshot,
        action: "view",
      }),
    ).toMatchObject({ ok: false, reason: "max_uses" })

    expect(
      evaluatePublicationShareGate({
        token: { ...baseToken, passcodeHash: "x" },
        snapshot: committedSnapshot,
        action: "view",
      }),
    ).toMatchObject({ ok: false, reason: "passcode_required" })

    expect(
      evaluatePublicationShareGate({
        token: { ...baseToken, passcodeHash: "x" },
        snapshot: committedSnapshot,
        action: "view",
        passcodeVerified: false,
      }),
    ).toMatchObject({ ok: false, reason: "passcode_failed" })

    expect(
      evaluatePublicationShareGate({
        token: baseToken,
        snapshot: committedSnapshot,
        action: "download",
      }),
    ).toMatchObject({ ok: false, reason: "download_denied" })

    expect(
      evaluatePublicationShareGate({
        token: baseToken,
        snapshot: committedSnapshot,
        action: "view",
        requestedScopeKeys: ["financial"],
      }),
    ).toMatchObject({ ok: false, reason: "scope_denied" })

    expect(
      evaluatePublicationShareGate({
        token: { ...baseToken, allowDownload: true, passcodeHash: "x" },
        snapshot: committedSnapshot,
        action: "download",
        passcodeVerified: true,
        requestedScopeKeys: ["overview"],
      }).ok,
    ).toBe(true)
  })

  it("blocks retracted/superseded/draft snapshots", () => {
    expect(
      evaluatePublicationShareGate({
        token: baseToken,
        snapshot: { id: "snap-1", status: "retracted" },
        action: "view",
      }),
    ).toMatchObject({ ok: false, reason: "snapshot_retracted" })

    expect(
      evaluatePublicationShareGate({
        token: baseToken,
        snapshot: { id: "snap-1", status: "superseded" },
        action: "view",
      }),
    ).toMatchObject({ ok: false, reason: "snapshot_superseded" })
  })

  it("validates create input", () => {
    expect(validateCreateShareLinkInput({ name: "", maxUses: 0 }).ok).toBe(false)
    expect(
      validateCreateShareLinkInput({
        name: "Vendor advance",
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
        passcode: "secret",
        allowDownload: true,
        maxUses: 5,
        sections: ["itinerary"],
      }).ok,
    ).toBe(true)
  })
})
