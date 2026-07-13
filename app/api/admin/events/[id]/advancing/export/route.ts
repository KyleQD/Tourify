import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/auth/api-auth'
import {
  assertAdminEventAccess,
} from "@/lib/admin/admin-tour-event-access"

function extractEventId(url: string): string | null {
  const segments = new URL(url).pathname.split('/')
  const idx = segments.indexOf('events')
  return idx >= 0 ? segments[idx + 1] : null
}

export const GET = withAdminAuth(async (request: NextRequest, { supabase, user }) => {
  const eventId = extractEventId(request.url)
  if (!eventId) return NextResponse.json({ error: 'Missing event id' }, { status: 400 })
  await assertAdminEventAccess({ supabase, userId: user.id, eventId })

  const [{ data: adv }, { data: event }] = await Promise.all([
    supabase.from('advancing_documents').select('*').eq('event_id', eventId).maybeSingle(),
    supabase.from('events_v2').select('title, start_at, settings').eq('id', eventId).maybeSingle(),
  ])

  const title = event?.title || 'Event'
  const dateLabel = event?.start_at ? new Date(event.start_at).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'TBD'

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Advancing — ${title}</title>
<style>
  @media print { .no-print { display: none; } }
  body { font-family: Arial, sans-serif; max-width: 820px; margin: 30px auto; color: #1a1a1a; font-size: 13px; }
  h1 { color: #7c3aed; margin-bottom: 4px; }
  h2 { color: #374151; border-bottom: 2px solid #7c3aed; padding-bottom: 4px; margin-top: 24px; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 8px; }
  .field { margin-bottom: 8px; }
  .label { font-size: 10px; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.05em; }
  .value { color: #111; font-weight: 500; }
  .status { display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 11px; font-weight: bold; background: #f3f4f6; color: #374151; }
  .status.confirmed { background: #d1fae5; color: #065f46; }
  .status.sent { background: #dbeafe; color: #1e40af; }
</style>
</head>
<body>
<h1>${title}</h1>
<p style="color:#6b7280;margin-bottom:4px">${dateLabel}</p>
<span class="status ${adv?.status || 'pending'}">${(adv?.status || 'pending').toUpperCase()}</span>

<h2>Tech Rider</h2>
<div class="grid">
  <div class="field"><div class="label">Stage</div><div class="value">${adv?.stage_width_ft ? `${adv.stage_width_ft}W × ${adv.stage_depth_ft}D × ${adv.stage_height_ft}H ft` : '—'}</div></div>
  <div class="field"><div class="label">Sound System</div><div class="value">${adv?.sound_system_type || '—'}</div></div>
  <div class="field"><div class="label">FOH Console</div><div class="value">${adv?.foh_console || '—'}</div></div>
  <div class="field"><div class="label">Monitor Console</div><div class="value">${adv?.mon_console || '—'}</div></div>
  <div class="field"><div class="label">Monitor Type</div><div class="value">${adv?.monitor_type || '—'} (${adv?.monitor_mixes_count || 0} mixes)</div></div>
  <div class="field"><div class="label">Backline Provided</div><div class="value">${adv?.backline_provided ? 'Yes' : 'No'}</div></div>
  ${adv?.backline_notes ? `<div class="field" style="grid-column:span 2"><div class="label">Backline Notes</div><div class="value">${adv.backline_notes}</div></div>` : ''}
  ${adv?.power_requirements ? `<div class="field" style="grid-column:span 2"><div class="label">Power Requirements</div><div class="value">${adv.power_requirements}</div></div>` : ''}
</div>

<h2>Hospitality Rider</h2>
<div class="grid">
  <div class="field"><div class="label">Dressing Rooms</div><div class="value">${adv?.dressing_rooms_count || '—'}</div></div>
  <div class="field"><div class="label">Meals</div><div class="value">${adv?.meal_count || '—'}</div></div>
  <div class="field"><div class="label">Comps</div><div class="value">${adv?.comps_count || '—'}</div></div>
  <div class="field"><div class="label">Parking Passes</div><div class="value">${adv?.parking_passes_count || '—'}</div></div>
  <div class="field"><div class="label">Towels</div><div class="value">${adv?.towels_count || '—'}</div></div>
  ${adv?.dietary_restrictions?.length ? `<div class="field"><div class="label">Dietary Restrictions</div><div class="value">${adv.dietary_restrictions.join(', ')}</div></div>` : ''}
  ${adv?.catering_notes ? `<div class="field" style="grid-column:span 2"><div class="label">Catering Notes</div><div class="value">${adv.catering_notes}</div></div>` : ''}
</div>

<h2>Contacts</h2>
<div class="grid">
  <div class="field"><div class="label">Venue Contact</div><div class="value">${adv?.venue_contact_name || '—'}<br><small>${adv?.venue_contact_phone || ''} ${adv?.venue_contact_email || ''}</small></div></div>
  <div class="field"><div class="label">Production Manager</div><div class="value">${adv?.production_manager_name || '—'}<br><small>${adv?.production_manager_phone || ''}</small></div></div>
  <div class="field"><div class="label">Local Promoter</div><div class="value">${adv?.local_promoter_name || '—'}<br><small>${adv?.local_promoter_phone || ''}</small></div></div>
</div>

<h2>Settlement</h2>
<div class="grid">
  <div class="field"><div class="label">Deal Type</div><div class="value">${adv?.deal_type || '—'}</div></div>
  <div class="field"><div class="label">Guarantee</div><div class="value">${adv?.guarantee_amount ? '$' + Number(adv.guarantee_amount).toLocaleString() : '—'}</div></div>
  <div class="field"><div class="label">Door %</div><div class="value">${adv?.door_percentage ? adv.door_percentage + '%' : '—'}</div></div>
  <div class="field"><div class="label">Settlement Contact</div><div class="value">${adv?.settlement_contact || '—'}</div></div>
</div>

${adv?.notes ? `<h2>Notes</h2><p>${adv.notes}</p>` : ''}

<p style="margin-top:40px;color:#9ca3af;font-size:11px">Generated by Tourify · ${new Date().toLocaleString()}</p>
</body></html>`

  const filename = `advancing-${(title || 'event').replace(/[^a-z0-9]/gi, '-').toLowerCase()}.html`
  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
})
