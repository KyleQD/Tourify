import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/auth/api-auth'

export const GET = withAdminAuth(async (request: NextRequest, { user, supabase }) => {
  const { searchParams } = new URL(request.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  // Resolve org to scope the export to the calling user's data only
  const { data: orgMember } = await supabase
    .from('org_members')
    .select('org_id')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle()
  const orgId = orgMember?.org_id

  // Fetch financial transactions for CSV export
  let txQuery = supabase
    .from('financial_transactions')
    .select('id, type, amount, description, event_id, created_at')
    .order('created_at', { ascending: false })
    .limit(1000)

  if (orgId) txQuery = txQuery.eq('org_id', orgId)
  if (from) txQuery = txQuery.gte('created_at', `${from}T00:00:00Z`)
  if (to) txQuery = txQuery.lte('created_at', `${to}T23:59:59Z`)

  const { data: transactions } = await txQuery

  // Fetch event stats
  let eventsQuery = supabase
    .from('events_v2')
    .select('id, title, start_at, venue_name, status, capacity')
    .order('start_at', { ascending: false })
    .limit(500)

  if (orgId) eventsQuery = eventsQuery.eq('org_id', orgId)
  if (from) eventsQuery = eventsQuery.gte('start_at', `${from}T00:00:00Z`)
  if (to) eventsQuery = eventsQuery.lte('start_at', `${to}T23:59:59Z`)

  const { data: events } = await eventsQuery

  // Build CSV
  const lines: string[] = []
  lines.push('=== Financial Transactions ===')
  lines.push('Date,Type,Amount,Description,Event ID')
  ;(transactions || []).forEach((tx: any) => {
    lines.push([
      new Date(tx.created_at).toISOString().slice(0, 10),
      tx.type || '',
      tx.amount ?? '',
      `"${(tx.description || '').replace(/"/g, '""')}"`,
      tx.event_id || '',
    ].join(','))
  })

  lines.push('')
  lines.push('=== Events ===')
  lines.push('Date,Name,Venue,Status,Capacity')
  ;(events || []).forEach((e: any) => {
    lines.push([
      e.start_at ? new Date(e.start_at).toISOString().slice(0, 10) : '',
      `"${(e.title || '').replace(/"/g, '""')}"`,
      `"${(e.venue_name || '').replace(/"/g, '""')}"`,
      e.status || '',
      e.capacity ?? '',
    ].join(','))
  })

  const csv = lines.join('\n')

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="analytics-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  })
})
