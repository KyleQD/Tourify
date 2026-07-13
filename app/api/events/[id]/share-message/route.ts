import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { authenticateApiRequest } from "@/lib/auth/api-auth"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { canShareArtistEvent } from "@/lib/feed/event-share-preview"
import {
  buildEventShareMessagePayload,
  encodeTaskCardMessage,
} from "@/lib/feed/event-share-message"

const bodySchema = z
  .object({
    recipientId: z.string().uuid().optional(),
    threadId: z.string().uuid().optional(),
    note: z.string().trim().max(1000).optional(),
  })
  .refine(
    (data) => Boolean(data.recipientId) !== Boolean(data.threadId),
    { message: "Provide exactly one of recipientId or threadId" },
  )

async function ensureThreadMembership(
  supabase: ReturnType<typeof createServiceRoleClient>,
  threadId: string,
  userId: string,
) {
  const { data } = await supabase
    .from("thread_members")
    .select("thread_id")
    .eq("thread_id", threadId)
    .eq("user_id", userId)
    .is("left_at", null)
    .maybeSingle()

  return Boolean(data)
}

async function findOrCreateConversation(
  supabase: ReturnType<typeof createServiceRoleClient>,
  senderId: string,
  recipientId: string,
  eventId: string,
) {
  const { data: existing, error: findError } = await supabase
    .from("conversations")
    .select("id, participant_1, participant_2, trust_tier, accepted_at")
    .or(
      `and(participant_1.eq.${senderId},participant_2.eq.${recipientId}),and(participant_1.eq.${recipientId},participant_2.eq.${senderId})`,
    )
    .maybeSingle()

  if (findError && findError.code !== "PGRST116") {
    throw new Error("Failed to find conversation")
  }

  if (existing) return existing

  const { data: created, error: createError } = await supabase
    .from("conversations")
    .insert({
      participant_1: senderId,
      participant_2: recipientId,
      trust_tier: "open",
      context_type: "shared_event",
      context_id: eventId,
      accepted_at: new Date().toISOString(),
      accepted_by: senderId,
    })
    .select("id, participant_1, participant_2, trust_tier, accepted_at")
    .single()

  if (createError || !created) throw new Error("Failed to create conversation")
  return created
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await authenticateApiRequest(request)
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { id: eventId } = await params
    const rawBody = await request.json().catch(() => null)
    const parsed = bodySchema.safeParse(rawBody)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 },
      )
    }

    const { recipientId, threadId, note } = parsed.data
    if (!recipientId && !threadId) {
      return NextResponse.json(
        { error: "Provide exactly one of recipientId or threadId" },
        { status: 400 },
      )
    }

    const supabase = createServiceRoleClient()

    const { data: event, error: eventError } = await supabase
      .from("events")
      .select(
        "id, slug, title, name, status, event_date, venue_name, city, state, country, poster_url, artist_id, created_by, producer_settings, is_public",
      )
      .eq("id", eventId)
      .maybeSingle()

    if (eventError || !event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 })
    }

    if (!canShareArtistEvent({ event, viewerId: auth.user.id })) {
      return NextResponse.json(
        { error: "Only published, non-private events can be shared" },
        { status: 403 },
      )
    }

    const origin = request.headers.get("origin") || request.nextUrl.origin
    const payload = buildEventShareMessagePayload({ event, note, origin })
    const taskContent = encodeTaskCardMessage(payload.taskCard)

    if (recipientId) {
      if (recipientId === auth.user.id) {
        return NextResponse.json({ error: "Cannot send message to yourself" }, { status: 400 })
      }

      const conversation = await findOrCreateConversation(
        supabase,
        auth.user.id,
        recipientId,
        event.id,
      )

      if (conversation.trust_tier === "request" && !conversation.accepted_at) {
        return NextResponse.json(
          { error: "Accept this request before sending more messages" },
          { status: 403 },
        )
      }

      const messageBody = note?.trim()
        ? `${note.trim()}\n\n${taskContent}`
        : taskContent

      const { data: message, error: messageError } = await supabase
        .from("messages")
        .insert({
          conversation_id: conversation.id,
          sender_id: auth.user.id,
          content: messageBody,
        })
        .select("id, conversation_id, sender_id, content, created_at")
        .single()

      if (messageError || !message) {
        console.error("[event share-message] dm insert failed:", messageError)
        return NextResponse.json({ error: "Failed to send message" }, { status: 500 })
      }

      await supabase
        .from("conversations")
        .update({
          last_message_id: message.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", conversation.id)

      return NextResponse.json({
        success: true,
        channel: "dm",
        preview: payload.preview,
        conversationId: conversation.id,
        message,
      })
    }

    const isMember = await ensureThreadMembership(supabase, threadId!, auth.user.id)
    if (!isMember) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const groupContent = note?.trim()
      ? `${note.trim()}\n\n${taskContent}`
      : taskContent

    const { data: groupMessage, error: groupError } = await supabase
      .from("group_messages")
      .insert({
        thread_id: threadId,
        sender_id: auth.user.id,
        content: groupContent,
        message_type: "text",
        mentions: [],
        attachments: [],
      })
      .select("id, thread_id, sender_id, content, created_at")
      .single()

    if (groupError || !groupMessage) {
      console.error("[event share-message] group insert failed:", groupError)
      return NextResponse.json({ error: "Failed to send group message" }, { status: 500 })
    }

    await supabase
      .from("group_threads")
      .update({ last_message_id: groupMessage.id, updated_at: new Date().toISOString() })
      .eq("id", threadId)

    return NextResponse.json({
      success: true,
      channel: "group",
      preview: payload.preview,
      message: groupMessage,
    })
  } catch (error) {
    console.error("[event share-message] error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    )
  }
}
