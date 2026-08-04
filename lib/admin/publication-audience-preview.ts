/**
 * PUB-203 — Audience preview before publication confirmation.
 */

import type { PublicationAudienceClass, PublicationDeliveryChannel } from "@/lib/admin/publication-schema"

export interface AudienceCandidate {
  subjectType: "user" | "email" | "vendor" | "role_group"
  subjectId: string
  displayName: string
  role?: string | null
  source: string
  audienceClass: PublicationAudienceClass
  channels: PublicationDeliveryChannel[]
  protectedFields: string[]
  excluded?: boolean
  excludeReason?: string
}

export interface AudiencePreviewInput {
  publicationType: string
  candidates: AudienceCandidate[]
  channelAvailability: Partial<Record<PublicationDeliveryChannel, boolean>>
}

export interface AudiencePreviewResult {
  totalCandidates: number
  includedCount: number
  excludedCount: number
  byRole: Record<string, number>
  bySource: Record<string, number>
  excluded: Array<{ subjectId: string; displayName: string; reason: string }>
  protectedFields: string[]
  channelAvailability: Record<PublicationDeliveryChannel, { available: boolean; recipientCount: number }>
  recipients: AudienceCandidate[]
}

const ALL_CHANNELS: PublicationDeliveryChannel[] = ["in_app", "email", "sms", "push"]

export function buildPublicationAudiencePreview(
  input: AudiencePreviewInput,
): AudiencePreviewResult {
  const included = input.candidates.filter((row) => !row.excluded)
  const excluded = input.candidates.filter((row) => row.excluded)

  const byRole: Record<string, number> = {}
  const bySource: Record<string, number> = {}
  const protectedFields = new Set<string>()

  for (const row of included) {
    const role = row.role || "unspecified"
    byRole[role] = (byRole[role] || 0) + 1
    bySource[row.source] = (bySource[row.source] || 0) + 1
    for (const field of row.protectedFields) protectedFields.add(field)
  }

  const channelAvailability = {} as AudiencePreviewResult["channelAvailability"]
  for (const channel of ALL_CHANNELS) {
    const available = input.channelAvailability[channel] !== false
    const recipientCount = included.filter(
      (row) => available && row.channels.includes(channel),
    ).length
    channelAvailability[channel] = { available, recipientCount }
  }

  return {
    totalCandidates: input.candidates.length,
    includedCount: included.length,
    excludedCount: excluded.length,
    byRole,
    bySource,
    excluded: excluded.map((row) => ({
      subjectId: row.subjectId,
      displayName: row.displayName,
      reason: row.excludeReason || "excluded",
    })),
    protectedFields: [...protectedFields].sort(),
    channelAvailability,
    recipients: included,
  }
}
