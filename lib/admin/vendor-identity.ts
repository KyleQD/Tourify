/**
 * VEND-102 — Vendor identity normalization, duplicate scoring, merge rules.
 * See docs/admin-feature-specs/adr/VEND-102-vendor-identity-deduplication.md
 */

import { z } from "zod"

export const VENDOR_CATEGORIES = [
  "production",
  "catering",
  "transport",
  "venue",
  "soft_goods",
  "security",
  "marketing",
  "other",
] as const

export type VendorCategory = (typeof VENDOR_CATEGORIES)[number]

export const VENDOR_MASTER_STATUSES = [
  "prospective",
  "invited",
  "evaluating",
  "approved",
  "preferred",
  "restricted",
  "inactive",
] as const

export type VendorMasterStatus = (typeof VENDOR_MASTER_STATUSES)[number]

export const VENDOR_ALIAS_SOURCES = [
  "legal_name",
  "display_name",
  "merge",
  "manual",
] as const

export type VendorAliasSource = (typeof VENDOR_ALIAS_SOURCES)[number]

/** Hard duplicate threshold — create blocked without merge or acknowledge reason. */
export const VENDOR_DUPLICATE_HARD_THRESHOLD = 80
/** Soft duplicate threshold — warn in UX. */
export const VENDOR_DUPLICATE_SOFT_THRESHOLD = 40

const LEGAL_SUFFIXES = /\b(inc|incorporated|llc|l\.l\.c|ltd|limited|corp|corporation|co|company|plc|gmbh|s\.a\.|sa|bv|pty)\b\.?/gi

