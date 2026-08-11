export type StaffOperationsPriority = "low" | "normal" | "high" | "critical"

export interface StaffOperationsMetrics {
  activeStaff: number
  shiftsNextSevenDays: number
  openShifts: number
  pendingRequests: number
  unreadUpdates: number
  openConflicts: number
}

export interface StaffOperationsTask {
  id: string
  source: "event_task" | "logistics_task" | "scheduling" | "request" | "credential" | "attendance"
  kind: string
  title: string
  description: string | null
  priority: StaffOperationsPriority
  status: string
  dueAt: string | null
  actorName: string | null
  actionHref: string
  isOverdue: boolean
}

export interface StaffOperationsShiftSummary {
  id: string
  shiftDate: string
  startTime: string | null
  endTime: string | null
  role: string | null
  zone: string | null
  status: string
  isOpen: boolean
}

export interface StaffOperationsSummary {
  metrics: StaffOperationsMetrics
  topTasks: StaffOperationsTask[]
  upcomingShifts: StaffOperationsShiftSummary[]
  coverage: {
    filledShifts: number
    openShifts: number
    openConflicts: number
  }
  team: {
    active: number
    onLeave: number
    pending: number
  }
  freshAt: string
  unavailableSources?: string[]
}

export interface StaffOperationsChannel {
  id: string
  name: string
  description: string | null
  memberCount: number
  unreadCount: number
  lastMessage: string | null
  lastActivity: string | null
  role: "owner" | "admin" | "member"
}

export interface StaffOperationsChannelMember {
  userId: string
  name: string
  email: string | null
  role: string | null
  membershipRole?: "owner" | "admin" | "member"
}
