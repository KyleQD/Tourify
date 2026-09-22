/**
 * PUB-206 — Secure share link create / revoke / resolve (server).
 */

import "server-only"

import { createHash } from "crypto"

import { hashPassword, verifyPassword } from "@/lib/auth"
import { logAuditEvent } from "@/lib/audit"
import {
  buildPublicationSharePath,
  evaluatePublicationShareGate,
  generatePublicationShareToken,
  hashPublicationShareSecret,
  normalizeScopeSections,
  validateCreateShareLinkInput,
  type PublicationShareGateDenyReason,
  type PublicationShareSnapshotRecord,
  type PublicationShareTokenRecord,
} from "@/lib/admin/publication-share-links"
import {
  executeServiceRoleJob,
  resolveServiceRoleJobOrgId,
} from "@/lib/supabase/service-role-job"


type SupabaseLike = { from: (table: string) => any }

function mapTokenRow(raw: Record<string, unknown>): PublicationShareTokenRecord {
  return {
    id: String(raw.id),
    orgId: String(raw.org_id),
    snapshotId: String(raw.snapshot_id),
    tokenHash: String(raw.token_hash),
    name: String(raw.name || "Share link"),
    scope:
      raw.scope && typeof raw.scope === "object" && !Array.isArray(raw.scope)
        ? (raw.scope as Record<string, unknown>)
        : {},
    expiresAt: raw.expires_at ? String(raw.expires_at) : null,
    passcodeHash: raw.passcode_hash ? String(raw.passcode_hash) : null,
    allowDownload: Boolean(raw.allow_download),
    maxUses: raw.max_uses == null ? null : Number(raw.max_uses),
    useCount: Number(raw.use_count ?? 0),
    revokedAt: raw.revoked_at ? String(raw.revoked_at) : null,
  }
}

function mapSnapshotRow(raw: Record<string, unknown>): PublicationShareSnapshotRecord {
  return {
    id: String(raw.id),
    status: String(raw.status || "draft"),
    retractedAt: raw.retracted_at ? String(raw.retracted_at) : null,
  }
}

function hashIp(ip: string | null | undefined): string | null {
  if (!ip?.trim()) return null
  return createHash("sha256").update(ip.trim(), "utf8").digest("hex")
}

async function writeAccessLog(args: {
  supabase: SupabaseLike
  orgId: string
  snapshotId: string | null
  shareTokenId: string | null
  action: string
  ip?: string | null
  userAgent?: string | null
  correlationId?: string | null
  metadata?: Record<string, unknown>
}) {
  await args.supabase.from("admin_publication_access_logs").insert({
    org_id: args.orgId,
    snapshot_id: args.snapshotId,
    share_token_id: args.shareTokenId,
    action: args.action,
    ip_hash: hashIp(args.ip),
    user_agent: args.userAgent?.slice(0, 500) || null,
    correlation_id: args.correlationId || null,
    metadata: args.metadata || {},
  })
}

