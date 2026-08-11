/**
 * PUB-301 to PUB-303 — Tour book sections, recipient projections, and offline packages (pure).
 *
 * PUB-301: Composable tour-book section contracts
 *   11 section types: itinerary, contacts, travel, lodging, schedules, advance,
 *   maps, hospitality, equipment, tickets_credentials, emergency.
 *   Each has: key, title, audience class, required flag, version, source refs, payload,
 *   exclusion/missing handling.
 *
 * PUB-302: Recipient-specific projections
 *   Field-level audience filtering per recipient class; projection version recorded in
 *   snapshot manifest; test fixtures verify no data leakage across class boundaries.
 *
 * PUB-303: Mobile/offline package
 *   Per-section cache policy (cacheable/not), encryption hint, expiry, sync status,
 *   and revoked/superseded warning; sensitive sections follow `sensitive_traveler`
 *   or `financial` constraint (no offline cache).
 *
 * Pure: no I/O, no `server-only`.
 */

import type { PublicationAudienceClass } from "@/lib/admin/publication-schema"

// ---------------------------------------------------------------------------
// PUB-301: Section type registry and contracts
// ---------------------------------------------------------------------------

export const TOUR_BOOK_SECTION_KEYS = [
  "itinerary",
  "contacts",
  "travel",
  "lodging",
  "schedules",
  "advance",
  "maps",
  "hospitality",
  "equipment",
  "tickets_credentials",
  "emergency",
] as const

export type TourBookSectionKey = (typeof TOUR_BOOK_SECTION_KEYS)[number]

/** Which audience class grants access to a section in the tour book. */
export const SECTION_AUDIENCE_CLASS: Record<TourBookSectionKey, PublicationAudienceClass> = {
  itinerary:           "worker",
  contacts:            "worker",
  travel:              "sensitive_traveler",
  lodging:             "sensitive_traveler",
  schedules:           "worker",
  advance:             "internal",
  maps:                "worker",
  hospitality:         "worker",
  equipment:           "internal",
  tickets_credentials: "worker",
  emergency:           "worker",
}

/** Whether the section must be present for the tour book to be publishable. */
export const SECTION_REQUIRED: Record<TourBookSectionKey, boolean> = {
  itinerary:           true,
  contacts:            true,
  travel:              false,
  lodging:             false,
  schedules:           false,
  advance:             false,
  maps:                false,
  hospitality:         false,
  equipment:           false,
  tickets_credentials: false,
  emergency:           true,
}

/** Contract version for each section type. Bumping triggers re-snapshot. */
export const SECTION_CONTRACT_VERSION: Record<TourBookSectionKey, string> = {
  itinerary:           "v1",
  contacts:            "v1",
  travel:              "v1",
  lodging:             "v1",
  schedules:           "v1",
  advance:             "v1",
  maps:                "v1",
  hospitality:         "v1",
  equipment:           "v1",
  tickets_credentials: "v1",
  emergency:           "v1",
}

export interface TourBookSectionSourceRef {
  /** Domain record type (e.g. "tour_stop", "lodging_block"). */
  record_type: string
  record_id: string
  record_version: number | null
}

export interface TourBookSection<T = unknown> {
  key: TourBookSectionKey
  title: string
  contract_version: string
  audience_class: PublicationAudienceClass
  required: boolean
  source_refs: TourBookSectionSourceRef[]
  payload: T
  excluded: boolean
  exclude_reason: string | null
}

export interface TourBookSectionInput<T = unknown> {
  key: TourBookSectionKey
  source_refs?: TourBookSectionSourceRef[]
  payload: T | null
  /** Explicitly exclude this section with a reason. */
  excluded?: boolean
  exclude_reason?: string | null
}

export type TourBookSectionBuildResult<T = unknown> =
  | { ok: true; section: TourBookSection<T> }
  | { ok: false; reason: "missing_required" | "missing_payload"; key: TourBookSectionKey; detail: string }

