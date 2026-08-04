export type GeneralActionSource =
  | "applications"
  | "tickets"
  | "messages"
  | "profile"
  | "assignments"

export type GeneralActionSourceState = "ready" | "unavailable"

export interface GeneralActionItem {
  id: GeneralActionSource
  label: string
  description: string
  href: string
  count: number | null
  state: GeneralActionSourceState
  priority: "now" | "soon" | "complete"
}

export interface GeneralActionCenterPayload {
  items: GeneralActionItem[]
  generatedAt: string
  partial: boolean
}

export interface GeneralProfileSummary {
  fullName: string | null
  username: string | null
  bio: string | null
  avatarUrl: string | null
  location: string | null
}

const PROFILE_FIELDS: Array<keyof GeneralProfileSummary> = [
  "fullName",
  "username",
  "bio",
  "avatarUrl",
  "location",
]

export function profileCompletion(summary: GeneralProfileSummary | null): number {
  if (!summary) return 0
  const completed = PROFILE_FIELDS.filter((field) => {
    const value = summary[field]
    return typeof value === "string" && value.trim().length > 0
  }).length
  return Math.round((completed / PROFILE_FIELDS.length) * 100)
}

export function normalizeApplicationStatus(status: string | null): string {
  switch ((status ?? "submitted").toLowerCase()) {
    case "new":
    case "pending":
    case "applied":
      return "submitted"
    case "reviewing":
    case "under_review":
    case "screening":
      return "in_review"
    case "interview":
    case "interviewing":
      return "interview"
    case "approved":
    case "accepted":
    case "hired":
    case "offer_accepted":
      return "accepted"
    case "rejected":
    case "declined":
      return "declined"
    case "withdrawn":
    case "cancelled":
      return "withdrawn"
    default:
      return "submitted"
  }
}

export function applicationStatusLabel(status: string | null): string {
  return normalizeApplicationStatus(status).replaceAll("_", " ")
}
