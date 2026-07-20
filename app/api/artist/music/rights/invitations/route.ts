import { createHash, randomBytes } from "node:crypto"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { getTrustedMusicWriteClient } from "@/lib/music/music-access"
import { resolveMusicRightsFlags } from "@/lib/music-rights/music-rights-flags"
import {
  assertOwnedProject,
  enqueueRightsOutboxEvent,
  writeRightsAuditEvent,
} from "@/lib/music-rights/rights-access"
import { createRateLimiter } from "@/lib/utils/rate-limit"

export const dynamic = "force-dynamic"
const limiter = createRateLimiter({ namespace: "music:rights:invitations", limit: 40, windowSec: 60 })

const createSchema = z.object({
  project_id: z.string().uuid(),
  email: z.string().email().max(320),
  display_name: z.string().min(1).max(200).optional(),
  party_id: z.string().uuid().optional(),
  proposed_roles: z.array(z.string().min(1).max(80)).max(20).default([]),
  claim_ids: z.array(z.string().uuid()).max(50).default([]),
  requires_signature: z.boolean().default(false),
  public_display_requested: z.boolean().default(false),
  expires_in_days: z.number().int().min(1).max(90).default(14),
})

const actionSchema = z.object({
  invitation_id: z.string().uuid(),
  action: z.enum(["accept", "counter", "reject", "revoke"]),
  counter_payload: z.record(z.string(), z.unknown()).optional(),
})

function hashInviteToken(token: string) {
  return createHash("sha256").update(token).digest("hex")
}

