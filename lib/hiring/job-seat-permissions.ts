import type { AdminCapability } from "@/lib/auth/admin-capabilities"

export type JobAssignmentScope = "organization" | "event" | "tour"

export interface JobSeatPermissionBundle {
  id: string
  label: string
  description: string
  capabilities: AdminCapability[]
}

export const JOB_SEAT_PERMISSION_BUNDLES: JobSeatPermissionBundle[] = [
  {
    id: "events-tours",
    label: "Events & tours",
    description: "View and update event and tour operations.",
    capabilities: ["event.view", "event.manage", "tour.view", "tour.manage"],
  },
  {
    id: "workforce",
    label: "Staff & hiring",
    description: "View staff, schedules, and hiring activity.",
    capabilities: ["workforce.view", "workforce.manage", "hiring.manage"],
  },
  {
    id: "merch-content",
    label: "Merch & content",
    description: "View and manage merchandise and organization content.",
    capabilities: ["content.view", "content.manage"],
  },
  {
    id: "ticketing",
    label: "Ticketing",
    description: "View ticketing activity and manage ticket operations.",
    capabilities: ["ticketing.view", "ticketing.manage"],
  },
  {
    id: "finance",
    label: "Financials",
    description: "View budgets and manage financial records.",
    capabilities: ["finance.view", "finance.manage"],
  },
  {
    id: "communications",
    label: "Communications",
    description: "Send team messages and organization broadcasts.",
    capabilities: ["communications.send", "communications.broadcast"],
  },
]

export const JOB_SEAT_CAPABILITIES = Array.from(
  new Set(JOB_SEAT_PERMISSION_BUNDLES.flatMap((bundle) => bundle.capabilities)),
)

export function getSelectedSeatBundleLabels(capabilities: readonly string[]): string[] {
  return JOB_SEAT_PERMISSION_BUNDLES
    .filter((bundle) => bundle.capabilities.every((capability) => capabilities.includes(capability)))
    .map((bundle) => bundle.label)
}
