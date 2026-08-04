/**
 * TIX-103 — Per-action Zod schemas for admin ticketing commands.
 * Unknown fields rejected (.strict). Reason required for inventory/refund/delete/config.
 */

import { z } from "zod"

import {
  createCampaignSchema,
  createPromoCodeSchema,
  createTicketTypeSchema,
  generateReferralCodesSchema,
  updateTicketTypeSchema,
} from "@/lib/admin/ticketing-validation"

const uuid = z.string().uuid()
const reason = z.string().trim().min(3).max(1_000)

export const deleteTicketTypeCommandSchema = z
  .object({
    action: z.literal("delete_ticket_type"),
    id: uuid,
    reason,
  })
  .strict()

export const upsertTicketingConfigCommandSchema = z
  .object({
    action: z.literal("upsert_ticketing_config"),
    event_id: uuid,
    reason,
    ticketing_enabled: z.boolean().optional(),
    sales_visibility: z.enum(["public", "private", "invite_only", "unlisted"]).optional(),
    sale_start: z.string().optional().nullable(),
    sale_end: z.string().optional().nullable(),
    capacity: z.number().int().min(0).max(10_000_000).optional().nullable(),
    max_per_order: z.number().int().min(1).max(10_000).optional().nullable(),
    max_per_user: z.number().int().min(1).max(10_000).optional().nullable(),
    currency: z.string().trim().min(3).max(8).optional(),
    tax_enabled: z.boolean().optional(),
    tax_rate: z.number().finite().min(0).max(100).optional(),
    refund_policy: z.string().trim().max(4_000).optional(),
    transfer_policy: z.string().trim().max(4_000).optional(),
    box_office_enabled: z.boolean().optional(),
    terms_text: z.string().max(20_000).optional().nullable(),
  })
  .strict()

export const reserveInventoryCommandSchema = z
  .object({
    action: z.literal("reserve_inventory"),
    ticket_type_id: uuid,
    quantity: z.number().int().min(1).max(10_000),
    order_id: uuid.optional().nullable(),
    ttl_seconds: z.number().int().min(60).max(86_400).optional().default(900),
    reason,
  })
  .strict()

export const releaseInventoryCommandSchema = z
  .object({
    action: z.literal("release_inventory"),
    reservation_id: uuid,
    reason,
  })
  .strict()

export const finalizeInventoryCommandSchema = z
  .object({
    action: z.literal("finalize_inventory"),
    reservation_id: uuid,
    reason,
  })
  .strict()

export const refundSaleCommandSchema = z
  .object({
    action: z.literal("refund_sale"),
    sale_id: uuid,
    reason,
    partial_amount: z.number().finite().positive().optional(),
    ticket_ids: z.array(uuid).min(1).max(500).optional(),
  })
  .strict()

export const ticketingCommandSchema = z.union([
  createTicketTypeSchema,
  updateTicketTypeSchema,
  deleteTicketTypeCommandSchema,
  createCampaignSchema,
  createPromoCodeSchema,
  generateReferralCodesSchema,
  upsertTicketingConfigCommandSchema,
  reserveInventoryCommandSchema,
  releaseInventoryCommandSchema,
  finalizeInventoryCommandSchema,
  refundSaleCommandSchema,
])

export type TicketingCommand = z.infer<typeof ticketingCommandSchema>
export type TicketingCommandAction = TicketingCommand["action"]

export const TICKETING_COMMAND_CAPABILITIES: Record<
  TicketingCommandAction,
  "ticketing.manage" | "ticketing.refund"
> = {
  create_ticket_type: "ticketing.manage",
  update_ticket_type: "ticketing.manage",
  delete_ticket_type: "ticketing.manage",
  create_campaign: "ticketing.manage",
  create_promo_code: "ticketing.manage",
  generate_referral_codes: "ticketing.manage",
  upsert_ticketing_config: "ticketing.manage",
  reserve_inventory: "ticketing.manage",
  release_inventory: "ticketing.manage",
  finalize_inventory: "ticketing.manage",
  refund_sale: "ticketing.refund",
}

export function parseTicketingCommand(body: unknown): {
  ok: true
  data: TicketingCommand
} | {
  ok: false
  error: string
  details?: unknown
} {
  if (!body || typeof body !== "object" || Array.isArray(body))
    return { ok: false, error: "Request body must be an object" }

  const parsed = ticketingCommandSchema.safeParse(body)
  if (!parsed.success) {
    return {
      ok: false,
      error: "Validation error — unknown fields or invalid values rejected",
      details: parsed.error.issues,
    }
  }
  return { ok: true, data: parsed.data }
}
