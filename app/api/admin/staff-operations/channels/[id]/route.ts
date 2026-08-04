import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { hasAdminCapability } from "@/lib/auth/admin-capabilities"
import { resolveActingAdminContext } from "@/lib/auth/admin-context"
import { authenticateApiRequest } from "@/lib/auth/api-auth"
import { listWorkforcePeople } from "@/lib/services/admin-workforce-people.service"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { canManageStaffChannel, invalidStaffChannelMemberIds } from "@/lib/admin/staff-channel-membership"

const patchSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  description: z.string().trim().max(240).nullable().optional(),
  addMemberIds: z.array(z.string().uuid()).max(200).default([]),
  removeMemberIds: z.array(z.string().uuid()).max(200).default([]),
  markRead: z.boolean().optional(),
})

function channelId(request: NextRequest) {
  return request.nextUrl.pathname.split("/").at(-1) ?? ""
}

async function context(request: NextRequest) {
  const auth = await authenticateApiRequest(request)
  if (!auth) return NextResponse.json({ error: "Authentication required." }, { status: 401 })
  const admin = await resolveActingAdminContext(request, auth)
  if (admin instanceof NextResponse) return admin
  if (!hasAdminCapability(admin.capabilities, "communications.broadcast") && !hasAdminCapability(admin.capabilities, "workforce.manage")) {
    return NextResponse.json({ error: "Team communication access is required." }, { status: 403 })
  }
  const service = createServiceRoleClient()
  const { data: thread } = await service
    .from("group_threads")
    .select("id, name, description, created_by")
    .eq("id", channelId(request))
    .eq("thread_type", "staff")
    .eq("context_type", "organization")
    .eq("context_id", admin.profileId)
    .maybeSingle()
  if (!thread) return NextResponse.json({ error: "Team channel not found." }, { status: 404 })
  const { data: membership } = await service.from("thread_members").select("role").eq("thread_id", thread.id).eq("user_id", auth.user.id).is("left_at", null).maybeSingle()
  if (!membership) return NextResponse.json({ error: "You are not an active member of this channel." }, { status: 403 })
  return { auth, admin, service, thread, membership }
}

export async function GET(request: NextRequest) {
  const access = await context(request)
  if (access instanceof NextResponse) return access
  const { service, thread } = access
  const { data: rows, error } = await service.from("thread_members").select("user_id, role").eq("thread_id", thread.id).is("left_at", null)
  if (error) return NextResponse.json({ error: "Unable to load channel members." }, { status: 503 })
  const ids = (rows ?? []).map((row) => row.user_id)
  const { data: profiles } = ids.length ? await service.from("profiles").select("id, user_id, full_name, username, email").or(`id.in.(${ids.join(",")}),user_id.in.(${ids.join(",")})`) : { data: [] }
  const profileByUser = new Map<string, Record<string, unknown>>()
  for (const profile of profiles ?? []) {
    if (profile.id) profileByUser.set(String(profile.id), profile)
    if (profile.user_id) profileByUser.set(String(profile.user_id), profile)
  }
  const members = (rows ?? []).map((row) => {
    const profile = profileByUser.get(row.user_id)
    return { userId: row.user_id, name: String(profile?.full_name ?? profile?.username ?? "Team member"), email: typeof profile?.email === "string" ? profile.email : null, role: null, membershipRole: row.role }
  })
  return NextResponse.json({ channel: thread, members })
}

export async function PATCH(request: NextRequest) {
  const access = await context(request)
  if (access instanceof NextResponse) return access
  const parsed = patchSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "Invalid channel update.", details: parsed.error.flatten() }, { status: 422 })
  const { auth, admin, service, thread } = access

  if (parsed.data.markRead) {
    const { error } = await service
      .from("thread_members")
      .update({ last_read_at: new Date().toISOString() })
      .eq("thread_id", thread.id)
      .eq("user_id", auth.user.id)
      .is("left_at", null)
    if (error) return NextResponse.json({ error: "Unable to update unread messages." }, { status: 503 })
    if (!parsed.data.name && parsed.data.description === undefined && !parsed.data.addMemberIds.length && !parsed.data.removeMemberIds.length) {
      return NextResponse.json({ success: true })
    }
  }

  if (!canManageStaffChannel(access.membership.role)) return NextResponse.json({ error: "Only channel owners and admins can manage members." }, { status: 403 })

  const addIds = Array.from(new Set(parsed.data.addMemberIds.filter((id) => id !== auth.user.id)))
  if (addIds.length) {
    const people = await listWorkforcePeople({ supabase: service, employerEntityType: "organization", employerEntityId: admin.profileId, includePending: false, limit: 500 })
    const approved = new Set(people.filter((person) => person.status === "active" || person.status === "confirmed").map((person) => person.userId))
    const invalid = invalidStaffChannelMemberIds({ requestedMemberIds: addIds, approvedActiveUserIds: approved, creatorUserId: auth.user.id })
    if (invalid.length) return NextResponse.json({ error: "One or more selected people are not approved active workforce members.", invalidMemberIds: invalid }, { status: 422 })
  }
  if (parsed.data.removeMemberIds.includes(thread.created_by)) return NextResponse.json({ error: "The channel owner cannot be removed." }, { status: 422 })

  const updates: Record<string, unknown> = {}
  if (parsed.data.name !== undefined) updates.name = parsed.data.name
  if (parsed.data.description !== undefined) updates.description = parsed.data.description
  if (Object.keys(updates).length) {
    updates.updated_at = new Date().toISOString()
    const { error } = await service.from("group_threads").update(updates).eq("id", thread.id)
    if (error) return NextResponse.json({ error: "Unable to update the channel." }, { status: 503 })
  }
  if (addIds.length) {
    const { error } = await service.from("thread_members").upsert(addIds.map((userId) => ({ thread_id: thread.id, user_id: userId, role: "member", left_at: null })), { onConflict: "thread_id,user_id" })
    if (error) return NextResponse.json({ error: "Unable to add channel members." }, { status: 503 })
  }
  const removeIds = Array.from(new Set(parsed.data.removeMemberIds.filter((id) => id !== auth.user.id)))
  if (removeIds.length) {
    const { error } = await service.from("thread_members").update({ left_at: new Date().toISOString() }).eq("thread_id", thread.id).in("user_id", removeIds)
    if (error) return NextResponse.json({ error: "Unable to remove channel members." }, { status: 503 })
  }
  return NextResponse.json({ success: true })
}
