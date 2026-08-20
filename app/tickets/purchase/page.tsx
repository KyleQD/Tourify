"use client"

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import Link from 'next/link'
import { TicketPurchaseForm } from '@/components/ticketing/ticket-purchase-form'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { TicketingShell, TicketStateNotice } from '@/components/ticketing/ticketing-experience-ui'

function PurchaseContent() {
  const params = useSearchParams()
  const eventId = params.get('event_id') || ''
  const cancelled = params.get('cancelled') === 'true'
  const title = params.get('title') || 'Event tickets'

  if (!eventId) {
    return (
      <TicketingShell title="Choose tickets" description="Select an event before starting checkout." backHref="/discover/events" backLabel="Browse events"><Card>
        <CardContent className="py-10 text-center">
          <p className="mb-4">Missing event. Choose an event to purchase tickets.</p>
          <Button asChild>
            <Link href="/discover/events">Browse events</Link>
          </Button>
        </CardContent>
      </Card></TicketingShell>
    )
  }

  return (
    <TicketingShell title={title} description="Choose a ticket tier, review the all-in price, and continue securely to payment." backHref="/discover/events" backLabel="Discover events">
      <div className="space-y-4">
      {cancelled && (
        <TicketStateNotice tone="warning" title="Checkout was cancelled">Your held inventory will be released shortly. Select your tickets again whenever you are ready.</TicketStateNotice>
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
    </TicketingShell>
  )
}

export default function TicketPurchasePage() {
  return (
    <Suspense fallback={<TicketingShell title="Loading tickets"><p className="text-sm text-muted-foreground">Loading checkout…</p></TicketingShell>}>
        <PurchaseContent />
    </Suspense>
  )
}
