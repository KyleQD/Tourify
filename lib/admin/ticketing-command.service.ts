/**
 * TIX-103 — Canonical admin ticketing command service.
 * Capability, parent/org state, inventory RPCs, reason, audit, typed errors.
 */

import { randomUUID } from "node:crypto"

import { logAuditEvent } from "@/lib/audit"
import {
  assertOrgEntityReferences,
  OrgEntityAccessError,
} from "@/lib/admin/org-entity-access"
import {
  TICKETING_COMMAND_CAPABILITIES,
  type TicketingCommand,
} from "@/lib/admin/ticketing-command-schemas"
import {
  assertDateOrder,
  assertPercentageDiscount,
  TicketingValidationError,
} from "@/lib/admin/ticketing-validation"
import type { AdminCapability } from "@/lib/auth/admin-capabilities"
import { hasAdminCapability } from "@/lib/auth/admin-capabilities"
import {
  finalizeInventory,
  releaseInventory,
  reserveInventory,
} from "@/lib/ticketing/inventory"

type SupabaseLike = { from: (table: string) => any; rpc: (fn: string, args?: Record<string, unknown>) => any }

export class TicketingCommandError extends Error {
  readonly status: number
  readonly code: string

  constructor(code: string, message: string, status = 422) {
    super(message)
    this.name = "TicketingCommandError"
    this.code = code
    this.status = status
  }
}

export function getTicketingCommandErrorStatus(error: unknown, fallback = 500): number {
  if (error instanceof TicketingCommandError) return error.status
  if (error instanceof TicketingValidationError) return 422
  if (error instanceof OrgEntityAccessError) return error.status
  if (error && typeof error === "object" && "status" in error) {
    const status = Number((error as { status: unknown }).status)
    if (Number.isFinite(status) && status >= 400 && status < 600) return status
  }
  const message = error instanceof Error ? error.message : ""
  if (/not found/i.test(message)) return 404
  if (/not authorized|forbidden|acting organization|capability/i.test(message)) return 403
  if (/illegal|validation|insufficient inventory|conflict|already/i.test(message)) return 422
  return fallback
}

function assertCommandCapability(args: {
  capabilities: readonly AdminCapability[]
  command: TicketingCommand
}) {
  const required = TICKETING_COMMAND_CAPABILITIES[args.command.action]
  if (!hasAdminCapability(args.capabilities, required)) {
    throw new TicketingCommandError(
      "capability_denied",
      `Missing capability ${required} for ${args.command.action}.`,
      403,
    )
  }
}

async function assertEventParent(args: {
  supabase: SupabaseLike
  orgId: string
  eventId: string
}) {
  try {
    await assertOrgEntityReferences(args.supabase, args.orgId, { eventId: args.eventId })
  } catch (error) {
    if (error instanceof OrgEntityAccessError) throw error
    throw new TicketingCommandError("parent_access_failed", "Unable to verify event parent.", 503)
  }
}

async function assertTicketTypesForEvent(
  supabase: SupabaseLike,
  eventId: string,
  ids: string[] | undefined,
) {
  const uniqueIds = Array.from(new Set(ids || []))
  if (uniqueIds.length === 0) return

  const { data, error } = await supabase
    .from("ticket_types")
    .select("id")
    .eq("event_id", eventId)
    .in("id", uniqueIds)

  if (error) throw new TicketingCommandError("db_error", "Unable to verify ticket types.", 503)
  if ((data || []).length !== uniqueIds.length) {
    throw new TicketingValidationError(
      "Every applicable ticket type must belong to the selected event.",
    )
  }
}

async function assertCampaignForEvent(
  supabase: SupabaseLike,
  eventId: string,
  campaignId: string | null | undefined,
) {
  if (!campaignId) return
  const { data, error } = await supabase
    .from("ticket_campaigns")
    .select("id")
    .eq("id", campaignId)
    .eq("event_id", eventId)
    .maybeSingle()

  if (error) throw new TicketingCommandError("db_error", "Unable to verify the campaign.", 503)
  if (!data) throw new TicketingValidationError("Campaign does not belong to the selected event.")
}

