import { notFound } from "next/navigation"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface Props {
  params: Promise<{ token: string }>
}

export default async function AdvancingSharePage({ params }: Props) {
  const { token } = await params
  if (!token) notFound()

  const supabase = createServiceRoleClient()

  const { data: doc } = await supabase
    .from('advancing_documents')
    .select('*')
    .eq('share_token', token)
    .maybeSingle()

  if (!doc) notFound()

  const sections: Record<string, any> = doc.sections || {}
  const eventInfo = sections.event_info || {}
  const venue = sections.venue || {}
  const schedule = sections.schedule || {}
  const production = sections.production || {}
  const contacts = sections.contacts || {}

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-slate-800 bg-slate-900/80 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-white">Advancing Document</h1>
            <p className="text-sm text-slate-400">{eventInfo.event_name || doc.title || 'Event Advancing'}</p>
          </div>
          <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30">
            Read-only
          </Badge>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Event Info */}
        {(eventInfo.event_name || eventInfo.event_date) && (
          <Card className="bg-slate-900/60 border-slate-700/50">
            <CardHeader>
              <CardTitle className="text-white text-base">Event Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {eventInfo.event_name && <InfoRow label="Event" value={eventInfo.event_name} />}
              {eventInfo.event_date && <InfoRow label="Date" value={eventInfo.event_date} />}
              {eventInfo.city && <InfoRow label="City" value={eventInfo.city} />}
              {eventInfo.capacity && <InfoRow label="Capacity" value={String(eventInfo.capacity)} />}
            </CardContent>
          </Card>
        )}

        {/* Venue */}
        {(venue.name || venue.address) && (
          <Card className="bg-slate-900/60 border-slate-700/50">
            <CardHeader>
              <CardTitle className="text-white text-base">Venue</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {venue.name && <InfoRow label="Venue" value={venue.name} />}
              {venue.address && <InfoRow label="Address" value={venue.address} />}
              {venue.contact_name && <InfoRow label="Contact" value={venue.contact_name} />}
              {venue.contact_phone && <InfoRow label="Phone" value={venue.contact_phone} />}
            </CardContent>
          </Card>
        )}

        {/* Schedule */}
        {(schedule.load_in_time || schedule.soundcheck_time || schedule.doors_time || schedule.showtime) && (
          <Card className="bg-slate-900/60 border-slate-700/50">
            <CardHeader>
              <CardTitle className="text-white text-base">Schedule</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {schedule.load_in_time && <InfoRow label="Load In" value={schedule.load_in_time} />}
              {schedule.soundcheck_time && <InfoRow label="Sound Check" value={schedule.soundcheck_time} />}
              {schedule.doors_time && <InfoRow label="Doors" value={schedule.doors_time} />}
              {schedule.showtime && <InfoRow label="Show Time" value={schedule.showtime} />}
              {schedule.curfew && <InfoRow label="Curfew" value={schedule.curfew} />}
            </CardContent>
          </Card>
        )}

        {/* Production */}
        {production.notes && (
          <Card className="bg-slate-900/60 border-slate-700/50">
            <CardHeader>
              <CardTitle className="text-white text-base">Production Notes</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate-300 whitespace-pre-wrap">
              {production.notes}
            </CardContent>
          </Card>
        )}

        {/* Contacts */}
        {Array.isArray(contacts.list) && contacts.list.length > 0 && (
          <Card className="bg-slate-900/60 border-slate-700/50">
            <CardHeader>
              <CardTitle className="text-white text-base">Key Contacts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {contacts.list.map((c: any, i: number) => (
                <div key={i} className="text-sm border-b border-slate-700/50 pb-3 last:border-0 last:pb-0">
                  <p className="font-medium text-white">{c.name}</p>
                  {c.role && <p className="text-slate-400">{c.role}</p>}
                  {c.phone && <p className="text-slate-300">{c.phone}</p>}
                  {c.email && <p className="text-slate-300">{c.email}</p>}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <p className="text-center text-xs text-slate-600 pb-8">
          Powered by Tourify · This document is read-only
        </p>
      </main>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3">
      <span className="text-slate-400 w-28 shrink-0">{label}</span>
      <span className="text-slate-200">{value}</span>
    </div>
  )
}
