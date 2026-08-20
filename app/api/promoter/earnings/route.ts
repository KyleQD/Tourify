import { NextRequest, NextResponse } from 'next/server'

import { requireApiUser } from '@/lib/api/route-helpers'
import { resolveEventPromoterFlags } from '@/lib/promoter-network/feature-flags'

export async function GET(request: NextRequest) {
  const auth = await requireApiUser(request)
  if (!auth.success) return auth.response

  const { supabase } = auth.auth
  const flags = await resolveEventPromoterFlags(supabase)
  if (!flags.event_promoter_program_enabled) {
    return NextResponse.json({
      enabled: false,
      data: { summary: {}, programs: [], ledger_entries: [], payout_setup: { enabled: false } },
    })
  }

  const { data, error } = await supabase.rpc('get_my_event_promoter_earnings_dashboard')
  if (error || !data) {
    console.error('[promoter earnings] read model unavailable', error)
    return NextResponse.json({ error: 'Promoter earnings are temporarily unavailable.' }, { status: 503 })
  }

  return NextResponse.json({
    enabled: true,
    data: {
      ...(data as Record<string, unknown>),
      payout_setup: {
        enabled: flags.event_promoter_payouts_enabled,
        status: flags.event_promoter_payouts_enabled ? 'coming_from_payout_adapter' : 'not_available',
      },
    },
  })
}