export async function executeTicketingCommand(args: {
  supabase: SupabaseLike
  userId: string
  orgId: string
  capabilities: readonly AdminCapability[]
  command: TicketingCommand
  idempotencyKey?: string | null
}): Promise<{ data: unknown; message?: string; status?: number }> {
  assertCommandCapability(args)

  const a = args as any
  switch (args.command.action) {
    case "create_ticket_type":
      return createTicketType(a)
    case "update_ticket_type":
      return updateTicketType(a)
    case "delete_ticket_type":
      return deleteTicketType(a)
    case "create_campaign":
      return createCampaign(a)
    case "create_promo_code":
      return createPromoCode(a)
    case "generate_referral_codes":
      return generateReferralCodes(a)
    case "upsert_ticketing_config":
      return upsertTicketingConfig(a)
    case "publish_ticket_sales":
      return publishTicketSales(a)
    case "unpublish_ticket_sales":
      return unpublishTicketSales(a)
    case "reserve_inventory":
      return reserveInventoryCommand(a)
    case "release_inventory":
      return releaseInventoryCommand(a)
    case "finalize_inventory":
      return finalizeInventoryCommand(a)
    case "refund_sale":
      return prepareRefundSale(a)
    default:
      throw new TicketingCommandError("unknown_action", "Unsupported ticketing command", 400)
  }
}

async function createTicketType(args: {
  supabase: SupabaseLike
  userId: string
  orgId: string
  command: Extract<TicketingCommand, { action: "create_ticket_type" }>
  idempotencyKey?: string | null
}) {
  const { command } = args
  await assertEventParent({ supabase: args.supabase, orgId: args.orgId, eventId: command.event_id })
  assertDateOrder(command.sale_start, command.sale_end, "Sale")
  if (command.max_per_customer && command.max_per_customer > command.quantity_available) {
    throw new TicketingValidationError(
      "Maximum tickets per customer cannot exceed available inventory.",
    )
  }

  const { action: _action, ...values } = command
  const { data, error } = await args.supabase
    .from("ticket_types")
    .insert({
      ...values,
      ticket_code: `TKT-${randomUUID()}`,
      quantity_sold: 0,
    })
    .select("*")
    .single()

  if (error || !data) throw new TicketingCommandError("db_error", "Failed to create ticket type.", 503)

  await logAuditEvent({
    actorId: args.userId,
    orgId: args.orgId,
    action: "create",
    entityType: "ticket",
    entityId: data.id,
    newValues: {
      event_id: command.event_id,
      kind: "ticket_type",
      idempotency_key: args.idempotencyKey ?? null,
    },
  })

  return { data: { ticket_type: data }, status: 201, message: "Ticket type created" }
}

async function updateTicketType(args: {
  supabase: SupabaseLike
  userId: string
  orgId: string
  command: Extract<TicketingCommand, { action: "update_ticket_type" }>
  idempotencyKey?: string | null
}) {
  const { command } = args
  const { data: current, error: currentError } = await args.supabase
    .from("ticket_types")
    .select("*")
    .eq("id", command.id)
    .maybeSingle()

  if (currentError) throw new TicketingCommandError("db_error", "Unable to load ticket type.", 503)
  if (!current) throw new TicketingCommandError("not_found", "Ticket type not found.", 404)

  await assertEventParent({
    supabase: args.supabase,
    orgId: args.orgId,
    eventId: current.event_id,
  })

  const saleStart = Object.prototype.hasOwnProperty.call(command, "sale_start")
    ? command.sale_start
    : current.sale_start
  const saleEnd = Object.prototype.hasOwnProperty.call(command, "sale_end")
    ? command.sale_end
    : current.sale_end
  assertDateOrder(saleStart, saleEnd, "Sale")

  const available = command.quantity_available ?? current.quantity_available
  const maxPerCustomer = Object.prototype.hasOwnProperty.call(command, "max_per_customer")
    ? command.max_per_customer
    : current.max_per_customer
  if (available < (current.quantity_sold || 0)) {
    throw new TicketingValidationError("Available quantity cannot be lower than tickets sold.")
  }
  if (maxPerCustomer && maxPerCustomer > available) {
    throw new TicketingValidationError(
      "Maximum tickets per customer cannot exceed available inventory.",
    )
  }

  const { action: _action, id, ...updates } = command
  const { data, error } = await args.supabase
    .from("ticket_types")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("event_id", current.event_id)
    .eq("updated_at", current.updated_at)
    .select("*")
    .maybeSingle()

  if (error) throw new TicketingCommandError("db_error", "Failed to update ticket type.", 503)
  if (!data) {
    throw new TicketingCommandError(
      "ticketing_conflict",
      "Ticket type changed while it was being updated.",
      409,
    )
  }

  await logAuditEvent({
    actorId: args.userId,
    orgId: args.orgId,
    action: "update",
    entityType: "ticket",
    entityId: id,
    oldValues: current,
    newValues: { ...updates, idempotency_key: args.idempotencyKey ?? null },
  })

  return { data: { ticket_type: data }, message: "Ticket type updated" }
}

