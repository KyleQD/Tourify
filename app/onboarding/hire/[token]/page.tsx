import { TokenOnboardingFlow } from "@/components/hiring/onboarding-module/token-onboarding-flow"

interface HireOnboardingTokenPageProps {
  params: Promise<{ token: string }>
}

export default async function HireOnboardingTokenPage({ params }: HireOnboardingTokenPageProps) {
  const { token } = await params

  return <TokenOnboardingFlow token={token} />
}
