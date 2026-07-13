import { redirect } from "next/navigation"

import { buildHireOnboardingPath, normalizeSearchParam } from "@/lib/onboarding/onboarding-route-utils"

type HireOnboardingSearchParams = Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined>

interface HireOnboardingIndexPageProps {
  searchParams?: HireOnboardingSearchParams
}

export default async function HireOnboardingIndexPage({ searchParams }: HireOnboardingIndexPageProps) {
  const params = await Promise.resolve(searchParams || {})
  const token = normalizeSearchParam(params.token)

  if (token) redirect(buildHireOnboardingPath({ token }))

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center px-4 text-center">
      <h1 className="text-3xl font-bold tracking-tight">Onboarding link required</h1>
      <p className="mt-3 text-muted-foreground">
        Staff hiring onboarding requires a secure invitation link from the hiring team. Check your email or ask the employer to resend your invite.
      </p>
    </main>
  )
}
