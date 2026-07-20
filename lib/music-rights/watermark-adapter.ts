/**
 * Forensic watermark adapter interface. Opt-in beta only.
 * Never embeds personal customer data; payload must be opaque IDs.
 * Adversarial / unlearnable audio processors are research-only and blocked.
 */

export interface WatermarkEmbedInput {
  derivativePath: string
  opaquePayload: string
  channelHint?: string
}

export interface WatermarkEmbedResult {
  ok: boolean
  status: "embedded" | "failed" | "skipped" | "stub"
  algorithm: string
  algorithmVersion: string
  opaquePayload: string
  errorCode?: string
  errorMessage?: string
  usedStub: boolean
}

export interface WatermarkDetectInput {
  audioPath: string
}

export interface WatermarkDetectResult {
  detected: boolean
  confidence: number
  opaquePayload?: string
  algorithm: string
  algorithmVersion: string
  codecRobustness?: Record<string, unknown>
  usedStub: boolean
}

export interface WatermarkAdapter {
  embed(input: WatermarkEmbedInput): Promise<WatermarkEmbedResult>
  detect(input: WatermarkDetectInput): Promise<WatermarkDetectResult>
}

const OPAQUE_PAYLOAD_PATTERN = /^[A-Za-z0-9:_-]{8,128}$/

export function assertOpaqueWatermarkPayload(payload: string): { ok: true } | { ok: false; reason: string } {
  if (!OPAQUE_PAYLOAD_PATTERN.test(payload))
    return { ok: false, reason: "Watermark payload must be an opaque identifier without PII." }
  const lowered = payload.toLowerCase()
  if (lowered.includes("@") || lowered.includes("ssn") || lowered.includes("email"))
    return { ok: false, reason: "Watermark payload appears to contain personal data." }
  return { ok: true }
}

export function isAdversarialAudioProcessorAllowed(params: {
  environment: string
  explicitResearchOptIn: boolean
  counselApproved: boolean
}): boolean {
  if (params.environment === "production") return false
  return params.explicitResearchOptIn && params.counselApproved
}

function createStubAdapter(): WatermarkAdapter {
  return {
    async embed(input) {
      const check = assertOpaqueWatermarkPayload(input.opaquePayload)
      if (!check.ok) {
        return {
          ok: false,
          status: "failed",
          algorithm: "stub",
          algorithmVersion: "0.0.0",
          opaquePayload: input.opaquePayload,
          errorCode: "watermark_payload_invalid",
          errorMessage: check.reason,
          usedStub: true,
        }
      }
      return {
        ok: true,
        status: "stub",
        algorithm: "stub",
        algorithmVersion: "0.0.0",
        opaquePayload: input.opaquePayload,
        usedStub: true,
      }
    },
    async detect() {
      return {
        detected: false,
        confidence: 0,
        algorithm: "stub",
        algorithmVersion: "0.0.0",
        codecRobustness: {
          mp3_128: "untested",
          aac_128: "untested",
          opus_96: "untested",
          note: "Stub adapter; no real detection performed.",
        },
        usedStub: true,
      }
    },
  }
}

let cachedAdapter: WatermarkAdapter | null = null

export async function getWatermarkAdapter(): Promise<WatermarkAdapter> {
  if (cachedAdapter) return cachedAdapter

  const sdkModule = process.env.MUSIC_WATERMARK_SDK_MODULE
  if (!sdkModule) {
    cachedAdapter = createStubAdapter()
    return cachedAdapter
  }

  try {
    const loaded = await import(/* webpackIgnore: true */ sdkModule)
    const factory = loaded.createWatermarkAdapter || loaded.default
    if (typeof factory !== "function") throw new Error("invalid_watermark_sdk_export")
    cachedAdapter = await factory()
    return cachedAdapter
  } catch {
    cachedAdapter = createStubAdapter()
    return cachedAdapter
  }
}

export function resetWatermarkAdapterForTests() {
  cachedAdapter = null
}
