"use client"

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import Link from 'next/link'
import { TicketPurchaseForm } from '@/components/ticketing/ticket-purchase-form'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

function PurchaseContent() {
  const params = useSearchParams()
  const eventId = params.get('event_id') || ''
  const cancelled = params.get('cancelled') === 'true'
  const title = params.get('title') || 'Event tickets'

  if (!eventId) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <p className="mb-4">Missing event. Choose an event to purchase tickets.</p>
          <Button asChild>
            <Link href="/discover/events">Browse events</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {cancelled && (
        <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm">
          Checkout was cancelled. Your reservation will expire shortly if not completed.
        </div>
      )}
      <TicketPurchaseForm
        eventId={eventId}
        event={{
          id: eventId,
          title,
          date: '',
          location: '',
        }}
      />
    </div>
  )
}

export default function TicketPurchasePage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="mb-6 text-3xl font-semibold tracking-tight">Purchase tickets</h1>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
        <PurchaseContent />
      </Suspense>
    </div>
  )
}
