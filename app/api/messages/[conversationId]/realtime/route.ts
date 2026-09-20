import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { resolveActingContext } from "@/lib/auth/acting-context"
import { resolveActingAccountIds, isConversationParticipant } from "@/lib/messages/participant-auth"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { getMessagingRealtimeTopic } from "@/lib/messaging/realtime-channel"

const conversationIdSchema = z.string().uuid()

async function getAuthorizedConversation(request: NextRequest, conversationId: string) {
  const ctx = await resolveActingContext(request)
  if (ctx instanceof NextResponse) return ctx

  const acting = await resolveActingAccountIds(
    ctx.userId,
    request.headers.get("x-acting-profile-id"),
  )
  if (acting.error) return NextResponse.json({ error: acting.error }, { status: 403 })

  const supabase = createServiceRoleClient()
  const { data: conversation, error } = await supabase
    .from("conversations")
    .select("id, participant_1, participant_2")
    .eq("id", conversationId)
    .maybeSingle()

  if (error || !conversation) return NextResponse.json({ error: "Conversation not found" }, { status: 404 })
  if (!isConversationParticipant(conversation, acting.ids)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  return { ctx, acting, conversation }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> },
) {
  const { conversationId: rawConversationId } = await params
  const parsed = conversationIdSchema.safeParse(rawConversationId)
  if (!parsed.success) return NextResponse.json({ error: "Invalid conversation id" }, { status: 400 })

  try {
    const authorized = await getAuthorizedConversation(request, parsed.data)
    if (authorized instanceof NextResponse) return authorized

    return NextResponse.json({
      channel: getMessagingRealtimeTopic(parsed.data),
      conversationId: parsed.data,
    })
  } catch (error) {
    console.error("Messaging realtime authorization error:", error)
    return NextResponse.json({ error: "Unable to authorize realtime messaging" }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> },
) {
  const { conversationId: rawConversationId } = await params
  const parsed = conversationIdSchema.safeParse(rawConversationId)
  if (!parsed.success) return NextResponse.json({ error: "Invalid conversation id" }, { status: 400 })

  try {
    const authorized = await getAuthorizedConversation(request, parsed.data)
    if (authorized instanceof NextResponse) return authorized

    const supabase = createServiceRoleClient()
    const { data, error } = await supabase
      .from("messages")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("conversation_id", parsed.data)
      .neq("sender_id", authorized.ctx.userId)
      .eq("is_read", false)
      .select("id, is_read, read_at")

    if (error) {
      console.error("Messaging read receipt error:", error)
      return NextResponse.json({ error: "Unable to mark messages as read" }, { status: 500 })
    }

    return NextResponse.json({ updated: data?.length ?? 0 })
  } catch (error) {
    console.error("Messaging read receipt authorization error:", error)
    return NextResponse.json({ error: "Unable to mark messages as read" }, { status: 500 })
  }
}
