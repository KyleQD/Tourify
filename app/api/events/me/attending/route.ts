import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import {
  formatAttendingEventTimeLabel,
  getUpcomingAttendingEvents,
} from "@/lib/events/get-upcoming-attending-events"

export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const events = await getUpcomingAttendingEvents({
      supabase,
      userId: user.id,
      limit: 5,
    })

    return NextResponse.json({
      success: true,
      data: events.map((event) => ({
        ...event,
        start_time_label: formatAttendingEventTimeLabel(event),
        href: `/events/${event.slug || event.id}`,
      })),
    })
  } catch (error) {
    console.error("[GET /api/events/me/attending]", error)
    return NextResponse.json(
      { error: "Internal server error", data: [] },
      { status: 500 }
    )
  }
}
