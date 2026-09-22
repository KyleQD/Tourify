import { redirect } from "next/navigation"

/** Canonical events list lives at /venue/events */
export default function VenueDashboardEventsTwinRedirectPage() {
  redirect("/venue/events")
}
