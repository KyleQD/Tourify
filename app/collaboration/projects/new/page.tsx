import { redirect } from "next/navigation"

/** Legacy collaboration CTA — live create surface is /projects/new */
export default function CollaborationNewProjectRedirectPage() {
  redirect("/projects/new")
}
