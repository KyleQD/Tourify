/**
 * MAP-301 through MAP-305 — Site-map version, links, file/token, review, publication tests.
 */

import { describe, it, expect } from "vitest"
import {
  // MAP-301
  MAP_VERSION_TRANSITIONS,
  transitionMapVersion,
  mapVersionIsImmutable,
  type MapVersion,
  // MAP-302
  validateMapOperationalLink,
  groupLinksByTargetType,
  type MapOperationalLink,
  // MAP-303
  validateMapFileUpload,
  evaluateMapShareToken,
  type MapShareToken,
  // MAP-304
  computeMapReviewSummary,
  resolveMapComment,
  type MapReviewComment,
  type MapChangeRequest,
  type MapApproval,
  // MAP-305
  projectMapForAudience,
  assertMapProjectionVersionPin,
  type MapLayer,
} from "@/lib/admin/site-map-versions"

const NOW = "2026-08-15T09:00:00.000Z"
const ACTOR = "user-prod"

const makeVersion = (overrides: Partial<MapVersion> = {}): MapVersion => ({
  map_version_id: "mv1",
  site_map_id: "sm1",
  org_id: "org1",
  version_number: 1,
  status: "draft",
  source_checksum: "abc123",
  source_file_key: "maps/sm1/v1/source.pdf",
  thumbnail_key: "maps/sm1/v1/thumb.png",
  label: "v1 – Draft",
  owner_user_id: ACTOR,
  notes: null,
  superseded_by_version_id: null,
  created_by: ACTOR,
  created_at: NOW,
  updated_by: ACTOR,
  updated_at: NOW,
  ...overrides,
})

// ---------------------------------------------------------------------------
// MAP-301: Version lifecycle
// ---------------------------------------------------------------------------

describe("MAP-301 — map version lifecycle", () => {
  it("documents all lifecycle statuses in transition map", () => {
    const statuses = Object.keys(MAP_VERSION_TRANSITIONS)
    expect(statuses).toContain("draft")
    expect(statuses).toContain("review")
    expect(statuses).toContain("approved")
    expect(statuses).toContain("published")
    expect(statuses).toContain("superseded")
    expect(statuses).toContain("archived")
  })

  it("transitions draft → review successfully", () => {
    const v = makeVersion({ status: "draft" })
    const result = transitionMapVersion(v, "review", ACTOR, NOW)
    expect(result.status).toBe("ok")
    expect(result.version?.status).toBe("review")
  })

  it("transitions review → approved → published", () => {
    const v1 = makeVersion({ status: "review" })
    const r1 = transitionMapVersion(v1, "approved", ACTOR, NOW)
    expect(r1.status).toBe("ok")

    const v2 = makeVersion({ status: "approved" })
    const r2 = transitionMapVersion(v2, "published", ACTOR, NOW)
    expect(r2.status).toBe("ok")
    expect(r2.version?.status).toBe("published")
  })

  it("blocks invalid transitions", () => {
    const v = makeVersion({ status: "draft" })
    const result = transitionMapVersion(v, "published", ACTOR, NOW)
    expect(result.status).toBe("invalid_transition")
  })

  it("returns immutable error when editing a published version (not supersede/archive)", () => {
    const v = makeVersion({ status: "published" })
    const result = transitionMapVersion(v, "approved", ACTOR, NOW)
    expect(result.status).toBe("immutable")
  })

  it("allows published → superseded when superseded_by_version_id is provided", () => {
    const v = makeVersion({ status: "published" })
    const result = transitionMapVersion(v, "superseded", ACTOR, NOW, {
      superseded_by_version_id: "mv2",
    })
    expect(result.status).toBe("ok")
    expect(result.version?.superseded_by_version_id).toBe("mv2")
  })

  it("requires superseded_by_version_id when superseding", () => {
    const v = makeVersion({ status: "published" })
    const result = transitionMapVersion(v, "superseded", ACTOR, NOW)
    expect(result.status).toBe("validation_error")
  })

  it("allows published → archived", () => {
    const v = makeVersion({ status: "published" })
    const result = transitionMapVersion(v, "archived", ACTOR, NOW)
    expect(result.status).toBe("ok")
    expect(result.version?.status).toBe("archived")
  })

  it("reports archived versions as not having any allowed transitions", () => {
    expect(MAP_VERSION_TRANSITIONS["archived"]).toHaveLength(0)
  })

  it("identifies published version as immutable", () => {
    expect(mapVersionIsImmutable(makeVersion({ status: "published" }))).toBe(true)
    expect(mapVersionIsImmutable(makeVersion({ status: "draft" }))).toBe(false)
    expect(mapVersionIsImmutable(makeVersion({ status: "approved" }))).toBe(false)
  })

  it("preserves checksum and thumbnail on transition", () => {
    const v = makeVersion({ status: "review" })
    const result = transitionMapVersion(v, "approved", ACTOR, NOW)
    expect(result.version?.source_checksum).toBe("abc123")
    expect(result.version?.thumbnail_key).toBe("maps/sm1/v1/thumb.png")
  })

  it("updates label when provided on transition", () => {
    const v = makeVersion({ status: "draft" })
    const result = transitionMapVersion(v, "review", ACTOR, NOW, { label: "v1 – For review" })
    expect(result.version?.label).toBe("v1 – For review")
  })
})

