/**
 * ADV-408 — Freeze/export approved advance
 *
 * An approved advance can be frozen into an immutable FrozenAdvanceVersion.
 * Later changes to section responses create a new version; diffs between
 * versions are computed and surface what changed.
 *
 * The frozen package manifest drives run-of-show/day-sheet generation by
 * enumerating available section data (without embedding the data itself).
 *
 * Export authorization is role-aware: only authorized capabilities may
 * request a web or PDF package.
 *
 * Pure domain logic; no Supabase imports.
 */

// ---------------------------------------------------------------------------
// Frozen version
// ---------------------------------------------------------------------------

export type FrozenVersionStatus = "draft" | "frozen" | "superseded"

export interface FrozenSectionSnapshot {
  template_section_id: string
  title: string
  /** Version of the section at freeze time */
  section_version_hash: string
  /** True when the section was approved at freeze time */
  was_approved: boolean
  /** True when this section had open variances at freeze time */
  had_open_variances: boolean
}

export interface FrozenAdvanceVersion {
  id: string
  org_id: string
  advance_id: string
  event_id: string

  version_number: number
  status: FrozenVersionStatus

  /** Immutable snapshot of section approval states at freeze time */
  sections: FrozenSectionSnapshot[]

  /** Checksum of the full section set (deterministic) */
  content_checksum: string

  /** ISO-8601 when all required sections were approved */
  all_sections_approved_at?: string

  frozen_by?: string
  frozen_at?: string

  /** Previous frozen version ID (null for v1) */
  previous_version_id?: string

  created_at: string
  updated_at: string
}

// ---------------------------------------------------------------------------
// Readiness check before freezing
// ---------------------------------------------------------------------------

export interface FreezeReadinessResult {
  ready: boolean
  blocking_reasons: string[]
}

export function checkFreezeReadiness(
  sections: FrozenSectionSnapshot[],
  hasBlockingVariances: boolean,
): FreezeReadinessResult {
  const reasons: string[] = []

  const unapproved = sections.filter((s) => !s.was_approved)
  if (unapproved.length > 0) {
    reasons.push(
      `${unapproved.length} section(s) not yet approved: ${unapproved.map((s) => s.title).join(", ")}.`,
    )
  }
  if (hasBlockingVariances) {
    reasons.push("There are unresolved variances that block publication.")
  }

  return { ready: reasons.length === 0, blocking_reasons: reasons }
}

// ---------------------------------------------------------------------------
// Freeze
// ---------------------------------------------------------------------------

export function freezeAdvanceVersion(
  existing: FrozenAdvanceVersion | undefined,
  input: {
    id: string
    org_id: string
    advance_id: string
    event_id: string
    sections: FrozenSectionSnapshot[]
    content_checksum: string
    all_sections_approved_at?: string
    frozen_by: string
    now?: string
  },
): { previous: FrozenAdvanceVersion | undefined; frozen: FrozenAdvanceVersion } {
  const ts = input.now ?? new Date().toISOString()

  let previous: FrozenAdvanceVersion | undefined
  let version_number = 1
  let previous_version_id: string | undefined

  if (existing) {
    previous = { ...existing, status: "superseded", updated_at: ts }
    version_number = existing.version_number + 1
    previous_version_id = existing.id
  }

  const frozen: FrozenAdvanceVersion = {
    id: input.id,
    org_id: input.org_id,
    advance_id: input.advance_id,
    event_id: input.event_id,
    version_number,
    status: "frozen",
    sections: input.sections,
    content_checksum: input.content_checksum,
    all_sections_approved_at: input.all_sections_approved_at,
    frozen_by: input.frozen_by,
    frozen_at: ts,
    previous_version_id,
    created_at: ts,
    updated_at: ts,
  }

  return { previous, frozen }
}

// ---------------------------------------------------------------------------
// Version diff
// ---------------------------------------------------------------------------

export type SectionDiffStatus = "unchanged" | "updated" | "added" | "removed"

export interface FrozenVersionDiffEntry {
  template_section_id: string
  title: string
  diff_status: SectionDiffStatus
  previous_hash?: string
  current_hash?: string
}

