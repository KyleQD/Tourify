import { redirect } from "next/navigation"

/** Crew profiles live under Staff Operations */
export default function VenueDashboardCrewProfilesRedirectPage() {
  redirect("/venue/staff")
}
