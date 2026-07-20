export const CREATOR_TREATY_OPS_FLAG_NAMES = [
  "creator_treaty_ops_readiness_enabled",
  "creator_treaty_ops_multi_year_evidence_enabled",
  "creator_treaty_ops_legal_character_enabled",
  "creator_treaty_ops_administration_enabled",
  "creator_treaty_ops_authority_revalidation_enabled",
  "creator_treaty_ops_governing_body_sessions_enabled",
  "creator_treaty_ops_periodic_review_enabled",
  "creator_treaty_ops_review_evidence_enabled",
  "creator_treaty_ops_expert_evaluation_enabled",
  "creator_treaty_ops_creator_outcomes_enabled",
  "creator_treaty_ops_implementation_reporting_enabled",
  "creator_treaty_ops_compliance_review_enabled",
  "creator_treaty_ops_protocol_amendment_enabled",
  "creator_treaty_ops_protocol_consolidation_enabled",
  "creator_treaty_ops_protocol_suspension_enabled",
  "creator_treaty_ops_protocol_termination_enabled",
  "creator_treaty_ops_reservations_enabled",
  "creator_treaty_ops_private_custody_enabled",
  "creator_treaty_ops_formal_depositary_enabled",
  "creator_treaty_ops_article102_tracking_enabled",
  "creator_treaty_ops_interpretive_guidance_enabled",
  "creator_treaty_ops_institutional_reform_enabled",
  "creator_treaty_ops_competence_change_enabled",
  "creator_treaty_ops_relationship_agreements_enabled",
  "creator_treaty_ops_public_service_obligations_enabled",
  "creator_treaty_ops_country_programs_enabled",
  "creator_treaty_ops_capacity_fund_enabled",
  "creator_treaty_ops_assessed_contributions_enabled",
  "creator_treaty_ops_privileges_enabled",
  "creator_treaty_ops_public_registries_enabled",
  "creator_treaty_ops_external_public_activation_enabled",
  "creator_treaty_ops_universal_identity_enabled",
  "creator_treaty_ops_collective_authority_enabled",
] as const

export type CreatorTreatyOpsFlagName = (typeof CREATOR_TREATY_OPS_FLAG_NAMES)[number]
export type CreatorTreatyOpsFlags = Record<CreatorTreatyOpsFlagName, boolean>

export const DISABLED_CREATOR_TREATY_OPS_FLAGS = Object.fromEntries(
  CREATOR_TREATY_OPS_FLAG_NAMES.map((name) => [name, false]),
) as CreatorTreatyOpsFlags

export const HARD_DISABLED_TREATY_OPS_FLAGS = [
  "creator_treaty_ops_formal_depositary_enabled",
  "creator_treaty_ops_article102_tracking_enabled",
  "creator_treaty_ops_privileges_enabled",
  "creator_treaty_ops_assessed_contributions_enabled",
  "creator_treaty_ops_competence_change_enabled",
  "creator_treaty_ops_universal_identity_enabled",
  "creator_treaty_ops_collective_authority_enabled",
  "creator_treaty_ops_external_public_activation_enabled",
] as const

export function stableRolloutBucket(subject: string, flag: string): number {
  let hash = 2166136261
  for (const character of `${flag}:${subject}`) {
    hash ^= character.charCodeAt(0)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0) % 100
}

export async function resolveCreatorTreatyOpsFlags(
  supabase: any,
  subjectId?: string | null,
): Promise<CreatorTreatyOpsFlags> {
  const { getTrustedMusicWriteClient } = await import("@/lib/music/music-access")
  const readClient = await getTrustedMusicWriteClient(supabase)
  const { data, error } = await readClient
    .from("feature_flags")
    .select("key, enabled, rollout_percentage")
    .in("key", [...CREATOR_TREATY_OPS_FLAG_NAMES])

  if (error || !data) return { ...DISABLED_CREATOR_TREATY_OPS_FLAGS }
  const result = { ...DISABLED_CREATOR_TREATY_OPS_FLAGS }
  for (const row of data as Array<{
    key: CreatorTreatyOpsFlagName
    enabled: boolean
    rollout_percentage: number
  }>) {
    if (!CREATOR_TREATY_OPS_FLAG_NAMES.includes(row.key)) continue
    if ((HARD_DISABLED_TREATY_OPS_FLAGS as readonly string[]).includes(row.key)) {
      result[row.key] = false
      continue
    }
    const percentage = Math.min(100, Math.max(0, row.rollout_percentage || 0))
    result[row.key] =
      row.enabled &&
      (percentage === 100 || Boolean(subjectId && stableRolloutBucket(subjectId, row.key) < percentage))
  }
  return result
}
