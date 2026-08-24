/**
 * P4-T05 — profile base-geography visibility rules.
 *
 * Users control whether their canonical place is public. Default is PRIVATE:
 * absence of an explicit opt-in must never publish geography. Device GPS and
 * IP-derived locations are never valid inputs to this decision (P4-T06) —
 * they are rejected as sources entirely.
 */
export type PlaceVisibility = "public" | "private"

export interface LocationVisibilityInput {
  /** Explicit user/admin choice from the form. `undefined` = not chosen. */
  userChoice?: PlaceVisibility | null
  /**
   * Where the location came from. Only 'user_entry' may ever be public.
   * 'device_gps' / 'ip_derived' / 'inferred' are hard-blocked from public.
   */
  source: "user_entry" | "device_gps" | "ip_derived" | "inferred"
}

const DEFAULT_VISIBILITY: PlaceVisibility = "private"

export function resolveLocationVisibility(input: LocationVisibilityInput): PlaceVisibility {
  if (input.source !== "user_entry") return DEFAULT_VISIBILITY
  if (input.userChoice === "public") return "public"
  return DEFAULT_VISIBILITY
}

/** Canonical display string stays in the operational field (P4-T03). */
export function buildDisplayString(parts: {
  cityName?: string | null
  admin1?: string | null
  countryName?: string | null
}): string | null {
  const segments = [parts.cityName, parts.admin1, parts.countryName]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value))
  return segments.length ? segments.join(", ") : null
}