export async function GET(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth
  const flags = await resolveMusicRightsFlags(supabase, user.id)
  const projectId = request.nextUrl.searchParams.get("projectId")
  let query = supabase
    .from("music_rights_invitations")
    .select("id, public_id, project_id, party_id, invitee_email, invitee_display_name, invitee_user_id, proposed_roles, claim_ids, requires_signature, public_display_requested, status, expires_at, created_at, updated_at")
    .or(`owner_user_id.eq.${user.id},invitee_user_id.eq.${user.id}`)
    .order("created_at", { ascending: false })
    .limit(100)
  if (projectId) query = query.eq("project_id", projectId)
  const { data, error } = await query
  if (error) return jsonError({ status: 500, code: "invitations_query_failed", message: "Unable to load invitations.", retryable: true })
  return NextResponse.json({ data: data || [], enabled: flags.music_contributor_workflows_enabled })
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiUser(request)
    if (!authResult.success) return authResult.response
    const { user, supabase } = authResult.auth
    if (!(await limiter.check(user.id)).success)
      return jsonError({ status: 429, code: "rate_limited", message: "Too many invitation requests.", retryable: true })

    const flags = await resolveMusicRightsFlags(supabase, user.id)
    if (!flags.music_contributor_workflows_enabled)
      return jsonError({ status: 404, code: "feature_disabled", message: "Contributor workflows are not available.", retryable: false })

    const payload = createSchema.parse(await request.json())
    const trusted = await getTrustedMusicWriteClient(supabase)
    const project = await assertOwnedProject({ supabase: trusted, userId: user.id, projectId: payload.project_id })
    if (!project) return jsonError({ status: 404, code: "project_not_found", message: "Rights project not found.", retryable: false })

    let partyId = payload.party_id || null
    if (!partyId) {
      const { data: party, error: partyError } = await trusted
        .from("music_rights_parties")
        .insert({
          project_id: project.id,
          owner_user_id: user.id,
          party_type: "person",
          display_name: payload.display_name || payload.email.split("@")[0],
          email: payload.email.toLowerCase(),
          status: "invited",
        })
        .select("id")
        .single()
      if (partyError || !party)
        return jsonError({ status: 500, code: "party_create_failed", message: "Unable to create invited party.", retryable: true })
      partyId = party.id
    }

    const rawToken = randomBytes(24).toString("hex")
    const expiresAt = new Date(Date.now() + payload.expires_in_days * 24 * 60 * 60 * 1000).toISOString()
    const { data: invitation, error } = await trusted
      .from("music_rights_invitations")
      .insert({
        project_id: project.id,
        owner_user_id: user.id,
        party_id: partyId,
        invitee_email: payload.email.toLowerCase(),
        invitee_display_name: payload.display_name || null,
        proposed_roles: payload.proposed_roles,
        claim_ids: payload.claim_ids,
        requires_signature: payload.requires_signature,
        public_display_requested: payload.public_display_requested,
        token_hash: hashInviteToken(rawToken),
        status: "pending",
        expires_at: expiresAt,
      })
      .select("id, public_id, project_id, party_id, invitee_email, invitee_display_name, proposed_roles, claim_ids, requires_signature, public_display_requested, status, expires_at, created_at")
      .single()
    if (error || !invitation)
      return jsonError({ status: 500, code: "invitation_create_failed", message: "Unable to create invitation.", retryable: true })

    await Promise.all([
      writeRightsAuditEvent({
        supabase: trusted,
        projectId: project.id,
        actorUserId: user.id,
        eventType: "music.rights.party.invited",
        entityType: "invitation",
        entityId: invitation.id,
        eventData: { email: invitation.invitee_email, roles: payload.proposed_roles },
      }),
      enqueueRightsOutboxEvent({
        supabase: trusted,
        projectId: project.id,
        eventType: "music.rights.party.invited",
        dedupeKey: `invitation:${invitation.id}:created`,
        payload: { invitationId: invitation.id, email: invitation.invitee_email },
      }),
    ])

    return NextResponse.json({
      data: invitation,
      invite_token: rawToken,
    }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError)
      return jsonError({ status: 400, code: "invalid_request", message: "Invalid invitation request.", issues: error.issues })
    console.error("Invitation create failed", error)
    return jsonError({ status: 500, code: "invitation_internal_error", message: "Unexpected invitation error.", retryable: true })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const authResult = await requireApiUser(request)
    if (!authResult.success) return authResult.response
    const { user, supabase } = authResult.auth
    if (!(await limiter.check(user.id)).success)
      return jsonError({ status: 429, code: "rate_limited", message: "Too many invitation actions.", retryable: true })

    const flags = await resolveMusicRightsFlags(supabase, user.id)
    if (!flags.music_contributor_workflows_enabled)
      return jsonError({ status: 404, code: "feature_disabled", message: "Contributor workflows are not available.", retryable: false })

    const payload = actionSchema.parse(await request.json())
    const trusted = await getTrustedMusicWriteClient(supabase)
    const { data: invitation } = await trusted
      .from("music_rights_invitations")
      .select("*")
      .eq("id", payload.invitation_id)
      .maybeSingle()
    if (!invitation) return jsonError({ status: 404, code: "invitation_not_found", message: "Invitation not found.", retryable: false })

    const isOwner = invitation.owner_user_id === user.id
    const isInvitee = invitation.invitee_user_id === user.id || invitation.invitee_email?.toLowerCase() === user.email?.toLowerCase()
    if (payload.action === "revoke" && !isOwner)
      return jsonError({ status: 403, code: "owner_required", message: "Only the project owner can revoke invitations." })
    if (["accept", "counter", "reject"].includes(payload.action) && !isInvitee && !isOwner)
      return jsonError({ status: 403, code: "invitee_required", message: "Only the invitee can respond to this invitation." })

    if (invitation.status !== "pending" && payload.action !== "revoke")
      return jsonError({ status: 409, code: "invitation_not_pending", message: "Invitation is no longer pending." })
    if (invitation.expires_at && new Date(invitation.expires_at).getTime() < Date.now() && payload.action !== "revoke") {
      await trusted.from("music_rights_invitations").update({ status: "expired", updated_at: new Date().toISOString() }).eq("id", invitation.id)
      return jsonError({ status: 409, code: "invitation_expired", message: "Invitation has expired." })
    }

    const statusByAction = {
      accept: "accepted",
      counter: "countered",
      reject: "rejected",
      revoke: "revoked",
    } as const

    const updates: Record<string, unknown> = {
      status: statusByAction[payload.action],
      updated_at: new Date().toISOString(),
      invitee_user_id: invitation.invitee_user_id || user.id,
    }
    if (payload.action === "accept") updates.accepted_at = new Date().toISOString()
    if (payload.action === "revoke") updates.revoked_at = new Date().toISOString()
    if (payload.action === "counter") updates.counter_payload = payload.counter_payload || {}

    const { data: updated, error } = await trusted
      .from("music_rights_invitations")
      .update(updates)
      .eq("id", invitation.id)
      .select("id, public_id, project_id, party_id, invitee_email, invitee_display_name, invitee_user_id, proposed_roles, claim_ids, status, expires_at, accepted_at, revoked_at, counter_payload, updated_at")
      .single()
    if (error || !updated)
      return jsonError({ status: 500, code: "invitation_update_failed", message: "Unable to update invitation.", retryable: true })

    if (payload.action === "accept" && invitation.party_id) {
      await trusted.from("music_rights_parties").update({
        linked_user_id: user.id,
        status: "active",
        updated_at: new Date().toISOString(),
      }).eq("id", invitation.party_id)
    }

    await writeRightsAuditEvent({
      supabase: trusted,
      projectId: invitation.project_id,
      actorUserId: user.id,
      actorType: isOwner ? "artist" : "contributor",
      eventType: `music.rights.invitation.${payload.action}`,
      entityType: "invitation",
      entityId: invitation.id,
    })

    return NextResponse.json({ data: updated })
  } catch (error) {
    if (error instanceof z.ZodError)
      return jsonError({ status: 400, code: "invalid_request", message: "Invalid invitation action.", issues: error.issues })
    console.error("Invitation action failed", error)
    return jsonError({ status: 500, code: "invitation_action_internal_error", message: "Unexpected invitation action error.", retryable: true })
  }
}
