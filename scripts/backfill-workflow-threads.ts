import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing Supabase env vars')
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

async function backfillEventTasks() {
  const admin = createServiceClient()
  const { data: eventTasks, error: eventTasksError } = await admin
    .from('tasks')
    .select('id, event_id, title, description, assignee_id, status, priority, due_at, labels, created_by, created_at, updated_at')
    .not('event_id', 'is', null)
    .limit(5000)

  if (eventTasksError) throw eventTasksError
  if (!eventTasks || eventTasks.length === 0) return { taskCount: 0, threadCount: 0 }

  const uniqueEventIds = Array.from(new Set(eventTasks.map((task) => task.event_id).filter(Boolean)))
  let createdThreads = 0
  for (const eventId of uniqueEventIds) {
    const { data: existing } = await admin
      .from('workflow_threads')
      .select('id')
      .eq('scope_type', 'event')
      .eq('scope_id', eventId)
      .maybeSingle()
    if (existing) continue
    const { error } = await admin.from('workflow_threads').insert({
      scope_type: 'event',
      scope_id: eventId,
      title: 'Event workflow',
      status: 'active',
    })
    if (!error) createdThreads += 1
  }

  const { data: threads, error: threadsError } = await admin
    .from('workflow_threads')
    .select('id, scope_id')
    .eq('scope_type', 'event')
    .in('scope_id', uniqueEventIds)

  if (threadsError) throw threadsError

  const threadByEvent = new Map((threads || []).map((thread) => [thread.scope_id, thread.id]))
  const payload = eventTasks
    .map((task) => {
      const threadId = threadByEvent.get(task.event_id)
      if (!threadId) return null
      return {
        thread_id: threadId,
        title: task.title,
        description: task.description,
        assignee_id: task.assignee_id,
        status: task.status,
        priority: task.priority,
        due_at: task.due_at,
        labels: task.labels || [],
        created_by: task.created_by,
        created_at: task.created_at,
        updated_at: task.updated_at,
        metadata: { source_task_id: task.id, backfilled: true },
      }
    })
    .filter(Boolean)

  if (payload.length > 0) {
    const { error: insertError } = await admin.from('workflow_tasks').insert(payload as any[])
    if (insertError) throw insertError
  }

  return { taskCount: payload.length, threadCount: uniqueEventIds.length, createdThreads }
}

async function backfillConversations() {
  const admin = createServiceClient()
  const { data: conversations, error: conversationsError } = await admin
    .from('conversations')
    .select('id, participant_1, participant_2')
    .limit(1000)
  if (conversationsError) throw conversationsError
  if (!conversations || conversations.length === 0) return { imported: 0 }

  let imported = 0
  for (const conversation of conversations) {
    const scopeId = crypto.randomUUID()
    const { data: thread, error: threadError } = await admin
      .from('workflow_threads')
      .insert({
        scope_type: 'tour',
        scope_id: scopeId,
        title: 'Backfilled conversation thread',
        status: 'archived',
      })
      .select('id')
      .single()

    if (threadError || !thread) continue

    await admin.from('workflow_participants').insert([
      {
        thread_id: thread.id,
        user_id: conversation.participant_1,
        role: 'member',
        permissions: ['messages.write'],
        status: 'active',
      },
      {
        thread_id: thread.id,
        user_id: conversation.participant_2,
        role: 'member',
        permissions: ['messages.write'],
        status: 'active',
      },
    ])

    const { data: messages } = await admin
      .from('messages')
      .select('id, sender_id, content, created_at')
      .eq('conversation_id', conversation.id)
      .order('created_at', { ascending: true })

    if ((messages || []).length > 0) {
      await admin.from('workflow_messages').insert(
        (messages || []).map((message) => ({
          thread_id: thread.id,
          sender_id: message.sender_id,
          message_type: 'text',
          body: message.content,
          metadata: { source_conversation_id: conversation.id, source_message_id: message.id, backfilled: true },
          created_at: message.created_at,
        }))
      )
    }
    imported += 1
  }

  return { imported }
}

async function main() {
  const tasks = await backfillEventTasks()
  const conversations = await backfillConversations()
  console.log(
    JSON.stringify(
      {
        success: true,
        tasks,
        conversations,
      },
      null,
      2
    )
  )
}

main().catch((error) => {
  console.error('workflow backfill failed', error)
  process.exit(1)
})
