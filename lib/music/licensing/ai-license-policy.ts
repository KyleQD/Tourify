export interface AiLicensePolicy {
  optedIn: boolean
  permittedPurposes: Array<"research" | "evaluation" | "pretraining" | "fine_tuning" | "retrieval" | "commercial_generation">
  permitsVoiceModel: boolean
  permitsDatasetRedistribution: boolean
  requiresOutputAttribution: boolean
  expiresAt?: string | null
}
export function aiUseAllowed(policy: AiLicensePolicy, purpose: AiLicensePolicy["permittedPurposes"][number], now = new Date()): boolean {
  if (!policy.optedIn) return false
  if (policy.expiresAt && now > new Date(policy.expiresAt)) return false
  return policy.permittedPurposes.includes(purpose)
}
