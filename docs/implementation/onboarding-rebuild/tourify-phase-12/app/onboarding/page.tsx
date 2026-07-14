import { redirect } from "next/navigation"

import { PersonaOnboardingFlow } from "@/components/hiring/onboarding-module/persona-onboarding-flow"
import { buildHireOnboardingPath, normalizePersonaOnboardingType, normalizeSearchParam } from "@/lib/onboarding/onboarding-route-utils"

type OnboardingSearchParams = Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined>

interface OnboardingPageProps {
  searchParams?: OnboardingSearchParams
}

export default async function OnboardingPage({ searchParams }: OnboardingPageProps) {
  const params = await Promise.resolve(searchParams || {})
  const token = normalizeSearchParam(params.token)

  if (token) redirect(buildHireOnboardingPath({ token }))

  const type = normalizePersonaOnboardingType({ value: params.type }) || "individual"
  const status = normalizeSearchParam(params.status)

  return <PersonaOnboardingFlow type={type} status={status} />
}
