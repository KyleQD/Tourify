import { redirect } from "next/navigation"

/** Legacy collaboration discover CTA — use global discover */
export default function CollaborationDiscoverRedirectPage() {
  redirect("/discover")
}
