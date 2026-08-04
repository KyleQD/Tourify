import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { hasAdminCapability } from "@/lib/auth/admin-capabilities"
import { resolveActingAdminContext } from "@/lib/auth/admin-context"
import { authenticateApiRequest } from "@/lib/auth/api-auth"
import { listWorkforcePeople } from "@/lib/services/admin-workforce-people.service"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { invalidStaffChannelMemberIds } from "@/lib/admin/staff-channel-membership"

const channelSchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(240).optional().nullable(),
  memberIds: z.array(z.string().uuid()).max(200).default([]),
})

async function authorize(request: NextRequest) {
  const auth = await authenticateApiRequest(request)
  if (!auth) return NextResponse.json({ error: "Authentication required." }, { status: 401 })
  const admin = await resolveActingAdminContext(request, auth)
  if (admin instanceof NextResponse) return admin
  if (!hasAdminCapability(admin.capabilities, "communications.broadcast") && !hasAdminCapability(admin.capabilities, "workforce.manage")) {
    return NextResponse.json({ error: "Team communication access is required." }, { status: 403 })
  }
  return { auth, admin }
}

export async function GET(request: NextRequest) {
  const access = await authorize(request)
  if (access instanceof NextResponse) return access
  const service = createServiceRoleClient()
  const { auth, admin } = access

  const { data: memberships, error: membershipError } = await service
    .from("thread_members")
    .select("thread_id, role, last_read_at")
    .eq("user_id", auth.user.id)
    .is("left_at", null)
  if (membershipError) return NextResponse.json({ error: "Unable to load team channels." }, { status: 503 })
  const roleByThread = new Map((memberships ?? []).map((row) => [row.thread_id, row]))
  const threadIds = Array.from(roleByThread.keys())
  if (!threadIds.length) return NextResponse.json({ channels: [] })

  const { data: threads, error } = await service
    .from("group_threads")
    .select("id, name, description, updated_at")
    .eq("thread_type", "staff")
    .eq("context_type", "organization")
    .eq("context_id", admin.profileId)
    .in("id", threadIds)
    .order("updated_at", { ascending: false })
  if (error) return NextResponse.json({ error: "Unable to load team channels." }, { status: 503 })

  const channels = await Promise.all((threads ?? []).map(async (thread) => {
    const membership = roleByThread.get(thread.id)
    const [{ count: memberCount }, { data: lastRows }, { count: unreadCount }] = await Promise.all([
      service.from("thread_members").select("thread_id", { count: "exact", head: true }).eq("thread_id", thread.id).is("left_at", null),
      service.from("group_messages").select("content, created_at").eq("thread_id", thread.id).order("created_at", { ascending: false }).limit(1),
      service.from("group_messages").select("id", { count: "exact", head: true }).eq("thread_id", thread.id).gt("created_at", membership?.last_read_at ?? "1970-01-01T00:00:00.000Z").neq("sender_id", auth.user.id),
    ])
    const last = lastRows?.[0]
    return {
      id: thread.id,
      name: thread.name,
      description: thread.description,
      memberCount: memberCount ?? 0,
      unreadCount: unreadCount ?? 0,
      lastMessage: last?.content ?? null,
      lastActivity: last?.created_at ?? thread.updated_at,
      role: membership?.role ?? "member",
    }
  }))
  return NextResponse.json({ channels }, { headers: { "Cache-Control": "private, no-store" } })
}

export async function POST(request: NextRequest) {
  const access = await authorize(request)
  if (access instanceof NextResponse) return access
  const body = channelSchema.safeParse(await request.json().catch(() => null))
  if (!body.success) return NextResponse.json({ error: "Check the channel name and selected members.", details: body.error.flatten() }, { status: 422 })

  const service = createServiceRoleClient()
  const { auth, admin } = access
  const people = await listWorkforcePeople({
    supabase: service,
    employerEntityType: "organization",
    employerEntityId: admin.profileId,
    includePending: false,
    limit: 500,
  })
  const approvedIds = new Set(people.filter((person) => person.status === "active" || person.status === "confirmed").map((person) => person.userId))
  const requestedIds = Array.from(new Set(body.data.memberIds.filter((id) => id !== auth.user.id)))
  const invalidIds = invalidStaffChannelMemberIds({ requestedMemberIds: requestedIds, approvedActiveUserIds: approvedIds, creatorUserId: auth.user.id })
  if (invalidIds.length) return NextResponse.json({ error: "One or more selected people are not approved active workforce members.", invalidMemberIds: invalidIds }, { status: 422 })

  const { data: thread, error: threadError } = await service
    .from("group_threads")
    .insert({
      name: body.data.name,
      description: body.data.description || null,
      thread_type: "staff",
      context_type: "organization",
      context_id: admin.profileId,
      created_by: auth.user.id,
    })
    .select("id, name, description, updated_at")
    .single()
  if (threadError || !thread) return NextResponse.json({ error: "Unable to create the team channel." }, { status: 503 })

  const memberRows = [
    { thread_id: thread.id, user_id: auth.user.id, role: "owner" },
    ...requestedIds.map((userId) => ({ thread_id: thread.id, user_id: userId, role: "member" })),
  ]
  const { error: membersError } = await service.from("thread_members").insert(memberRows)
  if (membersError) {
    await service.from("group_threads").delete().eq("id", thread.id)
    return NextResponse.json({ error: "Unable to add the selected channel members." }, { status: 503 })
  }
  return NextResponse.json({ channel: { ...thread, memberCount: memberRows.length, unreadCount: 0, lastMessage: null, lastActivity: thread.updated_at, role: "owner" } }, { status: 201 })
}