/** Build a validated section from raw input against its contract. */
export function buildTourBookSection<T = unknown>(
  input: TourBookSectionInput<T>,
): TourBookSectionBuildResult<T> {
  const { key } = input
  const required = SECTION_REQUIRED[key]
  const audience_class = SECTION_AUDIENCE_CLASS[key]
  const contract_version = SECTION_CONTRACT_VERSION[key]

  if (input.excluded) {
    if (required) {
      return {
        ok: false,
        reason: "missing_required",
        key,
        detail: `Required section "${key}" cannot be excluded.`,
      }
    }
    return {
      ok: true,
      section: {
        key,
        title: sectionTitle(key),
        contract_version,
        audience_class,
        required,
        source_refs: input.source_refs ?? [],
        payload: null as unknown as T,
        excluded: true,
        exclude_reason: input.exclude_reason ?? "explicitly_excluded",
      },
    }
  }

  if (input.payload == null) {
    if (required) {
      return {
        ok: false,
        reason: "missing_required",
        key,
        detail: `Required section "${key}" payload is null or undefined.`,
      }
    }
    return {
      ok: false,
      reason: "missing_payload",
      key,
      detail: `Optional section "${key}" has no payload; exclude it explicitly if not applicable.`,
    }
  }

  return {
    ok: true,
    section: {
      key,
      title: sectionTitle(key),
      contract_version,
      audience_class,
      required,
      source_refs: input.source_refs ?? [],
      payload: input.payload,
      excluded: false,
      exclude_reason: null,
    },
  }
}

function sectionTitle(key: TourBookSectionKey): string {
  const titles: Record<TourBookSectionKey, string> = {
    itinerary:           "Tour Itinerary",
    contacts:            "Key Contacts",
    travel:              "Travel Arrangements",
    lodging:             "Lodging Details",
    schedules:           "Schedules",
    advance:             "Advance Information",
    maps:                "Site Maps",
    hospitality:         "Hospitality & Catering",
    equipment:           "Equipment",
    tickets_credentials: "Tickets & Credentials",
    emergency:           "Emergency Information",
  }
  return titles[key]
}

/** Summarise a batch of section build results. Returns overall ok + errors. */
export interface TourBookAssemblySummary {
  ok: boolean
  included_sections: TourBookSectionKey[]
  excluded_sections: TourBookSectionKey[]
  errors: Array<{ key: TourBookSectionKey; detail: string }>
}

export function summariseTourBookAssembly(
  results: TourBookSectionBuildResult[],
): TourBookAssemblySummary {
  const errors: Array<{ key: TourBookSectionKey; detail: string }> = []
  const included: TourBookSectionKey[] = []
  const excluded: TourBookSectionKey[] = []

  for (const r of results) {
    if (!r.ok) {
      errors.push({ key: r.key, detail: r.detail })
    } else if (r.section.excluded) {
      excluded.push(r.section.key)
    } else {
      included.push(r.section.key)
    }
  }

  return {
    ok: errors.length === 0,
    included_sections: included,
    excluded_sections: excluded,
    errors,
  }
}

// ---------------------------------------------------------------------------
// PUB-302: Recipient-specific projections
// ---------------------------------------------------------------------------

/**
 * Audience class hierarchy — which classes are visible to a given recipient class.
 * A recipient sees their own class and everything below it in the hierarchy.
 */
const AUDIENCE_VISIBILITY: Record<PublicationAudienceClass, PublicationAudienceClass[]> = {
  internal:          ["internal", "worker", "department", "vendor", "public", "financial", "personnel", "sensitive_traveler"],
  worker:            ["worker", "department", "public"],
  department:        ["department", "public"],
  vendor:            ["vendor", "public"],
  public:            ["public"],
  financial:         ["financial", "internal"],
  personnel:         ["personnel", "internal"],
  sensitive_traveler: ["sensitive_traveler", "worker", "public"],
}

