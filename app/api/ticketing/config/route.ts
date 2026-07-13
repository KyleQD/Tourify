import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { authenticateApiRequest } from '@/lib/auth/api-auth'
import { hasTicketingPermission } from '@/lib/ticketing/permissions'
import { emitTicketAnalyticsEvent } from '@/lib/ticketing/analytics'

const configSchema = z.object({
  event_id: z.string().uuid(),
  ticketing_enabled: z.boolean().optional(),
  ticketing_owner_type: z.enum(['organization', 'venue', 'artist', 'admin', 'user']).optional(),
  ticketing_owner_id: z.string().uuid().nullable().optional(),
  sales_visibility: z.enum(['public', 'private', 'invite_only', 'unlisted']).optional(),
  sale_start: z.string().nullable().optional(),
  sale_end: z.string().nullable().optional(),
  capacity: z.number().int().nullable().optional(),
  max_per_order: z.number().int().nullable().optional(),
  max_per_user: z.number().int().nullable().optional(),
  currency: z.string().optional(),
  platform_fee_type: z.enum(['flat_per_ticket', 'percentage', 'flat_per_order', 'none']).optional(),
  platform_fee_amount: z.number().min(0).optional(),
  processing_fee_passthrough: z.boolean().optional(),
  tax_enabled: z.boolean().optional(),
  tax_rate: z.number().min(0).optional(),
  refund_policy: z.string().optional(),
  transfer_policy: z.string().optional(),
  resale_enabled: z.boolean().optional(),
  checkin_window_start: z.string().nullable().optional(),
  checkin_window_end: z.string().nullable().optional(),
  box_office_enabled: z.boolean().optional(),
  terms_text: z.string().nullable().optional(),
  payout_destination_account_id: z.string().nullable().optional(),
  stripe_connect_account_id: z.string().nullable().optional(),
  metadata: z.record(z.any()).optional(),
})

const grantSchema = z.object({
  event_id: z.string().uuid(),
  user_id: z.string().uuid(),
  permission: z.string(),
})

export async function GET(request: NextRequest) {
  const auth = await authenticateApiRequest(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const eventId = new URL(request.url).searchParams.get('event_id')
  if (!eventId) return NextResponse.json({ error: 'event_id required' }, { status: 400 })

  const supabase = await createClient()
  const allowed = await hasTicketingPermission({
    supabase,
    userId: auth.user.id,
    eventId,
    permission: 'view_overview',
  })
  if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const [{ data: config }, { data: grants }] = await Promise.all([
    supabase.from('event_ticketing_config').select('*').eq('event_id', eventId).maybeSingle(),
    supabase.from('event_ticketing_grants').select('*').eq('event_id', eventId),
  ])

  return NextResponse.json({ config, grants: grants || [] })
}

export async function POST(request: NextRequest) {
  const auth = await authenticateApiRequest(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const action = body.action || 'upsert_config'
  const supabase = await createClient()

  if (action === 'upsert_config') {
    const parsed = configSchema.parse(body)
    const allowed = await hasTicketingPermission({
      supabase,
      userId: auth.user.id,
      eventId: parsed.event_id,
      permission: 'manage_ticket_types',
    })
    if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { event_id, ...rest } = parsed
    const { data, error } = await supabase
      .from('event_ticketing_config')
      .upsert({
        event_id,
        ...rest,
        created_by: auth.user.id,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'event_id' })
      .select('*')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    if (rest.ticketing_enabled) {
      await emitTicketAnalyticsEvent({
        supabase,
        eventName: 'ticket_sales_published',
        eventId: event_id,
        actorUserId: auth.user.id,
      })
    }

    return NextResponse.json({ config: data })
  }

  if (action === 'grant') {
    const parsed = grantSchema.parse(body)
    const allowed = await hasTicketingPermission({
      supabase,
      userId: auth.user.id,
      eventId: parsed.event_id,
      permission: 'manage_grants',
    })
    if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { data, error } = await supabase
      .from('event_ticketing_grants')
      .upsert({
        event_id: parsed.event_id,
        user_id: parsed.user_id,
        permission: parsed.permission,
        granted_by: auth.user.id,
      }, { onConflict: 'event_id,user_id,permission' })
      .select('*')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ grant: data })
  }

  if (action === 'revoke_grant') {
    const parsed = grantSchema.parse(body)
    const allowed = await hasTicketingPermission({
      supabase,
      userId: auth.user.id,
      eventId: parsed.event_id,
      permission: 'manage_grants',
    })
    if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    await supabase
      .from('event_ticketing_grants')
      .delete()
      .eq('event_id', parsed.event_id)
      .eq('user_id', parsed.user_id)
      .eq('permission', parsed.permission)

    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
