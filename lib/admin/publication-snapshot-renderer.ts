/**
 * PUB-202 — Deterministic publication snapshot renderer.
 * Same source version always generates equivalent manifest/checksum.
 */

import { createHash } from "crypto"

import {
  classifyPublicationSection,
  PublicationFieldClassificationError,
} from "@/lib/admin/publication-field-policy"
import type {
  PublicationAudienceClass,
  PublicationType,
} from "@/lib/admin/publication-schema"

export interface SnapshotSectionInput {
  key: string
  title: string
  required: boolean
  payload: unknown
  /** When true, section may be omitted with an explicit exclusion record. */
  allowExclude?: boolean
  excluded?: boolean
  excludeReason?: string
  /** Required for custom section keys; built-in keys use the PUB-002 policy. */
  audienceClass?: PublicationAudienceClass
  /** Optional path overrides may raise, but never lower, built-in field policy. */
  fieldAudienceClasses?: Record<string, PublicationAudienceClass>
}

export interface SnapshotRenderInput {
  publicationType: PublicationType
  orgId: string
  subjectType: "tour" | "event"
  subjectId: string
  sourcePlanVersion: number
  sections: SnapshotSectionInput[]
}

export interface SnapshotManifestSection {
  key: string
  title: string
  required: boolean
  status: "included" | "excluded" | "missing"
  excludeReason?: string
  checksum: string | null
  audienceClass: PublicationAudienceClass | null
  accessClassification: PublicationAudienceClass | null
  fieldAudienceClasses: Record<string, PublicationAudienceClass>
}

export interface SnapshotRenderResult {
  ok: boolean
  manifest: {
    publicationType: PublicationType
    orgId: string
    subjectType: string
    subjectId: string
    sourcePlanVersion: number
    sections: SnapshotManifestSection[]
  }
  checksum: string
  body: Record<string, unknown>
  errors: string[]
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map((item) => stableStringify(item)).join(",")}]`
  const record = value as Record<string, unknown>
  const keys = Object.keys(record).sort()
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`).join(",")}}`
}

function sha256(raw: string): string {
  return createHash("sha256").update(raw).digest("hex")
}

export function renderPublicationSnapshot(input: SnapshotRenderInput): SnapshotRenderResult {
  const errors: string[] = []
  const body: Record<string, unknown> = {}
  const sections: SnapshotManifestSection[] = []

  const ordered = [...input.sections].sort((a, b) => a.key.localeCompare(b.key))

  for (const section of ordered) {
    if (section.excluded) {
      if (section.required && !section.allowExclude) {
        errors.push(`Required section "${section.key}" cannot be excluded.`)
        sections.push({
          key: section.key,
          title: section.title,
          required: section.required,
          status: "missing",
          excludeReason: section.excludeReason,
          checksum: null,
          audienceClass: null,
          accessClassification: null,
          fieldAudienceClasses: {},
        })
        continue
      }
      sections.push({
        key: section.key,
        title: section.title,
        required: section.required,
        status: "excluded",
        excludeReason: section.excludeReason || "explicitly_excluded",
        checksum: null,
        audienceClass: null,
        accessClassification: null,
        fieldAudienceClasses: {},
      })
      continue
    }

    if (section.payload == null) {
      if (section.required) {
        errors.push(`Required section "${section.key}" is missing.`)
        sections.push({
          key: section.key,
          title: section.title,
          required: true,
          status: "missing",
          checksum: null,
          audienceClass: null,
          accessClassification: null,
          fieldAudienceClasses: {},
        })
      } else if (section.allowExclude) {
        sections.push({
          key: section.key,
          title: section.title,
          required: false,
          status: "excluded",
          excludeReason: "missing_optional",
          checksum: null,
          audienceClass: null,
          accessClassification: null,
          fieldAudienceClasses: {},
        })
      } else {
        errors.push(`Optional section "${section.key}" missing without explicit exclusion.`)
        sections.push({
          key: section.key,
          title: section.title,
          required: false,
          status: "missing",
          checksum: null,
          audienceClass: null,
          accessClassification: null,
          fieldAudienceClasses: {},
        })
      }
      continue
    }

    let classification
    try {
      classification = classifyPublicationSection({
        publicationType: input.publicationType,
        sectionKey: section.key,
        payload: section.payload,
        audienceClass: section.audienceClass,
        fieldAudienceClasses: section.fieldAudienceClasses,
      })
    } catch (error) {
      if (!(error instanceof PublicationFieldClassificationError)) throw error
      errors.push(error.message)
      sections.push({
        key: section.key,
        title: section.title,
        required: section.required,
        status: "missing",
        checksum: null,
        audienceClass: null,
        accessClassification: null,
        fieldAudienceClasses: {},
      })
      continue
    }

    const encoded = stableStringify({
      payload: section.payload,
      audienceClass: classification.sectionAudienceClass,
      fieldAudienceClasses: classification.fieldAudienceClasses,
    })
    const checksum = sha256(encoded)
    body[section.key] = section.payload
    sections.push({
      key: section.key,
      title: section.title,
      required: section.required,
      status: "included",
      checksum,
      audienceClass: classification.sectionAudienceClass,
      accessClassification: classification.accessClassification,
      fieldAudienceClasses: classification.fieldAudienceClasses,
    })
  }

  const manifest = {
    publicationType: input.publicationType,
    orgId: input.orgId,
    subjectType: input.subjectType,
    subjectId: input.subjectId,
    sourcePlanVersion: input.sourcePlanVersion,
    sections,
  }

  const checksum = sha256(stableStringify({ manifest, body }))
  return {
    ok: errors.length === 0,
    manifest,
    checksum,
    body,
    errors,
  }
}
