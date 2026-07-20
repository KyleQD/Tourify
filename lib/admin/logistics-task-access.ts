import "server-only"

import { z } from "zod"

import { assertAdminEventAccess, assertAdminTourAccess } from "@/lib/admin/admin-tour-event-access"
import { getAdminTourEventErrorStatus } from "@/lib/admin/tour-event-operations.service"

type SupabaseLike = { from: (table: string) => any }

export interface AdminLogisticsTaskScope {
  id: string
  event_id: string | null
  tour_id: string | null
  created_by: string | null
}

export function getAdminLogisticsErrorStatus(error: unknown, fallback = 500) {
  const inheritedStatus = getAdminTourEventErrorStatus(error, fallback)
  if (inheritedStatus !== fallback) return inheritedStatus
  const message = error instanceof Error ? error.message : ""
  if (/not found/i.test(message)) return 404
  if (/acting organization|not available/i.test(message)) return 403
  return fallback
}

export async function assertAdminLogisticsTaskAccess(args: {
  supabase: SupabaseLike
  userId: string
  orgId: string
  taskId: string
}): Promise<AdminLogisticsTaskScope> {
  const taskId = z.string().uuid().parse(args.taskId)
  const { data, error } = await args.supabase
    .from("logistics_tasks")
    .select("id, event_id, tour_id, created_by")
    .eq("id", taskId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) throw new Error("Logistics task not found.")

  if (data.tour_id) {
    await assertAdminTourAccess({
      supabase: args.supabase,
      userId: args.userId,
      orgId: args.orgId,
      tourId: data.tour_id,
    })
  }
  if (data.event_id) {
    await assertAdminEventAccess({
      supabase: args.supabase,
      userId: args.userId,
      orgId: args.orgId,
      eventId: data.event_id,
    })
  }
  if (!data.tour_id && !data.event_id && data.created_by !== args.userId) {
    throw new Error("Logistics task is not available to the acting organization.")
  }

  return data as AdminLogisticsTaskScope
}

export async function assertAdminLogisticsTasksAccess(args: {
  supabase: SupabaseLike
  userId: string
  orgId: string
  taskIds: string[]
}) {
  const taskIds = z.array(z.string().uuid()).min(1).max(200).parse(args.taskIds)
  const { data, error } = await args.supabase
    .from("logistics_tasks")
    .select("id, event_id, tour_id, created_by")
    .in("id", taskIds)
  if (error) throw new Error(error.message)
  if ((data ?? []).length !== new Set(taskIds).size) throw new Error("One or more logistics tasks were not found.")

  const tasks = (data ?? []) as AdminLogisticsTaskScope[]
  const tourIds = Array.from(new Set(tasks.flatMap(task => task.tour_id ? [task.tour_id] : [])))
  const eventIds = Array.from(new Set(tasks.flatMap(task => task.event_id ? [task.event_id] : [])))
  const unauthorizedUnscoped = tasks.some(
    task => !task.tour_id && !task.event_id && task.created_by !== args.userId,
  )
  if (unauthorizedUnscoped) throw new Error("A logistics task is not available to the acting organization.")

  await Promise.all([
    ...tourIds.map(tourId => assertAdminTourAccess({ supabase: args.supabase, userId: args.userId, orgId: args.orgId, tourId })),
    ...eventIds.map(eventId => assertAdminEventAccess({ supabase: args.supabase, userId: args.userId, orgId: args.orgId, eventId })),
  ])
  return taskIds
}
