import { TokenOnboardingFlow } from "@/components/hiring/onboarding-module/token-onboarding-flow"

interface OnboardingTokenPageProps {
  params: Promise<{ token: string }> | { token: string }
}

export default async function OnboardingTokenPage({ params }: OnboardingTokenPageProps) {
  const resolvedParams = await params

  return <TokenOnboardingFlow token={resolvedParams.token} />
}
