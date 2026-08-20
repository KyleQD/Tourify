import { NextRequest, NextResponse } from "next/server"

import { authenticateApiRequest } from "@/lib/auth/api-auth"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import type { TicketExperienceTicket, TicketExperienceTransfer } from "@/types/ticketing-experience"

export async function GET(request: NextRequest) {
  const auth = await authenticateApiRequest(request)
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const service = createServiceRoleClient()
  const ticketId = request.nextUrl.searchParams.get("ticket_id")
  const query = service
    .from("tickets")
    .select(`
      id, order_id, status, issued_at, is_complimentary, event_id, ticket_type_id,
      ticket_types(id, name, category, description, is_transferable, refund_policy),
      events_v2(id, title, start_at, end_at, image_url, venue_id),
      ticket_credentials(token, status)
    `)
    .eq("owner_user_id", auth.user.id)
    .in("status", ["valid", "assigned", "transferred", "checked_in"])
    .order("issued_at", { ascending: false })

  if (ticketId) query.eq("id", ticketId)
  const transfersQuery = service
    .from("ticket_transfers")
    .select("id, ticket_id, status, from_user_id, to_user_id, to_email, expires_at, tickets(ticket_types(name), events_v2(title))")
    .or(`from_user_id.eq.${auth.user.id},to_user_id.eq.${auth.user.id}`)
    .order("created_at", { ascending: false })
  const [{ data: rows, error }, { data: transferRows }] = await Promise.all([query, transfersQuery])
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const now = Date.now()
  const tickets: TicketExperienceTicket[] = (rows ?? []).map((row: any) => {
    const event = row.events_v2 ?? {}
    const type = row.ticket_types ?? {}
    const qrToken = (row.ticket_credentials ?? []).find((credential: any) => credential.status === "active")?.token ?? null
    const eventStarted = event.start_at ? new Date(event.start_at).getTime() <= now : false
    const status = String(row.status ?? "pending")
    const canTransfer = Boolean(qrToken && type.is_transferable !== false && !eventStarted && ["valid", "assigned", "transferred"].includes(status))
    return {
      id: row.id,
      orderId: row.order_id ?? null,
      status,
      issuedAt: row.issued_at ?? null,
      isComplimentary: Boolean(row.is_complimentary),
      qrToken,
      ticketType: { id: type.id ?? null, name: type.name ?? "Admission", category: type.category ?? null, description: type.description ?? null, isTransferable: type.is_transferable !== false, refundPolicy: type.refund_policy ?? null },
      event: { id: event.id ?? row.event_id, title: event.title ?? "Event", startsAt: event.start_at ?? null, endsAt: event.end_at ?? null, imageUrl: event.image_url ?? null, venueName: null },
      eligibility: { canTransfer, canShowPass: Boolean(qrToken && status !== "checked_in"), transferReason: canTransfer ? null : eventStarted ? "Transfers are closed because this event has started." : type.is_transferable === false ? "This ticket type cannot be transferred." : "This ticket is not eligible for transfer." },
    }
  })

  const transfers: TicketExperienceTransfer[] = (transferRows ?? []).map((row: any) => ({
    id: row.id,
    ticketId: row.ticket_id,
    status: row.status,
    direction: row.from_user_id === auth.user.id ? "outgoing" : "incoming",
    recipientEmail: row.to_email ?? null,
    expiresAt: row.expires_at ?? null,
    eventTitle: row.tickets?.events_v2?.title ?? null,
    ticketTypeName: row.tickets?.ticket_types?.name ?? null,
  }))

  return NextResponse.json({ tickets: ticketId ? tickets.slice(0, 1) : tickets, transfers })
}
