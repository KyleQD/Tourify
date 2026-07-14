import { redirect } from "next/navigation"

import { buildHireOnboardingPath, isLikelyOnboardingToken } from "@/lib/onboarding/onboarding-route-utils"

interface LegacyTokenOnboardingPageProps {
  params: Promise<{ token: string }>
}

export default async function LegacyTokenOnboardingPage({ params }: LegacyTokenOnboardingPageProps) {
  const { token } = await params

  if (!isLikelyOnboardingToken(token)) redirect("/onboarding")

  redirect(buildHireOnboardingPath({ token }))
}
