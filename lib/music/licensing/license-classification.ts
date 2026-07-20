import type { LicenseFamily } from "./licensing-domain"

export interface ClassifyLicenseRequestInput {
  hasMovingImages: boolean
  usesExistingRecording: boolean
  createsPhonorecords: boolean
  samplesExistingAudio: boolean
  replaysComposition: boolean
  changesLyricsOrFundamentalCharacter: boolean
  isLiveEvent: boolean
  isUserGeneratedContent: boolean
  isAiTraining: boolean
  isSyntheticVoice: boolean
}

export interface LicenseClassificationResult {
  families: LicenseFamily[]
  requiresManualReview: boolean
  reasons: string[]
}

export function classifyLicenseRequest(input: ClassifyLicenseRequestInput): LicenseClassificationResult {
  const families = new Set<LicenseFamily>()
  const reasons: string[] = []
  if (input.hasMovingImages) {
    families.add("sync")
    if (input.usesExistingRecording) families.add("master_use")
  }
  if (input.createsPhonorecords) families.add("mechanical")
  if (input.samplesExistingAudio) { families.add("sample"); families.add("master_use"); families.add("sync") }
  if (input.replaysComposition) families.add("interpolation")
  if (input.changesLyricsOrFundamentalCharacter) families.add("derivative")
  if (input.isLiveEvent) families.add("live_event")
  if (input.isUserGeneratedContent) families.add("ugc")
  if (input.isAiTraining) families.add("ai_training")
  if (input.isSyntheticVoice) families.add("synthetic_voice")
  if (families.size === 0) reasons.push("No supported licence family could be determined")
  return { families: [...families], requiresManualReview: families.size === 0 || input.changesLyricsOrFundamentalCharacter, reasons }
}
