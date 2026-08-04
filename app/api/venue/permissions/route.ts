import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

const permissions = [
  { key: "manage_bookings", label: "Manage bookings", group: "Bookings" },
  { key: "manage_events", label: "Manage events", group: "Events" },
  { key: "manage_ticketing", label: "Manage ticketing", group: "Ticketing" },
  { key: "door_check_in", label: "Door check-in", group: "Ticketing" },
  { key: "manage_team", label: "Manage staff", group: "Workforce" },
  { key: "manage_documents", label: "Manage documents", group: "Operations" },
  { key: "view_analytics", label: "View analytics", group: "Reporting" },
  { key: "view_finances", label: "View finances", group: "Finance" },
  { key: "manage_finances", label: "Manage finances", group: "Finance" },
]

export async function GET() {
  return NextResponse.json({ success: true, permissions })
}