export async function createPublicationShareLink(args: {
  supabase: SupabaseLike
  orgId: string
  actorUserId: string
  snapshotId: string
  name?: string
  expiresAt?: string | null
  passcode?: string | null
  allowDownload?: boolean
  maxUses?: number | null
  sections?: string[]
  origin?: string
  correlationId?: string | null
}) {
  const validated = validateCreateShareLinkInput({
    name: args.name,
    expiresAt: args.expiresAt,
    passcode: args.passcode,
    allowDownload: args.allowDownload,
    maxUses: args.maxUses,
    sections: args.sections,
  })
  if (!validated.ok) throw new PublicationShareLinkError(validated.error, 400)

  const { data: snapshot, error: snapError } = await args.supabase
    .from("admin_publication_snapshots")
    .select("id, org_id, status, retracted_at")
    .eq("id", args.snapshotId)
    .eq("org_id", args.orgId)
    .maybeSingle()
  if (snapError) throw new Error(snapError.message)
  if (!snapshot) throw new PublicationShareLinkError("Snapshot not found.", 404)
  if (String(snapshot.status) !== "committed")
    throw new PublicationShareLinkError("Only committed snapshots can be shared.", 409)

  const plaintext = generatePublicationShareToken()
  const tokenHash = hashPublicationShareSecret(plaintext)
  const passcodeHash = validated.value.passcode
    ? await hashPassword(validated.value.passcode)
    : null

  const { data: inserted, error } = await args.supabase
    .from("admin_publication_share_tokens")
    .insert({
      org_id: args.orgId,
      snapshot_id: args.snapshotId,
      token_hash: tokenHash,
      name: validated.value.name,
      scope: validated.value.scope,
      expires_at: validated.value.expiresAt,
      passcode_hash: passcodeHash,
      allow_download: validated.value.allowDownload,
      max_uses: validated.value.maxUses,
      use_count: 0,
      created_by: args.actorUserId,
    })
    .select(
      "id, org_id, snapshot_id, token_hash, name, scope, expires_at, passcode_hash, allow_download, max_uses, use_count, revoked_at, created_at",
    )
    .single()

  if (error) throw new Error(error.message)

  const path = buildPublicationSharePath(plaintext)
  const url = args.origin ? `${args.origin.replace(/\/$/, "")}${path}` : path

  await logAuditEvent({
    actorId: args.actorUserId,
    orgId: args.orgId,
    action: "publication.share.create" as "create",
    entityType: "publication_share_token" as "content",
    entityId: String(inserted.id),
    correlationId: args.correlationId || undefined,
    newValues: {
      snapshotId: args.snapshotId,
      name: validated.value.name,
      expiresAt: validated.value.expiresAt,
      allowDownload: validated.value.allowDownload,
      maxUses: validated.value.maxUses,
      hasPasscode: Boolean(passcodeHash),
      sections: normalizeScopeSections(validated.value.scope),
    },
  })

  return {
    id: String(inserted.id),
    name: String(inserted.name),
    snapshotId: args.snapshotId,
    path,
    url,
    /** Returned once — never persisted. */
    token: plaintext,
    expiresAt: inserted.expires_at ? String(inserted.expires_at) : null,
    allowDownload: Boolean(inserted.allow_download),
    maxUses: inserted.max_uses == null ? null : Number(inserted.max_uses),
    hasPasscode: Boolean(inserted.passcode_hash),
    scope: inserted.scope,
    createdAt: inserted.created_at ? String(inserted.created_at) : null,
  }
}

export async function listPublicationShareLinks(args: {
  supabase: SupabaseLike
  orgId: string
  snapshotId?: string
  tourId?: string
  eventId?: string
  includeRevoked?: boolean
  limit?: number
}) {
  const limit = Math.min(Math.max(args.limit ?? 50, 1), 200)

  let query = args.supabase
    .from("admin_publication_share_tokens")
    .select(
      `
      id, org_id, snapshot_id, name, scope, expires_at, allow_download, max_uses, use_count,
      revoked_at, created_by, created_at, passcode_hash,
      admin_publication_snapshots ( id, title, publication_type, tour_id, event_id, status, sequence, version )
    `,
    )
    .eq("org_id", args.orgId)
    .order("created_at", { ascending: false })
    .limit(limit)

  if (args.snapshotId) query = query.eq("snapshot_id", args.snapshotId)
  if (!args.includeRevoked) query = query.is("revoked_at", null)

  const { data, error } = await query
  if (error) throw new Error(error.message)

  let rows = (data ?? []).map((raw: Record<string, unknown>) => {
    const snapshot =
      raw.admin_publication_snapshots && typeof raw.admin_publication_snapshots === "object"
        ? (raw.admin_publication_snapshots as Record<string, unknown>)
        : {}
    return {
      id: String(raw.id),
      snapshotId: String(raw.snapshot_id),
      name: String(raw.name || "Share link"),
      scope: raw.scope,
      expiresAt: raw.expires_at ? String(raw.expires_at) : null,
      allowDownload: Boolean(raw.allow_download),
      maxUses: raw.max_uses == null ? null : Number(raw.max_uses),
      useCount: Number(raw.use_count ?? 0),
      revokedAt: raw.revoked_at ? String(raw.revoked_at) : null,
      hasPasscode: Boolean(raw.passcode_hash),
      createdBy: raw.created_by ? String(raw.created_by) : null,
      createdAt: raw.created_at ? String(raw.created_at) : null,
      publicationTitle: snapshot.title ? String(snapshot.title) : null,
      publicationType: snapshot.publication_type ? String(snapshot.publication_type) : null,
      tourId: snapshot.tour_id ? String(snapshot.tour_id) : null,
      eventId: snapshot.event_id ? String(snapshot.event_id) : null,
      snapshotStatus: snapshot.status ? String(snapshot.status) : null,
    }
  })

  if (args.tourId) rows = rows.filter((row: typeof rows[number]) => row.tourId === args.tourId)
  if (args.eventId) rows = rows.filter((row: typeof rows[number]) => row.eventId === args.eventId)
  return rows
}

