import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'
import { resolveEventPromoterFlags } from '@/lib/promoter-network/feature-flags'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const flags = await resolveEventPromoterFlags(supabase)
  if (!flags.event_promoter_payouts_enabled)
    return NextResponse.json({ error: 'Promoter payouts are not enabled.' }, { status: 404 })

  const { data, error } = await supabase.rpc('get_my_event_promoter_payouts')
  if (error) {
    console.error('[promoter payouts] unavailable', error)
    return NextResponse.json({ error: 'Promoter payouts are temporarily unavailable.' }, { status: 503 })
  }
  return NextResponse.json({ data: data || [] })
}
