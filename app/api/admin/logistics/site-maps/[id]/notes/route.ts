import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSiteMapAccess, requireSiteMapAccess, siteMapError, siteMapSuccess } from '@/lib/site-map/access'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: siteMapId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return siteMapError('Unauthorized', 401)

    const access = await getSiteMapAccess(supabase, siteMapId, user.id)
    const accessCheck = requireSiteMapAccess(access, 'read')
    if (!accessCheck.ok) return siteMapError(accessCheck.error, accessCheck.status)

    // Use activity_log as notes store (entity_type = 'note')
    const { data, error } = await supabase
      .from('site_map_activity_log')
      .select(`
        id, site_map_id, user_id, action, entity_type, entity_id,
        old_values, new_values, created_at,
        user:profiles!site_map_activity_log_user_id_fkey(id, username, full_name, avatar_url)
      `)
      .eq('site_map_id', siteMapId)
      .in('entity_type', ['note', 'issue', 'status_change'])
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) {
      console.error('[Notes API] Error:', error)
      return siteMapError(error.message)
    }

    return siteMapSuccess(data || [])
  } catch (error) {
    return siteMapError('Failed to fetch notes')
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: siteMapId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return siteMapError('Unauthorized', 401)

    const access = await getSiteMapAccess(supabase, siteMapId, user.id)
    const accessCheck = requireSiteMapAccess(access, 'comment')
    if (!accessCheck.ok) return siteMapError(accessCheck.error, accessCheck.status)

    const body = await request.json()
    const {
      content,
      x,
      y,
      elementId,
      noteType = 'general',
      parentNoteId,
      priority = 'normal',
      convertedTaskId = null,
    } = body

    if (!content?.trim()) {
      return siteMapError('Content is required', 400)
    }

    const { data, error } = await supabase
      .from('site_map_activity_log')
      .insert({
        site_map_id: siteMapId,
        user_id: user.id,
        action: 'NOTE',
        entity_type: 'note',
        entity_id: elementId || null,
        new_values: {
          content,
          x: x ?? 0,
          y: y ?? 0,
          note_type: noteType,
          priority,
          parent_note_id: parentNoteId || null,
          converted_task_id: convertedTaskId,
          resolved_at: null,
          resolved_by: null,
          is_resolved: false
        }
      })
      .select(`
        id, site_map_id, user_id, action, entity_type, entity_id,
        new_values, created_at,
        user:profiles!site_map_activity_log_user_id_fkey(id, username, full_name, avatar_url)
      `)
      .single()

    if (error) {
      console.error('[Notes API] Insert error:', error)
      return siteMapError(error.message)
    }

    return siteMapSuccess(data)
  } catch (error) {
    return siteMapError('Failed to create note')
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: siteMapId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return siteMapError('Unauthorized', 401)

    const access = await getSiteMapAccess(supabase, siteMapId, user.id)
    const accessCheck = requireSiteMapAccess(access, 'comment')
    if (!accessCheck.ok) return siteMapError(accessCheck.error, accessCheck.status)

    const body = await request.json()
    const noteId = body.noteId || body.id
    if (!noteId) return siteMapError('noteId is required', 400)

    const { data: existingNote, error: fetchError } = await supabase
      .from('site_map_activity_log')
      .select('id, new_values')
      .eq('id', noteId)
      .eq('site_map_id', siteMapId)
      .eq('entity_type', 'note')
      .single()

    if (fetchError || !existingNote) return siteMapError('Note not found', 404)

    const nextValues = {
      ...(existingNote.new_values || {}),
    }

    if (body.content !== undefined) nextValues.content = body.content
    if (body.noteType !== undefined) nextValues.note_type = body.noteType
    if (body.priority !== undefined) nextValues.priority = body.priority
    if (body.parentNoteId !== undefined) nextValues.parent_note_id = body.parentNoteId || null
    if (body.convertedTaskId !== undefined) nextValues.converted_task_id = body.convertedTaskId || null

    if (body.action === 'resolve' || body.isResolved === true) {
      nextValues.is_resolved = true
      nextValues.resolved_at = new Date().toISOString()
      nextValues.resolved_by = user.id
    }

    if (body.action === 'reopen' || body.isResolved === false) {
      nextValues.is_resolved = false
      nextValues.resolved_at = null
      nextValues.resolved_by = null
    }

    const { data, error } = await supabase
      .from('site_map_activity_log')
      .update({ new_values: nextValues })
      .eq('id', noteId)
      .eq('site_map_id', siteMapId)
      .select(`
        id, site_map_id, user_id, action, entity_type, entity_id,
        old_values, new_values, created_at,
        user:profiles!site_map_activity_log_user_id_fkey(id, username, full_name, avatar_url)
      `)
      .single()

    if (error) return siteMapError(error.message)

    return siteMapSuccess(data)
  } catch (error) {
    console.error('[Notes API] PATCH error:', error)
    return siteMapError('Failed to update note')
  }
}
