import { createHash, createHmac, randomBytes } from "node:crypto"
import { hashPassportManifest, type PublicPassportManifest } from "./passport-manifest"

export type CredentialLifecycleStatus = "active" | "suspended" | "revoked" | "superseded"

export interface RightsCredentialEnvelope {
  "@context": string[]
  type: string[]
  id: string
  issuer: string
  validFrom: string
  credentialSubject: {
    id: string
    type: string
    passportPublicId: string
    passportVersion: number
    manifestHash: string
    publicManifest: PublicPassportManifest
    disclaimer: string
  }
  proof?: {
    type: string
    created: string
    proofPurpose: string
    verificationMethod: string
    proofValue: string
  }
}

export function buildCredentialEnvelope(params: {
  credentialPublicId: string
  issuerDid?: string
  passportPublicId: string
  passportVersion: number
  publicManifest: PublicPassportManifest
  issuedAt?: string
}): RightsCredentialEnvelope {
  const issuedAt = params.issuedAt || new Date().toISOString()
  const manifestHash = hashPassportManifest(params.publicManifest)
  return {
    "@context": [
      "https://www.w3.org/ns/credentials/v2",
      "https://tourify.app/ns/music-rights/v1",
    ],
    type: ["VerifiableCredential", "TourifyRightsPassportCredential"],
    id: `urn:uuid:${params.credentialPublicId}`,
    issuer: params.issuerDid || "did:web:tourify.app:music-rights",
    validFrom: issuedAt,
    credentialSubject: {
      id: `urn:tourify:music-rights-passport:${params.passportPublicId}`,
      type: "TourifyRightsPassport",
      passportPublicId: params.passportPublicId,
      passportVersion: params.passportVersion,
      manifestHash,
      publicManifest: params.publicManifest,
      disclaimer:
        "Tourify issued this record after the named participants supplied or approved the stated information and Tourify completed the listed review procedure. It is not a conclusive legal ownership adjudication.",
    },
  }
}

export function signCredentialEnvelope(envelope: RightsCredentialEnvelope, secret?: string): RightsCredentialEnvelope {
  const signingSecret = secret || process.env.MUSIC_RIGHTS_ISSUER_HMAC_SECRET
  const created = new Date().toISOString()
  const verificationMethod = `${envelope.issuer}#key-1`
  const payload = JSON.stringify({
    id: envelope.id,
    issuer: envelope.issuer,
    validFrom: envelope.validFrom,
    credentialSubject: envelope.credentialSubject,
  })

  const proofValue = signingSecret
    ? createHmac("sha256", signingSecret).update(payload).digest("base64url")
    : createHash("sha256").update(`${payload}:${randomBytes(8).toString("hex")}`).digest("base64url")

  return {
    ...envelope,
    proof: {
      type: signingSecret ? "DataIntegrityProof" : "TourifyDevIntegrityHash",
      created,
      proofPurpose: "assertionMethod",
      verificationMethod,
      proofValue,
    },
  }
}

export function verifyCredentialProof(envelope: RightsCredentialEnvelope, secret?: string): boolean {
  if (!envelope.proof?.proofValue) return false
  const signingSecret = secret || process.env.MUSIC_RIGHTS_ISSUER_HMAC_SECRET
  if (!signingSecret || envelope.proof.type !== "DataIntegrityProof") return Boolean(envelope.proof.proofValue)

  const payload = JSON.stringify({
    id: envelope.id,
    issuer: envelope.issuer,
    validFrom: envelope.validFrom,
    credentialSubject: envelope.credentialSubject,
  })
  const expected = createHmac("sha256", signingSecret).update(payload).digest("base64url")
  return expected === envelope.proof.proofValue
}

export function nextCredentialStatus(params: {
  current: CredentialLifecycleStatus
  action: "suspend" | "reactivate" | "revoke" | "supersede"
}): { allowed: boolean; next?: CredentialLifecycleStatus; reason?: string } {
  const { current, action } = params
  if (action === "suspend") {
    if (current !== "active") return { allowed: false, reason: "Only active credentials can be suspended." }
    return { allowed: true, next: "suspended" }
  }
  if (action === "reactivate") {
    if (current !== "suspended") return { allowed: false, reason: "Only suspended credentials can be reactivated." }
    return { allowed: true, next: "active" }
  }
  if (action === "revoke") {
    if (current === "revoked" || current === "superseded")
      return { allowed: false, reason: "Credential is already terminal." }
    return { allowed: true, next: "revoked" }
  }
  if (action === "supersede") {
    if (current === "superseded" || current === "revoked")
      return { allowed: false, reason: "Credential is already terminal." }
    return { allowed: true, next: "superseded" }
  }
  return { allowed: false, reason: "Unknown status action." }
}
