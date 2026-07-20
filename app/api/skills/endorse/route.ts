import { NextRequest, NextResponse } from 'next/server'
import { authenticateApiRequest } from '@/lib/auth/api-auth'
import { OptimizedNotificationService } from '@/lib/services/optimized-notification-service'

/**
 * Legacy skill endorsement endpoint.
 * Writes to the canonical `endorsements` table (and dual-writes to skill_endorsements when present).
 */
export async function POST(request: NextRequest) {
  const auth = await authenticateApiRequest(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { user, supabase } = auth

  const body = await request.json().catch(() => null)
  const { endorsed_id, skill, level, category, comment, job_id, event_id, collaboration_id, project_id } = body || {}
  if (!endorsed_id || !skill) return NextResponse.json({ error: 'Missing endorsed_id or skill' }, { status: 400 })
  if (endorsed_id === user.id) return NextResponse.json({ error: 'Cannot endorse yourself' }, { status: 400 })

  const hasWorkContext = !!(job_id || event_id || collaboration_id || project_id)

  const { data: endorsement, error } = await supabase
    .from('endorsements')
    .upsert(
      {
        endorser_id: user.id,
        endorsee_id: endorsed_id,
        skill,
        level: Number(level) || 3,
        category: category || null,
        comment: comment || null,
        job_id: job_id || null,
        event_id: event_id || null,
        collaboration_id: collaboration_id || null,
        project_id: project_id || null,
        is_verified: hasWorkContext,
        verified_by: hasWorkContext ? user.id : null,
        verified_at: hasWorkContext ? new Date().toISOString() : null,
        is_active: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'endorser_id,endorsee_id,skill' }
    )
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Best-effort dual-write for legacy readers
  try {
    await supabase.from('skill_endorsements').upsert(
      { endorsed_id, endorser_id: user.id, skill },
      { onConflict: 'endorser_id,endorsed_id,skill' }
    )
  } catch {
    // skill_endorsements may be absent
  }

  try {
    const { data: endorser } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single()

    await OptimizedNotificationService.createNotification({
      userId: endorsed_id,
      type: 'endorsement_received',
      title: `${endorser?.full_name || 'Someone'} endorsed you for ${skill}`,
      content: `${endorser?.full_name || 'Someone'} endorsed you for "${skill}".`,
      summary: 'New endorsement',
      relatedUserId: user.id,
      relatedContentId: endorsement?.id,
      relatedContentType: 'endorsement',
      metadata: {
        link: '/achievements?tab=endorsements',
        endorsement_id: endorsement?.id,
        skill,
        level: Number(level) || 3,
      },
    })
  } catch (notifyError) {
    console.warn('Failed to notify endorsement recipient:', notifyError)
  }

  return NextResponse.json({ success: true, endorsement })
}

export async function DELETE(request: NextRequest) {
  const auth = await authenticateApiRequest(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { user, supabase } = auth
  const { searchParams } = new URL(request.url)
  const endorsed_id = searchParams.get('endorsed_id')
  const skill = searchParams.get('skill')
  if (!endorsed_id || !skill) return NextResponse.json({ error: 'Missing endorsed_id or skill' }, { status: 400 })

  const { error } = await supabase
    .from('endorsements')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('endorser_id', user.id)
    .eq('endorsee_id', endorsed_id)
    .eq('skill', skill)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  try {
    await supabase
      .from('skill_endorsements')
      .delete()
      .eq('endorser_id', user.id)
      .eq('endorsed_id', endorsed_id)
      .eq('skill', skill)
  } catch {
    // optional
  }

  return NextResponse.json({ success: true })
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const endorsed_id = searchParams.get('endorsed_id')
  if (!endorsed_id) return NextResponse.json({ error: 'Missing endorsed_id' }, { status: 400 })

  const auth = await authenticateApiRequest(request)
  const supabase = auth?.supabase || (await (await import('@/lib/supabase/server')).createClient())

  const { data, error } = await supabase
    .from('endorsements')
    .select('endorser_id, skill, level, is_verified, created_at')
    .eq('endorsee_id', endorsed_id)
    .eq('is_active', true)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ endorsements: data })
}
