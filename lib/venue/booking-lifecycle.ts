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

const transitions: Record<VenueBookingLifecycleStatus, VenueBookingLifecycleStatus[]> = {
  inquiry: ["hold", "offer", "cancelled"],
  hold: ["inquiry", "offer", "cancelled"],
  offer: ["hold", "contract", "cancelled"],
  contract: ["offer", "confirmed", "cancelled"],
  confirmed: ["cancelled"],
  cancelled: [],
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
  if (
    input.lifecycle_status &&
    VENUE_BOOKING_LIFECYCLE_STATUSES.includes(
      input.lifecycle_status as VenueBookingLifecycleStatus,
    )
  ) {
    return input.lifecycle_status as VenueBookingLifecycleStatus
  }
  return mapLegacyBookingStatus(input.status)
}

export function getVenueBookingLifecycleTransitions(
  status: VenueBookingLifecycleStatus,
) {
  return transitions[status]
}

export function canTransitionVenueBookingLifecycle(
  from: VenueBookingLifecycleStatus,
  to: VenueBookingLifecycleStatus,
) {
  return transitions[from].includes(to)
}

export function mapLifecycleToLegacyBookingStatus(
  status: VenueBookingLifecycleStatus,
) {
  if (status === "confirmed") return "approved" as const
  if (status === "cancelled") return "cancelled" as const
  return "pending" as const
}
