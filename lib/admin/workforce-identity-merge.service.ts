/**
 * WORK-105 — Identity merge / reconciliation.
 *
 * Finds likely duplicates, previews reference impact, and merges only on
 * strong signals. Never auto-merges on weak signals (name-only, fuzzy email).
 */

import type { SupabaseClient } from "@supabase/supabase-js"

import { WORKFORCE_DUPLICATE_RISK_REPORT } from "@/lib/admin/workforce-identity-map"
import { executeServiceRoleJob } from "@/lib/supabase/service-role-job"

export type MergeSignalStrength = "strong" | "weak"

export type MergeSignalKind =
  | "same_user_id"
  | "same_email_employer"
  | "same_name_only"
  | "fuzzy_email"

export interface WorkforceDuplicateCandidate {
  id: string
  strength: MergeSignalStrength
  signal: MergeSignalKind
  riskPatternIds: string[]
  keepStaffMemberId: string
  mergeStaffMemberId: string
  userId: string | null
  email: string | null
  employerEntityType: string | null
  employerEntityId: string | null
  reason: string
}

export interface MergeReferencePreview {
  table: string
  column: string
  count: number
}

export interface MergePreviewResult {
  candidate: WorkforceDuplicateCandidate
  references: MergeReferencePreview[]
  canMerge: boolean
  blockReason: string | null
}

export interface MergeExecuteResult {
  ok: boolean
  aliasId: string | null
  keptStaffMemberId: string
  mergedStaffMemberId: string
  referencesUpdated: number
  error?: string
}

export class WorkforceMergeError extends Error {
  readonly status = 422
  readonly code = "merge_rejected"

  constructor(message: string) {
    super(message)
    this.name = "WorkforceMergeError"
  }
}

async function getDb(
  supabase: SupabaseClient | undefined,
  orgId: string,
  reason: string,
): Promise<SupabaseClient> {
  if (supabase) return supabase
  return executeServiceRoleJob(
    { orgId, reason, moduleId: "admin.workforce.identity-merge" },
    async (client) => client,
  )
}

function normalizeEmail(email: string | null | undefined): string | null {
  if (!email || typeof email !== "string") return null
  const trimmed = email.trim().toLowerCase()
  return trimmed.includes("@") ? trimmed : null
}

function isStrongSignal(signal: MergeSignalKind): boolean {
  return signal === "same_user_id" || signal === "same_email_employer"
}

function pairId(a: string, b: string): string {
  return [a, b].sort().join(":")
}

interface StaffRow {
  id: string
  user_id: string | null
  email: string | null
  name: string | null
  employer_entity_type: string | null
  employer_entity_id: string | null
  org_id: string | null
  status: string | null
}

/**
 * Scan org-scoped staff_members for duplicate pairs using WORK-101 risk patterns.
 */
