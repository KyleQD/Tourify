import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { hasWorkflowThreadPermission } from '@/lib/workflows/workflow-permissions'

// Create service role client for database operations
function createServiceRoleClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase environment variables for service role')
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

// Helper function to parse auth from cookies (same as social follow)
function parseAuthFromCookies(request: NextRequest): any | null {
  try {
    const cookies = request.headers.get('cookie') || ''
    const cookieArray = cookies.split(';').map(c => c.trim())
    
    const authCookie = cookieArray.find(cookie => 
      cookie.startsWith('sb-tourify-auth-token=')
    )
    
    if (!authCookie) {
      return null
    }

    const token = authCookie.split('=')[1]
    if (!token) {
      return null
    }

    const sessionData = JSON.parse(decodeURIComponent(token))
    
    if (sessionData?.user) {
      return sessionData.user
    }
    
    return null
  } catch (error) {
    console.error('Error parsing auth cookie:', error)
    return null
  }
}

// GET - Fetch conversations for the current user
export async function GET(request: NextRequest) {
  try {
    const user = parseAuthFromCookies(request)
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createServiceRoleClient()
    const { searchParams } = new URL(request.url)
    const conversationId = searchParams.get('conversationId')
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
      // Fetch messages for a specific conversation
      const { data: messages, error } = await supabase
        .from('messages')
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
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })

      if (error) {
        console.error('Error fetching messages:', error)
        return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
      }

      return NextResponse.json({ messages })
    } else {
      // Fetch all conversations for the user
      const { data: conversations, error } = await supabase
        .from('conversations')
        .select(`
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
        `)
        .or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`)
        .order('updated_at', { ascending: false })

      if (error) {
        console.error('Error fetching conversations:', error)
        return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 })
      }

      return NextResponse.json({ conversations })
    }
  } catch (error) {
    console.error('Messages API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Send a new message
export async function POST(request: NextRequest) {
  try {
    const user = parseAuthFromCookies(request)
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createServiceRoleClient()
    const { recipientId, content, threadId, messageType, metadata } = await request.json()

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

    if (!recipientId || !content?.trim()) {
      return NextResponse.json({ 
        error: 'Recipient ID and message content are required' 
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
      .select('id')
      .or(`and(participant_1.eq.${user.id},participant_2.eq.${recipientId}),and(participant_1.eq.${recipientId},participant_2.eq.${user.id})`)
      .single()

    if (conversationError && conversationError.code === 'PGRST116') {
      // Conversation doesn't exist, create it
      const { data: newConversation, error: createError } = await supabase
        .from('conversations')
        .insert({
          participant_1: user.id,
          participant_2: recipientId
        })
        .select('id')
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

    // Create the message
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversation.id,
        sender_id: user.id,
        content: content.trim()
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
    console.error('Send message API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 