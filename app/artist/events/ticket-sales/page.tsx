import Link from "next/link"
import { BarChart3, CalendarDays, Ticket } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

export default function TicketSalesPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6">
      <div className="border-b border-border pb-6"><div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground"><Ticket className="h-4 w-4" />Artist operations</div><h1 className="text-3xl font-semibold tracking-tight">Ticketing</h1><p className="mt-2 max-w-2xl text-muted-foreground">Choose an event to manage ticket tiers, audience access, and door operations from its event workspace.</p></div>
      <div className="grid gap-4 md:grid-cols-2"><Card><CardContent className="space-y-4 p-6"><CalendarDays className="h-5 w-5 text-cyan-300" /><div><h2 className="font-semibold">Event ticketing workspace</h2><p className="mt-1 text-sm text-muted-foreground">Open an event to manage its live ticketing setup and sales operations.</p></div><Button asChild><Link href="/artist/events">Choose event</Link></Button></CardContent></Card><Card><CardContent className="space-y-4 p-6"><BarChart3 className="h-5 w-5 text-emerald-300" /><div><h2 className="font-semibold">Your attendee wallet</h2><p className="mt-1 text-sm text-muted-foreground">Personal purchases and secure entry passes stay in your Tourify wallet.</p></div><Button asChild variant="outline"><Link href="/tickets/my-tickets">Open wallet</Link></Button></CardContent></Card></div>
    </div>
  )
}
