// Merge this into next.config.ts if the repo manages redirects centrally.
// Keep route files too when you need server-side compatibility for old links.

const onboardingRedirects = [
  {
    source: "/onboarding/enhanced-onboarding-flow",
    destination: "/onboarding",
    permanent: true,
  },
  {
    source: "/onboarding/complete",
    destination: "/onboarding?status=complete",
    permanent: false,
  },
  {
    source: "/onboarding/:token((?!hire$|complete$|enhanced-onboarding-flow$)[A-Za-z0-9._~-]{16,})",
    destination: "/onboarding/hire/:token",
    permanent: false,
  },
]

export default onboardingRedirects
