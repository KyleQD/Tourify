"use client"

import { useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"

import { TicketingShell, TicketStateNotice, TicketSuccessMark } from "@/components/ticketing/ticketing-experience-ui"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

export default function TicketClaimPage() {
  const params = useParams<{ token: string }>()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  async function claimTickets() { setLoading(true); setError(null); const response = await fetch("/api/ticketing/claim", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: params.token }) }); const data = await response.json(); setLoading(false); if (response.status === 401) { router.push(`/login?redirect=/tickets/claim/${params.token}`); return } if (!response.ok) { setError(data.error || "This ticket link cannot be claimed."); return } setMessage("Your tickets have been added to your wallet."); window.setTimeout(() => router.push(data.redirect_to || "/tickets/my-tickets"), 800) }
  return <TicketingShell title="Claim your tickets" description="Add these tickets to your secure Tourify wallet. You will be able to manage them and show the live entry pass at the door." backHref="/tickets/my-tickets" backLabel="Open wallet"><div className="mx-auto max-w-lg"><Card><CardContent className="space-y-5 p-6"><TicketSuccessMark />{error ? <TicketStateNotice tone="danger" title="Claim unavailable">{error}</TicketStateNotice> : null}{message ? <TicketStateNotice tone="success" title="Tickets claimed">Opening your wallet now.</TicketStateNotice> : null}<div className="flex flex-wrap gap-2"><Button onClick={() => void claimTickets()} disabled={loading}>{loading ? "Claiming tickets…" : "Claim tickets"}</Button><Button asChild variant="outline"><Link href="/tickets/my-tickets">Open wallet</Link></Button></div></CardContent></Card></div></TicketingShell>
}
