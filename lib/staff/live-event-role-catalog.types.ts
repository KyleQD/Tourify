import type { RoleCategory, WorkModePermissions } from "@/lib/staff/role-templates"

export interface RoleCredentialDefinition {
  key: string
  label: string
  authority?: string
  isRequired: boolean
  isExpiryTracked: boolean
  jurisdictionDependent?: boolean
}

export interface LiveEventRoleDefinition {
  key: string
  label: string
  department: string
  role_category: RoleCategory
  employment_type: "full_time" | "part_time" | "contractor" | "volunteer" | "intern"
  job_summary: string
  duties: string[]
  qualifications: string[]
  required_credentials: RoleCredentialDefinition[]
  essentials: string[]
  workflow_requirements: {
    management_surfaces: string[]
    lifecycle: string[]
    requires_shift_assignment: boolean
    requires_check_in: boolean
    handoff_required: boolean
    incident_reporting: boolean
  }
  tags: string[]
  permissions?: WorkModePermissions
  required_documents?: string[]
  estimated_onboarding_days?: number
}

export function defineLiveEventRole(
  input: Omit<LiveEventRoleDefinition, "workflow_requirements" | "tags"> & {
    surfaces: string[]
    tags?: string[]
    shiftBased?: boolean
    handoffRequired?: boolean
  }
): LiveEventRoleDefinition {
  const {
    surfaces,
    tags = [],
    shiftBased = true,
    handoffRequired = true,
    ...role
  } = input

  return {
    ...role,
    workflow_requirements: {
      management_surfaces: Array.from(new Set([
        "workforce",
        "communications",
        ...surfaces,
      ])),
      lifecycle: ["plan", "staff", "schedule", "onboard", "execute", "handoff", "closeout"],
      requires_shift_assignment: shiftBased,
      requires_check_in: shiftBased,
      handoff_required: handoffRequired,
      incident_reporting: surfaces.includes("incident_reporting"),
    },
    tags: Array.from(
      new Set([
        role.department.toLowerCase().replace(/\s+/g, "-"),
        role.role_category,
        ...tags,
      ])
    ),
  }
}
