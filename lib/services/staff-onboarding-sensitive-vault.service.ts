import type { SupabaseClient } from "@supabase/supabase-js"

import {
  extractSensitiveCredentialSummaries,
  partitionOnboardingResponses,
} from "@/lib/hiring/sensitive-field-utils"
import {
  decryptJsonPayload,
  encryptJsonPayload,
  isValidSecureEnvelope,
} from "@/lib/security/employee-credentials-vault"
import type { HiringEntity } from "@/types/hiring-entity"

interface UpsertVaultArgs {
  supabase: SupabaseClient
  candidateId: string
  employer: HiringEntity
  responses: Record<string, unknown>
  fieldTypeById?: Record<string, string>
}

interface RevealVaultArgs {
  supabase: SupabaseClient
  candidateId: string
  employer: HiringEntity
}

export class StaffOnboardingSensitiveVaultService {
  static async upsertFromResponses({
    supabase,
    candidateId,
    employer,
    responses,
    fieldTypeById = {},
  }: UpsertVaultArgs): Promise<{ ok: true; stored: boolean } | { ok: false; error: string }> {
    if (!candidateId) return { ok: false, error: "candidateId is required" }

    const { sensitive } = partitionOnboardingResponses({ responses, fieldTypeById })
    if (Object.keys(sensitive).length === 0) return { ok: true, stored: false }

    const summaries = extractSensitiveCredentialSummaries({ responses: sensitive, fieldTypeById })
    const envelope = encryptJsonPayload(sensitive)

    const { error } = await supabase.from("staff_onboarding_sensitive_vault").upsert(
      {
        candidate_id: candidateId,
        employer_entity_type: employer.entityType,
        employer_entity_id: employer.entityId,
        sensitive_envelope: envelope,
        field_summaries: summaries,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "candidate_id" }
    )

    if (error) {
      if (error.message?.includes("Could not find the table")) return { ok: true, stored: false }
      return { ok: false, error: error.message }
    }

    return { ok: true, stored: true }
  }

  static async reveal({
    supabase,
    candidateId,
    employer,
  }: RevealVaultArgs): Promise<
    | { ok: true; data: { fields: Record<string, unknown>; summaries: unknown[]; updatedAt: string | null } }
    | { ok: false; error: string; notFound?: boolean }
  > {
    const { data, error } = await supabase
      .from("staff_onboarding_sensitive_vault")
      .select("sensitive_envelope, field_summaries, updated_at, employer_entity_type, employer_entity_id")
      .eq("candidate_id", candidateId)
      .maybeSingle()

    if (error) {
      if (error.message?.includes("Could not find the table")) {
        return { ok: false, error: "Sensitive vault is not available.", notFound: true }
      }
      return { ok: false, error: error.message }
    }

    if (!data) return { ok: false, error: "No sensitive onboarding data stored for this candidate.", notFound: true }

    if (
      data.employer_entity_type !== employer.entityType ||
      data.employer_entity_id !== employer.entityId
    ) {
      return { ok: false, error: "Vault entry does not belong to this employer." }
    }

    if (!isValidSecureEnvelope(data.sensitive_envelope)) {
      return { ok: false, error: "Stored sensitive envelope is invalid." }
    }

    return {
      ok: true,
      data: {
        fields: decryptJsonPayload(data.sensitive_envelope),
        summaries: Array.isArray(data.field_summaries) ? data.field_summaries : [],
        updatedAt: typeof data.updated_at === "string" ? data.updated_at : null,
      },
    }
  }
}