async function deleteTicketType(args: {
  supabase: SupabaseLike
  userId: string
  orgId: string
  command: Extract<TicketingCommand, { action: "delete_ticket_type" }>
  idempotencyKey?: string | null
}) {
  const { command } = args
  const { data: current, error: currentError } = await args.supabase
    .from("ticket_types")
    .select("id,event_id,quantity_sold,updated_at")
    .eq("id", command.id)
    .maybeSingle()

  if (currentError) throw new TicketingCommandError("db_error", "Unable to load ticket type.", 503)
  if (!current) throw new TicketingCommandError("not_found", "Ticket type not found.", 404)

  await assertEventParent({
    supabase: args.supabase,
    orgId: args.orgId,
    eventId: current.event_id,
  })

  let softDeleted = Number(current.quantity_sold) > 0
  if (!softDeleted) {
    const { error } = await args.supabase
      .from("ticket_types")
      .delete()
      .eq("id", command.id)
      .eq("event_id", current.event_id)
      .eq("updated_at", current.updated_at)

    if (error?.code === "23503") softDeleted = true
    else if (error) throw new TicketingCommandError("db_error", "Failed to delete ticket type.", 503)
  }

  if (softDeleted) {
    const { data, error } = await args.supabase
      .from("ticket_types")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("id", command.id)
      .eq("event_id", current.event_id)
      .eq("updated_at", current.updated_at)
      .select("id")
      .maybeSingle()
    if (error || !data)
      throw new TicketingCommandError("db_error", "Failed to deactivate ticket type.", 503)
  }

  await logAuditEvent({
    actorId: args.userId,
    orgId: args.orgId,
    action: "delete",
    entityType: "ticket",
    entityId: command.id,
    oldValues: {
      event_id: current.event_id,
      quantity_sold: current.quantity_sold,
      reason: command.reason,
    },
    newValues: {
      soft_deleted: softDeleted,
      is_active: softDeleted ? false : undefined,
      idempotency_key: args.idempotencyKey ?? null,
    },
  })

  return {
    data: { success: true, soft_deleted: softDeleted },
    message: softDeleted ? "Ticket type deactivated (sold inventory)" : "Ticket type deleted",
  }
}

async function createCampaign(args: {
  supabase: SupabaseLike
  userId: string
  orgId: string
  command: Extract<TicketingCommand, { action: "create_campaign" }>
  idempotencyKey?: string | null
}) {
  const { command } = args
  await assertEventParent({ supabase: args.supabase, orgId: args.orgId, eventId: command.event_id })
  assertDateOrder(command.start_date, command.end_date, "Campaign")
  assertPercentageDiscount(command.discount_type, command.discount_value)
  await assertTicketTypesForEvent(args.supabase, command.event_id, command.applicable_ticket_types)

  const { action: _action, ...values } = command
  const { data, error } = await args.supabase
    .from("ticket_campaigns")
    .insert({ ...values, current_uses: 0, is_active: true, created_by: args.userId })
    .select("*")
    .single()

  if (error || !data) throw new TicketingCommandError("db_error", "Failed to create campaign.", 503)

  await logAuditEvent({
    actorId: args.userId,
    orgId: args.orgId,
    action: "create",
    entityType: "ticket",
    entityId: data.id,
    newValues: {
      event_id: command.event_id,
      kind: "campaign",
      idempotency_key: args.idempotencyKey ?? null,
    },
  })

  return { data: { campaign: data }, status: 201, message: "Campaign created" }
}

