import "server-only"

import {
  AdminTourEventOperationsService,
  getAdminTourEventErrorStatus,
} from "@/lib/admin/tour-event-operations.service"

type SupabaseLike = { from: (table: string) => any }

export async function assertAdminEventAccess(args: {
  supabase: SupabaseLike
  userId: string
  eventId: string
  orgId?: string
}) {
  return AdminTourEventOperationsService.getEvent({
    supabase: args.supabase,
    userId: args.userId,
    eventId: args.eventId,
    orgId: args.orgId,
  })
}

export async function assertAdminTourAccess(args: {
  supabase: SupabaseLike
  userId: string
  tourId: string
  orgId?: string
}) {
  return AdminTourEventOperationsService.getTour({
    supabase: args.supabase,
    userId: args.userId,
    tourId: args.tourId,
    orgId: args.orgId,
  })
}

export function adminAccessErrorResponse(error: unknown, fallbackMessage: string, fallbackStatus = 500) {
  const status = getAdminTourEventErrorStatus(error, fallbackStatus)
  const message =
    error && typeof error === "object" && "message" in error
      ? String((error as { message?: unknown }).message || fallbackMessage)
      : fallbackMessage
  return { status, message }
}

export function extractIdFromPath(url: string, segment: "events" | "tours"): string | null {
  const segments = new URL(url).pathname.split("/")
  const index = segments.indexOf(segment)
  return index >= 0 ? segments[index + 1] || null : null
}
