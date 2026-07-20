import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { hasWorkflowThreadPermission } from '@/lib/workflows/workflow-permissions'
import { checkAdminPermissions } from '@/lib/auth/api-auth'
import { resolveActingContext } from '@/lib/auth/acting-context'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import {
  applyConversationAccountScope,
  buildAccountAwareConversationPairFilter,
  resolveSenderAccountSide,
} from '@/lib/messaging/account-scope'
import { resolveDmTrustForNewConversation } from '@/lib/messaging/resolve-dm-trust'
import { verifyRecipientAccount } from '@/lib/messaging/verify-recipient-account'

interface MessageContextResult {
  tier: 'open' | 'request' | 'context'
  context_type: string | null
  context_id: string | null
}

interface ConversationRow {
  id: string
  participant_1: string
  participant_2: string
  trust_tier?: string | null
  accepted_at?: string | null
  context_type?: string | null
  context_id?: string | null
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
  recipientProfileId: z.string().uuid().optional(),
  recipientAccountType: z.string().max(40).optional(),
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

function getConversationListFallback(error: unknown) {
  const details = error && typeof error === 'object' ? error as Record<string, unknown> : {}
  const code = typeof details.code === 'string' ? details.code : 'conversation_list_unavailable'

  return NextResponse.json({
    conversations: [],
    viewer: { role: 'member', canSend: true },
    warning: {
      code,
      message: 'Conversations are temporarily unavailable.',
    },
  })
}

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

    const { data: acceptedAsRequester } = await supabase
      .from('follow_requests')
      .select('id')
      .eq('status', 'accepted')
      .eq('requester_id', senderId)
      .eq('target_id', recipientId)
      .maybeSingle()

    const { data: acceptedAsTarget } = acceptedAsRequester
      ? { data: null }
      : await supabase
          .from('follow_requests')
          .select('id')
          .eq('status', 'accepted')
          .eq('requester_id', recipientId)
          .eq('target_id', senderId)
          .maybeSingle()

    if (acceptedAsRequester || acceptedAsTarget) {
      return { tier: 'open', context_type: 'network_connection', context_id: null }
    }

    const { data: followOutgoing } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_id', senderId)
      .eq('following_id', recipientId)
      .maybeSingle()

    const { data: followIncoming } = followOutgoing
      ? { data: null }
      : await supabase
          .from('follows')
          .select('id')
          .eq('follower_id', recipientId)
          .eq('following_id', senderId)
          .maybeSingle()

