/**
 * MAP-301 to MAP-305 — Site-map version lifecycle, operational links,
 * file/token access, review/approval workflow, and publication projection (pure).
 *
 * MAP-301: Version lifecycle (draft → review → approved → published → superseded/archived)
 * MAP-302: Operational object links (notes/tasks/markers → domain entities)
 * MAP-303: File/token access helpers (signed-URL params, scan/type/size gate, revocation)
 * MAP-304: Review/approval workflow (comment threads, change-requests, resolution)
 * MAP-305: Publication projection (layer filtering, offline token, day-sheet version pin)
 *
 * Pure: no I/O, no `server-only`.
 */

// ---------------------------------------------------------------------------
// MAP-301: Version lifecycle
// ---------------------------------------------------------------------------

export type MapVersionStatus =
  | "draft"
  | "review"
  | "approved"
  | "published"
  | "superseded"
  | "archived"

/** Allowed forward transitions per status. */
export const MAP_VERSION_TRANSITIONS: Record<MapVersionStatus, MapVersionStatus[]> = {
  draft:      ["review", "archived"],
  review:     ["approved", "draft", "archived"],
  approved:   ["published", "review", "archived"],
  published:  ["superseded", "archived"],
  superseded: ["archived"],
  archived:   [],
}

export interface MapVersion {
  map_version_id: string
  site_map_id: string
  org_id: string
  version_number: number
  status: MapVersionStatus
  /** SHA-256 hex of source file content. */
  source_checksum: string | null
  /** Storage key for original source file. */
  source_file_key: string | null
  /** Storage key for generated thumbnail image. */
  thumbnail_key: string | null
  /** Display label e.g. "v3 – Main stage load-in". */
  label: string | null
  owner_user_id: string
  notes: string | null
  /** Set when this version is superseded by a newer one. */
  superseded_by_version_id: string | null
  created_by: string
  created_at: string
  updated_by: string
  updated_at: string
}

export interface MapVersionCommandResult {
  status: "ok" | "invalid_transition" | "validation_error" | "immutable"
  version: MapVersion | null
  error?: string
}

/** Transition a map version to a new status. Published versions are immutable except supersede/archive. */
export function transitionMapVersion(
  version: MapVersion,
  toStatus: MapVersionStatus,
  actor: string,
  at: string,
  opts?: {
    superseded_by_version_id?: string
    label?: string
  },
): MapVersionCommandResult {
  if (version.status === "published" && toStatus !== "superseded" && toStatus !== "archived") {
    return {
      status: "immutable",
      version,
      error: `Published map version ${version.version_number} cannot be edited. Supersede or archive it instead.`,
    }
  }

  const allowed = MAP_VERSION_TRANSITIONS[version.status]
  if (!allowed.includes(toStatus)) {
    return {
      status: "invalid_transition",
      version,
      error: `Cannot transition map version from '${version.status}' to '${toStatus}'.`,
    }
  }

  if (toStatus === "superseded" && !opts?.superseded_by_version_id) {
    return {
      status: "validation_error",
      version,
      error: "superseded_by_version_id is required when superseding a map version.",
    }
  }

  return {
    status: "ok",
    version: {
      ...version,
      status: toStatus,
      label: opts?.label ?? version.label,
      superseded_by_version_id:
        opts?.superseded_by_version_id ?? version.superseded_by_version_id,
      updated_by: actor,
      updated_at: at,
    },
  }
}

/** Returns true when a published version must not be mutated in-place. */
export function mapVersionIsImmutable(version: MapVersion): boolean {
  return version.status === "published"
}

// ---------------------------------------------------------------------------
// MAP-302: Operational object links
// ---------------------------------------------------------------------------

export type MapLinkTargetType =
  | "run_of_show_item"
  | "equipment_item"
  | "equipment_case"
  | "entrance"
  | "credential_zone"
  | "vendor"
  | "incident"
  | "checklist_item"
  | "logistics_task"

export interface MapOperationalLink {
  link_id: string
  site_map_id: string
  /** Optional version scope — if null, link applies across all versions. */
  map_version_id: string | null
  /** Marker or zone on the map (e.g., annotation element id). */
  element_id: string | null
  element_type: "marker" | "zone" | "note" | "task" | null
  target_type: MapLinkTargetType
  target_id: string
  /** Short human-readable label displayed on the link. */
  display_label: string
  created_by: string
  created_at: string
}

