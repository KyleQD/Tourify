/**
 * PUB-204 — Pure helpers for transactional publication commit.
 * Snapshot + audience + deliveries packaged for atomic RPC commit.
 */

import {
  buildPublicationAudiencePreview,
  type AudienceCandidate,
  type AudiencePreviewResult,
} from "@/lib/admin/publication-audience-preview"
import {
  elevatePublicationAudienceClass,
  resolveSnapshotAccessClassification,
  type PublicationAudienceClass,
  type PublicationDeliveryChannel,
  type PublicationType,
} from "@/lib/admin/publication-schema"
import {
  renderPublicationSnapshot,
  type SnapshotRenderResult,
  type SnapshotSectionInput,
} from "@/lib/admin/publication-snapshot-renderer"

export interface TransactionalPublishSectionRow {
  section_key: string
  audience_class: PublicationAudienceClass
  source_ref: Record<string, unknown>
  payload: unknown
  checksum: string
  ordinal: number
}

export interface TransactionalPublishRecipientRow {
  subject_type: AudienceCandidate["subjectType"] | "external_contact" | "share_link"
  subject_key: string
  display_name: string | null
  channel_hints: PublicationDeliveryChannel[]
  exclusion_reason: string | null
}

export interface TransactionalPublishDeliveryRow {
  subject_type: string
  subject_key: string
  channel: PublicationDeliveryChannel
}

export interface TransactionalPublishLifecycle {
  tour_id: string
  set_status: "active"
}

export interface TransactionalPublishAssembly {
  snapshot: {
    tour_id: string | null
    event_id: string | null
    publication_type: PublicationType
    title: string
    sequence: number
    version: number
    source_plan_version: number
    checksum: string
    access_classification: PublicationAudienceClass
    projection_policy: Record<string, unknown>
    projection_version: string
    payload: Record<string, unknown>
  }
  sections: TransactionalPublishSectionRow[]
  audience: {
    definition: Record<string, unknown>
    recipient_count: number
    excluded_count: number
  }
  recipients: TransactionalPublishRecipientRow[]
  deliveries: TransactionalPublishDeliveryRow[]
  lifecycle: TransactionalPublishLifecycle | null
  preview: AudiencePreviewResult
  render: SnapshotRenderResult
}

export function buildPublicationCommitIdempotencyKey(input: {
  orgId: string
  publicationType: PublicationType
  subjectType: "tour" | "event"
  subjectId: string
  naturalKey: string
}): string {
  return [
    "pub.commit",
    input.orgId.trim(),
    input.publicationType,
    input.subjectType,
    input.subjectId.trim(),
    input.naturalKey.trim(),
  ].join(":")
}

export function buildDefaultTourBookSections(input: {
  tour: {
    id: string
    name: string
    start_date?: string | null
    end_date?: string | null
    settings?: Record<string, unknown> | null
  }
  stops: Array<{
    ordinal: number
    name: string
    local_date?: string | null
    venue_label?: string | null
    event_id?: string | null
  }>
}): SnapshotSectionInput[] {
  const settings =
    input.tour.settings && typeof input.tour.settings === "object" ? input.tour.settings : {}
  return [
    {
      key: "overview",
      title: "Tour overview",
      required: true,
      payload: {
        tourId: input.tour.id,
        name: input.tour.name,
        startDate: input.tour.start_date ?? null,
        endDate: input.tour.end_date ?? null,
        mainArtist: settings.main_artist ?? settings.mainArtist ?? null,
      },
    },
    {
      key: "itinerary",
      title: "Itinerary",
      required: true,
      payload: {
        stops: input.stops.map((stop) => ({
          ordinal: stop.ordinal,
          name: stop.name,
          localDate: stop.local_date ?? null,
          venueLabel: stop.venue_label ?? null,
          eventId: stop.event_id ?? null,
        })),
      },
    },
    {
      key: "contacts",
      title: "Contacts",
      required: false,
      allowExclude: true,
      payload: settings.crew ?? settings.contacts ?? null,
      excluded: !(settings.crew || settings.contacts),
      excludeReason: "not_configured",
    },
  ]
}

export function buildDefaultTourAudienceCandidates(input: {
  publisherUserId: string
  publisherDisplayName?: string | null
  settings?: Record<string, unknown> | null
}): AudienceCandidate[] {
  const candidates: AudienceCandidate[] = [
    {
      subjectType: "user",
      subjectId: input.publisherUserId,
      displayName: input.publisherDisplayName?.trim() || "Publisher",
      role: "publisher",
      source: "publisher",
      audienceClass: "internal",
      channels: ["in_app"],
      protectedFields: [],
    },
  ]

  const settings =
    input.settings && typeof input.settings === "object" ? input.settings : {}
  const crew = Array.isArray(settings.crew) ? settings.crew : []
  for (const raw of crew) {
    if (!raw || typeof raw !== "object") continue
    const row = raw as Record<string, unknown>
    const subjectId = String(row.userId || row.user_id || row.id || row.email || "").trim()
    if (!subjectId) continue
    const isEmail = subjectId.includes("@")
    candidates.push({
      subjectType: isEmail ? "email" : "user",
      subjectId,
      displayName: String(row.name || row.displayName || subjectId),
      role: String(row.role || "crew"),
      source: "tour.settings.crew",
      audienceClass: "worker",
      channels: isEmail ? ["email", "in_app"] : ["in_app"],
      protectedFields: ["personnel.contact"],
    })
  }

  return candidates
}

