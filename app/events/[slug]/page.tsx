import { EnhancedEventPageLoader } from "@/components/events/enhanced-event-page-loader"
import { createClient } from "@/lib/supabase/server"
import { canNonOwnerViewArtistEvent } from "@/lib/artist/artist-event-visibility"
import { enrichPublicEventPageData } from "@/lib/events/get-public-event-page"
import { notFound } from "next/navigation"

interface EventPageProps {
  params: Promise<{ slug: string }>
}

export default async function EventPage({ params }: EventPageProps) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let { data: event, error } = await supabase
    .from("events")
    .select("*")
    .eq("slug", slug)
    .single()

  if (error || !event) {
    const { data: byId, error: idErr } = await supabase
      .from("events")
      .select("*")
      .eq("id", slug)
      .single()

    if (idErr || !byId) notFound()
    event = byId
  }

  const isOwner = !!user && event.artist_id === user.id
  if (!isOwner && !canNonOwnerViewArtistEvent(event)) notFound()

  const enriched = await enrichPublicEventPageData({ supabase, event })

  return <EnhancedEventPageLoader eventId={enriched.id} event={enriched} />
}