export async function findWorkforceDuplicateCandidates(args: {
  supabase?: SupabaseClient
  orgId: string
  limit?: number
}): Promise<WorkforceDuplicateCandidate[]> {
  const db = await getDb(args.supabase, args.orgId, "Scan workforce duplicate candidates")
  const limit = args.limit ?? 50

  const { data, error } = await db
    .from("staff_members")
    .select("id, user_id, email, name, employer_entity_type, employer_entity_id, org_id, status")
    .or(`org_id.eq.${args.orgId},employer_entity_id.eq.${args.orgId}`)
    .limit(500)

  if (error) throw new Error(error.message)

  const rows = (data ?? []) as StaffRow[]
  const candidates: WorkforceDuplicateCandidate[] = []
  const seen = new Set<string>()

  for (let i = 0; i < rows.length; i += 1) {
    for (let j = i + 1; j < rows.length; j += 1) {
      const left = rows[i]
      const right = rows[j]
      const sameEmployer =
        left.employer_entity_type
        && left.employer_entity_id
        && left.employer_entity_type === right.employer_entity_type
        && left.employer_entity_id === right.employer_entity_id

      if (!sameEmployer && left.org_id !== args.orgId && right.org_id !== args.orgId) continue

      let signal: MergeSignalKind | null = null
      let reason = ""

      if (left.user_id && right.user_id && left.user_id === right.user_id) {
        signal = "same_user_id"
        reason = "Same user_id on two staff_members for the same employer/org."
      } else {
        const leftEmail = normalizeEmail(left.email)
        const rightEmail = normalizeEmail(right.email)
        if (leftEmail && rightEmail && leftEmail === rightEmail && sameEmployer) {
          signal = "same_email_employer"
          reason = "Exact email match under the same employer."
        } else if (
          left.name
          && right.name
          && left.name.trim().toLowerCase() === right.name.trim().toLowerCase()
          && sameEmployer
          && !leftEmail
          && !rightEmail
        ) {
          signal = "same_name_only"
          reason = "Name-only match — weak signal; merge blocked."
        }
      }

      if (!signal) continue

      const key = pairId(left.id, right.id)
      if (seen.has(key)) continue
      seen.add(key)

      // Prefer row with user_id + active status as keep target.
      const keep =
        scoreKeep(left) >= scoreKeep(right) ? left : right
      const merge = keep.id === left.id ? right : left

      candidates.push({
        id: key,
        strength: isStrongSignal(signal) ? "strong" : "weak",
        signal,
        riskPatternIds: riskPatternsForSignal(signal),
        keepStaffMemberId: keep.id,
        mergeStaffMemberId: merge.id,
        userId: keep.user_id ?? merge.user_id,
        email: normalizeEmail(keep.email) ?? normalizeEmail(merge.email),
        employerEntityType: keep.employer_entity_type,
        employerEntityId: keep.employer_entity_id,
        reason,
      })

      if (candidates.length >= limit) return candidates
    }
  }

  return candidates
}

function scoreKeep(row: StaffRow): number {
  let score = 0
  if (row.user_id) score += 4
  if (normalizeEmail(row.email)) score += 2
  if (row.status === "active") score += 1
  return score
}

function riskPatternsForSignal(signal: MergeSignalKind): string[] {
  if (signal === "same_user_id") return ["dup-cross-surface-user", "dup-roster-workmode-drift"]
  if (signal === "same_email_employer") return ["dup-hiring-email-convert"]
  return ["dup-polymorphic-party"]
}

export async function previewWorkforceMerge(args: {
  supabase?: SupabaseClient
  orgId: string
  keepStaffMemberId: string
  mergeStaffMemberId: string
}): Promise<MergePreviewResult> {
  const db = await getDb(args.supabase, args.orgId, "Preview workforce identity merge")
  if (args.keepStaffMemberId === args.mergeStaffMemberId)
    throw new WorkforceMergeError("Keep and merge targets must differ.")

  const candidates = await findWorkforceDuplicateCandidates({
    supabase: db,
    orgId: args.orgId,
    limit: 200,
  })
  const candidate =
    candidates.find(
      (row) =>
        row.keepStaffMemberId === args.keepStaffMemberId
        && row.mergeStaffMemberId === args.mergeStaffMemberId,
    )
    || candidates.find(
      (row) =>
        row.keepStaffMemberId === args.mergeStaffMemberId
        && row.mergeStaffMemberId === args.keepStaffMemberId,
    )

  if (!candidate) {
    return {
      candidate: {
        id: pairId(args.keepStaffMemberId, args.mergeStaffMemberId),
        strength: "weak",
        signal: "same_name_only",
        riskPatternIds: [],
        keepStaffMemberId: args.keepStaffMemberId,
        mergeStaffMemberId: args.mergeStaffMemberId,
        userId: null,
        email: null,
        employerEntityType: null,
        employerEntityId: null,
        reason: "Pair is not a recognized duplicate candidate.",
      },
      references: [],
      canMerge: false,
      blockReason: "Merge requires a strong duplicate signal (same user_id or exact email+employer).",
    }
  }

  const normalized: WorkforceDuplicateCandidate = {
    ...candidate,
    keepStaffMemberId: args.keepStaffMemberId,
    mergeStaffMemberId: args.mergeStaffMemberId,
  }

  const references = await countMergeReferences(db, args.mergeStaffMemberId)
  const canMerge = normalized.strength === "strong"
  return {
    candidate: normalized,
    references,
    canMerge,
    blockReason: canMerge
      ? null
      : `Weak signal (${normalized.signal}) — never auto-merge; strengthen identity first.`,
  }
}

