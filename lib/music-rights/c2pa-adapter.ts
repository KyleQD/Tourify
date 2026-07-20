/**
 * Vendor-neutral C2PA adapter. Real SDKs load lazily only when configured.
 * Failures must never mutate the archival clean master.
 */

export type C2paManifestStatus =
  | "valid"
  | "unsupported"
  | "manifest_missing"
  | "modified_after_signing"
  | "issuer_unknown"
  | "revoked_or_suspended"
  | "stub"

export interface C2paAssertionInput {
  passportPublicId: string
  artistPublicIdentity: string
  recordingIdentifier: string
  sourceAssetCommitment: string
  originCertificationStatus: string
  aiUseDisclosureCategory: string
  issuer: string
  creationActions: string[]
  derivativeType: string
  rightsReservationUrl: string
  publicVerificationUrl: string
  c2paSpecVersion?: string
}

export interface C2paSignInput {
  derivativePath: string
  assertions: C2paAssertionInput
  mimeType?: string
}

export interface C2paSignResult {
  ok: boolean
  status: "signed" | "failed" | "unsupported" | "stub"
  manifestStoreHash?: string
  assertions: C2paAssertionInput
  errorCode?: string
  errorMessage?: string
  usedStub: boolean
}

export interface C2paValidateInput {
  derivativePath: string
  expectedManifestHash?: string
  passportStatus?: string
}

export interface C2paValidateResult {
  status: C2paManifestStatus
  details: Record<string, unknown>
  usedStub: boolean
}

export interface C2paAdapter {
  signManifest(input: C2paSignInput): Promise<C2paSignResult>
  validateManifest(input: C2paValidateInput): Promise<C2paValidateResult>
}

const APPROVED_MIME_TYPES = new Set([
  "audio/wav",
  "audio/x-wav",
  "audio/mpeg",
  "audio/mp3",
  "audio/ogg",
])

function isApprovedFormat(mimeType?: string) {
  if (!mimeType) return false
  return APPROVED_MIME_TYPES.has(mimeType.toLowerCase())
}

function createStubAdapter(): C2paAdapter {
  return {
    async signManifest(input) {
      if (!isApprovedFormat(input.mimeType)) {
        return {
          ok: false,
          status: "unsupported",
          assertions: input.assertions,
          errorCode: "c2pa_format_unsupported",
          errorMessage: "C2PA signing is not enabled for this format in the stub adapter.",
          usedStub: true,
        }
      }
      const { createHash } = await import("node:crypto")
      const hash = createHash("sha256")
        .update(JSON.stringify({
          path: input.derivativePath,
          assertions: input.assertions,
          mode: "stub",
        }))
        .digest("hex")
      return {
        ok: true,
        status: "stub",
        manifestStoreHash: `stub:${hash}`,
        assertions: {
          ...input.assertions,
          c2paSpecVersion: input.assertions.c2paSpecVersion || "2.4",
        },
        usedStub: true,
      }
    },
    async validateManifest(input) {
      if (input.passportStatus === "suspended" || input.passportStatus === "revoked") {
        return {
          status: "revoked_or_suspended",
          details: { passportStatus: input.passportStatus },
          usedStub: true,
        }
      }
      if (!input.expectedManifestHash) {
        return {
          status: "manifest_missing",
          details: { note: "No expected manifest hash provided; missing is not treated as fake." },
          usedStub: true,
        }
      }
      if (input.expectedManifestHash.startsWith("stub:")) {
        return {
          status: "stub",
          details: { mode: "stub", hash: input.expectedManifestHash },
          usedStub: true,
        }
      }
      return {
        status: "issuer_unknown",
        details: { mode: "stub", note: "Real C2PA SDK not configured." },
        usedStub: true,
      }
    },
  }
}

let cachedAdapter: C2paAdapter | null = null

export async function getC2paAdapter(): Promise<C2paAdapter> {
  if (cachedAdapter) return cachedAdapter

  const sdkModule = process.env.MUSIC_C2PA_SDK_MODULE
  if (!sdkModule) {
    cachedAdapter = createStubAdapter()
    return cachedAdapter
  }

  try {
    const loaded = await import(/* webpackIgnore: true */ sdkModule)
    const factory = loaded.createC2paAdapter || loaded.default
    if (typeof factory !== "function") throw new Error("invalid_c2pa_sdk_export")
    const adapter = (await factory()) ?? createStubAdapter()
    cachedAdapter = adapter
    return adapter
  } catch {
    cachedAdapter = createStubAdapter()
    return cachedAdapter
  }
}

export function resetC2paAdapterForTests() {
  cachedAdapter = null
}

export function buildC2paAssertions(input: C2paAssertionInput): C2paAssertionInput {
  return {
    ...input,
    c2paSpecVersion: input.c2paSpecVersion || "2.4",
  }
}
