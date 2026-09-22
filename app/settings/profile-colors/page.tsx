import { redirect } from "next/navigation"

export default function ProfileColorsPage() {
  redirect("/settings?tab=profile-colors")
}
