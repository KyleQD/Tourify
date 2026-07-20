import {
  buildPublicPassportManifest,
  canonicalizeManifest,
  createManifestNonce,
  hashPassportManifest,
} from "../passport-manifest"
import { buildCredentialEnvelope, nextCredentialStatus, signCredentialEnvelope, verifyCredentialProof } from "../credential"

describe("passport manifest", () => {
  it("canonicalizes object key order for stable hashing", () => {
    const left = buildPublicPassportManifest({
      publicId: "11111111-1111-1111-1111-111111111111",
      passportVersion: 1,
      artistName: "Artist",
      title: "Song",
      recordingIdentifiers: { ISRC: "USRC17607839" },
      workIdentifiers: { ISWC: "T-123.456.789-C" },
      nonce: "abc",
      issuedAt: "2026-07-17T00:00:00.000Z",
    })
    const right = {
      ...left,
      recordingIdentifiers: { ISRC: "USRC17607839" },
      workIdentifiers: { ISWC: "T-123.456.789-C" },
    }
    expect(canonicalizeManifest(left)).toBe(canonicalizeManifest(right))
    expect(hashPassportManifest(left)).toBe(hashPassportManifest(right))
  })

  it("creates opaque nonces", () => {
    expect(createManifestNonce()).toHaveLength(32)
  })

  it("builds and optionally verifies credential envelopes", () => {
    const manifest = buildPublicPassportManifest({
      publicId: "22222222-2222-2222-2222-222222222222",
      passportVersion: 2,
      artistName: "Artist",
      title: "Song",
      nonce: "def",
      issuedAt: "2026-07-17T00:00:00.000Z",
    })
    const envelope = buildCredentialEnvelope({
      credentialPublicId: "33333333-3333-3333-3333-333333333333",
      passportPublicId: manifest.publicId,
      passportVersion: manifest.passportVersion,
      publicManifest: manifest,
      issuedAt: manifest.issuedAt,
    })
    const signed = signCredentialEnvelope(envelope, "test-secret")
    expect(signed.proof?.proofValue).toBeTruthy()
    expect(verifyCredentialProof(signed, "test-secret")).toBe(true)
    expect(nextCredentialStatus({ current: "active", action: "suspend" }).next).toBe("suspended")
  })
})
