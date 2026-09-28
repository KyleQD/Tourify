/**
 * TRAVEL-103 — Per-command Zod schemas for travel coordination.
 * Unknown fields are rejected (.strict). Status transitions are allowlisted.
 */

import { z } from "zod"

export const TRAVEL_GROUP_STATUSES = [
  "planning",
  "confirmed",
  "in_transit",
  "arrived",
  "completed",
  "cancelled",
] as const

export const FLIGHT_STATUSES = [
  "scheduled",
  "confirmed",
  "boarding",
  "in_flight",
  "landed",
  "delayed",
  "cancelled",
] as const

export const GROUND_TRANSPORT_STATUSES = [
  "scheduled",
  "en_route",
  "arrived",
  "completed",
  "delayed",
  "cancelled",
] as const

export const GROUND_TRANSPORT_TYPES = [
  "shuttle_bus",
  "limo",
  "van",
  "car",
  "train",
  "subway",
  "walking",
] as const

export const TRAVEL_GROUP_TYPES = [
  "crew",
  "artists",
  "staff",
  "vendors",
  "guests",
  "vip",
  "media",
  "security",
  "catering",
  "technical",
  "management",
] as const

const uuid = z.string().uuid()
const optionalUuid = uuid.optional().nullable()

export const createTravelGroupCommandSchema = z
  .object({
    action: z.literal("create_travel_group"),
    name: z.string().trim().min(1).max(200),
    group_type: z.enum(TRAVEL_GROUP_TYPES).optional().default("crew"),
    status: z.enum(TRAVEL_GROUP_STATUSES).optional().default("planning"),
    event_id: optionalUuid,
    tour_id: optionalUuid,
    arrival_date: z.string().optional().nullable(),
    departure_date: z.string().optional().nullable(),
    arrival_location: z.string().max(500).optional().nullable(),
    departure_location: z.string().max(500).optional().nullable(),
    notes: z.string().max(4000).optional().nullable(),
  })
  .strict()

export const createGroupMemberCommandSchema = z
  .object({
    action: z.literal("create_group_member"),
    group_id: uuid,
    member_name: z.string().trim().min(1).max(200),
    member_email: z.string().email().optional().nullable().or(z.literal("")),
    member_phone: z.string().max(50).optional().nullable(),
    member_role: z.string().max(120).optional().nullable(),
    user_id: optionalUuid,
    status: z.enum(["pending", "confirmed", "checked_in", "in_transit", "arrived", "no_show", "cancelled"]).optional(),
  })
  .strict()

export const createFlightCommandSchema = z
  .object({
    action: z.literal("create_flight"),
    flight_number: z.string().trim().min(1).max(40),
    airline: z.string().trim().min(1).max(120),
    departure_airport: z.string().trim().min(1).max(20),
    arrival_airport: z.string().trim().min(1).max(20),
    departure_time: z.string().min(1),
    arrival_time: z.string().min(1),
    status: z.enum(FLIGHT_STATUSES).optional().default("scheduled"),
    booking_reference: z.string().max(80).optional().nullable(),
    gate: z.string().max(40).optional().nullable(),
    terminal: z.string().max(40).optional().nullable(),
    event_id: optionalUuid,
    tour_id: optionalUuid,
    group_id: optionalUuid,
  })
  .strict()

export const createGroundTransportCommandSchema = z
  .object({
    action: z.literal("create_ground_transportation"),
    transport_type: z.enum(GROUND_TRANSPORT_TYPES),
    pickup_location: z.string().trim().min(1).max(500),
    dropoff_location: z.string().trim().min(1).max(500),
    pickup_time: z.string().min(1),
    estimated_dropoff_time: z.string().min(1),
    status: z.enum(GROUND_TRANSPORT_STATUSES).optional().default("scheduled"),
    provider_name: z.string().max(200).optional().nullable(),
    driver_name: z.string().max(200).optional().nullable(),
    driver_phone: z.string().max(50).optional().nullable(),
    vehicle_plate: z.string().max(40).optional().nullable(),
    vehicle_capacity: z.number().int().positive().optional().nullable(),
    event_id: optionalUuid,
    tour_id: optionalUuid,
    group_id: optionalUuid,
    flight_id: optionalUuid,
    total_cost: z.number().nonnegative().optional().nullable(),
  })
  .strict()

export const createFlightPassengerCommandSchema = z
  .object({
    action: z.literal("create_flight_passenger"),
    flight_id: uuid,
    group_member_id: uuid,
    seat_number: z.string().max(20).optional().nullable(),
    status: z.enum(["confirmed", "checked_in", "boarded", "no_show", "cancelled"]).optional(),
    passenger_name: z.string().max(200).optional().nullable(),
  })
  .strict()

