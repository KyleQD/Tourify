import { redirect } from "next/navigation"

/** Legacy collaboration projects — send users to the live artist collaborations surface. */
export default function CollaborationProjectsRedirectPage() {
  redirect("/artist/collaborations")
}
