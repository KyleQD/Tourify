import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { hasWorkflowThreadPermission } from '@/lib/workflows/workflow-permissions'
import { authenticateApiRequest, checkAdminPermissions } from '@/lib/auth/api-auth'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

interface MessageContextResult {
  tier: 'open' | 'request' | 'context'
  context_type: string | null
  context_id: string | null
}

class MessageRateLimitError extends Error {
  retryAfterSeconds: number
  constructor(retryAfterSeconds: number) {
    super('Rate limit exceeded for message requests')
    this.name = 'MessageRateLimitError'
    this.retryAfterSeconds = retryAfterSeconds
  }
}

const attachmentSchema = z.object({
  url: z.string().url(),
  name: z.string().min(1),
  type: z.enum(['image', 'file', 'audio']),
  size: z.number().int().nonnegative(),
})

const sendMessageSchema = z.object({
  recipientId: z.string().uuid().optional(),
  content: z.string().trim().max(2000).optional(),
  threadId: z.string().uuid().optional(),
  messageType: z.string().max(40).optional(),
  metadata: z.record(z.unknown()).optional(),
  attachments: z.array(attachmentSchema).default([]),
  taskCard: z
    .object({
      title: z.string().min(1).max(200),
      description: z.string().max(1000).optional(),
      action_url: z.string().min(1).max(2000),
      action_label: z.string().max(80).optional(),
      is_sensitive: z.boolean().optional(),
    })
    .optional(),
})

async function getViewerRoleBlockedState(
  supabase: ReturnType<typeof createServiceRoleClient>,
  userId: string,
) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle()

  return profile?.role === 'viewer'
}

async function resolveMessageContext(
  supabase: ReturnType<typeof createServiceRoleClient>,
  senderId: string,
  recipientId: string
): Promise<MessageContextResult> {
  const isAdmin = await checkAdminPermissions({ id: senderId })
  if (isAdmin) {
    const { data: sharedStaff } = await supabase
      .from('staff_members')
      .select('id')
      .eq('user_id', recipientId)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle()

    if (sharedStaff) {
      return { tier: 'open', context_type: 'org_staff', context_id: null }
    }

    const { data: sharedEvent } = await supabase
      .from('event_participants')
      .select('event_id')
      .eq('participant_id', recipientId)
      .eq('participant_type', 'Individual')
      .limit(1)
      .maybeSingle()

    if (sharedEvent) {
      return { tier: 'open', context_type: 'event_team', context_id: sharedEvent.event_id }
    }
  }

  const { data, error } = await supabase.rpc('resolve_message_context', {
    sender: senderId,
    recipient: recipientId,
  })

  if (error || !Array.isArray(data) || data.length === 0) {
    return { tier: 'request', context_type: null, context_id: null }
  }

  const result = data[0] as MessageContextResult
  if (!result?.tier) {
    return { tier: 'request', context_type: null, context_id: null }
  }

  return result
}

