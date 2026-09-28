/**
 * TIX-105 — Explicit ticketing setup or not-ticketed; no silent GA/VIP/qty inventing.
 */

export const EVENT_TICKETING_SETUP_MODES = [
  "incomplete",
  "not_ticketed",
  "explicit_setup",
] as const

export type EventTicketingSetupMode = (typeof EVENT_TICKETING_SETUP_MODES)[number]

export interface ExplicitTicketTypeDraft {
  name?: unknown
  price?: unknown
  quantity?: unknown
  quantity_available?: unknown
  type?: unknown
  category?: unknown
  description?: unknown
}

export interface NormalizedExplicitTicketType {
  name: string
  price: number
  quantity_available: number
  category: string
  description: string | null
}

export function resolveEventTicketingSetupMode(
  settings: Record<string, unknown> | null | undefined,
): EventTicketingSetupMode {
  const raw = settings?.ticketing_setup ?? settings?.ticketing_setup_mode
  if (raw === "not_ticketed" || raw === "explicit_setup" || raw === "incomplete")
    return raw
  return "incomplete"
}

/**
 * Normalize planner/admin ticket drafts. Rejects missing names and non-positive quantities
 * instead of inventing "General Admission" / 100.
 */
export function normalizeExplicitTicketTypeDrafts(rows: ExplicitTicketTypeDraft[]): {
  ok: true
  data: NormalizedExplicitTicketType[]
} | {
  ok: false
  error: string
} {
  if (!Array.isArray(rows) || rows.length === 0)
    return { ok: false, error: "At least one ticket type with explicit name and quantity is required." }

  const data: NormalizedExplicitTicketType[] = []
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i] || {}
    const name = typeof row.name === "string" ? row.name.trim() : ""
    if (!name)
      return { ok: false, error: `Ticket type ${i + 1}: name is required (no default GA/VIP).` }

    const qtyRaw = row.quantity_available ?? row.quantity
    const quantity_available = Number(qtyRaw)
    if (!Number.isInteger(quantity_available) || quantity_available < 1) {
      return {
        ok: false,
        error: `Ticket type "${name}": quantity_available must be an explicit positive integer (no default capacity).`,
      }
    }

    const price = Number(row.price)
    if (!Number.isFinite(price) || price < 0)
      return { ok: false, error: `Ticket type "${name}": price must be a non-negative number.` }

    const categoryRaw = row.category ?? row.type
    const category =
      typeof categoryRaw === "string" && categoryRaw.trim()
        ? categoryRaw.trim().slice(0, 64)
        : "general"

    data.push({
      name: name.slice(0, 160),
      price,
      quantity_available,
      category,
      description: typeof row.description === "string" ? row.description : null,
    })
  }

  return { ok: true, data }
}

export function assertNoSilentTicketDefaults(input: {
  name?: string | null
  quantity?: number | null
  quantity_available?: number | null
}): string | null {
  if (!input.name || !String(input.name).trim())
    return "Ticket name is required; silent General Admission defaults are removed."
  const qty = input.quantity_available ?? input.quantity
  if (qty == null || !Number.isFinite(Number(qty)) || Number(qty) < 1)
    return "Ticket quantity must be set explicitly; silent default capacities are removed."
  return null
}
