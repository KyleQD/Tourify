import { TokenOnboardingFlow } from "@/components/hiring/onboarding-module/token-onboarding-flow"

interface HireOnboardingTokenPageProps {
  params: Promise<{ token: string }> | { token: string }
}

export default async function HireOnboardingTokenPage({ params }: HireOnboardingTokenPageProps) {
  const resolvedParams = await params

  return <TokenOnboardingFlow token={resolvedParams.token} />
}
