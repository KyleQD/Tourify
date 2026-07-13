import type { SupabaseClient } from "@supabase/supabase-js"

import { partitionOnboardingResponses } from "@/lib/hiring/sensitive-field-utils"
import {
  decryptJsonPayload,
  encryptJsonPayload,
  isValidSecureEnvelope,
} from "@/lib/security/employee-credentials-vault"

export type PrefillSource = "draft" | "saved_profile" | "none"

interface WorkerOnboardingProfileRow {
  user_id: string
  profile_data: Record<string, unknown> | null
  sensitive_envelope: unknown
  document_refs: Record<string, unknown> | null
  updated_at?: string
  created_at?: string
}

interface UpsertWorkerProfileArgs {
  supabase: SupabaseClient
  userId: string
  responses: Record<string, unknown>
  fieldTypeById?: Record<string, string>
}

interface LoadPrefillArgs {
  supabase: SupabaseClient
  userId: string
  /** When true, decrypt sensitive_envelope and include vaulted fields. */
  includeSensitive: boolean
  /** Template field names to keep; unknown keys are dropped. */
  templateFieldNames?: string[]
}

interface PrefillResult {
  responses: Record<string, unknown>
  source: PrefillSource
}

function isNonEmptyRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value) && Object.keys(value as object).length > 0
}

function filterToTemplateFields(
  responses: Record<string, unknown>,
  templateFieldNames?: string[]
): Record<string, unknown> {
  if (!templateFieldNames || templateFieldNames.length === 0) return responses
  const allowed = new Set(templateFieldNames)
  return Object.fromEntries(Object.entries(responses).filter(([key]) => allowed.has(key)))
}

function extractDraftFieldMap(existing: Record<string, unknown> | null | undefined): Record<string, unknown> {
  if (!existing || typeof existing !== "object") return {}
  if ("responses" in existing && isNonEmptyRecord(existing.responses)) {
    return existing.responses as Record<string, unknown>
  }
  if (!("id" in existing) && !("invitation_id" in existing) && !("candidate_id" in existing)) {
    return existing
  }
  return {}
}

/**
 * Private worker onboarding profile: stores reusable answers for cross-job prefill.
 * Sensitive values are AES-encrypted; employers never get a SELECT policy on this table.
 */
export class WorkerOnboardingProfileService {
  static async upsertFromResponses({
    supabase,
    userId,
    responses,
    fieldTypeById = {},
  }: UpsertWorkerProfileArgs): Promise<{ ok: true } | { ok: false; error: string }> {
    if (!userId) return { ok: false, error: "userId is required" }

    const { reusable, sensitive, documentRefs } = partitionOnboardingResponses({
      responses,
      fieldTypeById,
    })

    const { data: existing, error: loadError } = await supabase
      .from("worker_onboarding_profiles")
      .select("profile_data, sensitive_envelope, document_refs")
      .eq("user_id", userId)
      .maybeSingle()

    if (loadError && !loadError.message?.includes("Could not find the table")) {
      return { ok: false, error: loadError.message }
    }

    // Table may not exist yet in some environments — fail soft so onboarding still completes.
    if (loadError?.message?.includes("Could not find the table")) {
      return { ok: true }
    }

    const existingRow = (existing as WorkerOnboardingProfileRow | null) ?? null
    const mergedProfileData = {
      ...(isNonEmptyRecord(existingRow?.profile_data) ? existingRow!.profile_data! : {}),
      ...reusable,
    }
    const mergedDocumentRefs = {
      ...(isNonEmptyRecord(existingRow?.document_refs) ? existingRow!.document_refs! : {}),
      ...documentRefs,
    }

    let sensitiveEnvelope: unknown = existingRow?.sensitive_envelope ?? null
    if (Object.keys(sensitive).length > 0) {
      const priorSensitive = isValidSecureEnvelope(existingRow?.sensitive_envelope)
        ? decryptJsonPayload(existingRow!.sensitive_envelope)
        : {}
      sensitiveEnvelope = encryptJsonPayload({ ...priorSensitive, ...sensitive })
    }

    const now = new Date().toISOString()
    const { error: upsertError } = await supabase.from("worker_onboarding_profiles").upsert(
      {
        user_id: userId,
        profile_data: mergedProfileData,
        sensitive_envelope: sensitiveEnvelope,
        document_refs: mergedDocumentRefs,
        updated_at: now,
        created_at: existingRow?.created_at ?? now,
      },
      { onConflict: "user_id" }
    )

    if (upsertError) {
      if (upsertError.message?.includes("Could not find the table")) return { ok: true }
      return { ok: false, error: upsertError.message }
    }

    return { ok: true }
  }

  static async loadPrefillResponses({
    supabase,
    userId,
    includeSensitive,
    templateFieldNames,
  }: LoadPrefillArgs): Promise<PrefillResult> {
    if (!userId) return { responses: {}, source: "none" }

    const { data, error } = await supabase
      .from("worker_onboarding_profiles")
      .select("profile_data, sensitive_envelope, document_refs")
      .eq("user_id", userId)
      .maybeSingle()

    if (error || !data) return { responses: {}, source: "none" }

    const row = data as WorkerOnboardingProfileRow
    const profileData = isNonEmptyRecord(row.profile_data) ? row.profile_data : {}
    const documentRefs = isNonEmptyRecord(row.document_refs) ? row.document_refs : {}

    let sensitive: Record<string, unknown> = {}
    if (includeSensitive && row.sensitive_envelope) {
      sensitive = decryptJsonPayload(row.sensitive_envelope)
    }

    const merged = filterToTemplateFields(
      {
        ...profileData,
        ...documentRefs,
        ...sensitive,
      },
      templateFieldNames
    )

    if (Object.keys(merged).length === 0) return { responses: {}, source: "none" }
    return { responses: merged, source: "saved_profile" }
  }

  /**
   * Resolve prefill for a hire token: prefer current-candidate draft, else saved profile.
   */
  static async resolvePrefill({
    supabase,
    userId,
    sessionUserId,
    draftExistingResponses,
    candidateOnboardingResponses,
    templateFieldNames,
  }: {
    supabase: SupabaseClient
    userId: string | null
    sessionUserId: string | null
    draftExistingResponses?: Record<string, unknown> | null
    candidateOnboardingResponses?: Record<string, unknown> | null
    templateFieldNames?: string[]
  }): Promise<{ responses: Record<string, unknown> | null; prefillSource: PrefillSource }> {
    const draftFromRow = extractDraftFieldMap(draftExistingResponses)
    const draftFromCandidate = isNonEmptyRecord(candidateOnboardingResponses)
      ? candidateOnboardingResponses
      : {}
    const draft = isNonEmptyRecord(draftFromRow) ? draftFromRow : draftFromCandidate

    if (isNonEmptyRecord(draft)) {
      return {
        responses: {
          responses: filterToTemplateFields(draft, templateFieldNames),
        },
        prefillSource: "draft",
      }
    }

    if (!userId) {
      return { responses: null, prefillSource: "none" }
    }

    const includeSensitive = Boolean(sessionUserId && sessionUserId === userId)
    const prefill = await this.loadPrefillResponses({
      supabase,
      userId,
      includeSensitive,
      templateFieldNames,
    })

    if (prefill.source === "none") {
      return { responses: null, prefillSource: "none" }
    }

    return {
      responses: { responses: prefill.responses },
      prefillSource: "saved_profile",
    }
  }
}