export function diffFrozenVersions(
  previous: FrozenAdvanceVersion,
  current: FrozenAdvanceVersion,
): FrozenVersionDiffEntry[] {
  const entries: FrozenVersionDiffEntry[] = []
  const prevMap = new Map(previous.sections.map((s) => [s.template_section_id, s]))
  const currMap = new Map(current.sections.map((s) => [s.template_section_id, s]))

  // Check current sections against previous
  for (const [id, curr] of currMap.entries()) {
    const prev = prevMap.get(id)
    if (!prev) {
      entries.push({ template_section_id: id, title: curr.title, diff_status: "added", current_hash: curr.section_version_hash })
    } else if (prev.section_version_hash !== curr.section_version_hash) {
      entries.push({ template_section_id: id, title: curr.title, diff_status: "updated", previous_hash: prev.section_version_hash, current_hash: curr.section_version_hash })
    } else {
      entries.push({ template_section_id: id, title: curr.title, diff_status: "unchanged", current_hash: curr.section_version_hash })
    }
  }

  // Removed sections
  for (const [id, prev] of prevMap.entries()) {
    if (!currMap.has(id)) {
      entries.push({ template_section_id: id, title: prev.title, diff_status: "removed", previous_hash: prev.section_version_hash })
    }
  }

  return entries
}

// ---------------------------------------------------------------------------
// Export package manifest
// ---------------------------------------------------------------------------

export type ExportPackageFormat = "web" | "pdf"

export type ExportAuthCapability =
  | "advance.manage"    // full access
  | "event.publish"     // can request export for publication
  | "event.live_ops"    // day-sheet view (limited sections)
  | "workforce.view"    // crew-only sections

/** Sections visible per capability */
const EXPORT_CAPABILITY_SECTION_FILTER: Record<ExportAuthCapability, "all" | "crew_only"> = {
  "advance.manage": "all",
  "event.publish": "all",
  "event.live_ops": "crew_only",
  "workforce.view": "crew_only",
}

export interface ExportManifestSection {
  template_section_id: string
  title: string
  section_version_hash: string
  included: boolean
  exclusion_reason?: string
}

export interface ExportPackageManifest {
  frozen_version_id: string
  advance_id: string
  event_id: string
  version_number: number
  format: ExportPackageFormat
  capability: ExportAuthCapability
  content_checksum: string
  sections: ExportManifestSection[]
  generated_at: string
  /** Sections that feed run-of-show/day-sheet generation */
  ros_feed_section_ids: string[]
}

/** Section categories that feed run-of-show/day sheet */
const ROS_FEED_SECTION_TITLE_KEYWORDS = [
  "production", "transport", "staffing", "hospitality", "emergency", "local_contacts",
]

export function buildExportPackageManifest(
  version: FrozenAdvanceVersion,
  format: ExportPackageFormat,
  capability: ExportAuthCapability,
  now?: string,
): ExportPackageManifest {
  const ts = now ?? new Date().toISOString()
  const filter = EXPORT_CAPABILITY_SECTION_FILTER[capability]

  const CREW_ONLY_KEYWORDS = ["staffing", "transport", "emergency"]

  const sections: ExportManifestSection[] = version.sections.map((s) => {
    const isCrewSection = CREW_ONLY_KEYWORDS.some((kw) =>
      s.title.toLowerCase().includes(kw),
    )
    const included = filter === "all" || isCrewSection

    return {
      template_section_id: s.template_section_id,
      title: s.title,
      section_version_hash: s.section_version_hash,
      included,
      exclusion_reason: included ? undefined : "capability_restricted",
    }
  })

  const ros_feed_section_ids = sections
    .filter(
      (s) =>
        s.included &&
        ROS_FEED_SECTION_TITLE_KEYWORDS.some((kw) => s.title.toLowerCase().includes(kw)),
    )
    .map((s) => s.template_section_id)

  return {
    frozen_version_id: version.id,
    advance_id: version.advance_id,
    event_id: version.event_id,
    version_number: version.version_number,
    format,
    capability,
    content_checksum: version.content_checksum,
    sections,
    generated_at: ts,
    ros_feed_section_ids,
  }
}

// ---------------------------------------------------------------------------
// Export package summary
// ---------------------------------------------------------------------------

export function summarizeExportManifest(manifest: ExportPackageManifest): {
  total_sections: number
  included: number
  excluded: number
  ros_feed_count: number
} {
  return {
    total_sections: manifest.sections.length,
    included: manifest.sections.filter((s) => s.included).length,
    excluded: manifest.sections.filter((s) => !s.included).length,
    ros_feed_count: manifest.ros_feed_section_ids.length,
  }
}