export const createTransportPassengerCommandSchema = z
  .object({
    action: z.literal("create_transportation_passenger"),
    transportation_id: uuid,
    group_member_id: uuid,
    status: z.enum(["confirmed", "picked_up", "in_transit", "dropped_off", "no_show", "cancelled"]).optional(),
    pickup_instructions: z.string().max(1000).optional().nullable(),
    dropoff_instructions: z.string().max(1000).optional().nullable(),
  })
  .strict()

export const createHotelAssignmentCommandSchema = z
  .object({
    action: z.literal("create_hotel_assignment"),
    lodging_booking_id: uuid,
    group_member_id: uuid,
    room_number: z.string().max(40).optional().nullable(),
    room_type: z.string().max(80).optional().nullable(),
    status: z.enum(["assigned", "confirmed", "checked_in", "checked_out", "cancelled"]).optional(),
  })
  .strict()

export const createTimelineEntryCommandSchema = z
  .object({
    action: z.literal("create_timeline_entry"),
    entry_type: z.enum(["flight", "transport", "hotel_checkin", "hotel_checkout", "meeting", "meal", "activity"]),
    title: z.string().trim().min(1).max(200),
    description: z.string().max(4000).optional().nullable(),
    start_time: z.string().min(1),
    end_time: z.string().min(1),
    timezone: z.string().max(80).optional().nullable(),
    location: z.string().max(500).optional().nullable(),
    group_id: optionalUuid,
    event_id: optionalUuid,
    tour_id: optionalUuid,
    status: z.enum(["scheduled", "in_progress", "completed", "delayed", "cancelled"]).optional(),
  })
  .strict()

export const autoCoordinateGroupCommandSchema = z
  .object({
    action: z.literal("auto_coordinate_group"),
    group_id: uuid,
  })
  .strict()

export const createFlightWithPassengerCommandSchema = z
  .object({
    action: z.literal("create_flight_with_passenger"),
    passenger_name: z.string().trim().min(1).max(200),
    passenger_user_id: optionalUuid,
    passenger_email: z.string().email().optional().nullable().or(z.literal("")),
    group_id: optionalUuid,
    flight_number: z.string().trim().min(1).max(40),
    airline: z.string().trim().min(1).max(120),
    departure_airport: z.string().trim().min(1).max(20),
    arrival_airport: z.string().trim().min(1).max(20),
    departure_time: z.string().min(1),
    arrival_time: z.string().min(1),
    booking_reference: z.string().max(80).optional().nullable(),
    status: z.enum(FLIGHT_STATUSES).optional(),
    event_id: optionalUuid,
    tour_id: optionalUuid,
    gate: z.string().max(40).optional().nullable(),
    terminal: z.string().max(40).optional().nullable(),
  })
  .strict()

export const bulkCreateGroupMembersCommandSchema = z
  .object({
    action: z.literal("bulk_create_group_members"),
    group_id: uuid,
    members: z
      .array(
        z
          .object({
            member_name: z.string().trim().min(1).max(200),
            member_email: z.string().email().optional().nullable().or(z.literal("")),
            member_phone: z.string().max(50).optional().nullable(),
            member_role: z.string().max(120).optional().nullable(),
            user_id: optionalUuid,
            status: z.string().max(40).optional(),
          })
          .strict(),
      )
      .min(1)
      .max(200),
  })
  .strict()

export const updateTravelGroupCommandSchema = z
  .object({
    action: z.literal("update_travel_group"),
    id: uuid,
    name: z.string().trim().min(1).max(200).optional(),
    group_type: z.enum(TRAVEL_GROUP_TYPES).optional(),
    status: z.enum(TRAVEL_GROUP_STATUSES).optional(),
    arrival_date: z.string().optional().nullable(),
    departure_date: z.string().optional().nullable(),
    arrival_location: z.string().max(500).optional().nullable(),
    departure_location: z.string().max(500).optional().nullable(),
    notes: z.string().max(4000).optional().nullable(),
    coordination_status: z
      .enum([
        "pending",
        "flights_booked",
        "hotels_booked",
        "transport_arranged",
        "complete",
        "suggestion",
        "review",
        "request",
        "hold",
        "confirmed",
      ])
      .optional()
      .nullable(),
  })
  .strict()

export const updateFlightCommandSchema = z
  .object({
    action: z.literal("update_flight"),
    id: uuid,
    flight_number: z.string().trim().min(1).max(40).optional(),
    airline: z.string().trim().min(1).max(120).optional(),
    departure_airport: z.string().trim().min(1).max(20).optional(),
    arrival_airport: z.string().trim().min(1).max(20).optional(),
    departure_time: z.string().optional(),
    arrival_time: z.string().optional(),
    status: z.enum(FLIGHT_STATUSES).optional(),
    booking_reference: z.string().max(80).optional().nullable(),
    gate: z.string().max(40).optional().nullable(),
    terminal: z.string().max(40).optional().nullable(),
  })
  .strict()

