import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withAuth } from '@/lib/auth/api-auth'
import { createClient } from '@supabase/supabase-js'

function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

const settingsSchema = z.object({
  bulletins_enabled: z.boolean().optional(),
  group_chats_enabled: z.boolean().optional(),
  documents_enabled: z.boolean().optional(),
  site_map_view_roles: z.array(z.string()).optional(),
  document_edit_roles: z.array(z.string()).optional(),
  site_map_edit_roles: z.array(z.string()).optional(),
  bulletin_create_roles: z.array(z.string()).optional(),
  group_chat_create_roles: z.array(z.string()).optional(),
  role_management_roles: z.array(z.string()).optional(),
})

const DEFAULT_SETTINGS = {
  bulletins_enabled: true,
  group_chats_enabled: true,
  documents_enabled: true,
  site_map_view_roles: ['admin', 'manager', 'staff', 'crew', 'vendor'],
  document_edit_roles: ['admin'],
  site_map_edit_roles: ['admin'],
  bulletin_create_roles: ['admin', 'manager'],
  group_chat_create_roles: ['admin', 'manager', 'staff'],
  role_management_roles: ['admin'],
}

export const GET = withAuth(async (request: NextRequest, { user }) => {
  try {
    const eventId = request.nextUrl.pathname.split('/')[5]
    const svc = createServiceClient()

    const { data: eventOwner } = await svc
      .from('events_v2')
      .select('id, settings')
      .eq('id', eventId)
      .eq('created_by', user.id)
      .maybeSingle()

    const { data: participant } = await svc
      .from('event_participants')
      .select('id, role')
      .eq('event_id', eventId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (!participant && !eventOwner) {
      return NextResponse.json({ error: 'Not a member of this event' }, { status: 403 })
    }

    const userRole = eventOwner ? 'admin' : (participant?.role || 'staff')
    const eventSettings = eventOwner?.settings || {}
    const commSettings = eventSettings.communication || DEFAULT_SETTINGS

    return NextResponse.json({
      success: true,
      settings: { ...DEFAULT_SETTINGS, ...commSettings },
      userRole,
      isAdmin: userRole === 'admin',
    })
  } catch (error) {
    console.error('[Event Comm Settings] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})

export const PATCH = withAuth(async (request: NextRequest, { user }) => {
  try {
    const eventId = request.nextUrl.pathname.split('/')[5]
    const svc = createServiceClient()

    const { data: eventOwner } = await svc
      .from('events_v2')
      .select('id, settings')
      .eq('id', eventId)
      .eq('created_by', user.id)
      .maybeSingle()

    if (!eventOwner) {
      return NextResponse.json({ error: 'Only event admin can update communication settings' }, { status: 403 })
    }

    const body = await request.json()
    const validated = settingsSchema.parse(body)

    const currentSettings = eventOwner.settings || {}
    const currentComm = currentSettings.communication || DEFAULT_SETTINGS
    const updatedComm = { ...currentComm, ...validated }

    const { error } = await svc
      .from('events_v2')
      .update({
        settings: { ...currentSettings, communication: updatedComm }
      })
      .eq('id', eventId)

    if (error) {
      console.error('[Event Comm Settings] Update error:', error)
      return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
    }

    return NextResponse.json({ success: true, settings: updatedComm })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 })
    }
    console.error('[Event Comm Settings] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})
