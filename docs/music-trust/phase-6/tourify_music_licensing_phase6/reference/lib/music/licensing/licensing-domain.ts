export type LicenseFamily =
  | "sync" | "master_use" | "mechanical" | "public_performance"
  | "digital_sound_recording_performance" | "neighboring_rights"
  | "sample" | "interpolation" | "remix" | "derivative" | "stems"
  | "lyrics_print" | "ugc" | "live_event" | "brand" | "podcast"
  | "game" | "trailer" | "ai_training" | "ai_output" | "synthetic_voice"
  | "custom"

export interface LicenseScope {
  family: LicenseFamily
  assetIds: string[]
  territories: string[]
  termStartsAt: string
  termEndsAt?: string | null
  media: string[]
  uses: string[]
  exclusivity?: { kind: "none" | "category" | "competitor" | "full"; value?: string }
}

export interface AuthoritySnapshot {
  partyId: string
  authorityRecordId: string
  authorityVersion: number
  rightCategory: string
  territories: string[]
  validFrom: string
  validUntil?: string | null
  mayQuote: boolean
  mayApprove: boolean
  maySign: boolean
}

export interface ClearanceLeg {
  id: string
  rightCategory: string
  assetId: string
  requiredApproverPartyIds: string[]
  authoritySnapshots: AuthoritySnapshot[]
  status: "pending" | "satisfied" | "blocked" | "not_applicable"
  blockers: string[]
}