async function createPromoCode(args: {
  supabase: SupabaseLike
  userId: string
  orgId: string
  command: Extract<TicketingCommand, { action: "create_promo_code" }>
  idempotencyKey?: string | null
}) {
  const { command } = args
  await assertEventParent({ supabase: args.supabase, orgId: args.orgId, eventId: command.event_id })
  const startDate = command.start_date || new Date().toISOString()
  const endDate = command.end_date || command.expires_at
  assertDateOrder(startDate, endDate, "Promo code")
  assertPercentageDiscount(command.discount_type, command.discount_value)
  await Promise.all([
    assertCampaignForEvent(args.supabase, command.event_id, command.campaign_id),
    assertTicketTypesForEvent(args.supabase, command.event_id, command.applicable_ticket_types),
  ])

  const code = command.code.toUpperCase()
  const { data: existing, error: existingError } = await args.supabase
    .from("promo_codes")
    .select("id")
    .eq("event_id", command.event_id)
    .eq("code", code)
    .maybeSingle()
  if (existingError)
    throw new TicketingCommandError("db_error", "Unable to verify promo code uniqueness.", 503)
  if (existing) throw new TicketingValidationError("Promo code already exists for this event.")

  const {
    action: _action,
    expires_at: _expiresAt,
    start_date: _startDate,
    end_date: _endDate,
    ...values
  } = command
  const { data, error } = await args.supabase
    .from("promo_codes")
    .insert({
      ...values,
      code,
      start_date: startDate,
      end_date: endDate,
      current_uses: 0,
      is_active: true,
      created_by: args.userId,
    })
    .select("*")
    .single()

  if (error || !data) throw new TicketingCommandError("db_error", "Failed to create promo code.", 503)

  await logAuditEvent({
    actorId: args.userId,
    orgId: args.orgId,
    action: "create",
    entityType: "ticket",
    entityId: data.id,
    newValues: {
      event_id: command.event_id,
      kind: "promo_code",
      code,
      idempotency_key: args.idempotencyKey ?? null,
    },
  })

  return { data: { promo_code: data }, status: 201, message: "Promo code created" }
}

async function generateReferralCodes(args: {
  supabase: SupabaseLike
  userId: string
  orgId: string
  command: Extract<TicketingCommand, { action: "generate_referral_codes" }>
  idempotencyKey?: string | null
}) {
  const { command } = args
  await assertEventParent({ supabase: args.supabase, orgId: args.orgId, eventId: command.event_id })

  const rows = Array.from({ length: command.count }, () => ({
    referrer_id: args.userId,
    referred_email: "",
    event_id: command.event_id,
    referral_code: `REF-${randomUUID()}`,
    discount_amount: command.discount_amount,
  }))
  const { data, error } = await args.supabase.from("ticket_referrals").insert(rows).select("*")

  if (error || !data || data.length !== rows.length) {
    throw new TicketingCommandError("db_error", "Failed to generate referral codes.", 503)
  }

  await logAuditEvent({
    actorId: args.userId,
    orgId: args.orgId,
    action: "create",
    entityType: "ticket",
    newValues: {
      event_id: command.event_id,
      kind: "referral_codes",
      count: data.length,
      idempotency_key: args.idempotencyKey ?? null,
    },
  })

  return { data: { referral_codes: data }, status: 201, message: "Referral codes generated" }
}

async function upsertTicketingConfig(args: {
  supabase: SupabaseLike
  userId: string
  orgId: string
  command: Extract<TicketingCommand, { action: "upsert_ticketing_config" }>
  idempotencyKey?: string | null
}) {
  const { command } = args
  await assertEventParent({ supabase: args.supabase, orgId: args.orgId, eventId: command.event_id })
  assertDateOrder(command.sale_start, command.sale_end, "Sale")

  const { action: _a, reason, event_id, ...fields } = command
  const payload = {
    event_id,
    org_id: args.orgId,
    ...fields,
    updated_at: new Date().toISOString(),
    created_by: args.userId,
  }

  const { data, error } = await args.supabase
    .from("event_ticketing_config")
    .upsert(payload, { onConflict: "event_id" })
    .select("*")
    .single()

  if (error || !data)
    throw new TicketingCommandError("db_error", "Failed to upsert ticketing config.", 503)

  await logAuditEvent({
    actorId: args.userId,
    orgId: args.orgId,
    action: "update",
    entityType: "ticket",
    entityId: data.id,
    newValues: {
      event_id,
      kind: "ticketing_config",
      reason,
      idempotency_key: args.idempotencyKey ?? null,
    },
  })

  return { data: { config: data }, message: "Ticketing config saved" }
}

