'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { ChatMessage } from '../types/chat'

const messageSchema = z.object({
  eventId: z.string(),
  content: z.string().min(1, 'Message cannot be empty'),
  type: z.enum(['text', 'file']),
  fileUrl: z.string().optional(),
  fileName: z.string().optional(),
  fileType: z.string().optional(),
})

function mapRowToChatMessage(row: Record<string, unknown>, profile?: Record<string, unknown> | null): ChatMessage {
  return {
    id: String(row.id),
    eventId: String(row.event_id),
    userId: String(row.sender_id),
    content: String(row.content),
    type: 'text',
    createdAt: String(row.created_at || new Date().toISOString()),
    user: {
      id: String(row.sender_id),
      fullName: String(profile?.full_name || profile?.username || 'Team member'),
      avatar: profile?.avatar_url ? String(profile.avatar_url) : undefined,
    },
  }
}

async function getAuthorizedSupabase() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' as const, supabase, user: null }
  return { supabase, user, error: null }
}

export async function sendMessage(data: z.infer<typeof messageSchema>) {
  try {
    const validatedData = messageSchema.parse(data)
    const auth = await getAuthorizedSupabase()
    if (auth.error || !auth.user) return { success: false, error: auth.error || 'Unauthorized' }

    const content = validatedData.type === 'file' && validatedData.fileUrl
      ? `${validatedData.content}\n${validatedData.fileUrl}`
      : validatedData.content

    const { error } = await auth.supabase
      .from('event_team_messages')
      .insert({
        event_id: validatedData.eventId,
        sender_id: auth.user.id,
        content,
      })

    if (error) return { success: false, error: error.message }

    revalidatePath('/venue')
    return { success: true }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: 'Validation failed', details: error.errors }
    }
    return { success: false, error: 'Failed to send message' }
  }
}

export async function uploadChatFile(file: File) {
  try {
    const auth = await getAuthorizedSupabase()
    if (auth.error || !auth.user) return { success: false, error: auth.error || 'Unauthorized' }

    const arrayBuffer = await file.arrayBuffer()
    const fileBytes = new Uint8Array(arrayBuffer)
    const storagePath = `${auth.user.id}/chat/${Date.now()}_${file.name.replace(/[^\w.-]/g, '_')}`

    const { error: uploadErr, data: uploaded } = await auth.supabase.storage
      .from('message-attachments')
      .upload(storagePath, fileBytes, { contentType: file.type, upsert: false })

    if (uploadErr) return { success: false, error: uploadErr.message }

    const { data: publicUrl } = auth.supabase.storage.from('message-attachments').getPublicUrl(uploaded.path)
    return { success: true, url: publicUrl.publicUrl }
  } catch {
    return { success: false, error: 'Failed to upload file' }
  }
}

export async function getChatMessages(eventId: string): Promise<ChatMessage[]> {
  try {
    const auth = await getAuthorizedSupabase()
    if (auth.error || !auth.user) return []

    const { data, error } = await auth.supabase
      .from('event_team_messages')
      .select(`
        id,
        event_id,
        sender_id,
        content,
        created_at,
        profiles:sender_id (
          full_name,
          username,
          avatar_url
        )
      `)
      .eq('event_id', eventId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error('Failed to fetch chat messages:', error)
      return []
    }

    return (data || []).map(row => {
      const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
      return mapRowToChatMessage(row as Record<string, unknown>, profile as Record<string, unknown> | null)
    })
  } catch (error) {
    console.error('Failed to fetch chat messages:', error)
    return []
  }
}
