import { EnhancedEventPageLoader } from "@/components/events/enhanced-event-page-loader"
import { createClient } from "@/lib/supabase/server"
import { enrichPublicEventPageData } from "@/lib/events/get-public-event-page"
import { resolvePublicEvent } from "@/lib/events/resolve-public-event"
import { notFound } from "next/navigation"

interface EventPageProps {
  params: Promise<{ slug: string }>
}

export default async function EventPage({ params }: EventPageProps) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const event = await resolvePublicEvent(slug, user?.id || null)
  if (!event) notFound()

  const enriched = await enrichPublicEventPageData({ supabase, event })

  return <EnhancedEventPageLoader eventId={enriched.id} event={enriched} />
}
