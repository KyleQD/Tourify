import { redirect } from "next/navigation"

/** Legacy collaboration hub — send users to the live artist collaborations surface. */
export default function CollaborationRedirectPage() {
  redirect("/artist/collaborations")
}