export const updateGroundTransportCommandSchema = z
  .object({
    action: z.literal("update_ground_transportation"),
    id: uuid,
    transport_type: z.enum(GROUND_TRANSPORT_TYPES).optional(),
    pickup_location: z.string().trim().min(1).max(500).optional(),
    dropoff_location: z.string().trim().min(1).max(500).optional(),
    pickup_time: z.string().optional(),
    estimated_dropoff_time: z.string().optional(),
    status: z.enum(GROUND_TRANSPORT_STATUSES).optional(),
    provider_name: z.string().max(200).optional().nullable(),
    driver_name: z.string().max(200).optional().nullable(),
    driver_phone: z.string().max(50).optional().nullable(),
    vehicle_plate: z.string().max(40).optional().nullable(),
    vehicle_capacity: z.number().int().positive().optional().nullable(),
    total_cost: z.number().nonnegative().optional().nullable(),
  })
  .strict()

export const updateHotelAssignmentCommandSchema = z
  .object({
    action: z.literal("update_hotel_assignment"),
    id: uuid,
    room_number: z.string().max(40).optional().nullable(),
    room_type: z.string().max(80).optional().nullable(),
    status: z.enum(["assigned", "confirmed", "checked_in", "checked_out", "cancelled"]).optional(),
    check_in_status: z.string().max(40).optional().nullable(),
    check_out_status: z.string().max(40).optional().nullable(),
  })
  .strict()

const COMMAND_SCHEMAS = {
  create_travel_group: createTravelGroupCommandSchema,
  create_group_member: createGroupMemberCommandSchema,
  bulk_create_group_members: bulkCreateGroupMembersCommandSchema,
  create_flight: createFlightCommandSchema,
  create_flight_with_passenger: createFlightWithPassengerCommandSchema,
  create_ground_transportation: createGroundTransportCommandSchema,
  create_flight_passenger: createFlightPassengerCommandSchema,
  create_transportation_passenger: createTransportPassengerCommandSchema,
  create_hotel_assignment: createHotelAssignmentCommandSchema,
  create_timeline_entry: createTimelineEntryCommandSchema,
  auto_coordinate_group: autoCoordinateGroupCommandSchema,
  update_travel_group: updateTravelGroupCommandSchema,
  update_flight: updateFlightCommandSchema,
  update_ground_transportation: updateGroundTransportCommandSchema,
  update_hotel_assignment: updateHotelAssignmentCommandSchema,
} as const

export type TravelCoordinationAction = keyof typeof COMMAND_SCHEMAS

export function parseTravelCoordinationCommand(body: unknown): {
  ok: true
  action: TravelCoordinationAction
  data: Record<string, unknown>
} | {
  ok: false
  error: string
  details?: unknown
} {
  if (!body || typeof body !== "object" || Array.isArray(body))
    return { ok: false, error: "Request body must be an object" }

  const action = (body as { action?: unknown }).action
  if (typeof action !== "string" || !(action in COMMAND_SCHEMAS))
    return { ok: false, error: `Unknown or unsupported action: ${String(action)}` }

  const schema = COMMAND_SCHEMAS[action as TravelCoordinationAction]
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return {
      ok: false,
      error: "Validation error — unknown fields or invalid values rejected",
      details: parsed.error.issues,
    }
  }

  return {
    ok: true,
    action: action as TravelCoordinationAction,
    data: parsed.data as Record<string, unknown>,
  }
}

/** Allowed status transitions for parent travel records (TRAVEL-103). */
export const TRAVEL_STATUS_TRANSITIONS: Record<string, readonly string[]> = {
  planning: ["confirmed", "cancelled"],
  confirmed: ["in_transit", "cancelled", "completed"],
  in_transit: ["arrived", "cancelled"],
  arrived: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
  scheduled: ["confirmed", "delayed", "cancelled", "boarding", "en_route"],
  boarding: ["in_flight", "cancelled", "delayed"],
  in_flight: ["landed", "delayed", "cancelled"],
  landed: ["completed", "cancelled"],
  delayed: ["scheduled", "confirmed", "boarding", "en_route", "cancelled"],
  en_route: ["arrived", "completed", "cancelled", "delayed"],
}

export function canTransitionTravelStatus(from: string, to: string): boolean {
  if (from === to) return true
  const allowed = TRAVEL_STATUS_TRANSITIONS[from]
  if (!allowed) return false
  return allowed.includes(to)
}