async function loadPublishReadiness(args: {
  supabase: SupabaseLike
  orgId: string
  eventId: string
}) {
  await assertEventParent({ supabase: args.supabase, orgId: args.orgId, eventId: args.eventId })

  const [{ data: config, error: configError }, { data: ticketTypes, error: typesError }] =
    await Promise.all([
      args.supabase
        .from("event_ticketing_config")
        .select("id,event_id,ticketing_enabled,sale_start,sale_end,terms_text,metadata,capacity")
        .eq("event_id", args.eventId)
        .maybeSingle(),
      args.supabase
        .from("ticket_types")
        .select("id,quantity_available,is_active")
        .eq("event_id", args.eventId)
        .eq("is_active", true),
    ])

  if (configError)
    throw new TicketingCommandError("db_error", "Unable to load ticketing config.", 503)
  if (typesError)
    throw new TicketingCommandError("db_error", "Unable to load ticket types.", 503)

  return {
    config,
    ticketTypes: ticketTypes || [],
  }
}

async function publishTicketSales(args: {
  supabase: SupabaseLike
  userId: string
  orgId: string
  command: Extract<TicketingCommand, { action: "publish_ticket_sales" }>
  idempotencyKey?: string | null
}) {
  const { command } = args
  const { config, ticketTypes } = await loadPublishReadiness({
    supabase: args.supabase,
    orgId: args.orgId,
    eventId: command.event_id,
  })

  if (!config) {
    throw new TicketingCommandError(
      "config_required",
      "Create ticketing setup before publishing sales.",
      422,
    )
  }

  if (ticketTypes.length === 0) {
    throw new TicketingCommandError(
      "ticket_types_required",
      "Add at least one active ticket type before publishing sales.",
      422,
    )
  }

  const activeCapacity = ticketTypes.reduce(
    (sum: number, row: any) => sum + Number(row.quantity_available || 0),
    0,
  )
  if (activeCapacity <= 0) {
    throw new TicketingCommandError(
      "inventory_required",
      "Active ticket types must have available inventory before publishing.",
      422,
    )
  }

  assertDateOrder(config.sale_start, config.sale_end, "Sale")
  const now = Date.now()
  if (config.sale_end && now > new Date(config.sale_end).getTime()) {
    throw new TicketingCommandError(
      "sales_window_closed",
      "Sales end date is already in the past.",
      422,
    )
  }

  const termsText = typeof config.terms_text === "string" ? config.terms_text.trim() : ""
  if (!termsText && !command.terms_waived && !config.metadata?.terms_waived) {
    throw new TicketingCommandError(
      "terms_required",
      "Publish organizer terms or explicitly waive them before publishing.",
      422,
    )
  }

  const metadata = {
    ...(config.metadata || {}),
    terms_waived: Boolean(command.terms_waived || config.metadata?.terms_waived),
    published_by: args.userId,
    published_at: new Date().toISOString(),
  }

  const { data, error } = await args.supabase
    .from("event_ticketing_config")
    .update({
      ticketing_enabled: true,
      org_id: args.orgId,
      metadata,
      updated_at: new Date().toISOString(),
    })
    .eq("event_id", command.event_id)
    .select("*")
    .single()

  if (error || !data)
    throw new TicketingCommandError("db_error", "Failed to publish ticket sales.", 503)

  await logAuditEvent({
    actorId: args.userId,
    orgId: args.orgId,
    action: "publish",
    entityType: "ticket",
    entityId: data.id,
    newValues: {
      event_id: command.event_id,
      kind: "ticket_sales_publish",
      reason: command.reason,
      terms_waived: command.terms_waived,
      active_ticket_types: ticketTypes.length,
      active_capacity: activeCapacity,
      idempotency_key: args.idempotencyKey ?? null,
    },
  })

  return { data: { config: data }, message: "Ticket sales published" }
}

