import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { OptimizedNotificationService } from '@/lib/services/optimized-notification-service'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: siteMapId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const body = await request.json()
    const { userId, email, permissions = 'view' } = body

    if (!userId && !email) {
      return NextResponse.json({ error: 'userId or email is required' }, { status: 400 })
    }

    // Verify the requester owns the map or has admin collaborator access
    const { data: siteMap } = await supabase
      .from('site_maps')
      .select('id, created_by, name')
      .eq('id', siteMapId)
      .single()

    if (!siteMap) {
      return NextResponse.json({ error: 'Site map not found' }, { status: 404 })
    }

    if (siteMap.created_by !== user.id) {
      const { data: requesterCollab } = await supabase
        .from('site_map_collaborators')
        .select('can_invite_users')
        .eq('site_map_id', siteMapId)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single()

      if (!requesterCollab?.can_invite_users) {
        return NextResponse.json({ error: 'You do not have permission to share this map' }, { status: 403 })
      }
    }

    // Resolve the target user
    let targetUserId = userId
    if (!targetUserId && email) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .single()

      if (!profile) {
        return NextResponse.json({ error: 'User not found with that email' }, { status: 404 })
      }
      targetUserId = profile.id
    }

    if (targetUserId === user.id) {
      return NextResponse.json({ error: 'Cannot share with yourself' }, { status: 400 })
    }

    // Map permission levels to granular booleans
    const permMap = {
      view: { canEdit: false, canManageTents: false, canManageZones: false, canInviteUsers: false, canExport: true },
      edit: { canEdit: true, canManageTents: true, canManageZones: true, canInviteUsers: false, canExport: true },
      admin: { canEdit: true, canManageTents: true, canManageZones: true, canInviteUsers: true, canExport: true }
    }
    const perms = permMap[permissions as keyof typeof permMap] || permMap.view

    // Upsert the collaborator record
    const { data: collab, error } = await supabase
      .from('site_map_collaborators')
      .upsert({
        site_map_id: siteMapId,
        user_id: targetUserId,
        can_edit: perms.canEdit,
        can_manage_tents: perms.canManageTents,
        can_manage_zones: perms.canManageZones,
        can_invite_users: perms.canInviteUsers,
        can_export: perms.canExport,
        is_active: true,
        invited_by: user.id,
        invited_at: new Date().toISOString()
      }, {
        onConflict: 'site_map_id,user_id'
      })
      .select('*')
      .single()

    if (error) {
      console.error('[Share API] Error:', error)
      return NextResponse.json({ error: 'Failed to share site map', details: error.message }, { status: 500 })
    }

    // Log the activity
    try {
      await supabase.from('site_map_activity_log').insert({
        site_map_id: siteMapId,
        user_id: user.id,
        action: 'SHARE',
        entity_type: 'collaborator',
        entity_id: targetUserId,
        new_values: { permissions, target_user_id: targetUserId }
      })
    } catch {}

    // Send notification to the target user
    try {
      await OptimizedNotificationService.createNotification({
        userId: targetUserId,
        type: 'site_map_shared',
        title: 'Site Map Shared With You',
        content: `You have been given ${permissions} access to the site map "${siteMap.name}"`,
        relatedUserId: user.id,
        metadata: { siteMapId, siteMapName: siteMap.name, permissions, sharedBy: user.id },
      })
    } catch {}

    return NextResponse.json({ success: true, data: collab })
  } catch (error) {
    console.error('[Share API] Error:', error)
    return NextResponse.json({ success: false, error: 'Failed to share site map' }, { status: 500 })
  }
}
