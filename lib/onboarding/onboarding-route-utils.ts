import type { PersonaOnboardingType } from "@/types/persona-onboarding"

const PERSONA_TYPES: PersonaOnboardingType[] = [
  "individual",
  "artist",
  "venue",
  "organization",
  "performanceAgency",
  "staffingAgency",
  "rentalCompany",
  "productionCompany",
  "promoter",
]

interface NormalizePersonaTypeArgs {
  value?: string | string[] | null
}

interface BuildHireOnboardingPathArgs {
  token: string
}

interface GetOnboardingRouteArgs {
  token?: string | string[] | null
  type?: string | string[] | null
}

export function normalizeSearchParam(value?: string | string[] | null): string | undefined {
  if (Array.isArray(value)) return value[0]
  return value ?? undefined
}

export function normalizePersonaOnboardingType({ value }: NormalizePersonaTypeArgs): PersonaOnboardingType | undefined {
  const normalized = normalizeSearchParam(value)
  if (!normalized) return undefined

  return PERSONA_TYPES.find((type) => type.toLowerCase() === normalized.toLowerCase())
}

export function isPersonaOnboardingType(value?: string | null): value is PersonaOnboardingType {
  if (!value) return false
  return PERSONA_TYPES.some((type) => type.toLowerCase() === value.toLowerCase())
}

export function buildHireOnboardingPath({ token }: BuildHireOnboardingPathArgs): string {
  const trimmedToken = token.trim()
  return `/onboarding/hire/${encodeURIComponent(trimmedToken)}`
}

export function getOnboardingBoundaryRoute({ token, type }: GetOnboardingRouteArgs): string | undefined {
  const normalizedToken = normalizeSearchParam(token)
  if (normalizedToken) return buildHireOnboardingPath({ token: normalizedToken })

  const normalizedType = normalizePersonaOnboardingType({ value: type })
  if (normalizedType) return `/onboarding?type=${encodeURIComponent(normalizedType)}`

  return undefined
}

export function isLikelyOnboardingToken(value: string): boolean {
  const trimmed = value.trim()
  if (!trimmed) return false
  if (isPersonaOnboardingType(trimmed)) return false
  if (["hire", "complete", "enhanced-onboarding-flow"].includes(trimmed)) return false

  return /^[A-Za-z0-9._~-]{16,}$/.test(trimmed)
}
