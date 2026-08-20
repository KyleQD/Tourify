export interface TicketExperienceTicket {
  id: string
  orderId: string | null
  status: string
  issuedAt: string | null
  isComplimentary: boolean
  qrToken: string | null
  ticketType: {
    id: string | null
    name: string
    category: string | null
    description: string | null
    isTransferable: boolean
    refundPolicy: string | null
  }
  event: {
    id: string
    title: string
    startsAt: string | null
    endsAt: string | null
    imageUrl: string | null
    venueName: string | null
  }
  eligibility: {
    canTransfer: boolean
    canShowPass: boolean
    transferReason: string | null
  }
}

export interface TicketExperienceTransfer {
  id: string
  ticketId: string
  status: string
  direction: "incoming" | "outgoing"
  recipientEmail: string | null
  expiresAt: string | null
  eventTitle: string | null
  ticketTypeName: string | null
}