/** Projection policy version — bump when visibility rules change. */
export const PROJECTION_POLICY_VERSION = "v1"

export interface ProjectedSection {
  key: TourBookSectionKey
  contract_version: string
  audience_class: PublicationAudienceClass
  /** true when section is included in this recipient's view. */
  visible: boolean
  /** Reason a section was hidden for this recipient. */
  hidden_reason: "audience_class_denied" | "excluded_by_source" | null
}

export interface RecipientProjectionManifest {
  /** The recipient's audience class. */
  recipient_class: PublicationAudienceClass
  projection_policy_version: string
  sections: ProjectedSection[]
  /** Keys of sections visible to this recipient. */
  visible_section_keys: TourBookSectionKey[]
  /** Keys hidden for this recipient. */
  hidden_section_keys: TourBookSectionKey[]
}

/** Project a list of tour-book sections for a specific recipient audience class. */
export function projectSectionsForRecipient(
  sections: TourBookSection[],
  recipientClass: PublicationAudienceClass,
): RecipientProjectionManifest {
  const allowed = AUDIENCE_VISIBILITY[recipientClass] ?? []
  const projected: ProjectedSection[] = []
  const visible: TourBookSectionKey[] = []
  const hidden: TourBookSectionKey[] = []

  for (const s of sections) {
    if (s.excluded) {
      projected.push({
        key: s.key,
        contract_version: s.contract_version,
        audience_class: s.audience_class,
        visible: false,
        hidden_reason: "excluded_by_source",
      })
      hidden.push(s.key)
      continue
    }

    const permitted = allowed.includes(s.audience_class)
    projected.push({
      key: s.key,
      contract_version: s.contract_version,
      audience_class: s.audience_class,
      visible: permitted,
      hidden_reason: permitted ? null : "audience_class_denied",
    })
    if (permitted) visible.push(s.key)
    else hidden.push(s.key)
  }

  return {
    recipient_class: recipientClass,
    projection_policy_version: PROJECTION_POLICY_VERSION,
    sections: projected,
    visible_section_keys: visible,
    hidden_section_keys: hidden,
  }
}

/** Verify no section intended for a higher-privileged class leaks into a lower one. */
export interface ProjectionLeakCheck {
  leaked_sections: Array<{ key: TourBookSectionKey; audience_class: PublicationAudienceClass }>
  ok: boolean
}

export function assertNoProjectionLeak(
  internalManifest: RecipientProjectionManifest,
  restrictedManifest: RecipientProjectionManifest,
): ProjectionLeakCheck {
  const leaked: Array<{ key: TourBookSectionKey; audience_class: PublicationAudienceClass }> = []

  for (const ps of restrictedManifest.sections) {
    if (!ps.visible) continue
    // If this key is also visible to internal (should always be) — that's fine.
    // But if the restricted audience sees a section whose class is NOT in their allowed list, it's a leak.
    const allowed = AUDIENCE_VISIBILITY[restrictedManifest.recipient_class] ?? []
    if (!allowed.includes(ps.audience_class)) {
      leaked.push({ key: ps.key, audience_class: ps.audience_class })
    }
  }

  return { leaked_sections: leaked, ok: leaked.length === 0 }
}

// ---------------------------------------------------------------------------
// PUB-303: Mobile/offline package
// ---------------------------------------------------------------------------

export type OfflineCachePolicy = "cacheable" | "session_only" | "no_cache"
export type OfflineSyncStatus = "current" | "stale" | "superseded" | "revoked" | "never_synced"

/** Per-section offline cache policy — sensitive data never cached offline. */
export const SECTION_OFFLINE_POLICY: Record<TourBookSectionKey, OfflineCachePolicy> = {
  itinerary:           "cacheable",
  contacts:            "cacheable",
  travel:              "session_only",    // sensitive_traveler — no persistent cache
  lodging:             "session_only",    // sensitive_traveler — no persistent cache
  schedules:           "cacheable",
  advance:             "no_cache",        // internal only
  maps:                "cacheable",
  hospitality:         "cacheable",
  equipment:           "no_cache",        // internal only
  tickets_credentials: "session_only",    // credential data — session only
  emergency:           "cacheable",
}