async function unpublishTicketSales(args: {
  supabase: SupabaseLike
  userId: string
  orgId: string
  command: Extract<TicketingCommand, { action: "unpublish_ticket_sales" }>
  idempotencyKey?: string | null
}) {
  const { command } = args
  await assertEventParent({ supabase: args.supabase, orgId: args.orgId, eventId: command.event_id })

  const { data, error } = await args.supabase
    .from("event_ticketing_config")
    .update({
      ticketing_enabled: false,
      org_id: args.orgId,
      updated_at: new Date().toISOString(),
    })
    .eq("event_id", command.event_id)
    .select("*")
    .maybeSingle()

  if (error)
    throw new TicketingCommandError("db_error", "Failed to unpublish ticket sales.", 503)
  if (!data)
    throw new TicketingCommandError("config_required", "Ticketing setup not found.", 404)

  await logAuditEvent({
    actorId: args.userId,
    orgId: args.orgId,
    action: "unpublish",
    entityType: "ticket",
    entityId: data.id,
    newValues: {
      event_id: command.event_id,
      kind: "ticket_sales_unpublish",
      reason: command.reason,
      idempotency_key: args.idempotencyKey ?? null,
    },
  })

  return { data: { config: data }, message: "Ticket sales unpublished" }
}

async function loadTicketTypeEventId(supabase: SupabaseLike, ticketTypeId: string) {
  const { data, error } = await supabase
    .from("ticket_types")
    .select("id,event_id")
    .eq("id", ticketTypeId)
    .maybeSingle()
  if (error) throw new TicketingCommandError("db_error", "Unable to load ticket type.", 503)
  if (!data) throw new TicketingCommandError("not_found", "Ticket type not found.", 404)
  return data
}

