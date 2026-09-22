import "server-only"

import {
  AdminTourEventOperationsService,
  getAdminTourEventErrorStatus,
} from "@/lib/admin/tour-event-operations.service"
import {
  getTourAccessErrorStatus,
  requireTourAccess,
  requireTourCapability,
  resolveTourAccess,
  TourAccessDeniedError,
  TourCapabilityDeniedError,
  type ResolveTourAccessInput,
  type RequireTourCapabilityInput,
  type TourAccessRecord,
} from "@/lib/admin/tour-access.service"
import {
  EventAccessDeniedError,
  EventCapabilityDeniedError,
  getEventAccessErrorStatus,
  requireEventAccess,
  requireEventCapability,
  requireEventChildAccess,
  resolveEventAccess,
  type EventAccessRecord,
  type RequireEventCapabilityInput,
  type ResolveEventAccessInput,
} from "@/lib/admin/event-access.service"

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

/**
 * Legacy-compatible tour gate used by admin + `/api/tours/*` delegates.
 * Authority is resolved by the TOUR-102 canonical access service inside getTour.
 */
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

/** Authority-only check (no event fanout) — prefer for mutations that only need a gate. */
export async function assertTourAuthority(args: ResolveTourAccessInput): Promise<TourAccessRecord> {
  return requireTourAccess(args)
}

/** Authority-only event gate (no tour assignment fanout). */
export async function assertEventAuthority(args: ResolveEventAccessInput): Promise<EventAccessRecord> {
  return requireEventAccess(args)
}

export {
  resolveTourAccess,
  requireTourAccess,
  requireTourCapability,
  getTourAccessErrorStatus,
  TourAccessDeniedError,
  TourCapabilityDeniedError,
  resolveEventAccess,
  requireEventAccess,
  requireEventCapability,
  requireEventChildAccess,
  getEventAccessErrorStatus,
  EventAccessDeniedError,
  EventCapabilityDeniedError,
}
export type {
  ResolveTourAccessInput,
  RequireTourCapabilityInput,
  TourAccessRecord,
  ResolveEventAccessInput,
  RequireEventCapabilityInput,
  EventAccessRecord,
}

export function adminAccessErrorResponse(error: unknown, fallbackMessage: string, fallbackStatus = 500) {
  const status = getAdminTourEventErrorStatus(
    error,
    getEventAccessErrorStatus(error, getTourAccessErrorStatus(error, fallbackStatus)),
  )
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
