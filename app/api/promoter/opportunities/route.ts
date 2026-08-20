import { NextRequest, NextResponse } from 'next/server'

import { requireApiUser } from '@/lib/api/route-helpers'
import { resolveEventPromoterFlags } from '@/lib/promoter-network/feature-flags'

export async function GET(request: NextRequest) {
  const auth = await requireApiUser(request)
  if (!auth.success) return auth.response

  const { supabase, user } = auth.auth
  const flags = await resolveEventPromoterFlags(supabase)
  if (!flags.event_promoter_applications_enabled) {
    return NextResponse.json({ data: [], enabled: false })
  }

  const [programsResult, applicationsResult, membershipsResult] = await Promise.all([
    supabase
      .from('event_promotion_programs')
      .select('id, event_id, status, application_mode, commission_type, commission_rate_bps, commission_fixed_amount_minor, currency, attribution_window_days, starts_at, ends_at, terms_markdown, events_v2:event_id(title, start_at, venue_id)')
      .eq('status', 'open')
      .order('created_at', { ascending: false }),
    supabase
      .from('event_promoter_applications')
      .select('id, program_id, status, source, created_at')
      .eq('user_id', user.id),
    supabase
      .from('event_promoter_memberships')
      .select('id, program_id, status, created_at')
      .eq('user_id', user.id),
  ])

  if (programsResult.error) return NextResponse.json({ error: 'Unable to load promoter opportunities.' }, { status: 503 })
  const applications = new Map((applicationsResult.data || []).map((item: any) => [item.program_id, item]))
  const memberships = new Map((membershipsResult.data || []).map((item: any) => [item.program_id, item]))
  const data = (programsResult.data || []).map((program: any) => ({
    ...program,
    application: applications.get(program.id) || null,
    membership: memberships.get(program.id) || null,
  }))
  return NextResponse.json({ data, enabled: true })
}