async function reserveInventoryCommand(args: {
  supabase: SupabaseLike
  userId: string
  orgId: string
  command: Extract<TicketingCommand, { action: "reserve_inventory" }>
  idempotencyKey?: string | null
}) {
  const { command } = args
  const ticketType = await loadTicketTypeEventId(args.supabase, command.ticket_type_id)
  await assertEventParent({
    supabase: args.supabase,
    orgId: args.orgId,
    eventId: ticketType.event_id,
  })

  try {
    const { reservationId } = await reserveInventory({
      supabase: args.supabase,
      ticketTypeId: command.ticket_type_id,
      quantity: command.quantity,
      orderId: command.order_id,
      ttlSeconds: command.ttl_seconds,
      createdBy: args.userId,
    })

    await logAuditEvent({
      actorId: args.userId,
      orgId: args.orgId,
      action: "create",
      entityType: "ticket",
      entityId: reservationId,
      newValues: {
        kind: "inventory_reservation",
        ticket_type_id: command.ticket_type_id,
        quantity: command.quantity,
        reason: command.reason,
        idempotency_key: args.idempotencyKey ?? null,
      },
    })

    return {
      data: { reservation_id: reservationId },
      status: 201,
      message: "Inventory reserved",
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Reserve failed"
    throw new TicketingCommandError("inventory_transaction_failed", message, 422)
  }
}

async function releaseInventoryCommand(args: {
  supabase: SupabaseLike
  userId: string
  orgId: string
  command: Extract<TicketingCommand, { action: "release_inventory" }>
  idempotencyKey?: string | null
}) {
  const { command } = args
  const { data: reservation, error } = await args.supabase
    .from("ticket_inventory_reservations")
    .select("id,event_id,status")
    .eq("id", command.reservation_id)
    .maybeSingle()

  if (error) throw new TicketingCommandError("db_error", "Unable to load reservation.", 503)
  if (!reservation) throw new TicketingCommandError("not_found", "Reservation not found.", 404)

  await assertEventParent({
    supabase: args.supabase,
    orgId: args.orgId,
    eventId: reservation.event_id,
  })

  if (reservation.status !== "active") {
    // Idempotent release
    return {
      data: { released: false, already: true, reservation_id: command.reservation_id },
      message: "Reservation already released or finalized",
    }
  }

  try {
    const released = await releaseInventory({
      supabase: args.supabase,
      reservationId: command.reservation_id,
    })

    await logAuditEvent({
      actorId: args.userId,
      orgId: args.orgId,
      action: "update",
      entityType: "ticket",
      entityId: command.reservation_id,
      newValues: {
        kind: "inventory_release",
        reason: command.reason,
        released,
        idempotency_key: args.idempotencyKey ?? null,
      },
    })

    return { data: { released, reservation_id: command.reservation_id }, message: "Inventory released" }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Release failed"
    throw new TicketingCommandError("inventory_transaction_failed", message, 422)
  }
}

async function finalizeInventoryCommand(args: {
  supabase: SupabaseLike
  userId: string
  orgId: string
  command: Extract<TicketingCommand, { action: "finalize_inventory" }>
  idempotencyKey?: string | null
}) {
  const { command } = args
  const { data: reservation, error } = await args.supabase
    .from("ticket_inventory_reservations")
    .select("id,event_id,status")
    .eq("id", command.reservation_id)
    .maybeSingle()

  if (error) throw new TicketingCommandError("db_error", "Unable to load reservation.", 503)
  if (!reservation) throw new TicketingCommandError("not_found", "Reservation not found.", 404)

  await assertEventParent({
    supabase: args.supabase,
    orgId: args.orgId,
    eventId: reservation.event_id,
  })

  if (reservation.status === "finalized") {
    return {
      data: { finalized: false, already: true, reservation_id: command.reservation_id },
      message: "Reservation already finalized",
    }
  }

  try {
    const finalized = await finalizeInventory({
      supabase: args.supabase,
      reservationId: command.reservation_id,
    })

    await logAuditEvent({
      actorId: args.userId,
      orgId: args.orgId,
      action: "update",
      entityType: "ticket",
      entityId: command.reservation_id,
      newValues: {
        kind: "inventory_finalize",
        reason: command.reason,
        finalized,
        idempotency_key: args.idempotencyKey ?? null,
      },
    })

    return {
      data: { finalized, reservation_id: command.reservation_id },
      message: "Inventory finalized",
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Finalize failed"
    throw new TicketingCommandError("inventory_transaction_failed", message, 422)
  }
}

/**
 * Validates refund parent/state/reason. Stripe + service-role mutation stays on
 * `/api/admin/ticketing/refund` (SEC-109); this command records an audited intent
 * and returns a typed handoff payload for that route / UI.
 */
async function prepareRefundSale(args: {
  supabase: SupabaseLike
  userId: string
  orgId: string
  command: Extract<TicketingCommand, { action: "refund_sale" }>
  idempotencyKey?: string | null
}) {
  const { command } = args
  const { data: sale, error } = await args.supabase
    .from("ticket_sales")
    .select("id,event_id,payment_status,total_amount,quantity,metadata")
    .eq("id", command.sale_id)
    .maybeSingle()

  if (error) throw new TicketingCommandError("db_error", "Unable to load sale.", 503)
  if (!sale) throw new TicketingCommandError("not_found", "Sale not found.", 404)

  await assertEventParent({
    supabase: args.supabase,
    orgId: args.orgId,
    eventId: sale.event_id,
  })

  if (sale.payment_status === "refunded" || sale.metadata?.refund) {
    throw new TicketingCommandError("already_refunded", "This sale has already been refunded.", 409)
  }
  if (!["completed", "paid"].includes(sale.payment_status)) {
    throw new TicketingCommandError(
      "sale_not_refundable",
      "Only completed sales can be refunded.",
      422,
    )
  }

  const totalAmount = Number(sale.total_amount)
  if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
    throw new TicketingCommandError("sale_not_refundable", "Sale has no refundable balance.", 422)
  }

  if (command.partial_amount && command.partial_amount > totalAmount) {
    throw new TicketingCommandError(
      "refund_amount_exceeded",
      "Refund amount cannot exceed the sale total.",
      422,
    )
  }
  if (
    command.partial_amount
    && command.partial_amount < totalAmount
    && !command.ticket_ids?.length
  ) {
    throw new TicketingCommandError(
      "ticket_ids_required",
      "A partial refund must identify the refunded tickets.",
      422,
    )
  }

  await logAuditEvent({
    actorId: args.userId,
    orgId: args.orgId,
    action: "refund",
    entityType: "ticket",
    entityId: sale.id,
    newValues: {
      kind: "refund_intent",
      reason: command.reason,
      partial_amount: command.partial_amount ?? null,
      ticket_ids: command.ticket_ids ?? [],
      idempotency_key: args.idempotencyKey ?? null,
      execute_via: "/api/admin/ticketing/refund",
    },
  })

  return {
    data: {
      validated: true,
      sale_id: sale.id,
      event_id: sale.event_id,
      execute_via: "/api/admin/ticketing/refund",
      reason: command.reason,
      partial_amount: command.partial_amount ?? null,
      ticket_ids: command.ticket_ids ?? [],
    },
    message: "Refund command validated; execute via dedicated refund endpoint (service-role).",
  }
}