async function countMergeReferences(
  db: SupabaseClient,
  staffMemberId: string,
): Promise<MergeReferencePreview[]> {
  const tables: Array<{ table: string; column: string }> = [
    { table: "employment_assignments", column: "staff_member_id" },
    { table: "staff_shifts", column: "staff_member_id" },
    { table: "staff_shift_assignments", column: "staff_member_id" },
  ]

  const out: MergeReferencePreview[] = []
  for (const spec of tables) {
    const { count, error } = await db
      .from(spec.table)
      .select("id", { count: "exact", head: true })
      .eq(spec.column, staffMemberId)
    if (error) continue
    out.push({ table: spec.table, column: spec.column, count: count ?? 0 })
  }
  return out
}

/**
 * Execute a strong-signal merge. Retains an alias row and never runs on weak signals.
 */
export async function executeWorkforceMerge(args: {
  supabase?: SupabaseClient
  orgId: string
  keepStaffMemberId: string
  mergeStaffMemberId: string
  actorUserId: string
  confirmPreview: boolean
}): Promise<MergeExecuteResult> {
  if (!args.confirmPreview)
    throw new WorkforceMergeError("Merge requires an explicit preview confirmation.")

  const db = await getDb(args.supabase, args.orgId, "Execute workforce identity merge")
  const preview = await previewWorkforceMerge({
    supabase: db,
    orgId: args.orgId,
    keepStaffMemberId: args.keepStaffMemberId,
    mergeStaffMemberId: args.mergeStaffMemberId,
  })

  if (!preview.canMerge)
    throw new WorkforceMergeError(preview.blockReason || "Merge blocked.")

  const now = new Date().toISOString()
  let referencesUpdated = 0

  for (const ref of preview.references) {
    if (ref.count === 0) continue
    const { error, count } = await db
      .from(ref.table)
      .update({ [ref.column]: args.keepStaffMemberId })
      .eq(ref.column, args.mergeStaffMemberId)
    if (!error) referencesUpdated += count ?? ref.count
  }

  const { error: retireError } = await db
    .from("staff_members")
    .update({ status: "inactive", updated_at: now })
    .eq("id", args.mergeStaffMemberId)
  if (retireError) {
    await db.from("staff_members").update({ status: "inactive" }).eq("id", args.mergeStaffMemberId)
  }

  const { data: alias, error: aliasError } = await db
    .from("workforce_identity_aliases")
    .insert({
      org_id: args.orgId,
      canonical_staff_member_id: args.keepStaffMemberId,
      alias_staff_member_id: args.mergeStaffMemberId,
      signal: preview.candidate.signal,
      strength: preview.candidate.strength,
      merged_by: args.actorUserId,
      metadata: {
        risk_pattern_ids: preview.candidate.riskPatternIds,
        references: preview.references,
        reason: preview.candidate.reason,
      },
    })
    .select("id")
    .single()

  if (aliasError) {
    return {
      ok: false,
      aliasId: null,
      keptStaffMemberId: args.keepStaffMemberId,
      mergedStaffMemberId: args.mergeStaffMemberId,
      referencesUpdated,
      error: aliasError.message,
    }
  }

  return {
    ok: true,
    aliasId: alias?.id ?? null,
    keptStaffMemberId: args.keepStaffMemberId,
    mergedStaffMemberId: args.mergeStaffMemberId,
    referencesUpdated,
  }
}

export function listKnownDuplicateRiskPatterns() {
  return WORKFORCE_DUPLICATE_RISK_REPORT
}
