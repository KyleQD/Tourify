import { redirect } from "next/navigation"

export default function LegacyOnboardingCompletePage() {
  redirect("/onboarding?status=complete")
}
