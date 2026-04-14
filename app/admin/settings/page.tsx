import { redirect } from "next/navigation"

/** Canonical organizer settings live under the dashboard shell */
export default function AdminSettingsRedirectPage() {
  redirect("/admin/dashboard/settings")
}
