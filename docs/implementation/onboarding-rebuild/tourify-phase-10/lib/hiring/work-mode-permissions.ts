import type { WorkModePermissions } from "@/types/hiring-roster-work-mode"

interface ResolveWorkModePermissionsArgs {
  position?: string | null
  department?: string | null
  roleCategory?: string | null
  existingPermissions?: Partial<WorkModePermissions> | null
}

const BASE_WORK_MODE_PERMISSIONS: WorkModePermissions = {
  view_shift_schedule: true,
  check_in_out: true,
  view_run_sheet: false,
  post_official_comms: false,
  manage_other_staff: false,
  access_staff_docs: "own",
  view_private_contacts: false,
  verify_documents: false,
  assign_zones: false,
  export_roster: false,
}

const MANAGER_WORK_MODE_PERMISSIONS: WorkModePermissions = {
  view_shift_schedule: true,
  check_in_out: true,
  view_run_sheet: true,
  post_official_comms: true,
  manage_other_staff: true,
  access_staff_docs: "team",
  view_private_contacts: true,
  verify_documents: true,
  assign_zones: true,
  export_roster: true,
}

const SECURITY_WORK_MODE_PERMISSIONS: WorkModePermissions = {
  view_shift_schedule: true,
  check_in_out: true,
  view_run_sheet: "limited",
  post_official_comms: false,
  manage_other_staff: false,
  access_staff_docs: "own",
  view_private_contacts: false,
  verify_documents: false,
  assign_zones: false,
  export_roster: false,
}

const TECHNICAL_WORK_MODE_PERMISSIONS: WorkModePermissions = {
  view_shift_schedule: true,
  check_in_out: true,
  view_run_sheet: true,
  post_official_comms: false,
  manage_other_staff: false,
  access_staff_docs: "own",
  view_private_contacts: false,
  verify_documents: false,
  assign_zones: false,
  export_roster: false,
}

const MERCH_WORK_MODE_PERMISSIONS: WorkModePermissions = {
  view_shift_schedule: true,
  check_in_out: true,
  view_run_sheet: "limited",
  post_official_comms: false,
  manage_other_staff: false,
  access_staff_docs: "own",
  view_private_contacts: false,
  verify_documents: false,
  assign_zones: false,
  export_roster: false,
}

function normalize(value?: string | null): string {
  return value?.toLowerCase().trim() ?? ""
}

function mergePermissions(
  base: WorkModePermissions,
  overrides?: Partial<WorkModePermissions> | null
): WorkModePermissions {
  return {
    ...base,
    ...(overrides ?? {}),
  }
}

export function resolveWorkModePermissions({
  position,
  department,
  roleCategory,
  existingPermissions,
}: ResolveWorkModePermissionsArgs): WorkModePermissions {
  const normalizedPosition = normalize(position)
  const normalizedDepartment = normalize(department)
  const normalizedCategory = normalize(roleCategory)

  const combined = [normalizedPosition, normalizedDepartment, normalizedCategory].join(" ")

  if (
    combined.includes("manager") ||
    combined.includes("lead") ||
    combined.includes("captain") ||
    combined.includes("director") ||
    combined.includes("tour manager") ||
    combined.includes("venue manager")
  ) {
    return mergePermissions(MANAGER_WORK_MODE_PERMISSIONS, existingPermissions)
  }

  if (combined.includes("security") || combined.includes("guard")) {
    return mergePermissions(SECURITY_WORK_MODE_PERMISSIONS, existingPermissions)
  }

  if (
    combined.includes("foh") ||
    combined.includes("sound") ||
    combined.includes("audio") ||
    combined.includes("lighting") ||
    combined.includes("stage") ||
    combined.includes("production") ||
    combined.includes("tech")
  ) {
    return mergePermissions(TECHNICAL_WORK_MODE_PERMISSIONS, existingPermissions)
  }

  if (combined.includes("merch") || combined.includes("seller")) {
    return mergePermissions(MERCH_WORK_MODE_PERMISSIONS, existingPermissions)
  }

  return mergePermissions(BASE_WORK_MODE_PERMISSIONS, existingPermissions)
}

export function getWorkModePermissionLabels(permissions: WorkModePermissions): string[] {
  const labels: string[] = []

  if (permissions.view_shift_schedule) labels.push("View shift schedule")
  if (permissions.check_in_out) labels.push("Check in/out")
  if (permissions.view_run_sheet === true) labels.push("View full run sheet")
  if (permissions.view_run_sheet === "limited") labels.push("View limited run sheet")
  if (permissions.post_official_comms) labels.push("Post official comms")
  if (permissions.manage_other_staff) labels.push("Manage staff")
  if (permissions.access_staff_docs === "team") labels.push("Access team docs")
  if (permissions.access_staff_docs === "own") labels.push("Access own docs")
  if (permissions.verify_documents) labels.push("Verify documents")
  if (permissions.assign_zones) labels.push("Assign zones")
  if (permissions.export_roster) labels.push("Export roster")

  return labels
}
