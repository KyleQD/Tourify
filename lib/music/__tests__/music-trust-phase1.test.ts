import { buildMusicOriginManifest, hashMusicOriginManifest, serializeMusicOriginManifest } from "../music-origin-manifest"
import { certificationIsPubliclyActive, evidenceIsMutable, validateCertificationTransition } from "../music-certification"
import { buildPrivateFingerprintMatchSignals, computeOriginRetry, staleLockCutoff } from "../music-origin-job-policy"
import { deriveMusicTrustDisplay, resolveMusicPublicationTrust } from "../music-trust"
import { stableRolloutBucket } from "../music-trust-flags"

describe("music trust publication policy", () => {
  test("allows incomplete private drafts", () => {
    expect(resolveMusicPublicationTrust({ rightsConfirmed: false, aiUseCategory: "unknown", policyVersionsAccepted: false, isPublic: false })).toEqual({ allowed: true, blockingReasons: [] })
  })

  test("fails closed for public unknown, missing policy, rights, moderation, and preview", () => {
    const result = resolveMusicPublicationTrust({
      rightsConfirmed: false, aiUseCategory: "unknown", policyVersionsAccepted: false, isPublic: true,
      moderationStatus: "pending", isVisible: false, previewReady: false,
    })
    expect(result.allowed).toBe(false)
    expect(result.blockingReasons).toEqual(expect.arrayContaining([
      "rights_confirmation_required", "music_policy_acceptance_required", "ai_disclosure_required",
      "moderation_approval_required", "track_visibility_required", "preview_not_ready",
    ]))
  })

  test("blocks materially generated tracks when the human-only gate is active", () => {
    expect(resolveMusicPublicationTrust({ rightsConfirmed: true, aiUseCategory: "materially_generated", policyVersionsAccepted: true, isPublic: true, humanOnlyGateEnabled: true }).allowed).toBe(false)
  })

  test("shows a badge only for active approval", () => {
    expect(deriveMusicTrustDisplay({ originStatus: "recorded", certificationStatus: "approved", certificationLevel: 1 }).showCertificationBadge).toBe(true)
    expect(deriveMusicTrustDisplay({ originStatus: "recorded", certificationStatus: "suspended", certificationLevel: 1 }).showCertificationBadge).toBe(false)
  })
})

describe("certification state machine", () => {
  test("allows review approval and rejects direct draft approval", () => {
    expect(validateCertificationTransition("in_review", "approved").allowed).toBe(true)
    expect(validateCertificationTransition("draft", "approved").allowed).toBe(false)
  })

  test("locks evidence after submission and only exposes active approval", () => {
    expect(evidenceIsMutable("needs_information")).toBe(true)
    expect(evidenceIsMutable("submitted")).toBe(false)
    expect(certificationIsPubliclyActive("approved")).toBe(true)
    expect(certificationIsPubliclyActive("suspended")).toBe(false)
  })
})

describe("deterministic manifests and rollout", () => {
  const manifestInput = {
    schemaVersion: "1.0.0", trackId: "track", artistUserId: "artist", sourceSha256: "a".repeat(64),
    title: "Song", durationSeconds: 120, declarationVersion: "1", declarationStatementHash: "b".repeat(64),
    aiUseCategory: "human_created", trainingUsePolicy: "rights_reserved", recordedAt: "2026-07-17T00:00:00.000Z",
  }
  test("serializes and hashes the same manifest deterministically", () => {
    const first = buildMusicOriginManifest(manifestInput)
    const second = buildMusicOriginManifest({ ...manifestInput })
    expect(serializeMusicOriginManifest(first)).toBe(serializeMusicOriginManifest(second))
    expect(hashMusicOriginManifest(first)).toMatch(/^[a-f0-9]{64}$/)
    expect(hashMusicOriginManifest(first)).toBe(hashMusicOriginManifest(second))
  })

  test("uses a stable user-and-flag rollout bucket", () => {
    expect(stableRolloutBucket("user-1", "flag-a")).toBe(stableRolloutBucket("user-1", "flag-a"))
    expect(stableRolloutBucket("user-1", "flag-a")).toBeGreaterThanOrEqual(0)
    expect(stableRolloutBucket("user-1", "flag-a")).toBeLessThan(100)
  })
})

describe("origin worker policies", () => {
  test("backs off and dead-letters at the bound", () => {
    expect(computeOriginRetry(1, 5, 0)).toMatchObject({ deadLetter: false, delaySeconds: 30 })
    expect(computeOriginRetry(5, 5, 0).deadLetter).toBe(true)
  })

  test("deduplicates private match signals and never creates legal conclusions", () => {
    expect(buildPrivateFingerprintMatchSignals("track-a", [
      { id: "one", track_id: "track-b" }, { id: "one", track_id: "track-b" }, { id: "self", track_id: "track-a" },
    ])).toEqual([{ type: "sha256_match", fingerprint_id: "one", track_id: "track-b" }])
  })

  test("computes a stable stale-lock cutoff", () => {
    expect(staleLockCutoff(15 * 60_000, 15)).toBe("1970-01-01T00:00:00.000Z")
  })
})