export interface OfflinePackageSection {
  key: TourBookSectionKey
  cache_policy: OfflineCachePolicy
  /** True when section should be present in the package for this recipient. */
  included: boolean
  /** True when the cache policy allows persisting to device storage. */
  device_cacheable: boolean
  /** Reason section is absent from package. */
  omit_reason: "no_cache_policy" | "hidden_for_recipient" | null
}

export interface OfflinePackageManifest {
  publication_id: string
  snapshot_id: string
  /** Pinned published version — never floats. */
  snapshot_version: number
  recipient_class: PublicationAudienceClass
  /** ISO expiry — client must discard and re-sync after this. */
  expires_at: string | null
  sync_status: OfflineSyncStatus
  sections: OfflinePackageSection[]
  /** Warning shown when sync_status is superseded or revoked. */
  warning: string | null
  /** Encryption hint: 'device_keychain' | 'none'. Sensitive sections require device_keychain. */
  encryption_hint: "device_keychain" | "none"
}

export function buildOfflinePackageManifest(args: {
  publicationId: string
  snapshotId: string
  snapshotVersion: number
  recipientClass: PublicationAudienceClass
  projectionManifest: RecipientProjectionManifest
  expiresAt: string | null
  syncStatus: OfflineSyncStatus
}): OfflinePackageManifest {
  const {
    publicationId,
    snapshotId,
    snapshotVersion,
    recipientClass,
    projectionManifest,
    expiresAt,
    syncStatus,
  } = args

  const sections: OfflinePackageSection[] = TOUR_BOOK_SECTION_KEYS.map((key) => {
    const cachePolicy = SECTION_OFFLINE_POLICY[key]
    const projSection = projectionManifest.sections.find((s) => s.key === key)
    const visibleToRecipient = projSection?.visible ?? false

    if (!visibleToRecipient) {
      return {
        key,
        cache_policy: cachePolicy,
        included: false,
        device_cacheable: false,
        omit_reason: "hidden_for_recipient",
      }
    }

    if (cachePolicy === "no_cache") {
      return {
        key,
        cache_policy: cachePolicy,
        included: false,
        device_cacheable: false,
        omit_reason: "no_cache_policy",
      }
    }

    return {
      key,
      cache_policy: cachePolicy,
      included: true,
      device_cacheable: cachePolicy === "cacheable",
      omit_reason: null,
    }
  })

  // Any session_only sensitive section in the package requires device_keychain hint.
  const hasSensitiveSection = sections.some(
    (s) => s.included && SECTION_OFFLINE_POLICY[s.key] === "session_only",
  )

  let warning: string | null = null
  if (syncStatus === "superseded") {
    warning = "This package has been superseded. Please sync to get the latest version."
  } else if (syncStatus === "revoked") {
    warning = "Access to this package has been revoked. Please discard it immediately."
  }

  return {
    publication_id: publicationId,
    snapshot_id: snapshotId,
    snapshot_version: snapshotVersion,
    recipient_class: recipientClass,
    expires_at: expiresAt,
    sync_status: syncStatus,
    sections,
    warning,
    encryption_hint: hasSensitiveSection ? "device_keychain" : "none",
  }
}

/** Returns true when the offline package should be rejected by the client. */
export function offlinePackageIsUsable(pkg: OfflinePackageManifest, nowMs: number): boolean {
  if (pkg.sync_status === "revoked") return false
  if (pkg.expires_at) {
    const exp = new Date(pkg.expires_at).getTime()
    if (Number.isFinite(exp) && nowMs > exp) return false
  }
  return true
}
