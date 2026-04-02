import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/auth/api-auth'

export const GET = withAdminAuth(async (request: NextRequest, { supabase, user }) => {
  try {
    const { pathname } = new URL(request.url)
    const parts = pathname.split('/')
    const idIndex = parts.findIndex(p => p === 'events') + 1
    const eventId = parts[idIndex]
    const isEntityRbacEnabled = process.env.FEATURE_ENTITY_RBAC === '1'

    if (isEntityRbacEnabled && eventId && user?.id) {
      // Allow if user can edit logistics OR has any active role on this event
      const { data: canEdit, error: permErr } = await supabase.rpc('has_entity_permission', {
        p_user_id: user.id,
        p_entity_type: 'Event',
        p_entity_id: eventId,
        p_permission_name: 'EDIT_EVENT_LOGISTICS'
      })
      if (permErr) return NextResponse.json({ error: permErr.message }, { status: 400 })

      if (!canEdit) {
        const { data: hasRole, error: roleErr } = await supabase
          .from('rbac_user_entity_roles')
          .select('id')
          .eq('user_id', user.id)
          .eq('entity_type', 'Event')
          .eq('entity_id', eventId)
          .eq('is_active', true)
          .limit(1)
          .maybeSingle()
        if (roleErr) return NextResponse.json({ error: roleErr.message }, { status: 400 })
        if (!hasRole) return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
      }
    }

    const { data, error } = await supabase
      .from('event_vendor_requests')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ success: true, requests: data ?? [] })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Invalid request' }, { status: 400 })
  }
})