    if (followOutgoing || followIncoming) {
      return { tier: 'open', context_type: 'network_connection', context_id: null }
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
    const ctx = await resolveActingContext(request)
    if (ctx instanceof NextResponse) return ctx

    const { userId } = ctx
    const inboxScope = {
      userId,
      profileId: ctx.profileId,
      accountType: ctx.accountType,
    }
    const supabase = createServiceRoleClient()
    const { searchParams } = new URL(request.url)
    const conversationId = searchParams.get('conversationId')
    const selectedTab = searchParams.get('tab')
    const threadId = searchParams.get('threadId')

    if (threadId && process.env.FEATURE_UNIFIED_WORKFLOW_THREADS === '1') {
      const canReadThread = await hasWorkflowThreadPermission({
        supabase: supabase as any,
        threadId,
        userId,
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

      const isParticipant = conversation.participant_1 === userId || conversation.participant_2 === userId
      if (!isParticipant) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

      const rawLimit = Number(searchParams.get('limit') ?? '50')
      const limit = Math.min(Math.max(Number.isFinite(rawLimit) ? rawLimit : 50, 1), 100)
      const before = searchParams.get('before')

      const messageSelectWithAttachments = `
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
        `
      const messageSelectBase = `
          id,
          content,
          attachment_urls,
          sender_id,
          created_at,
          sender:profiles!sender_id (
            id,
            username,
            full_name,
            avatar_url
          )
        `

      let messagesQuery = supabase
        .from('messages')
        .select(messageSelectWithAttachments)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .limit(limit)
      if (before) messagesQuery = messagesQuery.lt('created_at', before)

      let messageRows: Array<Record<string, unknown>> | null = null
      let error: { code?: string; message?: string } | null = null
      {
        const initial = await messagesQuery
        messageRows = initial.data as Array<Record<string, unknown>> | null
        error = initial.error
      }

      if (error && String(error.message || '').toLowerCase().includes('attachments')) {
        let fallbackQuery = supabase
          .from('messages')
          .select(messageSelectBase)
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: false })
          .limit(limit)
        if (before) fallbackQuery = fallbackQuery.lt('created_at', before)
        const fallback = await fallbackQuery
        error = fallback.error
        if (!error && fallback.data) {
          messageRows = (fallback.data as Array<Record<string, unknown>>).map((row) => ({
            ...row,
            attachments: Array.isArray(row.attachment_urls)
              ? (row.attachment_urls as string[]).map((url) => ({ url, name: 'attachment', type: 'file', size: 0 }))
              : [],
          }))
        }
      }

      if (error) {
        console.error('Error fetching messages:', error)
        return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
      }

      const messages = (messageRows || []).slice().reverse()
      const nextCursor = messageRows && messageRows.length === limit
        ? String(messageRows[messageRows.length - 1].created_at ?? '')
        : null

      return NextResponse.json({ messages, nextCursor })
    }

    const conversationListSelect = `
        id,
        created_at,
        updated_at,
        participant_1,
        participant_2,
        participant_1_profile_id,
        participant_1_account_type,
        participant_2_profile_id,
        participant_2_account_type,
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
      `
    const conversationListSelectBase = `
        id,
        created_at,
        updated_at,
        participant_1,
        participant_2,
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
      `

    let query = applyConversationAccountScope(
      supabase.from('conversations').select(conversationListSelect),
      inboxScope,
    )

    if (selectedTab === 'primary') query = query.eq('trust_tier', 'open')
    if (selectedTab === 'requests') query = query.eq('trust_tier', 'request').is('accepted_at', null)
    if (selectedTab === 'work') query = query.in('context_type', ['event_team', 'venue_staff', 'job_application', 'workflow'])

    let { data: conversations, error } = await query.order('updated_at', { ascending: false })

    if (error && (
      String(error.message || '').toLowerCase().includes('trust_tier')
      || String(error.message || '').toLowerCase().includes('participant_1_account_type')
      || String(error.message || '').toLowerCase().includes('participant_1_profile_id')
    )) {
      // Schema lag: list without account/trust filters so DMs still work.
      const fallback = await supabase
        .from('conversations')
        .select(conversationListSelectBase)
        .or(`participant_1.eq.${userId},participant_2.eq.${userId}`)
        .order('updated_at', { ascending: false })
      conversations = fallback.data as typeof conversations
      error = fallback.error
    }

    if (error) {
      console.error('Error fetching conversations:', error)
      return getConversationListFallback(error)
    }

    const isViewerBlocked = await getViewerRoleBlockedState(supabase, userId)

    return NextResponse.json({
      conversations,
      viewer: { role: isViewerBlocked ? 'viewer' : 'member', canSend: !isViewerBlocked },
      inbox: {
        profileId: ctx.profileId,
        accountType: ctx.accountType,
      },
    })
  } catch (error) {
    console.error('Messages API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await resolveActingContext(request)
    if (ctx instanceof NextResponse) return ctx

    const { userId } = ctx
    const senderSide = resolveSenderAccountSide({
      userId,
      profileId: ctx.profileId,
      accountType: ctx.accountType,
    })
    const supabase = createServiceRoleClient()
    const isViewerBlocked = await getViewerRoleBlockedState(supabase, userId)
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
    const {
      recipientId,
      recipientProfileId,
      recipientAccountType,
      content,
      threadId,
      messageType,
      metadata,
      taskCard,
      attachments,
    } = parsedBody.data

    if (threadId && process.env.FEATURE_UNIFIED_WORKFLOW_THREADS === '1') {
      const canWriteThread = await hasWorkflowThreadPermission({
        supabase: supabase as any,
        threadId,
        userId,
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
          sender_id: userId,
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
          actor_user_id: userId,
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

    if (recipientId === userId) {
      return NextResponse.json({ 
        error: 'Cannot send message to yourself' 
      }, { status: 400 })
    }

    const recipientVerified = await verifyRecipientAccount({
      supabase,
      recipientUserId: recipientId,
      profileId: recipientProfileId,
      accountType: recipientAccountType,
    })
    if (!recipientVerified.ok)
      return NextResponse.json({ error: recipientVerified.error }, { status: 400 })

    const recipientSide = {
      profileId: recipientVerified.profileId,
      accountType: recipientVerified.accountType,
    }

    // Find or create conversation. Demo DBs may lag trust-model columns
    // (trust_tier etc.); treat missing-column errors as "not found" and create
    // with the widest compatible payload.
    const accountAwareFilter = buildAccountAwareConversationPairFilter({
      senderId: userId,
      recipientId,
      senderProfileId: senderSide.profileId,
      recipientProfileId: recipientSide.profileId,
    })
    const legacyPairFilter = `and(participant_1.eq.${userId},participant_2.eq.${recipientId}),and(participant_1.eq.${recipientId},participant_2.eq.${userId})`
    const trustSelect =
      'id, participant_1, participant_2, participant_1_profile_id, participant_1_account_type, participant_2_profile_id, participant_2_account_type, trust_tier, accepted_at, context_type, context_id'
    const baseSelect = 'id, participant_1, participant_2'

    function isMissingColumnError(error: { code?: string; message?: string } | null) {
      if (!error) return false
      if (error.code === '42703') return true
      const message = String(error.message || '').toLowerCase()
      return message.includes('does not exist') && message.includes('column')
    }

    function isNoRowError(error: { code?: string } | null) {
      return Boolean(error && (error.code === 'PGRST116' || error.code === 'PGRST123'))
    }

    let conversation: ConversationRow | null = null
    let trustColumnsAvailable = true
    let accountColumnsAvailable = true
    let conversationPairFilter = accountAwareFilter

    {
      const { data, error } = await supabase
        .from('conversations')
        .select(trustSelect)
        .or(conversationPairFilter)
        .maybeSingle()

      if (error && isMissingColumnError(error)) {
        const missingAccount =
          String(error.message || '').toLowerCase().includes('participant_1_profile_id')
          || String(error.message || '').toLowerCase().includes('participant_1_account_type')
        if (missingAccount) {
          accountColumnsAvailable = false
          conversationPairFilter = legacyPairFilter
        }
        if (String(error.message || '').toLowerCase().includes('trust_tier'))
          trustColumnsAvailable = false

        const fallbackSelect = trustColumnsAvailable
          ? 'id, participant_1, participant_2, trust_tier, accepted_at, context_type, context_id'
          : baseSelect
        const fallback = await supabase
          .from('conversations')
          .select(fallbackSelect)
          .or(conversationPairFilter)
          .maybeSingle()
        if (fallback.error && !isNoRowError(fallback.error) && isMissingColumnError(fallback.error)) {
          trustColumnsAvailable = false
          accountColumnsAvailable = false
          conversationPairFilter = legacyPairFilter
          const legacy = await supabase
            .from('conversations')
            .select(baseSelect)
            .or(legacyPairFilter)
            .maybeSingle()
          if (legacy.error && !isNoRowError(legacy.error)) {
            console.error('Error finding conversation:', legacy.error)
            return NextResponse.json({ error: 'Failed to find conversation' }, { status: 500 })
          }
          conversation = legacy.data as unknown as ConversationRow
        } else if (fallback.error && !isNoRowError(fallback.error)) {
          console.error('Error finding conversation:', fallback.error)
          return NextResponse.json({ error: 'Failed to find conversation' }, { status: 500 })
        } else {
          conversation = fallback.data as unknown as ConversationRow
        }
      } else if (error && !isNoRowError(error)) {
        console.error('Error finding conversation:', error)
        return NextResponse.json({ error: 'Failed to find conversation' }, { status: 500 })
      } else {
        conversation = data as unknown as ConversationRow
      }
    }

    if (!conversation) {
      const resolvedContext = trustColumnsAvailable
        ? await resolveDmTrustForNewConversation({
            supabase,
            senderId: userId,
            recipientId,
            recipientProfileId: recipientSide.profileId,
            recipientAccountType: recipientSide.accountType,
            fallback: () => resolveMessageContext(supabase, userId, recipientId),
          })
        : { tier: 'open' as const, context_type: null, context_id: null }

      if (trustColumnsAvailable && resolvedContext.tier === 'request')
        await enforceRequestRateLimit(supabase, userId, recipientId)

      const insertPayload: Record<string, unknown> = {
        participant_1: userId,
        participant_2: recipientId,
      }
      if (accountColumnsAvailable) {
        insertPayload.participant_1_profile_id = senderSide.profileId
        insertPayload.participant_1_account_type = senderSide.accountType
        insertPayload.participant_2_profile_id = recipientSide.profileId
        insertPayload.participant_2_account_type = recipientSide.accountType
      }
      if (trustColumnsAvailable) {
        insertPayload.trust_tier = resolvedContext.tier
        insertPayload.context_type = resolvedContext.context_type
        insertPayload.context_id = resolvedContext.context_id
        insertPayload.accepted_at = resolvedContext.tier === 'request' ? null : new Date().toISOString()
        insertPayload.accepted_by = resolvedContext.tier === 'request' ? null : userId
      }

      const selectCols = accountColumnsAvailable && trustColumnsAvailable
        ? trustSelect
        : trustColumnsAvailable
          ? 'id, participant_1, participant_2, trust_tier, accepted_at, context_type, context_id'
          : baseSelect

      const { data: newConversation, error: createError } = await supabase
        .from('conversations')
        .insert(insertPayload)
        .select(selectCols)
        .single()

      if (createError || !newConversation) {
        // Unique race: another request created the row first.
        if (createError?.code === '23505') {
          const raced = await supabase
            .from('conversations')
            .select(selectCols)
            .or(conversationPairFilter)
            .maybeSingle()
          if (raced.data) conversation = raced.data as unknown as ConversationRow
        }

        if (!conversation) {
          console.error('Error creating conversation:', createError)
          return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 })
        }
      } else {
        conversation = newConversation as unknown as ConversationRow
      }
    }

    if (!conversation) {
      return NextResponse.json({ error: 'Failed to find or create conversation' }, { status: 500 })
    }

    const isParticipant = conversation.participant_1 === userId || conversation.participant_2 === userId
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
        if (firstSenderId !== userId) {
          return NextResponse.json({ error: 'Accept this request before replying' }, { status: 403 })
        }

        return NextResponse.json({ error: 'Only one intro message is allowed until accepted' }, { status: 403 })
      }
    }

    const messageInsertBase = {
      conversation_id: conversation.id,
      sender_id: userId,
      content: messageContent || '(attachment)',
    }
    const attachmentUrls = attachments.map((item) => item.url)
    const messageInsertCandidates = attachments.length > 0
      ? [
          { ...messageInsertBase, attachments },
          { ...messageInsertBase, attachment_urls: attachmentUrls },
          messageInsertBase,
        ]
      : [messageInsertBase]

    let message: Record<string, unknown> | null = null
    let messageError: { code?: string; message?: string } | null = null
    for (const candidate of messageInsertCandidates) {
      const result = await supabase
        .from('messages')
        .insert(candidate)
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
      message = result.data
      messageError = result.error
      if (!messageError && message) break
      if (messageError && !isMissingColumnError(messageError)) break
    }

    if (messageError || !message) {
      console.error('Error sending message:', messageError)
      return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
    }

    const messageId = String(message.id)

    // Update conversation's last message
    await supabase
      .from('conversations')
      .update({
        last_message_id: messageId,
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
