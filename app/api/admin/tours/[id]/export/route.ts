import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/auth/api-auth'

export const GET = withAdminAuth(async (request: NextRequest, { supabase }) => {
  const url = new URL(request.url)
  const segments = url.pathname.split('/')
  const idIndex = segments.indexOf('tours') + 1
  const id = segments[idIndex]
  const format = url.searchParams.get('format') || 'pdf'

  if (!id) return NextResponse.json({ error: 'Missing tour id' }, { status: 400 })

  // Fetch tour data
  const { data: tour } = await supabase
    .from('tours')
    .select('id, name, description, start_date, end_date, status, genre, main_artist, cover_image_url')
    .eq('id', id)
    .maybeSingle()

  if (!tour) return NextResponse.json({ error: 'Tour not found' }, { status: 404 })

  // Fetch tour events
  const { data: tourEvents } = await supabase
    .from('tour_events')
    .select('event_id, events_v2(id, title, start_at, venue_id, capacity, settings)')
    .eq('tour_id', id)
    .order('event_id')

  const events: any[] = []
  for (const te of tourEvents || []) {
    const ev = (te as any).events_v2
    if (ev) {
      const settings = ev.settings || {}
      events.push({
        id: ev.id,
        title: ev.title,
        start_at: ev.start_at,
        venue: settings.venue_label || 'TBD',
        capacity: ev.capacity,
      })
    }
  }
  events.sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime())

  // Fetch team
  const { data: teamRows } = await supabase
    .from('tour_team_members')
    .select('user_id, role, profiles(full_name, username)')
    .eq('tour_id', id)
    .limit(50)

  // Fetch financials
  const { data: transactions } = await supabase
    .from('financial_transactions')
    .select('type, amount, category')
    .eq('tour_id', id)

  const totalIncome = (transactions || []).filter((t: any) => t.type === 'income').reduce((s: number, t: any) => s + Number(t.amount), 0)
  const totalExpenses = (transactions || []).filter((t: any) => t.type === 'expense').reduce((s: number, t: any) => s + Number(t.amount), 0)

  if (format === 'pdf') {
    const startLabel = tour.start_date ? new Date(tour.start_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'TBD'
    const endLabel = tour.end_date ? new Date(tour.end_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'TBD'

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${tour.name} — Tour Report</title>
<style>
  body { font-family: Arial, sans-serif; max-width: 800px; margin: 40px auto; color: #1a1a1a; }
  h1 { color: #7c3aed; border-bottom: 3px solid #7c3aed; padding-bottom: 10px; }
  h2 { color: #374151; margin-top: 28px; font-size: 1.1rem; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  th { background: #f3f4f6; padding: 8px 12px; text-align: left; font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; }
  td { padding: 8px 12px; border-bottom: 1px solid #f0f0f0; font-size: 13px; }
  .meta { color: #6b7280; font-size: 14px; margin-bottom: 6px; }
  .stat { display: inline-block; margin: 0 24px 12px 0; }
  .stat-value { font-size: 22px; font-weight: bold; color: #7c3aed; }
  .stat-label { font-size: 11px; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.05em; }
  .cover { width: 100%; max-height: 200px; object-fit: cover; border-radius: 8px; margin-bottom: 16px; }
</style>
</head>
<body>
${tour.cover_image_url ? `<img class="cover" src="${tour.cover_image_url}" alt="${tour.name}" />` : ''}
<h1>${tour.name}</h1>
<p class="meta">${tour.main_artist || ''} ${tour.genre ? `· ${tour.genre}` : ''} · ${startLabel} – ${endLabel}</p>
${tour.description ? `<p style="color:#374151;margin-bottom:16px">${tour.description}</p>` : ''}

<h2>Summary</h2>
<div>
  <div class="stat"><div class="stat-value">${events.length}</div><div class="stat-label">Shows</div></div>
  <div class="stat"><div class="stat-value">${(teamRows || []).length}</div><div class="stat-label">Team Members</div></div>
  <div class="stat"><div class="stat-value">$${totalIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div><div class="stat-label">Revenue</div></div>
  <div class="stat"><div class="stat-value">$${totalExpenses.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div><div class="stat-label">Expenses</div></div>
</div>

${events.length > 0 ? `
<h2>Shows (${events.length})</h2>
<table>
<tr><th>#</th><th>Date</th><th>Title</th><th>Venue</th><th>Capacity</th></tr>
${events.map((e, i) => `<tr><td>${i + 1}</td><td>${new Date(e.start_at).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' })}</td><td>${e.title}</td><td>${e.venue}</td><td>${e.capacity || '—'}</td></tr>`).join('')}
</table>
` : ''}

${(teamRows || []).length > 0 ? `
<h2>Team Roster</h2>
<table>
<tr><th>Name</th><th>Role</th></tr>
${(teamRows || []).map((m: any) => `<tr><td>${m.profiles?.full_name || m.profiles?.username || '—'}</td><td>${m.role || '—'}</td></tr>`).join('')}
</table>
` : ''}

<p style="margin-top:40px;color:#9ca3af;font-size:11px">Generated by Tourify · ${new Date().toLocaleString()}</p>
</body></html>`

    const filename = `${(tour.name || 'tour').replace(/[^a-z0-9]/gi, '-').toLowerCase()}-report.html`
    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  }

  if (format === 'csv') {
    const rows = events.map((e, i) => [
      i + 1,
      `"${e.title}"`,
      `"${new Date(e.start_at).toLocaleDateString()}"`,
      `"${e.venue}"`,
      e.capacity || '',
    ].join(','))

    const csv = ['#,Title,Date,Venue,Capacity', ...rows].join('\n')
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${(tour.name || 'tour').replace(/\s/g, '-')}-shows.csv"`,
      },
    })
  }

  return NextResponse.json({ error: 'Invalid format. Use: pdf, csv' }, { status: 400 })
})
