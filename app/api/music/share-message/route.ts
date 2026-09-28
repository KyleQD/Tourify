import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { authenticateApiRequest } from "@/lib/auth/api-auth"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

const bodySchema = z.object({
  musicId: z.string().uuid(),
  recipientId: z.string().uuid().optional(),
  threadId: z.string().uuid().optional(),
  note: z.string().trim().max(1000).optional(),
}).refine((data) => Boolean(data.recipientId) !== Boolean(data.threadId), {
  message: "Provide exactly one of recipientId or threadId",
})

function resolveAppOrigin(request: NextRequest) {
  const configured = (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "").trim().replace(/\/$/, "")
  if (configured) return /^https?:\/\//i.test(configured) ? configured : `https://${configured}`
  return request.nextUrl.origin
}

async function ensureThreadMembership(
  supabase: ReturnType<typeof createServiceRoleClient>,
  threadId: string,
  userId: string,
) {
  const { data } = await supabase.from("thread_members").select("thread_id").eq("thread_id", threadId).eq("user_id", userId).is("left_at", null).maybeSingle()
  return Boolean(data)
}

async function findOrCreateConversation(
  supabase: ReturnType<typeof createServiceRoleClient>,
  senderId: string,
  recipientId: string,
  musicId: string,
) {
  const pairFilter = `and(participant_1.eq.${senderId},participant_2.eq.${recipientId}),and(participant_1.eq.${recipientId},participant_2.eq.${senderId})`
  const { data: existing, error: findError } = await supabase.from("conversations").select("id, participant_1, participant_2, trust_tier, accepted_at").or(pairFilter).maybeSingle()
  if (findError && findError.code !== "PGRST116") throw new Error("Failed to find conversation")
  if (existing) return existing
  const { data: created, error: createError } = await supabase.from("conversations").insert({
    participant_1: senderId,
    participant_2: recipientId,
    trust_tier: "open",
    context_type: "shared_music",
    context_id: musicId,
    accepted_at: new Date().toISOString(),
    accepted_by: senderId,
  }).select("id, participant_1, participant_2, trust_tier, accepted_at").single()
  if (createError || !created) throw new Error("Failed to create conversation")
  return created
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateApiRequest(request)
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const parsed = bodySchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return NextResponse.json({ error: "Invalid request body", details: parsed.error.flatten() }, { status: 400 })

    const { musicId, recipientId, threadId, note } = parsed.data
    const supabase = createServiceRoleClient()
    const { data: music, error: musicError } = await supabase.from("artist_music").select("id, title, is_public").eq("id", musicId).maybeSingle()
    if (musicError || !music) return NextResponse.json({ error: "Music track not found" }, { status: 404 })
    if (!music.is_public) return NextResponse.json({ error: "Cannot share private music" }, { status: 403 })

    const url = `${resolveAppOrigin(request)}/music?trackId=${encodeURIComponent(music.id)}`
    const content = note?.trim() ? `${note.trim()}\n\nCheck out “${music.title}”: ${url}` : `Check out “${music.title}”: ${url}`

    if (recipientId) {
      if (recipientId === auth.user.id) return NextResponse.json({ error: "Cannot send message to yourself" }, { status: 400 })
      const conversation = await findOrCreateConversation(supabase, auth.user.id, recipientId, music.id)
      if (conversation.trust_tier === "request" && !conversation.accepted_at) return NextResponse.json({ error: "Accept this request before sending more messages" }, { status: 403 })
      const { data: message, error: messageError } = await supabase.from("messages").insert({ conversation_id: conversation.id, sender_id: auth.user.id, content }).select("id, conversation_id, sender_id, content, created_at").single()
      if (messageError || !message) return NextResponse.json({ error: "Failed to send message" }, { status: 500 })
      await supabase.from("conversations").update({ last_message_id: message.id, updated_at: new Date().toISOString() }).eq("id", conversation.id)
      await supabase.from("music_shares").insert({ music_id: music.id, user_id: auth.user.id, share_type: "message", share_data: { recipient_id: recipientId, canonical_track_id: music.id } })
      return NextResponse.json({ success: true, channel: "dm", conversationId: conversation.id, message })
    }

    if (!(await ensureThreadMembership(supabase, threadId!, auth.user.id))) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    const { data: groupMessage, error: groupError } = await supabase.from("group_messages").insert({ thread_id: threadId, sender_id: auth.user.id, content, message_type: "music", mentions: [] }).select("id, thread_id, sender_id, content, message_type, created_at").single()
    if (groupError || !groupMessage) return NextResponse.json({ error: "Failed to send group message" }, { status: 500 })
    await supabase.from("group_threads").update({ last_message_id: groupMessage.id, updated_at: new Date().toISOString() }).eq("id", threadId)
    await supabase.from("music_shares").insert({ music_id: music.id, user_id: auth.user.id, share_type: "message", share_data: { thread_id: threadId, canonical_track_id: music.id } })
    return NextResponse.json({ success: true, channel: "group", message: groupMessage })
  } catch (error) {
    console.error("[music share-message] error:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal server error" }, { status: 500 })
  }
}
