import type { StaffOperationsTask } from "@/types/staff-operations"

const PRIORITY_WEIGHT = { critical: 0, high: 1, normal: 2, low: 3 } as const

function dayKey(value: string | null): string | null {
  if (!value) return null
  const date = new Date(value)
  return Number.isFinite(date.getTime()) ? date.toISOString().slice(0, 10) : null
}

export function staffOperationsTaskBucket(task: StaffOperationsTask, now = new Date()): number {
  const today = now.toISOString().slice(0, 10)
  if (task.priority === "critical" && task.isOverdue) return 0
  if (task.priority === "critical") return 1
  if (task.source === "request" && task.priority === "high" && task.status === "pending") return 2
  if (dayKey(task.dueAt) === today) return 3
  if (task.source === "scheduling" && task.status === "open") return 4
  return 5
}

export function rankStaffOperationsTasks(
  tasks: StaffOperationsTask[],
  now = new Date(),
): StaffOperationsTask[] {
  return [...tasks].sort((left, right) => {
    const bucket = staffOperationsTaskBucket(left, now) - staffOperationsTaskBucket(right, now)
    if (bucket !== 0) return bucket

    const priority = PRIORITY_WEIGHT[left.priority] - PRIORITY_WEIGHT[right.priority]
    if (priority !== 0) return priority

    const leftDue = left.dueAt ? new Date(left.dueAt).getTime() : Number.POSITIVE_INFINITY
    const rightDue = right.dueAt ? new Date(right.dueAt).getTime() : Number.POSITIVE_INFINITY
    if (leftDue !== rightDue) return leftDue - rightDue
    return left.id.localeCompare(right.id)
  })
}