export type MapLinkValidationResult =
  | { valid: true }
  | { valid: false; reason: "missing_target_id" | "missing_target_type" | "missing_site_map_id" }

export function validateMapOperationalLink(
  link: Partial<MapOperationalLink>,
): MapLinkValidationResult {
  if (!link.site_map_id) return { valid: false, reason: "missing_site_map_id" }
  if (!link.target_type) return { valid: false, reason: "missing_target_type" }
  if (!link.target_id) return { valid: false, reason: "missing_target_id" }
  return { valid: true }
}

/** Group links by target type for rendering. */
export function groupLinksByTargetType(
  links: MapOperationalLink[],
): Map<MapLinkTargetType, MapOperationalLink[]> {
  const out = new Map<MapLinkTargetType, MapOperationalLink[]>()
  for (const link of links) {
    const bucket = out.get(link.target_type) ?? []
    bucket.push(link)
    out.set(link.target_type, bucket)
  }
  return out
}

// ---------------------------------------------------------------------------
// MAP-303: File/token access
// ---------------------------------------------------------------------------

export type MapFileAssetType = "source" | "thumbnail" | "export_pdf" | "export_png"

export interface MapFileAccessInput {
  file_key: string
  asset_type: MapFileAssetType
  /** Caller's org_id or grant token must match. */
  org_id: string
  size_bytes: number
  mime_type: string
}

/** Max 50 MB for source; 5 MB for derived types. */
const MAX_SIZE_BYTES: Record<MapFileAssetType, number> = {
  source:      50 * 1024 * 1024,
  thumbnail:    5 * 1024 * 1024,
  export_pdf:  20 * 1024 * 1024,
  export_png:  10 * 1024 * 1024,
}

const ALLOWED_MIME: Record<MapFileAssetType, string[]> = {
  source:      ["image/svg+xml", "application/pdf", "image/png", "image/jpeg", "application/octet-stream"],
  thumbnail:   ["image/png", "image/jpeg", "image/webp"],
  export_pdf:  ["application/pdf"],
  export_png:  ["image/png"],
}

export type MapFileGateResult =
  | { ok: true }
  | { ok: false; reason: "size_exceeded" | "invalid_mime" | "missing_key" }

export function validateMapFileUpload(input: MapFileAccessInput): MapFileGateResult {
  if (!input.file_key) return { ok: false, reason: "missing_key" }
  const maxSize = MAX_SIZE_BYTES[input.asset_type]
  if (input.size_bytes > maxSize) return { ok: false, reason: "size_exceeded" }
  if (!ALLOWED_MIME[input.asset_type].includes(input.mime_type)) {
    return { ok: false, reason: "invalid_mime" }
  }
  return { ok: true }
}

export interface MapShareToken {
  token_id: string
  site_map_id: string
  /** Lock to a specific published version when set. */
  map_version_id: string | null
  is_active: boolean
  expires_at: string | null
  /** Passcode hash (bcrypt); null means no passcode. */
  passcode_hash: string | null
  max_uses: number | null
  use_count: number
  created_by: string
  created_at: string
  revoked_at: string | null
  revoked_by: string | null
}

export type MapTokenGateResult =
  | { ok: true; siteMapId: string; versionId: string | null }
  | { ok: false; reason: "inactive" | "expired" | "revoked" | "max_uses_reached" | "missing" }

export function evaluateMapShareToken(
  token: MapShareToken,
  nowMs?: number,
): MapTokenGateResult {
  if (!token.site_map_id) return { ok: false, reason: "missing" }
  if (!token.is_active || token.revoked_at) return { ok: false, reason: token.revoked_at ? "revoked" : "inactive" }
  if (token.max_uses != null && token.use_count >= token.max_uses) {
    return { ok: false, reason: "max_uses_reached" }
  }
  if (token.expires_at) {
    const expires = new Date(token.expires_at).getTime()
    const now = nowMs ?? Date.now()
    if (Number.isFinite(expires) && expires < now) return { ok: false, reason: "expired" }
  }
  return { ok: true, siteMapId: token.site_map_id, versionId: token.map_version_id }
}

export interface MapAccessLogEntry {
  log_id: string
  token_id: string | null
  site_map_id: string
  map_version_id: string | null
  actor_user_id: string | null
  /** 'token' | 'org_user' | 'collaborator' */
  access_type: string
  action: "view" | "download" | "share"
  accessed_at: string
}

