export const WORKFORCE_NOTIFICATION_TYPES = [
  "workflow_task_completed",
  "event_task_completed",
  "task_completed",
  "shift_assignment_response",
  "staff_time_off_request",
  "workforce_availability_request",
  "shift_swap_request",
  "shift_drop_request",
  "shift_pickup_request",
  "workforce_request_submitted",
] as const

export function isWorkforceNotificationType(value: string): boolean {
  return (WORKFORCE_NOTIFICATION_TYPES as readonly string[]).includes(value)
}
