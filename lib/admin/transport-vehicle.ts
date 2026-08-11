/**
 * TRANS-301 — Vehicle master and capacity model (pure).
 *
 * Defines the vehicle record with:
 *  - Capacity: seats, berths, cargo, accessibility
 *  - Ownership: org-owned, rented, vendor-provided
 *  - Status: active, maintenance, retired
 *  - Sensitive fields: driver license/document data is NOT stored here;
 *    driver records live in the workforce module (WORK-*). References only.
 *
 * This module defines the canonical vehicle types, validates vehicle records,
 * and provides helpers for capacity checking.
 *
 * Pure: no I/O, no `server-only`.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type VehicleOwnership = "org_owned" | "rented" | "vendor_provided"

export type VehicleClass =
  | "car"
  | "van"
  | "sprinter"
  | "minibus"
  | "bus"
  | "coach"
  | "truck"
  | "aircraft"
  | "ferry"
  | "rail"
  | "other"

export type VehicleStatus = "active" | "maintenance" | "retired"

export interface VehicleCapacity {
  /** Total passenger seats. */
  passenger_seats: number
  /** Sleeping berths (e.g. sleeper coach). */
  sleeping_berths: number
  /** Cargo/equipment capacity in cubic meters. Null if unknown. */
  cargo_cubic_meters: number | null
  /** Wheelchair-accessible spaces. */
  wheelchair_spaces: number
  /** Whether the vehicle has accessible features (ramp, lift, etc.). */
  is_accessible: boolean
}

export interface Vehicle {
  vehicle_id: string
  /** Display label (e.g. "Bus #3 - Chicago tour"). */
  label: string
  vehicle_class: VehicleClass
  ownership: VehicleOwnership
  /** Org-internal fleet/asset number. */
  fleet_number?: string | null
  /** External vendor name (when vendor_provided or rented). */
  vendor_name?: string | null
  /** License plate / registration (non-sensitive — display only). */
  registration_plate?: string | null
  /** Year/make/model for reference. */
  year?: number | null
  make?: string | null
  model?: string | null
  capacity: VehicleCapacity
  status: VehicleStatus
  /** Current maintenance notes. */
  maintenance_notes?: string | null
  /** ISO date of next required maintenance. */
  next_maintenance_date?: string | null
  /**
   * SENSITIVE FLAG: True when this vehicle has driver document data stored
   * externally (workforce module). Admin UI must show "protected" indicator.
   * No document content is stored here.
   */
  has_sensitive_driver_docs: boolean
  created_by: string
  created_at: string
  updated_by: string
  updated_at: string
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export interface VehicleValidationResult {
  valid: boolean
  errors: string[]
}

export function validateVehicle(v: Partial<Vehicle>): VehicleValidationResult {
  const errors: string[] = []

  if (!v.vehicle_id?.trim()) errors.push("vehicle_id is required.")
  if (!v.label?.trim()) errors.push("label is required.")
  if (!v.vehicle_class) errors.push("vehicle_class is required.")
  if (!v.ownership) errors.push("ownership is required.")

  const cap = v.capacity
  if (!cap) {
    errors.push("capacity is required.")
  } else {
    if (cap.passenger_seats < 0) errors.push("passenger_seats must be >= 0.")
    if (cap.sleeping_berths < 0) errors.push("sleeping_berths must be >= 0.")
    if (cap.wheelchair_spaces < 0) errors.push("wheelchair_spaces must be >= 0.")
    if (cap.cargo_cubic_meters !== null && cap.cargo_cubic_meters !== undefined && cap.cargo_cubic_meters < 0) {
      errors.push("cargo_cubic_meters must be >= 0 if provided.")
    }
  }

  return { valid: errors.length === 0, errors }
}

// ---------------------------------------------------------------------------
// Capacity helpers
// ---------------------------------------------------------------------------

/**
 * Check if a vehicle can accommodate the requested number of passengers.
 */
export function hasPassengerCapacity(
  vehicle: Vehicle,
  requestedPassengers: number,
  alreadyAssigned: number = 0,
): boolean {
  return vehicle.capacity.passenger_seats - alreadyAssigned >= requestedPassengers
}

/**
 * Check if a vehicle can accommodate a passenger with accessibility needs.
 */
export function meetsAccessibilityRequirements(
  vehicle: Vehicle,
  requiresWheelchairSpace: boolean,
  alreadyUsedWheelchairSpaces: number = 0,
): boolean {
  if (!requiresWheelchairSpace) return true
  if (!vehicle.capacity.is_accessible) return false
  return vehicle.capacity.wheelchair_spaces - alreadyUsedWheelchairSpaces >= 1
}

/**
 * Check if a vehicle is available (not in maintenance or retired).
 */
export function isVehicleAvailable(vehicle: Vehicle): boolean {
  return vehicle.status === "active"
}

/**
 * Get remaining passenger capacity.
 */
export function remainingPassengerCapacity(vehicle: Vehicle, alreadyAssigned: number): number {
  return Math.max(0, vehicle.capacity.passenger_seats - alreadyAssigned)
}

// ---------------------------------------------------------------------------
// Sensitive data summary (for UI display)
// ---------------------------------------------------------------------------

export interface VehicleSensitiveDataSummary {
  vehicle_id: string
  has_sensitive_driver_docs: boolean
  /** Message to show in UI when sensitive data exists. */
  protected_indicator: string | null
}

/**
 * Returns a summary for UI display — never exposes document content.
 */
export function getVehicleSensitiveDataSummary(vehicle: Vehicle): VehicleSensitiveDataSummary {
  return {
    vehicle_id: vehicle.vehicle_id,
    has_sensitive_driver_docs: vehicle.has_sensitive_driver_docs,
    protected_indicator: vehicle.has_sensitive_driver_docs
      ? "Driver documents stored in protected workforce records. Access requires credential authorization."
      : null,
  }
}

// ---------------------------------------------------------------------------
// Factory helper
// ---------------------------------------------------------------------------

export function makeVehicle(args: {
  vehicle_id: string
  label: string
  vehicle_class: VehicleClass
  ownership: VehicleOwnership
  capacity: VehicleCapacity
  actor: string
  at: string
  overrides?: Partial<Vehicle>
}): Vehicle {
  return {
    vehicle_id: args.vehicle_id,
    label: args.label,
    vehicle_class: args.vehicle_class,
    ownership: args.ownership,
    fleet_number: null,
    vendor_name: null,
    registration_plate: null,
    year: null,
    make: null,
    model: null,
    capacity: args.capacity,
    status: "active",
    maintenance_notes: null,
    next_maintenance_date: null,
    has_sensitive_driver_docs: false,
    created_by: args.actor,
    created_at: args.at,
    updated_by: args.actor,
    updated_at: args.at,
    ...args.overrides,
  }
}
