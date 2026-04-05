interface CreatorCapabilitiesV1Input {
  creatorType?: unknown
  serviceOfferings?: unknown
  productsForSale?: unknown
  credentials?: unknown
  workHighlights?: unknown
  availableForHire?: unknown
  collaborationInterest?: unknown
  availability?: unknown
  preferredContact?: unknown
}

export interface CreatorCapabilitiesV1 {
  version: 'v1'
  creatorType: string | null
  serviceOfferings: string[]
  productsForSale: string[]
  credentials: string[]
  workHighlights: string[]
  availableForHire: boolean
  collaborationInterest: boolean
  availability: string | null
  preferredContact: string | null
}

function normalizeOptionalText(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length ? trimmed : null
}

function uniqueNonEmpty(values: string[]): string[] {
  const seen = new Set<string>()
  const normalized: string[] = []

  for (const rawValue of values) {
    const value = rawValue.trim()
    if (!value) continue
    const key = value.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    normalized.push(value)
  }

  return normalized
}

export function parseCapabilityList(value: unknown, maxItems = 24): string[] {
  if (Array.isArray(value)) {
    return uniqueNonEmpty(value.map(item => String(item))).slice(0, maxItems)
  }

  if (typeof value !== 'string') return []

  const normalizedText = value
    .replace(/\r\n/g, '\n')
    .replace(/[•·]/g, '\n')
    .replace(/\s*\|\s*/g, '\n')

  const chunks = normalizedText
    .split(/[\n,;]+/)
    .map(item => item.replace(/^\s*[-*]\s*/, '').trim())
    .filter(Boolean)

  return uniqueNonEmpty(chunks).slice(0, maxItems)
}

export function serializeCapabilityList(values: unknown): string {
  return parseCapabilityList(values).join(', ')
}

export function buildCreatorCapabilitiesV1(input: CreatorCapabilitiesV1Input): CreatorCapabilitiesV1 {
  return {
    version: 'v1',
    creatorType: normalizeOptionalText(input.creatorType),
    serviceOfferings: parseCapabilityList(input.serviceOfferings),
    productsForSale: parseCapabilityList(input.productsForSale),
    credentials: parseCapabilityList(input.credentials),
    workHighlights: parseCapabilityList(input.workHighlights),
    availableForHire: Boolean(input.availableForHire),
    collaborationInterest: Boolean(input.collaborationInterest),
    availability: normalizeOptionalText(input.availability),
    preferredContact: normalizeOptionalText(input.preferredContact),
  }
}

export function extractCreatorCapabilitiesV1(settings: unknown): CreatorCapabilitiesV1 {
  const safeSettings = settings && typeof settings === 'object' ? (settings as Record<string, unknown>) : {}
  const professional = safeSettings.professional && typeof safeSettings.professional === 'object'
    ? (safeSettings.professional as Record<string, unknown>)
    : {}
  const preferences = safeSettings.preferences && typeof safeSettings.preferences === 'object'
    ? (safeSettings.preferences as Record<string, unknown>)
    : {}
  const capabilities = safeSettings.capabilities_v1 && typeof safeSettings.capabilities_v1 === 'object'
    ? (safeSettings.capabilities_v1 as Record<string, unknown>)
    : {}

  return buildCreatorCapabilitiesV1({
    creatorType: capabilities.creatorType || professional.creator_type || professional.music_style,
    serviceOfferings: capabilities.serviceOfferings || professional.service_offerings || professional.equipment,
    productsForSale: capabilities.productsForSale || professional.products_for_sale || professional.upcoming_releases,
    credentials: capabilities.credentials,
    workHighlights: capabilities.workHighlights || professional.notable_performances,
    availableForHire: capabilities.availableForHire ?? preferences.available_for_hire,
    collaborationInterest: capabilities.collaborationInterest ?? preferences.collaboration_interest,
    availability: capabilities.availability || professional.availability,
    preferredContact: capabilities.preferredContact || preferences.preferred_contact,
  })
}
