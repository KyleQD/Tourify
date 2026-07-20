/**
 * AI-training reservation policy helpers (Layer 3 of Tourify Shield).
 * These express rights preferences; they are not technical enforcement.
 */

export type TrainingPermissionState =
  | "reserved_no_training"
  | "licensed_only"
  | "opt_in_allowed"
  | "unknown"

export interface TrainingReservationPolicy {
  version: string
  permissionState: TrainingPermissionState
  policyUrl: string
  machineReadableUrl: string
  licensingContactUrl: string
  statement: string
  lastUpdated: string
}

export const MUSIC_TRAINING_RESERVATION_POLICY_PATH = "/legal/music-training-reservation"
export const MUSIC_TRAINING_RESERVATION_TDMREP_PATH = "/.well-known/tdmrep.json"
export const MUSIC_TRAINING_RESERVATION_POLICY_VERSION = "1.0.0"

export function buildTrainingReservationPolicy(params?: {
  baseUrl?: string
  permissionState?: TrainingPermissionState
  lastUpdated?: string
}): TrainingReservationPolicy {
  const baseUrl = (params?.baseUrl || process.env.NEXT_PUBLIC_APP_URL || "https://tourify.app").replace(/\/$/, "")
  const permissionState = params?.permissionState || "reserved_no_training"
  return {
    version: MUSIC_TRAINING_RESERVATION_POLICY_VERSION,
    permissionState,
    policyUrl: `${baseUrl}${MUSIC_TRAINING_RESERVATION_POLICY_PATH}`,
    machineReadableUrl: `${baseUrl}${MUSIC_TRAINING_RESERVATION_TDMREP_PATH}`,
    licensingContactUrl: `${baseUrl}/legal/music-training-reservation#licensing-contact`,
    statement:
      "No AI model training, dataset inclusion, or machine-learning use of Tourify-hosted music is permitted without a separate written license from the rights holder.",
    lastUpdated: params?.lastUpdated || "2026-07-17",
  }
}

export function buildAssetTrainingReservation(params: {
  assetPublicId: string
  permissionState?: TrainingPermissionState
  baseUrl?: string
}) {
  const policy = buildTrainingReservationPolicy({
    baseUrl: params.baseUrl,
    permissionState: params.permissionState,
  })
  return {
    assetPublicId: params.assetPublicId,
    permissionState: policy.permissionState,
    policyUrl: policy.policyUrl,
    machineReadableUrl: policy.machineReadableUrl,
    statement: policy.statement,
    version: policy.version,
  }
}

export function buildTdmReservationDocument(params?: { baseUrl?: string }) {
  const policy = buildTrainingReservationPolicy(params)
  return {
    version: 1,
    policy: policy.policyUrl,
    contact: policy.licensingContactUrl,
    reservation: "all",
    note: policy.statement,
    updated: policy.lastUpdated,
  }
}