export async function revokePublicationShareLink(args: {
  supabase: SupabaseLike
  orgId: string
  actorUserId: string
  shareTokenId: string
  correlationId?: string | null
}) {
  const now = new Date().toISOString()
  const { data, error } = await args.supabase
    .from("admin_publication_share_tokens")
    .update({ revoked_at: now })
    .eq("id", args.shareTokenId)
    .eq("org_id", args.orgId)
    .is("revoked_at", null)
    .select("id, snapshot_id, name, revoked_at")
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) throw new PublicationShareLinkError("Share link not found or already revoked.", 404)

  await logAuditEvent({
    actorId: args.actorUserId,
    orgId: args.orgId,
    action: "publication.share.revoke" as "delete",
    entityType: "publication_share_token" as "content",
    entityId: String(data.id),
    correlationId: args.correlationId || undefined,
    newValues: { snapshotId: data.snapshot_id, revokedAt: data.revoked_at },
  })

  return {
    id: String(data.id),
    snapshotId: String(data.snapshot_id),
    name: String(data.name),
    revokedAt: String(data.revoked_at),
  }
}

export async function resolvePublicationShareAccess(args: {
  token: string
  action?: "view" | "download"
  passcode?: string | null
  requestedScopeKeys?: string[]
  ip?: string | null
  userAgent?: string | null
  correlationId?: string | null
}) {
  const action = args.action || "view"
  const plaintext = args.token?.trim()
  if (!plaintext) {
    return { ok: false as const, reason: "missing" as PublicationShareGateDenyReason, status: 404 }
  }

  const tokenHash = hashPublicationShareSecret(plaintext)
  const orgId = await resolveServiceRoleJobOrgId({
    reason: "Resolve organization for public publication share token",
    moduleId: "admin.publication.share-resolution",
    lookup: async (client) => {
      const { data, error } = await client
        .from("admin_publication_share_tokens")
        .select("org_id")
        .eq("token_hash", tokenHash)
        .maybeSingle()
      if (error) throw new Error(error.message)
      return data?.org_id ? String(data.org_id) : null
    },
  })

  if (!orgId) {
    return { ok: false as const, reason: "missing" as PublicationShareGateDenyReason, status: 404 }
  }

  return executeServiceRoleJob({
    orgId,
    reason: "Resolve and record public publication share access",
    moduleId: "admin.publication.share-resolution",
  }, async (supabase) => {

  const { data: tokenRow, error: tokenError } = await supabase
    .from("admin_publication_share_tokens")
    .select(
      "id, org_id, snapshot_id, token_hash, name, scope, expires_at, passcode_hash, allow_download, max_uses, use_count, revoked_at",
    )
    .eq("token_hash", tokenHash)
    .eq("org_id", orgId)
    .maybeSingle()

  if (tokenError) throw new Error(tokenError.message)

  let snapshotRow: Record<string, unknown> | null = null
  if (tokenRow) {
    const { data: snap } = await supabase
      .from("admin_publication_snapshots")
      .select(
        "id, org_id, status, retracted_at, title, publication_type, sequence, version, checksum, payload, published_at, tour_id, event_id, access_classification",
      )
      .eq("id", tokenRow.snapshot_id)
      .eq("org_id", orgId)
      .maybeSingle()
    snapshotRow = snap
  }

  const token = tokenRow ? mapTokenRow(tokenRow as Record<string, unknown>) : null
  const snapshot = snapshotRow ? mapSnapshotRow(snapshotRow) : null

  let passcodeVerified: boolean | undefined
  if (token?.passcodeHash) {
    if (!args.passcode?.trim()) passcodeVerified = undefined
    else passcodeVerified = await verifyPassword(args.passcode.trim(), token.passcodeHash)
  }

  const gate = evaluatePublicationShareGate({
    token,
    snapshot,
    action,
    passcodeVerified,
    requestedScopeKeys: args.requestedScopeKeys,
  })

  if (!gate.ok) {
    if (token) {
      await writeAccessLog({
        supabase,
        orgId: token.orgId,
        snapshotId: token.snapshotId,
        shareTokenId: token.id,
        action: gate.accessAction,
        ip: args.ip,
        userAgent: args.userAgent,
        correlationId: args.correlationId,
        metadata: { reason: gate.reason, action },
      })
    }
    const status =
      gate.reason === "missing"
        ? 404
        : gate.reason === "passcode_required" || gate.reason === "passcode_failed"
          ? 401
          : 403
    return { ok: false as const, reason: gate.reason, status }
  }

  // Increment use count after a successful gate (view or download).
  const { error: useError } = await supabase
    .from("admin_publication_share_tokens")
    .update({ use_count: gate.token.useCount + 1 })
    .eq("id", gate.token.id)
    .eq("use_count", gate.token.useCount)

  if (useError) {
    // Concurrent max-use race — re-check
    return { ok: false as const, reason: "max_uses" as PublicationShareGateDenyReason, status: 403 }
  }

  await writeAccessLog({
    supabase,
    orgId: gate.token.orgId,
    snapshotId: gate.token.snapshotId,
    shareTokenId: gate.token.id,
    action,
    ip: args.ip,
    userAgent: args.userAgent,
    correlationId: args.correlationId,
    metadata: { allowDownload: gate.token.allowDownload },
  })

  const sections = normalizeScopeSections(gate.token.scope)
  const payload =
    snapshotRow?.payload && typeof snapshotRow.payload === "object"
      ? (snapshotRow.payload as Record<string, unknown>)
      : {}
  const body =
    payload.body && typeof payload.body === "object"
      ? (payload.body as Record<string, unknown>)
      : payload

  const projectedBody =
    sections.length === 0
      ? body
      : Object.fromEntries(Object.entries(body).filter(([key]) => sections.includes(key)))

  return {
    ok: true as const,
    share: {
      id: gate.token.id,
      name: gate.token.name,
      allowDownload: gate.token.allowDownload,
      expiresAt: gate.token.expiresAt,
      scopeSections: sections,
    },
    publication: {
      snapshotId: gate.snapshot.id,
      title: snapshotRow?.title ? String(snapshotRow.title) : null,
      publicationType: snapshotRow?.publication_type
        ? String(snapshotRow.publication_type)
        : null,
      sequence: Number(snapshotRow?.sequence ?? 1),
      version: Number(snapshotRow?.version ?? 1),
      checksum: snapshotRow?.checksum ? String(snapshotRow.checksum) : null,
      publishedAt: snapshotRow?.published_at ? String(snapshotRow.published_at) : null,
      tourId: snapshotRow?.tour_id ? String(snapshotRow.tour_id) : null,
      eventId: snapshotRow?.event_id ? String(snapshotRow.event_id) : null,
      accessClassification: snapshotRow?.access_classification
        ? String(snapshotRow.access_classification)
        : null,
      sections: projectedBody,
    },
  }
  })
}

export async function findLatestCommittedSnapshotForTour(args: {
  supabase: SupabaseLike
  orgId: string
  tourId: string
}) {
  const { data, error } = await args.supabase
    .from("admin_publication_snapshots")
    .select("id, title, publication_type, sequence, version, published_at, status")
    .eq("org_id", args.orgId)
    .eq("tour_id", args.tourId)
    .eq("status", "committed")
    .order("published_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data
}

export async function findLatestCommittedSnapshotForEvent(args: {
  supabase: SupabaseLike
  orgId: string
  eventId: string
  publicationType?: string
}) {
  let query = args.supabase
    .from("admin_publication_snapshots")
    .select("id, title, publication_type, sequence, version, published_at, status")
    .eq("org_id", args.orgId)
    .eq("event_id", args.eventId)
    .eq("status", "committed")
    .order("published_at", { ascending: false })
    .limit(1)

  if (args.publicationType) query = query.eq("publication_type", args.publicationType)

  const { data, error } = await query.maybeSingle()
  if (error) throw new Error(error.message)
  return data
}

export class PublicationShareLinkError extends Error {
  status: number

  constructor(message: string, status = 400) {
    super(message)
    this.name = "PublicationShareLinkError"
    this.status = status
  }
}
