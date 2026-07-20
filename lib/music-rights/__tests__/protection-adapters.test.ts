import {
  buildAnchorOutboxPayload,
  doesAnchorFailureInvalidatePassport,
  hashOpaqueCommitment,
  mapAnchorWorkerStatus,
  resolveAnchorNetwork,
} from "../blockchain-anchor"
import {
  buildC2paAssertions,
  getC2paAdapter,
  resetC2paAdapterForTests,
} from "../c2pa-adapter"
import {
  buildAssetTrainingReservation,
  buildTdmReservationDocument,
  buildTrainingReservationPolicy,
} from "../training-reservation"
import {
  assertOpaqueWatermarkPayload,
  getWatermarkAdapter,
  isAdversarialAudioProcessorAllowed,
  resetWatermarkAdapterForTests,
} from "../watermark-adapter"

describe("music rights protection adapters", () => {
  beforeEach(() => {
    resetC2paAdapterForTests()
    resetWatermarkAdapterForTests()
    delete process.env.MUSIC_C2PA_SDK_MODULE
    delete process.env.MUSIC_WATERMARK_SDK_MODULE
    delete process.env.MUSIC_RIGHTS_ANCHOR_NETWORK
    delete process.env.MUSIC_RIGHTS_ANCHOR_MAINNET
  })

  it("signs C2PA manifests via stub without touching master semantics", async () => {
    const adapter = await getC2paAdapter()
    const assertions = buildC2paAssertions({
      passportPublicId: "pp-1",
      artistPublicIdentity: "artist-public",
      recordingIdentifier: "rec-1",
      sourceAssetCommitment: "sha256:abc",
      originCertificationStatus: "approved",
      aiUseDisclosureCategory: "none",
      issuer: "tourify",
      creationActions: ["transcode"],
      derivativeType: "streaming",
      rightsReservationUrl: "https://tourify.app/legal/music-training-reservation",
      publicVerificationUrl: "https://tourify.app/music/verify/origin/x",
    })
    const result = await adapter.signManifest({
      derivativePath: "/tmp/derivative.wav",
      mimeType: "audio/wav",
      assertions,
    })
    expect(result.ok).toBe(true)
    expect(result.usedStub).toBe(true)
    expect(result.manifestStoreHash).toMatch(/^stub:/)
  })

  it("does not treat missing C2PA manifests as fake", async () => {
    const adapter = await getC2paAdapter()
    const result = await adapter.validateManifest({ derivativePath: "/tmp/x.wav" })
    expect(result.status).toBe("manifest_missing")
  })

  it("rejects watermark payloads that look like PII", () => {
    expect(assertOpaqueWatermarkPayload("asset:abc-123").ok).toBe(true)
    expect(assertOpaqueWatermarkPayload("user@example.com").ok).toBe(false)
  })

  it("blocks adversarial audio processors in production", () => {
    expect(isAdversarialAudioProcessorAllowed({
      environment: "production",
      explicitResearchOptIn: true,
      counselApproved: true,
    })).toBe(false)
  })

  it("embeds opaque watermark payloads through stub adapter", async () => {
    const adapter = await getWatermarkAdapter()
    const result = await adapter.embed({
      derivativePath: "/tmp/derivative.wav",
      opaquePayload: "asset:track-12345",
    })
    expect(result.ok).toBe(true)
    expect(result.usedStub).toBe(true)
    expect(result.algorithm).toBe("stub")
  })

  it("builds training reservation policy URLs", () => {
    const policy = buildTrainingReservationPolicy({ baseUrl: "https://example.test" })
    expect(policy.policyUrl).toBe("https://example.test/legal/music-training-reservation")
    expect(policy.permissionState).toBe("reserved_no_training")
    const asset = buildAssetTrainingReservation({
      assetPublicId: "asset-1",
      baseUrl: "https://example.test",
    })
    expect(asset.assetPublicId).toBe("asset-1")
    const tdm = buildTdmReservationDocument({ baseUrl: "https://example.test" })
    expect(tdm.reservation).toBe("all")
  })

  it("builds idempotent privacy-safe anchor outbox payloads", () => {
    const payload = buildAnchorOutboxPayload({
      network: "sepolia",
      projectId: "proj-1",
      passportId: "pass-1",
      commitments: {
        passportPublicId: "public-pass-1",
        passportVersion: 2,
        publicManifestHash: "pmh",
        privateManifestCommitment: "pmc",
        credentialHash: "ch",
        schemaVersion: "1.0.0",
        issuer: "did:web:tourify.app:music-rights",
        issuedAt: "2026-07-17T00:00:00.000Z",
        status: "active",
      },
    })
    expect(payload.eventType).toBe("music.rights.anchor.requested")
    expect(payload.dedupeKey).toBe("anchor:sepolia:public-pass-1:v2")
    expect(payload.passportPublicIdHash).toBe(hashOpaqueCommitment("public-pass-1"))
    expect(payload).not.toHaveProperty("email")
    expect(doesAnchorFailureInvalidatePassport()).toBe(false)
    expect(mapAnchorWorkerStatus({ submitted: true, confirmed: false, failed: false })).toBe("pending")
    expect(resolveAnchorNetwork({ MUSIC_RIGHTS_ANCHOR_MAINNET: "true" } as NodeJS.ProcessEnv)).toBe("mainnet_disabled")
  })
})
