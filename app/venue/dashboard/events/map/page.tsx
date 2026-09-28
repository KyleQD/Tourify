import { redirect } from "next/navigation"

/** Map twin retired — use canonical events list */
export default function VenueDashboardEventsMapRedirectPage() {
  redirect("/venue/events")
}