// ---------------------------------------------------------------------------
// MAP-302: Operational object links
// ---------------------------------------------------------------------------

describe("MAP-302 — operational object links", () => {
  it("validates a well-formed link", () => {
    const result = validateMapOperationalLink({
      site_map_id: "sm1",
      target_type: "equipment_item",
      target_id: "eq1",
    })
    expect(result.valid).toBe(true)
  })

  it("rejects link without site_map_id", () => {
    const result = validateMapOperationalLink({
      target_type: "vendor",
      target_id: "v1",
    })
    expect(result.valid).toBe(false)
    if (!result.valid) expect(result.reason).toBe("missing_site_map_id")
  })

  it("rejects link without target_type", () => {
    const result = validateMapOperationalLink({
      site_map_id: "sm1",
      target_id: "x1",
    })
    expect(result.valid).toBe(false)
    if (!result.valid) expect(result.reason).toBe("missing_target_type")
  })

  it("rejects link without target_id", () => {
    const result = validateMapOperationalLink({
      site_map_id: "sm1",
      target_type: "incident",
    })
    expect(result.valid).toBe(false)
    if (!result.valid) expect(result.reason).toBe("missing_target_id")
  })

  it("groups links by target type", () => {
    const links: MapOperationalLink[] = [
      {
        link_id: "l1",
        site_map_id: "sm1",
        map_version_id: null,
        element_id: "e1",
        element_type: "marker",
        target_type: "equipment_item",
        target_id: "eq1",
        display_label: "Backline case",
        created_by: ACTOR,
        created_at: NOW,
      },
      {
        link_id: "l2",
        site_map_id: "sm1",
        map_version_id: null,
        element_id: "e2",
        element_type: "zone",
        target_type: "vendor",
        target_id: "vend1",
        display_label: "Sound vendor",
        created_by: ACTOR,
        created_at: NOW,
      },
      {
        link_id: "l3",
        site_map_id: "sm1",
        map_version_id: null,
        element_id: "e3",
        element_type: "marker",
        target_type: "equipment_item",
        target_id: "eq2",
        display_label: "PA stack",
        created_by: ACTOR,
        created_at: NOW,
      },
    ]

    const grouped = groupLinksByTargetType(links)
    expect(grouped.get("equipment_item")).toHaveLength(2)
    expect(grouped.get("vendor")).toHaveLength(1)
    expect(grouped.get("incident")).toBeUndefined()
  })

  it("supports all target types in MapLinkTargetType union", () => {
    const types: string[] = [
      "run_of_show_item", "equipment_item", "equipment_case",
      "entrance", "credential_zone", "vendor",
      "incident", "checklist_item", "logistics_task",
    ]
    for (const t of types) {
      const result = validateMapOperationalLink({
        site_map_id: "sm1",
        target_type: t as any,
        target_id: "x",
      })
      expect(result.valid).toBe(true)
    }
  })
})

// ---------------------------------------------------------------------------
// MAP-303: File/token access
// ---------------------------------------------------------------------------

