export const VENUE_BOOKING_LIFECYCLE_STATUSES = [
  "inquiry",
  "hold",
  "offer",
  "contract",
  "confirmed",
  "cancelled",
] as const

export type VenueBookingLifecycleStatus =
  (typeof VENUE_BOOKING_LIFECYCLE_STATUSES)[number]

/**
 * The canonical venue booking-request state machine.
 *
 * This is intentionally a request lifecycle, not an event-day lifecycle:
 * `confirmed` is the successful booking state (it may still be cancelled)
 * and event completion is owned by the event operations lifecycle. Keep this matrix in sync with
 * `transition_venue_booking_lifecycle` in the booking-lifecycle migration.
 */
export const VENUE_BOOKING_LIFECYCLE_TRANSITIONS = {
  inquiry: ["hold", "offer", "cancelled"],
  hold: ["inquiry", "offer", "cancelled"],
  offer: ["hold", "contract", "cancelled"],
  contract: ["offer", "confirmed", "cancelled"],
  confirmed: ["cancelled"],
  cancelled: [],
} as const satisfies Record<
  VenueBookingLifecycleStatus,
  readonly VenueBookingLifecycleStatus[]
>

export const VENUE_BOOKING_LIFECYCLE_TERMINAL_STATUSES = [
  "cancelled",
] as const satisfies readonly VenueBookingLifecycleStatus[]

export function isVenueBookingLifecycleStatus(
  value: string | null | undefined,
): value is VenueBookingLifecycleStatus {
  return (
    typeof value === "string" &&
    VENUE_BOOKING_LIFECYCLE_STATUSES.includes(value as VenueBookingLifecycleStatus)
  )
}

export function isVenueBookingLifecycleEnabled() {
  return process.env.FEATURE_VENUE_BOOKING_LIFECYCLE === "1"
}

export function mapLegacyBookingStatus(
  status: string | null | undefined,
): VenueBookingLifecycleStatus {
  if (status === "approved") return "confirmed"
  if (status === "rejected" || status === "cancelled") return "cancelled"
  return "inquiry"
}

export function resolveVenueBookingLifecycleStatus(input: {
  lifecycle_status?: string | null
  status?: string | null
}): VenueBookingLifecycleStatus {
  if (isVenueBookingLifecycleStatus(input.lifecycle_status)) return input.lifecycle_status
  return mapLegacyBookingStatus(input.status)
}

export function getVenueBookingLifecycleTransitions(
  status: VenueBookingLifecycleStatus,
) {
  return VENUE_BOOKING_LIFECYCLE_TRANSITIONS[status]
}

export function canTransitionVenueBookingLifecycle(
  from: VenueBookingLifecycleStatus,
  to: VenueBookingLifecycleStatus,
) {
  return getVenueBookingLifecycleTransitions(from).includes(to)
}

export function mapLifecycleToLegacyBookingStatus(
  status: VenueBookingLifecycleStatus,
) {
  if (status === "confirmed") return "approved" as const
  if (status === "cancelled") return "cancelled" as const
  return "pending" as const
}