/**
 * Assemble immutable snapshot + audience + queued deliveries for atomic commit.
 */
export function assembleTransactionalPublish(input: {
  publicationType: PublicationType
  orgId: string
  subjectType: "tour" | "event"
  subjectId: string
  title: string
  sourcePlanVersion: number
  sequence?: number
  version?: number
  sections: SnapshotSectionInput[]
  candidates: AudienceCandidate[]
  channelAvailability?: Partial<Record<PublicationDeliveryChannel, boolean>>
  projectionPolicy?: Record<string, unknown>
  lifecycleTourId?: string | null
}): TransactionalPublishAssembly {
  const render = renderPublicationSnapshot({
    publicationType: input.publicationType,
    orgId: input.orgId,
    subjectType: input.subjectType,
    subjectId: input.subjectId,
    sourcePlanVersion: input.sourcePlanVersion,
    sections: input.sections,
  })
  if (!render.ok) {
    throw new TransactionalPublishValidationError(render.errors.join(" "))
  }

  const preview = buildPublicationAudiencePreview({
    publicationType: input.publicationType,
    candidates: input.candidates,
    channelAvailability: input.channelAvailability || { in_app: true, email: true },
  })

  const sectionClasses = render.manifest.sections
    .filter((section) => section.status === "included" && section.accessClassification)
    .map((section) => section.accessClassification as PublicationAudienceClass)
  const accessClassification = resolveSnapshotAccessClassification(sectionClasses)

  const sections: TransactionalPublishSectionRow[] = render.manifest.sections
    .filter((section) => section.status === "included" && section.checksum)
    .map((section, index) => ({
      section_key: section.key,
      audience_class: section.accessClassification as PublicationAudienceClass,
      source_ref: {
        subjectType: input.subjectType,
        subjectId: input.subjectId,
        sourcePlanVersion: input.sourcePlanVersion,
        sectionAudienceClass: section.audienceClass,
        fieldAudienceClasses: section.fieldAudienceClasses,
      },
      payload: render.body[section.key] ?? {},
      checksum: section.checksum as string,
      ordinal: index,
    }))

  const recipients: TransactionalPublishRecipientRow[] = input.candidates.map((row) => ({
    subject_type: row.subjectType,
    subject_key: row.subjectId,
    display_name: row.displayName,
    channel_hints: row.channels,
    exclusion_reason: row.excluded ? row.excludeReason || "excluded" : null,
  }))

  const deliveries: TransactionalPublishDeliveryRow[] = []
  for (const recipient of preview.recipients) {
    for (const channel of recipient.channels) {
      if (preview.channelAvailability[channel]?.available === false) continue
      deliveries.push({
        subject_type: recipient.subjectType,
        subject_key: recipient.subjectId,
        channel,
      })
    }
  }

  return {
    snapshot: {
      tour_id: input.subjectType === "tour" ? input.subjectId : null,
      event_id: input.subjectType === "event" ? input.subjectId : null,
      publication_type: input.publicationType,
      title: input.title,
      sequence: input.sequence ?? 1,
      version: input.version ?? 1,
      source_plan_version: input.sourcePlanVersion,
      checksum: render.checksum,
      access_classification: elevatePublicationAudienceClass(accessClassification, "worker"),
      projection_policy: input.projectionPolicy || { version: "v1" },
      projection_version: "v1",
      payload: {
        manifest: render.manifest,
        body: render.body,
      },
    },
    sections,
    audience: {
      definition: {
        publicationType: input.publicationType,
        byRole: preview.byRole,
        bySource: preview.bySource,
        protectedFields: preview.protectedFields,
        channelAvailability: preview.channelAvailability,
      },
      recipient_count: preview.includedCount,
      excluded_count: preview.excludedCount,
    },
    recipients,
    deliveries,
    lifecycle: input.lifecycleTourId
      ? { tour_id: input.lifecycleTourId, set_status: "active" }
      : null,
    preview,
    render,
  }
}

export class TransactionalPublishValidationError extends Error {
  status = 422

  constructor(message: string) {
    super(message)
    this.name = "TransactionalPublishValidationError"
  }
}

export interface TransactionalPublishResultView {
  snapshotId: string
  domainTransactionId: string | null
  outboxId: string | null
  alreadyExisted: boolean
  sequence: number
  version: number
  checksum: string
  correlationId: string
  status: "committed"
}
