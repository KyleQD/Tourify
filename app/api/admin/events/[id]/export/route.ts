import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/auth/api-auth'
import {
  assertAdminEventAccess,
} from "@/lib/admin/admin-tour-event-access"
import { resolveDoorsOpenTime } from '@/lib/admin/calendar/ics'

export const GET = withAdminAuth(async (request: NextRequest, { supabase, user }) => {
  // Extract event ID from URL path
  const url = new URL(request.url)
  const segments = url.pathname.split('/')
  const idIndex = segments.indexOf('events') + 1
  const id = segments[idIndex]
  const format = url.searchParams.get('format') || 'csv'

  if (!id) return NextResponse.json({ error: 'Missing event id' }, { status: 400 })
    await assertAdminEventAccess({ supabase, userId: user.id, eventId: id })

  // Fetch event data
  const { data: event } = await supabase
    .from('events_v2')
    .select('id, title, status, start_at, end_at, capacity, settings')
    .eq('id', id)
    .maybeSingle()

  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 })

  const settings = (event.settings || {}) as Record<string, any>
  const title = event.title || 'Event'
  const venueLabel = settings.venue_label || 'Venue TBD'
  const startAt = event.start_at ? new Date(event.start_at) : new Date()

  // ─── CSV: attendee list ────────────────────────────────────────────────────
  if (format === 'csv') {
    const { data: sales } = await supabase
      .from('ticket_sales')
      .select('buyer_name, buyer_email, quantity, unit_price, total_amount, payment_status, created_at, ticket_types(name)')
      .eq('event_id', id)
      .order('created_at', { ascending: false })

    const rows = (sales || []).map((s: any) => {
      const tierName = s.ticket_types?.name || 'General'
      return [
        `"${(s.buyer_name || '').replace(/"/g, '""')}"`,
        `"${(s.buyer_email || '').replace(/"/g, '""')}"`,
        `"${tierName.replace(/"/g, '""')}"`,
        s.quantity,
        s.unit_price,
        s.total_amount,
        s.payment_status,
        s.created_at,
      ].join(',')
    })

    const csv = [
      'Buyer Name,Email,Ticket Type,Quantity,Unit Price,Total Amount,Status,Purchased At',
      ...rows,
    ].join('\n')

    const filename = `${title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-attendees.csv`
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  }

  // ─── iCal: RFC 5545 calendar feed ────────────────────────────────────────
  if (format === 'ical') {
    const formatICalDate = (d: Date) =>
      d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')

    const endAt = event.end_at ? new Date(event.end_at) : new Date(startAt.getTime() + 2 * 60 * 60 * 1000)
    const loadInTime = settings.load_in_time
      ? new Date(`${startAt.toISOString().slice(0, 10)}T${settings.load_in_time}:00Z`)
      : null
    const soundCheckTime = settings.sound_check_time
      ? new Date(`${startAt.toISOString().slice(0, 10)}T${settings.sound_check_time}:00Z`)
      : null
    const doorsOpen = resolveDoorsOpenTime(settings)
    const doorsTime = doorsOpen
      ? new Date(`${startAt.toISOString().slice(0, 10)}T${doorsOpen}:00Z`)
      : null

    const vevents: string[] = []

    // Main show event
    vevents.push(
      'BEGIN:VEVENT',
      `UID:${id}-show@tourify`,
      `DTSTART:${formatICalDate(startAt)}`,
      `DTEND:${formatICalDate(endAt)}`,
      `SUMMARY:${title}`,
      `LOCATION:${venueLabel}`,
      `DESCRIPTION:${event.status} • Capacity: ${event.capacity || 0}`,
      'END:VEVENT',
    )

    if (loadInTime) {
      vevents.push(
        'BEGIN:VEVENT',
        `UID:${id}-load-in@tourify`,
        `DTSTART:${formatICalDate(loadInTime)}`,
        `DTEND:${formatICalDate(new Date(loadInTime.getTime() + 60 * 60 * 1000))}`,
        `SUMMARY:Load In — ${title}`,
        `LOCATION:${venueLabel}`,
        'END:VEVENT',
      )
    }

    if (soundCheckTime) {
      vevents.push(
        'BEGIN:VEVENT',
        `UID:${id}-soundcheck@tourify`,
        `DTSTART:${formatICalDate(soundCheckTime)}`,
        `DTEND:${formatICalDate(new Date(soundCheckTime.getTime() + 60 * 60 * 1000))}`,
        `SUMMARY:Sound Check — ${title}`,
        `LOCATION:${venueLabel}`,
        'END:VEVENT',
      )
    }

    if (doorsTime) {
      vevents.push(
        'BEGIN:VEVENT',
        `UID:${id}-doors@tourify`,
        `DTSTART:${formatICalDate(doorsTime)}`,
        `DTEND:${formatICalDate(new Date(doorsTime.getTime() + 30 * 60 * 1000))}`,
        `SUMMARY:Doors Open — ${title}`,
        `LOCATION:${venueLabel}`,
        'END:VEVENT',
      )
    }

    const ical = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Tourify//Event Calendar//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      ...vevents,
      'END:VCALENDAR',
    ].join('\r\n')

    const filename = `${title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.ics`
    return new NextResponse(ical, {
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  }

  // ─── PDF: basic HTML-to-text summary (no PDF lib dependency) ──────────────
  if (format === 'pdf') {
    const { data: tasks } = await supabase
      .from('tasks')
      .select('title, status, priority, due_date')
      .eq('event_id', id)
      .order('priority', { ascending: false })
      .limit(50)

    const { data: staff } = await supabase
      .from('staff_shifts')
      .select('staff_members(full_name, role)')
      .eq('event_id', id)
      .limit(50)

    const { data: sales } = await supabase
      .from('ticket_sales')
      .select('quantity, total_amount')
      .eq('event_id', id)
      .eq('payment_status', 'completed')

    const totalSold = (sales || []).reduce((s: number, r: any) => s + (r.quantity || 0), 0)
    const totalRevenue = (sales || []).reduce((s: number, r: any) => s + (Number(r.total_amount) || 0), 0)

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${title} — Event Report</title>
<style>
  body { font-family: Arial, sans-serif; max-width: 800px; margin: 40px auto; color: #1a1a1a; }
  h1 { color: #7c3aed; border-bottom: 2px solid #7c3aed; padding-bottom: 8px; }
  h2 { color: #374151; margin-top: 24px; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  th { background: #f3f4f6; padding: 8px 12px; text-align: left; font-size: 13px; }
  td { padding: 8px 12px; border-bottom: 1px solid #e5e7eb; font-size: 13px; }
  .stat { display: inline-block; margin: 8px 16px 8px 0; }
  .stat-value { font-size: 24px; font-weight: bold; color: #7c3aed; }
  .stat-label { font-size: 12px; color: #6b7280; }
</style>
</head>
<body>
<h1>${title}</h1>
<p><strong>Venue:</strong> ${venueLabel} &nbsp;|&nbsp; <strong>Date:</strong> ${startAt.toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' })} &nbsp;|&nbsp; <strong>Status:</strong> ${event.status}</p>
<h2>Attendance Summary</h2>
<div>
  <div class="stat"><div class="stat-value">${totalSold}</div><div class="stat-label">Tickets Sold</div></div>
  <div class="stat"><div class="stat-value">${event.capacity || '—'}</div><div class="stat-label">Capacity</div></div>
  <div class="stat"><div class="stat-value">$${totalRevenue.toLocaleString('en-US', { minimumFractionDigits:2 })}</div><div class="stat-label">Revenue</div></div>
</div>
${(tasks || []).length > 0 ? `
<h2>Tasks (${tasks!.length})</h2>
<table>
<tr><th>Task</th><th>Status</th><th>Priority</th><th>Due</th></tr>
${tasks!.map((t: any) => `<tr><td>${t.title}</td><td>${t.status}</td><td>${t.priority}</td><td>${t.due_date ? new Date(t.due_date).toLocaleDateString() : '—'}</td></tr>`).join('')}
</table>
` : ''}
${(staff || []).length > 0 ? `
<h2>Staff (${staff!.length})</h2>
<table>
<tr><th>Name</th><th>Role</th></tr>
${staff!.map((s: any) => `<tr><td>${s.staff_members?.full_name || '—'}</td><td>${s.staff_members?.role || '—'}</td></tr>`).join('')}
</table>
` : ''}
<p style="margin-top:40px;color:#9ca3af;font-size:12px">Generated by Tourify • ${new Date().toLocaleString()}</p>
</body></html>`

    const filename = `${title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-report.html`
    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  }

  return NextResponse.json({ error: 'Invalid format. Use: csv, ical, pdf' }, { status: 400 })
})
