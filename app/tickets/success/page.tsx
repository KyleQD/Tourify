"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { CalendarDays, Mail, ReceiptText } from "lucide-react"

import { TicketingShell, TicketEventMeta, TicketStateNotice, TicketSuccessMark } from "@/components/ticketing/ticketing-experience-ui"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function TicketSuccessPage() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get("session_id")
  const [purchase, setPurchase] = useState<any>(null)
  const [state, setState] = useState<"loading" | "ready" | "error">("loading")
  const [emailMessage, setEmailMessage] = useState<string | null>(null)
  useEffect(() => { void (async () => { if (!sessionId) { setState("error"); return } try { const response = await fetch(`/api/ticketing/verify?session_id=${encodeURIComponent(sessionId)}`); const data = await response.json(); if (!response.ok) throw new Error(data.error || "Purchase verification is still pending."); setPurchase(data.purchase); setState("ready") } catch { setState("error") } })() }, [sessionId])
  async function resend() { if (!sessionId) return; const response = await fetch("/api/ticketing/delivery", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ session_id: sessionId }) }); const data = await response.json(); setEmailMessage(response.ok ? (data.message || "Receipt sent.") : (data.error || "We could not resend the receipt.")) }
  if (state === "loading") return <TicketingShell title="Confirming your purchase"><Card className="h-64 animate-pulse" /></TicketingShell>
  if (state === "error") return <TicketingShell title="We are confirming your purchase" backHref="/tickets/my-tickets" backLabel="Open wallet"><TicketStateNotice tone="warning" title="Your payment may still be processing">Check your wallet in a moment. If no tickets appear after a few minutes, contact support with your payment receipt.</TicketStateNotice></TicketingShell>
  return <TicketingShell title="Tickets confirmed" description="Your receipt is ready and your live passes are now in your wallet." actions={<Button asChild><Link href="/tickets/my-tickets">Open wallet</Link></Button>}><div className="mx-auto grid max-w-4xl gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]"><div className="space-y-4"><Card><CardContent className="space-y-4 p-6"><TicketSuccessMark /><div><h2 className="text-xl font-semibold">{purchase.event?.title || "Your event"}</h2><TicketEventMeta className="mt-2" startsAt={purchase.event?.date} venue={purchase.event?.location} /></div><div className="grid grid-cols-2 gap-4 border-t border-border pt-4 text-sm"><div><p className="text-muted-foreground">Order</p><p className="mt-1 font-mono">{purchase.order_number}</p></div><div><p className="text-muted-foreground">Total</p><p className="mt-1 font-semibold">${Number(purchase.total_amount || 0).toFixed(2)}</p></div></div></CardContent></Card><Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><ReceiptText className="h-4 w-4" />What happens next</CardTitle></CardHeader><CardContent className="space-y-3 text-sm text-muted-foreground"><p>Your entry passes are in your wallet. Open the live pass at the door, rather than sharing a screenshot.</p><p>A receipt and secure manage link will be sent to {purchase.customer_email}.</p></CardContent></Card></div><Card className="h-fit"><CardContent className="space-y-3 p-5"><p className="font-medium">Need another receipt?</p><p className="text-sm text-muted-foreground">Resend a secure manage link to your purchase email.</p><Button variant="outline" className="w-full" onClick={() => void resend()}><Mail className="mr-2 h-4 w-4" />Resend receipt</Button>{emailMessage ? <p className="text-xs text-muted-foreground">{emailMessage}</p> : null}<Button asChild variant="ghost" className="w-full"><Link href="/discover/events"><CalendarDays className="mr-2 h-4 w-4" />Discover events</Link></Button></CardContent></Card></div></TicketingShell>
}