describe("MAP-303 — file/token access", () => {
  it("accepts a valid source SVG within size limits", () => {
    const result = validateMapFileUpload({
      file_key: "maps/sm1/v1/source.svg",
      asset_type: "source",
      org_id: "org1",
      size_bytes: 5 * 1024 * 1024,
      mime_type: "image/svg+xml",
    })
    expect(result.ok).toBe(true)
  })

  it("rejects source file exceeding 50 MB", () => {
    const result = validateMapFileUpload({
      file_key: "maps/sm1/v1/source.pdf",
      asset_type: "source",
      org_id: "org1",
      size_bytes: 51 * 1024 * 1024,
      mime_type: "application/pdf",
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe("size_exceeded")
  })

  it("rejects thumbnail with invalid MIME type", () => {
    const result = validateMapFileUpload({
      file_key: "maps/sm1/v1/thumb.gif",
      asset_type: "thumbnail",
      org_id: "org1",
      size_bytes: 100_000,
      mime_type: "image/gif",
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe("invalid_mime")
  })

  it("accepts a valid thumbnail PNG within 5 MB", () => {
    const result = validateMapFileUpload({
      file_key: "maps/sm1/v1/thumb.png",
      asset_type: "thumbnail",
      org_id: "org1",
      size_bytes: 1024 * 1024,
      mime_type: "image/png",
    })
    expect(result.ok).toBe(true)
  })

  it("rejects missing file key", () => {
    const result = validateMapFileUpload({
      file_key: "",
      asset_type: "export_pdf",
      org_id: "org1",
      size_bytes: 1024,
      mime_type: "application/pdf",
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe("missing_key")
  })

  const makeToken = (overrides: Partial<MapShareToken> = {}): MapShareToken => ({
    token_id: "tok1",
    site_map_id: "sm1",
    map_version_id: null,
    is_active: true,
    expires_at: null,
    passcode_hash: null,
    max_uses: null,
    use_count: 0,
    created_by: ACTOR,
    created_at: NOW,
    revoked_at: null,
    revoked_by: null,
    ...overrides,
  })

  it("passes a valid active token with no expiry", () => {
    const result = evaluateMapShareToken(makeToken())
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.siteMapId).toBe("sm1")
      expect(result.versionId).toBeNull()
    }
  })

  it("passes token pinned to a specific version", () => {
    const result = evaluateMapShareToken(makeToken({ map_version_id: "mv2" }))
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.versionId).toBe("mv2")
  })

  it("rejects inactive token", () => {
    const result = evaluateMapShareToken(makeToken({ is_active: false }))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe("inactive")
  })

  it("rejects revoked token", () => {
    const result = evaluateMapShareToken(makeToken({ revoked_at: NOW }))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe("revoked")
  })

  it("rejects expired token", () => {
    const result = evaluateMapShareToken(
      makeToken({ expires_at: "2020-01-01T00:00:00.000Z" }),
      Date.parse("2026-08-15T00:00:00.000Z"),
    )
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe("expired")
  })

  it("rejects token that has reached max_uses", () => {
    const result = evaluateMapShareToken(makeToken({ max_uses: 3, use_count: 3 }))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe("max_uses_reached")
  })

  it("still allows token that has not reached max_uses", () => {
    const result = evaluateMapShareToken(makeToken({ max_uses: 5, use_count: 4 }))
    expect(result.ok).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// MAP-304: Review/approval workflow
// ---------------------------------------------------------------------------

describe("MAP-304 — review/approval workflow", () => {
  const makeComment = (overrides: Partial<MapReviewComment> = {}): MapReviewComment => ({
    comment_id: "c1",
    map_version_id: "mv1",
    parent_comment_id: null,
    author_user_id: "user-reviewer",
    is_external: false,
    body: "Stage right entrance needs label.",
    element_id: "marker-3",
    status: "open",
    created_at: NOW,
    resolved_by: null,
    resolved_at: null,
    ...overrides,
  })

  const makeChangeRequest = (overrides: Partial<MapChangeRequest> = {}): MapChangeRequest => ({
    request_id: "cr1",
    map_version_id: "mv1",
    requested_by: "user-reviewer",
    description: "Add fire exit markers.",
    status: "pending",
    addressed_by: null,
    addressed_at: null,
    created_at: NOW,
    ...overrides,
  })

  const makeApproval = (overrides: Partial<MapApproval> = {}): MapApproval => ({
    approval_id: "ap1",
    map_version_id: "mv1",
    approved_by: "user-approver",
    approved_at: NOW,
    version_number: 1,
    notes: null,
    ...overrides,
  })

  it("can_publish requires zero open comments/requests and an approval", () => {
    const summary = computeMapReviewSummary(
      "mv1",
      [makeComment({ status: "open" })],
      [],
      makeApproval(),
    )
    expect(summary.can_publish).toBe(false)
    expect(summary.open_comments).toBe(1)
    expect(summary.is_approved).toBe(true)
  })

  it("can_publish is true when approved with no open items", () => {
    const summary = computeMapReviewSummary(
      "mv1",
      [makeComment({ status: "resolved" })],
      [makeChangeRequest({ status: "addressed" })],
      makeApproval(),
    )
    expect(summary.can_publish).toBe(true)
    expect(summary.open_comments).toBe(0)
    expect(summary.open_change_requests).toBe(0)
  })

  it("not approved when no approval record exists", () => {
    const summary = computeMapReviewSummary("mv1", [], [], null)
    expect(summary.is_approved).toBe(false)
    expect(summary.can_publish).toBe(false)
  })

  it("surfaces open change requests blocking publication", () => {
    const summary = computeMapReviewSummary(
      "mv1",
      [],
      [makeChangeRequest({ status: "pending" })],
      makeApproval(),
    )
    expect(summary.can_publish).toBe(false)
    expect(summary.open_change_requests).toBe(1)
  })

  it("exposes approver identity in summary", () => {
    const summary = computeMapReviewSummary("mv1", [], [], makeApproval())
    expect(summary.approved_by).toBe("user-approver")
    expect(summary.approved_at).toBe(NOW)
  })

  it("resolves a comment with actor and timestamp", () => {
    const c = makeComment({ status: "open" })
    const resolved = resolveMapComment(c, ACTOR, NOW)
    expect(resolved.status).toBe("resolved")
    expect(resolved.resolved_by).toBe(ACTOR)
    expect(resolved.resolved_at).toBe(NOW)
  })

  it("does not mutate the original comment on resolve", () => {
    const c = makeComment({ status: "open" })
    resolveMapComment(c, ACTOR, NOW)
    expect(c.status).toBe("open")
  })
})

// ---------------------------------------------------------------------------
// MAP-305: Publication projection
// ---------------------------------------------------------------------------

describe("MAP-305 — map publication projection", () => {
  const layers: MapLayer[] = [
    {
      layer_id: "L-stage",
      label: "Stage Layout",
      visible_to: ["internal", "worker", "vendor"],
      is_restricted: false,
    },
    {
      layer_id: "L-security",
      label: "Security Positions",
      visible_to: ["internal"],
      is_restricted: true,
    },
    {
      layer_id: "L-general",
      label: "General Venue",
      visible_to: ["internal", "worker", "vendor", "public"],
      is_restricted: false,
    },
    {
      layer_id: "L-backstage",
      label: "Backstage Access",
      visible_to: ["internal", "worker"],
      is_restricted: true,
    },
  ]

  const v = makeVersion({ status: "published", map_version_id: "mv-pub", version_number: 3 })

  it("internal audience sees all layers", () => {
    const proj = projectMapForAudience({
      version: v,
      layers,
      audience: "internal",
      publicationRefId: "pub1",
    })
    expect(proj.visible_layer_ids).toContain("L-stage")
    expect(proj.visible_layer_ids).toContain("L-security")
    expect(proj.visible_layer_ids).toContain("L-general")
    expect(proj.visible_layer_ids).toContain("L-backstage")
    expect(proj.visible_layer_ids).toHaveLength(4)
  })

  it("vendor audience cannot see security or backstage restricted layers", () => {
    const proj = projectMapForAudience({
      version: v,
      layers,
      audience: "vendor",
      publicationRefId: "pub1",
    })
    expect(proj.visible_layer_ids).toContain("L-stage")
    expect(proj.visible_layer_ids).toContain("L-general")
    expect(proj.visible_layer_ids).not.toContain("L-security")
    expect(proj.visible_layer_ids).not.toContain("L-backstage")
  })

  it("public audience sees only general layer", () => {
    const proj = projectMapForAudience({
      version: v,
      layers,
      audience: "public",
      publicationRefId: "pub1",
    })
    expect(proj.visible_layer_ids).toEqual(["L-general"])
  })

  it("projection pins exact version ID and checksum", () => {
    const proj = projectMapForAudience({
      version: v,
      layers,
      audience: "worker",
      publicationRefId: "pub1",
    })
    expect(proj.map_version_id).toBe("mv-pub")
    expect(proj.version_number).toBe(3)
    expect(proj.source_checksum).toBe("abc123")
  })

  it("carries offline token when provided", () => {
    const proj = projectMapForAudience({
      version: v,
      layers,
      audience: "worker",
      publicationRefId: "pub1",
      offlineToken: "offline-tok-99",
    })
    expect(proj.offline_token).toBe("offline-tok-99")
  })

  it("null offline token when not provided", () => {
    const proj = projectMapForAudience({
      version: v,
      layers,
      audience: "public",
      publicationRefId: "pub1",
    })
    expect(proj.offline_token).toBeNull()
  })

  it("assertMapProjectionVersionPin detects drift when version IDs differ", () => {
    const proj = projectMapForAudience({
      version: v,
      layers,
      audience: "internal",
      publicationRefId: "pub1",
    })
    const { pinned, drift } = assertMapProjectionVersionPin(proj, "mv-newer")
    expect(pinned).toBe(false)
    expect(drift).toBe(true)
  })

  it("assertMapProjectionVersionPin confirms pin when IDs match", () => {
    const proj = projectMapForAudience({
      version: v,
      layers,
      audience: "internal",
      publicationRefId: "pub1",
    })
    const { pinned, drift } = assertMapProjectionVersionPin(proj, "mv-pub")
    expect(pinned).toBe(true)
    expect(drift).toBe(false)
  })
})
