import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { canManageHiring } from '@/lib/auth/hiring-permissions'
import { createHiringServiceClient } from '@/lib/supabase/hiring-service-client'
import type { HiringEntity } from '@/types/hiring-entity'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user)
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })

    const { id: applicationId } = await context.params
    if (!applicationId)
      return NextResponse.json({ success: false, error: 'Application ID is required' }, { status: 400 })

    const serviceSupabase = createHiringServiceClient()
    const { data: application, error: applicationError } = await serviceSupabase
      .from('job_applications')
      .select('id, employer_entity_type, employer_entity_id, venue_id')
      .eq('id', applicationId)
      .maybeSingle()

    if (applicationError) throw applicationError
    if (!application) {
      return NextResponse.json({ success: false, error: 'Application not found' }, { status: 404 })
    }

    const employer: HiringEntity = {
      entityType: application.employer_entity_type || 'venue',
      entityId: application.employer_entity_id || application.venue_id,
      displayName: 'Application employer',
      scope: application.venue_id ? { venueId: application.venue_id } : undefined,
    }

    if (!employer.entityId) {
      return NextResponse.json({ success: false, error: 'Application employer scope is missing' }, { status: 409 })
    }

    const permission = await canManageHiring({ supabase: serviceSupabase, userId: user.id, employer })
    if (!permission.ok || !permission.data.allowed) {
      return NextResponse.json(
        { success: false, error: permission.ok ? permission.data.reason || 'Forbidden' : permission.error.message },
        { status: permission.ok ? 403 : 500 }
      )
    }

    const { data: auditRows, error: auditError } = await supabase
      .from('hiring_audit_events')
      .select('id, action, from_status, to_status, title, content, metadata, created_at')
      .eq('application_id', applicationId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (!auditError) {
      const normalized = (auditRows || []).map((row: any) => ({
        id: row.id,
        type: 'hiring_audit_event',
        title: row.title || `Status changed: ${row.from_status} -> ${row.to_status}`,
        content: row.content || null,
        metadata: {
          action: row.action,
          from_status: row.from_status,
          to_status: row.to_status,
          ...(row.metadata || {}),
        },
        created_at: row.created_at,
      }))

      return NextResponse.json({
        success: true,
        data: normalized,
      })
    }

    const { data: fallbackEvents, error: fallbackError } = await supabase
      .from('notifications')
      .select('id, type, title, content, metadata, created_at')
      .in('type', ['hiring_status_transition', 'artist_application_status_transition'])
      .eq('metadata->>application_id', applicationId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (fallbackError) throw fallbackError

    return NextResponse.json({
      success: true,
      data: fallbackEvents || [],
    })
  } catch (error) {
    console.error('❌ [Applications Audit API] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load audit events',
      },
      { status: 500 }
    )
  }
}