export function normalizeVendorName(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(LEGAL_SUFFIXES, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

export function normalizePhoneDigits(value: string | null | undefined): string | null {
  if (!value) return null
  const digits = value.replace(/\D/g, "")
  if (digits.length < 7) return null
  return digits
}

export function normalizeEmail(value: string | null | undefined): string | null {
  if (!value) return null
  const trimmed = value.trim().toLowerCase()
  if (!trimmed || !trimmed.includes("@")) return null
  return trimmed
}

export const vendorIdentityInputSchema = z
  .object({
    legal_name: z.string().trim().min(1).max(240),
    display_name: z.string().trim().min(1).max(240).optional(),
    category: z.enum(VENDOR_CATEGORIES),
    status: z.enum(VENDOR_MASTER_STATUSES).optional().default("prospective"),
    city: z.string().trim().max(120).optional().nullable(),
    region: z.string().trim().max(120).optional().nullable(),
    country: z.string().trim().max(120).optional().nullable(),
    external_accounting_id: z.string().trim().max(120).optional().nullable(),
    primary_contact_name: z.string().trim().max(160).optional().nullable(),
    primary_contact_email: z.string().trim().email().max(240).optional().nullable()
      .or(z.literal("").transform(() => null)),
    primary_contact_phone: z.string().trim().max(80).optional().nullable(),
  })
  .strict()

export type VendorIdentityInput = z.infer<typeof vendorIdentityInputSchema>

export interface VendorIdentityRecord {
  id: string
  org_id: string
  legal_name: string
  display_name: string
  normalized_legal_name: string
  category: string
  status: string
  city?: string | null
  region?: string | null
  country?: string | null
  external_accounting_id?: string | null
  primary_contact_email?: string | null
  primary_contact_phone?: string | null
  merged_into_id?: string | null
  aliases?: string[]
}

export interface VendorDuplicateSignal {
  code: string
  weight: number
  detail: string
}

export interface VendorDuplicateMatch {
  candidateId: string
  score: number
  signals: VendorDuplicateSignal[]
  severity: "hard" | "soft" | "none"
}

export function buildVendorIdentityRow(args: {
  orgId: string
  input: VendorIdentityInput
  actorUserId: string
}): Record<string, unknown> {
  const legal = args.input.legal_name.trim()
  const display = (args.input.display_name || legal).trim()
  return {
    org_id: args.orgId,
    legal_name: legal,
    display_name: display,
    normalized_legal_name: normalizeVendorName(legal),
    category: args.input.category,
    status: args.input.status ?? "prospective",
    city: args.input.city ?? null,
    region: args.input.region ?? null,
    country: args.input.country ?? null,
    external_accounting_id: args.input.external_accounting_id?.trim() || null,
    primary_contact_name: args.input.primary_contact_name ?? null,
    primary_contact_email: normalizeEmail(args.input.primary_contact_email),
    primary_contact_phone: args.input.primary_contact_phone ?? null,
    created_by: args.actorUserId,
    updated_by: args.actorUserId,
  }
}

export function scoreVendorDuplicate(args: {
  incoming: {
    legal_name: string
    display_name?: string | null
    country?: string | null
    city?: string | null
    external_accounting_id?: string | null
    primary_contact_email?: string | null
    primary_contact_phone?: string | null
  }
  existing: VendorIdentityRecord
}): VendorDuplicateMatch {
  const signals: VendorDuplicateSignal[] = []
  const incomingLegal = normalizeVendorName(args.incoming.legal_name)
  const existingLegal = args.existing.normalized_legal_name
    || normalizeVendorName(args.existing.legal_name)

  if (incomingLegal && incomingLegal === existingLegal) {
    signals.push({
      code: "exact_normalized_legal_name",
      weight: 100,
      detail: "Normalized legal names match",
    })
  }

  const inAcct = args.incoming.external_accounting_id?.trim().toLowerCase() || null
  const exAcct = args.existing.external_accounting_id?.trim().toLowerCase() || null
  if (inAcct && exAcct && inAcct === exAcct) {
    signals.push({
      code: "exact_external_accounting_id",
      weight: 100,
      detail: "External accounting IDs match",
    })
  }

  const inCountry = (args.incoming.country || "").trim().toLowerCase()
  const exCountry = (args.existing.country || "").trim().toLowerCase()
  if (
    incomingLegal
    && incomingLegal === existingLegal
    && inCountry
    && inCountry === exCountry
  ) {
    signals.push({
      code: "legal_name_same_country",
      weight: 90,
      detail: "Legal name and country match",
    })
  }

  const inDisplay = normalizeVendorName(args.incoming.display_name || args.incoming.legal_name)
  const exDisplay = normalizeVendorName(args.existing.display_name || args.existing.legal_name)
  const inCity = (args.incoming.city || "").trim().toLowerCase()
  const exCity = (args.existing.city || "").trim().toLowerCase()
  if (inDisplay && inDisplay === exDisplay && inCity && inCity === exCity) {
    signals.push({
      code: "display_name_same_city",
      weight: 70,
      detail: "Display name and city match",
    })
  }

  const inEmail = normalizeEmail(args.incoming.primary_contact_email)
  const exEmail = normalizeEmail(args.existing.primary_contact_email)
  if (inEmail && exEmail && inEmail === exEmail) {
    signals.push({
      code: "shared_contact_email",
      weight: 85,
      detail: "Primary contact emails match",
    })
  }

  const inPhone = normalizePhoneDigits(args.incoming.primary_contact_phone)
  const exPhone = normalizePhoneDigits(args.existing.primary_contact_phone)
  if (inPhone && exPhone && inPhone === exPhone) {
    signals.push({
      code: "shared_contact_phone",
      weight: 75,
      detail: "Primary contact phones match",
    })
  }

  // Alias hit (search history)
  const aliases = args.existing.aliases || []
  if (incomingLegal && aliases.some((a) => normalizeVendorName(a) === incomingLegal)) {
    signals.push({
      code: "alias_match",
      weight: 95,
      detail: "Incoming legal name matches retained alias",
    })
  }

  const score = signals.reduce((max, s) => Math.max(max, s.weight), 0)
  const severity =
    score >= VENDOR_DUPLICATE_HARD_THRESHOLD
      ? "hard"
      : score >= VENDOR_DUPLICATE_SOFT_THRESHOLD
        ? "soft"
        : "none"

  return {
    candidateId: args.existing.id,
    score,
    signals,
    severity,
  }
}

export function findVendorDuplicateMatches(args: {
  incoming: {
    legal_name: string
    display_name?: string | null
    country?: string | null
    city?: string | null
    external_accounting_id?: string | null
    primary_contact_email?: string | null
    primary_contact_phone?: string | null
  }
  existing: VendorIdentityRecord[]
}): VendorDuplicateMatch[] {
  return args.existing
    .filter((row) => !row.merged_into_id && row.status !== "inactive")
    .map((row) => scoreVendorDuplicate({ incoming: args.incoming, existing: row }))
    .filter((m) => m.severity !== "none")
    .sort((a, b) => b.score - a.score)
}

export interface VendorMergePlan {
  survivorId: string
  absorbedIds: string[]
  aliasesToRetain: Array<{
    vendor_id: string
    alias_display: string
    alias_normalized: string
    source: VendorAliasSource
  }>
  repointEngagements: boolean
}

/**
 * Build merge plan: survivor kept; absorbed become inactive aliases of survivor.
 */
export function planVendorMerge(args: {
  survivor: VendorIdentityRecord
  absorbed: VendorIdentityRecord[]
}): VendorMergePlan {
  if (args.absorbed.length === 0) {
    throw new Error("At least one absorbed vendor is required for merge")
  }
  if (args.absorbed.some((a) => a.id === args.survivor.id)) {
    throw new Error("Survivor cannot be absorbed into itself")
  }
  if (args.absorbed.some((a) => a.org_id !== args.survivor.org_id)) {
    throw new Error("Merge is org-scoped only")
  }

  const aliasesToRetain: VendorMergePlan["aliasesToRetain"] = []
  for (const row of args.absorbed) {
    aliasesToRetain.push({
      vendor_id: args.survivor.id,
      alias_display: row.legal_name,
      alias_normalized: normalizeVendorName(row.legal_name),
      source: "merge",
    })
    if (normalizeVendorName(row.display_name) !== normalizeVendorName(row.legal_name)) {
      aliasesToRetain.push({
        vendor_id: args.survivor.id,
        alias_display: row.display_name,
        alias_normalized: normalizeVendorName(row.display_name),
        source: "merge",
      })
    }
    for (const alias of row.aliases || []) {
      aliasesToRetain.push({
        vendor_id: args.survivor.id,
        alias_display: alias,
        alias_normalized: normalizeVendorName(alias),
        source: "merge",
      })
    }
  }

  // Dedupe aliases by normalized form
  const seen = new Set<string>()
  const uniqueAliases = aliasesToRetain.filter((a) => {
    if (!a.alias_normalized || seen.has(a.alias_normalized)) return false
    seen.add(a.alias_normalized)
    return true
  })

  return {
    survivorId: args.survivor.id,
    absorbedIds: args.absorbed.map((a) => a.id),
    aliasesToRetain: uniqueAliases,
    repointEngagements: true,
  }
}

export function canAcknowledgeDistinctDuplicate(args: {
  score: number
  acknowledgeReason?: string | null
}): boolean {
  if (args.score < VENDOR_DUPLICATE_HARD_THRESHOLD) return true
  return Boolean(args.acknowledgeReason && args.acknowledgeReason.trim().length >= 3)
}
