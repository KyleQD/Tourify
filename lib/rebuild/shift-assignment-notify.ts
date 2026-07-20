/**
 * In-app notifications for staff shift assignment, updates, cancellation, and worker responses.
 */

import { OptimizedNotificationService } from "@/lib/services/optimized-notification-service"
import {
  entityNotificationTarget,
  generalNotificationTarget,
} from "@/lib/notifications/notification-target"

export interface ShiftNotifyBase {
  workerUserId: string
  shiftId: string
  staffMemberId?: string | null
  roleTitle?: string | null
  shiftDate?: string | null
  startTime?: string | null
  endTime?: string | null
  eventName?: string | null
  employerName?: string | null
  employerEntityType?: string | null
  employerEntityId?: string | null
  assignmentId?: string | null
}

export interface ShiftResponseNotifyContext {
  adminUserId: string
  workerName?: string | null
  action: "accept" | "decline"
  shiftId: string
  staffMemberId?: string | null
  roleTitle?: string | null
  shiftDate?: string | null
  assignmentId?: string | null
  employerEntityType?: string | null
  employerEntityId?: string | null
}

function formatShiftWindow(ctx: Pick<ShiftNotifyBase, "shiftDate" | "startTime" | "endTime">): string {
  const date = ctx.shiftDate ?? "upcoming"
  if (ctx.startTime && ctx.endTime) return `${date} ${ctx.startTime}–${ctx.endTime}`
  return date
}

export async function sendShiftAssignmentNotification(
  ctx: ShiftNotifyBase
): Promise<{ sent: boolean }> {
  const role = ctx.roleTitle ? ` as ${ctx.roleTitle}` : ""
  const employer = ctx.employerName ? ` for ${ctx.employerName}` : ""
  const window = formatShiftWindow(ctx)
  const title = "New shift assignment"
  const content = `You've been assigned a shift${role}${employer} on ${window}. Open Work Mode to accept or decline.`

  try {
    await OptimizedNotificationService.createNotification({
      userId: ctx.workerUserId,
      type: "shift_assignment_invite",
      title,
      content,
      priority: "high",
      ...generalNotificationTarget(ctx.workerUserId),
      metadata: {
        shift_id: ctx.shiftId,
        staff_member_id: ctx.staffMemberId ?? null,
        assignment_id: ctx.assignmentId ?? null,
        role_title: ctx.roleTitle ?? null,
        shift_date: ctx.shiftDate ?? null,
        start_time: ctx.startTime ?? null,
        end_time: ctx.endTime ?? null,
        event_name: ctx.eventName ?? null,
        employer_name: ctx.employerName ?? null,
        employer_entity_type: ctx.employerEntityType ?? null,
        employer_entity_id: ctx.employerEntityId ?? null,
        link: "/dashboard/staff-ops",
      },
    })
    return { sent: true }
  } catch (err) {
    console.warn("[shift-assignment-notify] Failed to send invite:", err)
    return { sent: false }
  }
}

export async function sendShiftUpdateNotification(
  ctx: ShiftNotifyBase & { changeSummary?: string | null }
): Promise<{ sent: boolean }> {
  const window = formatShiftWindow(ctx)
  const summary = ctx.changeSummary?.trim() || "details were updated"
  const title = "Shift updated"
  const content = `Your shift on ${window} ${summary}. Review the latest details in Work Mode.`

  try {
    await OptimizedNotificationService.createNotification({
      userId: ctx.workerUserId,
      type: "shift_assignment_updated",
      title,
      content,
      priority: "normal",
      ...generalNotificationTarget(ctx.workerUserId),
      metadata: {
        shift_id: ctx.shiftId,
        staff_member_id: ctx.staffMemberId ?? null,
        assignment_id: ctx.assignmentId ?? null,
        role_title: ctx.roleTitle ?? null,
        shift_date: ctx.shiftDate ?? null,
        start_time: ctx.startTime ?? null,
        end_time: ctx.endTime ?? null,
        employer_name: ctx.employerName ?? null,
        link: "/messages?tab=work",
      },
    })
    return { sent: true }
  } catch (err) {
    console.warn("[shift-assignment-notify] Failed to send update:", err)
    return { sent: false }
  }
}

export async function sendShiftCancelledNotification(
  ctx: ShiftNotifyBase
): Promise<{ sent: boolean }> {
  const window = formatShiftWindow(ctx)
  const role = ctx.roleTitle ? ` (${ctx.roleTitle})` : ""
  const title = "Shift cancelled"
  const content = `Your shift${role} on ${window} was cancelled.`

  try {
    await OptimizedNotificationService.createNotification({
      userId: ctx.workerUserId,
      type: "shift_assignment_cancelled",
      title,
      content,
      priority: "high",
      ...generalNotificationTarget(ctx.workerUserId),
      metadata: {
        shift_id: ctx.shiftId,
        staff_member_id: ctx.staffMemberId ?? null,
        assignment_id: ctx.assignmentId ?? null,
        role_title: ctx.roleTitle ?? null,
        shift_date: ctx.shiftDate ?? null,
        link: "/messages?tab=work",
      },
    })
    return { sent: true }
  } catch (err) {
    console.warn("[shift-assignment-notify] Failed to send cancellation:", err)
    return { sent: false }
  }
}

export async function sendShiftResponseNotification(
  ctx: ShiftResponseNotifyContext
): Promise<{ sent: boolean }> {
  const worker = ctx.workerName?.trim() || "A staff member"
  const role = ctx.roleTitle ? ` (${ctx.roleTitle})` : ""
  const date = ctx.shiftDate ? ` on ${ctx.shiftDate}` : ""
  const verb = ctx.action === "accept" ? "accepted" : "declined"
  const title = ctx.action === "accept" ? "Shift accepted" : "Shift declined"
  const content = `${worker} ${verb} their shift assignment${role}${date}.`

  try {
    const adminTarget = entityNotificationTarget({
      entityType: ctx.employerEntityType,
      entityId: ctx.employerEntityId,
      fallbackUserId: ctx.adminUserId,
    })
    await OptimizedNotificationService.createNotification({
      userId: ctx.adminUserId,
      type: "shift_assignment_response",
      title,
      content,
      priority: "normal",
      ...adminTarget,
      metadata: {
        shift_id: ctx.shiftId,
        staff_member_id: ctx.staffMemberId ?? null,
        assignment_id: ctx.assignmentId ?? null,
        action: ctx.action,
        role_title: ctx.roleTitle ?? null,
        shift_date: ctx.shiftDate ?? null,
        employer_entity_type: ctx.employerEntityType ?? null,
        employer_entity_id: ctx.employerEntityId ?? null,
        link: "/admin/dashboard/staff?tab=scheduling",
      },
    })
    return { sent: true }
  } catch (err) {
    console.warn("[shift-assignment-notify] Failed to send response notify:", err)
    return { sent: false }
  }
}