async function enforceRequestRateLimit(
  supabase: ReturnType<typeof createServiceRoleClient>,
  senderId: string,
  recipientId: string
) {
  const now = new Date()
  const windowStart = new Date(now.getTime() - 24 * 60 * 60 * 1000)

  const { data: existing, error } = await supabase
    .from('dm_request_rate_limits')
    .select('request_count, window_started_at')
    .eq('sender_id', senderId)
    .eq('recipient_id', recipientId)
    .maybeSingle()

  if (error) throw error

  if (!existing) {
    await supabase
      .from('dm_request_rate_limits')
      .insert({
        sender_id: senderId,
        recipient_id: recipientId,
        request_count: 1,
        window_started_at: now.toISOString(),
        updated_at: now.toISOString(),
      })
    return
  }

  const startedAt = new Date(existing.window_started_at)
  if (startedAt < windowStart) {
    await supabase
      .from('dm_request_rate_limits')
      .update({
        request_count: 1,
        window_started_at: now.toISOString(),
        updated_at: now.toISOString(),
      })
      .eq('sender_id', senderId)
      .eq('recipient_id', recipientId)
    return
  }

  if (existing.request_count >= 3) {
    const elapsed = Math.floor((now.getTime() - startedAt.getTime()) / 1000)
    const retryAfterSeconds = Math.max(60, 24 * 60 * 60 - elapsed)
    throw new MessageRateLimitError(retryAfterSeconds)
  }

  await supabase
    .from('dm_request_rate_limits')
    .update({
      request_count: existing.request_count + 1,
      updated_at: now.toISOString(),
    })
    .eq('sender_id', senderId)
    .eq('recipient_id', recipientId)
}

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateApiRequest(request)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { user } = auth
    const supabase = createServiceRoleClient()
    const { searchParams } = new URL(request.url)
    const conversationId = searchParams.get('conversationId')
    const selectedTab = searchParams.get('tab')
    const threadId = searchParams.get('threadId')

    if (threadId && process.env.FEATURE_UNIFIED_WORKFLOW_THREADS === '1') {
      const canReadThread = await hasWorkflowThreadPermission({
        supabase: supabase as any,
        threadId,
        userId: user.id,
        permission: 'read',
      })

      if (!canReadThread) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      const { data: workflowMessages, error: workflowMessagesError } = await supabase
        .from('workflow_messages')
        .select(`
          id,
          body,
          sender_id,
          message_type,
          metadata,
          created_at,
          sender:profiles!sender_id (
            id,
            username,
            full_name,
            avatar_url
          )
        `)
        .eq('thread_id', threadId)
        .order('created_at', { ascending: true })

      if (workflowMessagesError) {
        console.error('Error fetching workflow messages:', workflowMessagesError)
        return NextResponse.json({ error: 'Failed to fetch workflow messages' }, { status: 500 })
      }

      return NextResponse.json({ messages: workflowMessages, source: 'workflow' })
    }

    if (conversationId) {
      const { data: conversation, error: conversationError } = await supabase
        .from('conversations')
        .select('participant_1, participant_2')
        .eq('id', conversationId)
        .single()

      if (conversationError || !conversation) {
        return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
      }

      const isParticipant = conversation.participant_1 === user.id || conversation.participant_2 === user.id
      if (!isParticipant) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

      const rawLimit = Number(searchParams.get('limit') ?? '50')
      const limit = Math.min(Math.max(Number.isFinite(rawLimit) ? rawLimit : 50, 1), 100)
      const before = searchParams.get('before')

      let messagesQuery = supabase
        .from('messages')
        .select(`
          id,
          content,
          attachments,
          sender_id,
          created_at,
          sender:profiles!sender_id (
            id,
            username,
            full_name,
            avatar_url
          )
        `)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .limit(limit)
      if (before) messagesQuery = messagesQuery.lt('created_at', before)

      const { data, error } = await messagesQuery

      if (error) {
        console.error('Error fetching messages:', error)
        return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
      }

      const messages = (data || []).slice().reverse()
      const nextCursor = data && data.length === limit ? data[data.length - 1].created_at : null

      return NextResponse.json({ messages, nextCursor })
    }

    let query = supabase
      .from('conversations')
      .select(`
        id,
        created_at,
        updated_at,
        participant_1,
        participant_2,
        trust_tier,
        context_type,
        context_id,
        accepted_at,
        accepted_by,
        last_message_id,
        participant_1_profile:profiles!participant_1 (
          id,
          username,
          full_name,
          avatar_url
        ),
        participant_2_profile:profiles!participant_2 (
          id,
          username,
          full_name,
          avatar_url
        ),
        last_message:messages!last_message_id (
          id,
          content,
          created_at,
          sender_id
        )
      `)
      .or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`)

    if (selectedTab === 'primary') query = query.eq('trust_tier', 'open')
    if (selectedTab === 'requests') query = query.eq('trust_tier', 'request').is('accepted_at', null)
    if (selectedTab === 'work') query = query.in('context_type', ['event_team', 'venue_staff', 'job_application', 'workflow'])

    const { data: conversations, error } = await query.order('updated_at', { ascending: false })

    if (error) {
      console.error('Error fetching conversations:', error)
      return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 })
    }

    const isViewerBlocked = await getViewerRoleBlockedState(supabase, user.id)

    return NextResponse.json({
      conversations,
      viewer: { role: isViewerBlocked ? 'viewer' : 'member', canSend: !isViewerBlocked },
    })
  } catch (error) {
    console.error('Messages API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateApiRequest(request)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { user } = auth
    const supabase = createServiceRoleClient()
    const isViewerBlocked = await getViewerRoleBlockedState(supabase, user.id)
    if (isViewerBlocked)
      return NextResponse.json({ error: 'Messaging is unavailable for viewer accounts' }, { status: 403 })

    const rawBody = await request.json().catch(() => null)
    const parsedBody = sendMessageSchema.safeParse(rawBody)
    if (!parsedBody.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsedBody.error.flatten() },
        { status: 400 },
      )
    }
    const { recipientId, content, threadId, messageType, metadata, taskCard, attachments } = parsedBody.data

    if (threadId && process.env.FEATURE_UNIFIED_WORKFLOW_THREADS === '1') {
      const canWriteThread = await hasWorkflowThreadPermission({
        supabase: supabase as any,
        threadId,
        userId: user.id,
        permission: 'write',
      })

      if (!canWriteThread) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      if (!content?.trim()) {
        return NextResponse.json({ error: 'Message content is required' }, { status: 400 })
      }

      const { data: workflowMessage, error: workflowMessageError } = await supabase
        .from('workflow_messages')
        .insert({
          thread_id: threadId,
          sender_id: user.id,
          message_type: typeof messageType === 'string' ? messageType : 'text',
          body: content.trim(),
          metadata: metadata || {},
        })
        .select(`
          id,
          body,
          sender_id,
          message_type,
          metadata,
          created_at,
          sender:profiles!sender_id (
            id,
            username,
            full_name,
            avatar_url
          )
        `)
        .single()

      if (workflowMessageError) {
        console.error('Error sending workflow message:', workflowMessageError)
        return NextResponse.json({ error: 'Failed to send workflow message' }, { status: 500 })
      }

      await Promise.all([
        supabase.from('workflow_threads').update({ updated_at: new Date().toISOString() }).eq('id', threadId),
        supabase.from('workflow_events_audit').insert({
          thread_id: threadId,
          actor_user_id: user.id,
          action: 'message.created.bridge.legacy',
          entity_type: 'message',
          entity_id: workflowMessage.id,
          metadata: { source: 'app/api/messages/route.ts' },
        }),
      ])

      return NextResponse.json({
        success: true,
        message: workflowMessage,
        threadId,
        source: 'workflow',
      })
    }

    // Build message content — support task card messages
    let messageContent = content?.trim() || ''
    if (taskCard && taskCard.title && taskCard.action_url) {
      messageContent = `[TASK:${JSON.stringify({
        title: taskCard.title,
        description: taskCard.description || '',
        action_url: taskCard.action_url,
        action_label: taskCard.action_label || 'Go to Task',
        is_sensitive: taskCard.is_sensitive || false,
      })}]`
    }

    if (!recipientId || (!messageContent && attachments.length === 0)) {
      return NextResponse.json({ 
        error: 'Recipient ID and message content or attachments are required' 
      }, { status: 400 })
    }

    if (recipientId === user.id) {
      return NextResponse.json({ 
        error: 'Cannot send message to yourself' 
      }, { status: 400 })
    }

    // Find or create conversation
    let { data: conversation, error: conversationError } = await supabase
      .from('conversations')
      .select('id, participant_1, participant_2, trust_tier, accepted_at, context_type, context_id')
      .or(`and(participant_1.eq.${user.id},participant_2.eq.${recipientId}),and(participant_1.eq.${recipientId},participant_2.eq.${user.id})`)
      .single()

    if (conversationError && conversationError.code === 'PGRST116') {
      const resolvedContext = await resolveMessageContext(supabase, user.id, recipientId)
      if (resolvedContext.tier === 'request')
        await enforceRequestRateLimit(supabase, user.id, recipientId)

      const { data: newConversation, error: createError } = await supabase
        .from('conversations')
        .insert({
          participant_1: user.id,
          participant_2: recipientId,
          trust_tier: resolvedContext.tier,
          context_type: resolvedContext.context_type,
          context_id: resolvedContext.context_id,
          accepted_at: resolvedContext.tier === 'request' ? null : new Date().toISOString(),
          accepted_by: resolvedContext.tier === 'request' ? null : user.id
        })
        .select('id, participant_1, participant_2, trust_tier, accepted_at, context_type, context_id')
        .single()

      if (createError || !newConversation) {
        console.error('Error creating conversation:', createError)
        return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 })
      }

      conversation = newConversation
    } else if (conversationError) {
      console.error('Error finding conversation:', conversationError)
      return NextResponse.json({ error: 'Failed to find conversation' }, { status: 500 })
    }

    if (!conversation) {
      return NextResponse.json({ error: 'Failed to find or create conversation' }, { status: 500 })
    }

    const isParticipant = conversation.participant_1 === user.id || conversation.participant_2 === user.id
    if (!isParticipant)
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    if (conversation.trust_tier === 'request' && !conversation.accepted_at) {
      const { data: existingRequestMessages, error: requestMessagesError } = await supabase
        .from('messages')
        .select('id, sender_id')
        .eq('conversation_id', conversation.id)
        .order('created_at', { ascending: true })

      if (requestMessagesError) {
        console.error('Error validating request conversation:', requestMessagesError)
        return NextResponse.json({ error: 'Failed to validate request conversation' }, { status: 500 })
      }

      if (existingRequestMessages && existingRequestMessages.length > 0) {
        const firstSenderId = existingRequestMessages[0].sender_id
        if (firstSenderId !== user.id) {
          return NextResponse.json({ error: 'Accept this request before replying' }, { status: 403 })
        }

        return NextResponse.json({ error: 'Only one intro message is allowed until accepted' }, { status: 403 })
      }
    }

    const { data: message, error: messageError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversation.id,
        sender_id: user.id,
        content: messageContent || '(attachment)',
        attachments,
      })
      .select(`
        id,
        content,
        sender_id,
        created_at,
        sender:profiles!sender_id (
          id,
          username,
          full_name,
          avatar_url
        )
      `)
      .single()

    if (messageError) {
      console.error('Error sending message:', messageError)
      return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
    }

    // Update conversation's last message
    await supabase
      .from('conversations')
      .update({
        last_message_id: message.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', conversation.id)

    return NextResponse.json({ 
      success: true, 
      message,
      conversationId: conversation.id 
    })
  } catch (error) {
    if (error instanceof MessageRateLimitError) {
      return NextResponse.json(
        {
          error: 'You have hit the message request limit for this user. Try again later.',
          retryAfterSeconds: error.retryAfterSeconds,
        },
        { status: 429, headers: { 'Retry-After': String(error.retryAfterSeconds) } },
      )
    }
    console.error('Send message API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 