// ---------------------------------------------------------------------------
// MAP-304: Review/approval workflow
// ---------------------------------------------------------------------------

export type MapReviewCommentStatus = "open" | "resolved" | "wont_fix"
export type MapReviewRequestStatus = "pending" | "addressed" | "dismissed"

export interface MapReviewComment {
  comment_id: string
  map_version_id: string
  /** null for inline-thread starters; set for replies. */
  parent_comment_id: string | null
  author_user_id: string
  /** External collaborator flag: limited to assigned markers. */
  is_external: boolean
  body: string
  /** Marker/element the comment is anchored to. */
  element_id: string | null
  status: MapReviewCommentStatus
  created_at: string
  resolved_by: string | null
  resolved_at: string | null
}

export interface MapChangeRequest {
  request_id: string
  map_version_id: string
  requested_by: string
  description: string
  status: MapReviewRequestStatus
  addressed_by: string | null
  addressed_at: string | null
  created_at: string
}

export interface MapApproval {
  approval_id: string
  map_version_id: string
  approved_by: string
  approved_at: string
  /** Snapshot of version_number at approval time. */
  version_number: number
  notes: string | null
}

export interface MapReviewSummary {
  map_version_id: string
  open_comments: number
  open_change_requests: number
  is_approved: boolean
  approved_by: string | null
  approved_at: string | null
  can_publish: boolean
}

export function computeMapReviewSummary(
  versionId: string,
  comments: MapReviewComment[],
  changeRequests: MapChangeRequest[],
  approval: MapApproval | null,
): MapReviewSummary {
  const openComments = comments.filter((c) => c.status === "open").length
  const openChangeRequests = changeRequests.filter((r) => r.status === "pending").length
  const is_approved = approval != null
  const can_publish = is_approved && openComments === 0 && openChangeRequests === 0

  return {
    map_version_id: versionId,
    open_comments: openComments,
    open_change_requests: openChangeRequests,
    is_approved,
    approved_by: approval?.approved_by ?? null,
    approved_at: approval?.approved_at ?? null,
    can_publish,
  }
}

export function resolveMapComment(
  comment: MapReviewComment,
  resolvedBy: string,
  at: string,
): MapReviewComment {
  return { ...comment, status: "resolved", resolved_by: resolvedBy, resolved_at: at }
}

// ---------------------------------------------------------------------------
// MAP-305: Publication projection
// ---------------------------------------------------------------------------

export type MapLayerAudience = "internal" | "worker" | "vendor" | "public"

/** Layer definition with restriction flags. */
export interface MapLayer {
  layer_id: string
  label: string
  /** Audiences allowed to see this layer. */
  visible_to: MapLayerAudience[]
  is_restricted: boolean
}

export interface MapPublicationProjection {
  site_map_id: string
  /** Pinned to the exact approved/published version — never silently updated. */
  map_version_id: string
  version_number: number
  source_checksum: string | null
  thumbnail_key: string | null
  audience: MapLayerAudience
  visible_layer_ids: string[]
  /** Offline access token (null if audience cannot cache offline). */
  offline_token: string | null
  /** Publication reference this projection belongs to (day-sheet / tour-book). */
  publication_ref_id: string
}

export function projectMapForAudience(args: {
  version: MapVersion
  layers: MapLayer[]
  audience: MapLayerAudience
  publicationRefId: string
  offlineToken?: string | null
}): MapPublicationProjection {
  const { version, layers, audience, publicationRefId, offlineToken } = args
  const visible = layers
    .filter((l) => l.visible_to.includes(audience))
    .map((l) => l.layer_id)

  return {
    site_map_id: version.site_map_id,
    map_version_id: version.map_version_id,
    version_number: version.version_number,
    source_checksum: version.source_checksum,
    thumbnail_key: version.thumbnail_key,
    audience,
    visible_layer_ids: visible,
    offline_token: offlineToken ?? null,
    publication_ref_id: publicationRefId,
  }
}

/** Verify a published day-sheet map reference still points to the correct immutable version. */
export function assertMapProjectionVersionPin(
  projection: MapPublicationProjection,
  currentPublishedVersionId: string,
): { pinned: boolean; drift: boolean } {
  const pinned = projection.map_version_id === currentPublishedVersionId
  return { pinned, drift: !pinned }
}
