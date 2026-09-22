import { redirect } from "next/navigation"

/** Teams hub consolidated into Staff Operations */
export default function VenueDashboardTeamsRedirectPage() {
  redirect("/venue/staff")
}
