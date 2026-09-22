/**
 * PUB-102 — Canonical publication schema contracts (types + validators).
 * Mirrors supabase/migrations/20260720171000_admin_publication_schema_pub102.sql
 */

export const PUBLICATION_TYPES = [
  "tour_book",
  "itinerary",
  "advance_request",
  "advance_response",
  "day_sheet",
  "run_of_show",
  "schedule",
  "site_map",
  "contact_sheet",
  "travel_brief",
  "change_notice",
  "emergency_notice",
] as const

export type PublicationType = (typeof PUBLICATION_TYPES)[number]

export const PUBLICATION_AUDIENCE_CLASSES = [
  "internal",
  "worker",
  "department",
  "vendor",
  "public",
  "financial",
  "personnel",
  "sensitive_traveler",
] as const

export type PublicationAudienceClass = (typeof PUBLICATION_AUDIENCE_CLASSES)[number]

export const PUBLICATION_SNAPSHOT_STATUSES = [
  "draft",
  "committed",
  "superseded",
  "retracted",
] as const

export type PublicationSnapshotStatus = (typeof PUBLICATION_SNAPSHOT_STATUSES)[number]

export const PUBLICATION_DELIVERY_CHANNELS = ["in_app", "email", "sms", "push"] as const

export type PublicationDeliveryChannel = (typeof PUBLICATION_DELIVERY_CHANNELS)[number]

export const PUBLICATION_DELIVERY_STATUSES = [
  "queued",
  "processing",
  "delivered",
  "opened",
  "acknowledged",
  "failed",
  "suppressed",
  "expired",
  "revoked",
] as const

export type PublicationDeliveryStatus = (typeof PUBLICATION_DELIVERY_STATUSES)[number]

export const PUBLICATION_SUBJECT_TYPES = [
  "user",
  "email",
  "vendor",
  "external_contact",
  "share_link",
  "role_group",
] as const

export type PublicationSubjectType = (typeof PUBLICATION_SUBJECT_TYPES)[number]

export const PUBLICATION_ACCESS_ACTIONS = [
  "view",
  "download",
  "denied",
  "passcode_failed",
  "revoked_hit",
  "expired_hit",
  "superseded_hit",
] as const

export type PublicationAccessAction = (typeof PUBLICATION_ACCESS_ACTIONS)[number]

/** Tables created for PUB-102 (plus PUB-101 outbox relation). */
export const PUBLICATION_SCHEMA_TABLES = [
  "admin_publication_snapshots",
  "admin_publication_sections",
  "admin_publication_audiences",
  "admin_publication_recipients",
  "admin_publication_deliveries",
  "admin_publication_acknowledgements",
  "admin_publication_share_tokens",
  "admin_publication_access_logs",
  "admin_publication_ownership_quarantine",
  "admin_publication_outbox",
  "admin_domain_transactions",
] as const

export type PublicationSchemaTable = (typeof PUBLICATION_SCHEMA_TABLES)[number]

export function isPublicationType(value: string): value is PublicationType {
  return (PUBLICATION_TYPES as readonly string[]).includes(value)
}

export function isPublicationAudienceClass(value: string): value is PublicationAudienceClass {
  return (PUBLICATION_AUDIENCE_CLASSES as readonly string[]).includes(value)
}

export function isPublicationDeliveryChannel(value: string): value is PublicationDeliveryChannel {
  return (PUBLICATION_DELIVERY_CHANNELS as readonly string[]).includes(value)
}

export function isPublicationDeliveryStatus(value: string): value is PublicationDeliveryStatus {
  return (PUBLICATION_DELIVERY_STATUSES as readonly string[]).includes(value)
}

/**
 * Highest-sensitivity class wins when composing a snapshot classification.
 * Order: public < worker < department < vendor < internal < personnel < financial < sensitive_traveler
 */
const AUDIENCE_CLASS_RANK: Record<PublicationAudienceClass, number> = {
  public: 10,
  worker: 20,
  department: 30,
  vendor: 40,
  internal: 50,
  personnel: 60,
  financial: 70,
  sensitive_traveler: 80,
}

export function elevatePublicationAudienceClass(
  current: PublicationAudienceClass,
  next: PublicationAudienceClass,
): PublicationAudienceClass {
  return AUDIENCE_CLASS_RANK[next] > AUDIENCE_CLASS_RANK[current] ? next : current
}

export function resolveSnapshotAccessClassification(
  sectionClasses: PublicationAudienceClass[],
): PublicationAudienceClass {
  if (sectionClasses.length === 0) return "worker"
  return sectionClasses.reduce((acc, cls) => elevatePublicationAudienceClass(acc, cls), "public")
}

export interface PublicationSchemaRelationCheck {
  table: PublicationSchemaTable
  orgScoped: boolean
  relatesToOutbox: boolean
}

export const PUBLICATION_SCHEMA_RELATIONS: PublicationSchemaRelationCheck[] = [
  { table: "admin_publication_snapshots", orgScoped: true, relatesToOutbox: true },
  { table: "admin_publication_sections", orgScoped: true, relatesToOutbox: false },
  { table: "admin_publication_audiences", orgScoped: true, relatesToOutbox: false },
  { table: "admin_publication_recipients", orgScoped: true, relatesToOutbox: false },
  { table: "admin_publication_deliveries", orgScoped: true, relatesToOutbox: true },
  { table: "admin_publication_acknowledgements", orgScoped: true, relatesToOutbox: false },
  { table: "admin_publication_share_tokens", orgScoped: true, relatesToOutbox: false },
  { table: "admin_publication_access_logs", orgScoped: true, relatesToOutbox: false },
  { table: "admin_publication_ownership_quarantine", orgScoped: true, relatesToOutbox: false },
  { table: "admin_publication_outbox", orgScoped: true, relatesToOutbox: true },
  { table: "admin_domain_transactions", orgScoped: true, relatesToOutbox: true },
]
