import { EnhancedEventPage } from "@/components/events/enhanced-event-page"
import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"

interface EventPageProps {
  params: Promise<{ slug: string }>
}

export default async function EventPage({ params }: EventPageProps) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Try by slug first
  let { data: event, error } = await supabase
    .from('events')
    .select('*')
    .eq('slug', slug)
    .single()

  if (error || !event) {
    // Fallback: treat param as id
    const { data: byId, error: idErr } = await supabase
      .from('events')
      .select('*')
      .eq('id', slug)
      .single()

    if (idErr || !byId) notFound()
    event = byId
  }

  const isOwner = !!user && event.artist_id === user.id
  if (event.status !== "published" && !isOwner) notFound()

  return <EnhancedEventPage eventId={event.id} event={event} />
}
