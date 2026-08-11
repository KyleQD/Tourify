/**
 * FIN-103 — Canonical admin finance command service.
 * Schemas, org/parent predicates, status transitions, money checks,
 * expected version, reason, immutable audit, typed errors.
 */

import { logAuditEvent } from "@/lib/audit"
import {
  assertOrgEntityReferences,
  OrgEntityAccessError,
} from "@/lib/admin/org-entity-access"
import { stampFinanceOrgId } from "@/lib/admin/finance-tenant-keys"
import {
  assertPaymentStatusTransition,
  assertSettlementStatusTransition,
  categoryMatchesType,
  FinanceStatusTransitionError,
  type FinanceCommand,
} from "@/lib/admin/finance-command-schemas"
import {
  buildReversalLine,
  canCreateAdjustmentForTransaction,
  canCreateReversalForTransaction,
  canMutateFinanceTransaction,
  isSettledSettlementStatus,
} from "@/lib/admin/finance-reversal-rules"
import {
  assertStateAllowsAction,
  StateAwareAuthDeniedError,
} from "@/lib/admin/state-aware-authorization"
import type { AdminCapability } from "@/lib/auth/admin-capabilities"
import { hasAdminCapability } from "@/lib/auth/admin-capabilities"

type SupabaseLike = { from: (table: string) => any }

export class FinanceCommandError extends Error {
  readonly status: number
  readonly code: string

  constructor(code: string, message: string, status = 422) {
    super(message)
    this.name = "FinanceCommandError"
    this.code = code
    this.status = status
  }
}

export function getFinanceCommandErrorStatus(error: unknown, fallback = 500): number {
  if (error instanceof FinanceCommandError) return error.status
  if (error instanceof FinanceStatusTransitionError) return error.status
  if (error instanceof OrgEntityAccessError) return error.status
  if (error instanceof StateAwareAuthDeniedError) return error.status
  if (error && typeof error === "object" && "status" in error) {
    const status = Number((error as { status: unknown }).status)
    if (Number.isFinite(status) && status >= 400 && status < 600) return status
  }
  const message = error instanceof Error ? error.message : ""
  if (/not found/i.test(message)) return 404
  if (/not authorized|forbidden|capability|acting organization/i.test(message)) return 403
  if (/illegal|validation|immutable|conflict|mismatch/i.test(message)) return 422
  return fallback
}

function requireCap(capabilities: readonly AdminCapability[], cap: AdminCapability, action: string) {
  if (!hasAdminCapability(capabilities, cap)) {
    throw new FinanceCommandError(
      "capability_denied",
      `Missing capability ${cap} for ${action}.`,
      403,
    )
  }
}

export async function executeFinanceCommand(args: {
  supabase: SupabaseLike
  userId: string
  orgId: string
  capabilities: readonly AdminCapability[]
  command: FinanceCommand
  idempotencyKey?: string | null
}): Promise<{ data: unknown; message?: string; status?: number }> {
  requireCap(args.capabilities, "finance.manage", args.command.action)

  const a = args as any
  switch (args.command.action) {
    case "create_transaction":
      return createTransaction(a)
    case "update_transaction":
      return updateTransaction(a)
    case "transition_payment_status":
      return transitionPaymentStatus(a)
    case "delete_transaction":
      return deleteTransaction(a)
    case "create_budget":
      return createBudget(a)
    case "update_budget":
      return updateBudget(a)
    case "create_settlement":
      return createSettlement(a)
    case "update_settlement":
      return updateSettlement(a)
    case "transition_settlement_status":
      return transitionSettlementStatus(a)
    case "create_reversal":
      return createReversal(a)
    case "create_adjustment":
      return createAdjustment(a)
    case "create_settlement_adjustment":
      return createSettlementAdjustment(a)
    default:
      throw new FinanceCommandError("unknown_action", "Unsupported finance command", 400)
  }
}

async function createTransaction(args: {
  supabase: SupabaseLike
  userId: string
  orgId: string
  capabilities: readonly AdminCapability[]
  command: Extract<FinanceCommand, { action: "create_transaction" }>
  idempotencyKey?: string | null
}) {
  const { command } = args
  await assertOrgEntityReferences(args.supabase, args.orgId, {
    eventId: command.event_id,
    tourId: command.tour_id,
  })

  if (["paid", "refunded"].includes(command.payment_status || "pending"))
    requireCap(args.capabilities, "finance.pay", "create_transaction with paid/refunded")

  const { action: _a, reason, ...values } = command
  const now = new Date().toISOString()
  const row = {
    ...values,
    created_by: args.userId,
    ...(values.payment_status === "paid" || values.payment_status === "refunded"
      ? {
          paid_at: values.payment_status === "paid" ? now : undefined,
          posted_at: now,
        }
      : {}),
  }
  const { data, error } = await args.supabase
    .from("financial_transactions")
    .insert(stampFinanceOrgId({
      orgId: args.orgId,
      row,
    }))
    .select("*")
    .single()

  if (error || !data)
    throw new FinanceCommandError("db_error", "Failed to create transaction.", 503)

  await logAuditEvent({
    actorId: args.userId,
    orgId: args.orgId,
    action: "create",
    entityType: "transaction",
    entityId: data.id,
    newValues: {
      type: command.type,
      amount: command.amount,
      category: command.category,
      reason: reason ?? null,
      idempotency_key: args.idempotencyKey ?? null,
    },
  })

  return { data: { transaction: data }, status: 201, message: "Transaction created" }
}

async function updateTransaction(args: {
  supabase: SupabaseLike
  userId: string
  orgId: string
  command: Extract<FinanceCommand, { action: "update_transaction" }>
  idempotencyKey?: string | null
}) {
  const { command } = args
  const { data: current, error: currentError } = await args.supabase
    .from("financial_transactions")
    .select("*")
    .eq("id", command.id)
    .eq("org_id", args.orgId)
    .maybeSingle()

  if (currentError) throw new FinanceCommandError("db_error", "Unable to load transaction.", 503)
  if (!current) throw new FinanceCommandError("not_found", "Transaction not found.", 404)

  if (current.updated_at !== command.expected_updated_at) {
    throw new FinanceCommandError(
      "version_conflict",
      "Transaction changed while it was being updated.",
      409,
    )
  }
  const mutateGuard = canMutateFinanceTransaction({
    paymentStatus: current.payment_status,
    action: "update",
  })
  if (!mutateGuard.ok) {
    throw new FinanceCommandError(mutateGuard.code, mutateGuard.message, 409)
  }

  const {
    action: _a,
    id,
    expected_updated_at: _e,
    reason,
    ...updates
  } = command

  const effectiveType = updates.type ?? current.type
  const effectiveCategory = updates.category ?? current.category
  if (!categoryMatchesType(effectiveType, effectiveCategory)) {
    throw new FinanceCommandError(
      "category_type_mismatch",
      "Transaction category does not match its type.",
      422,
    )
  }

  const eventId = Object.prototype.hasOwnProperty.call(updates, "event_id")
    ? updates.event_id
    : current.event_id
  const tourId = Object.prototype.hasOwnProperty.call(updates, "tour_id")
    ? updates.tour_id
    : current.tour_id
  await assertOrgEntityReferences(args.supabase, args.orgId, { eventId, tourId })

  const { data, error } = await args.supabase
    .from("financial_transactions")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("org_id", args.orgId)
    .eq("updated_at", command.expected_updated_at)
    .select("*")
    .maybeSingle()

  if (error) throw new FinanceCommandError("db_error", "Failed to update transaction.", 503)
  if (!data) {
    throw new FinanceCommandError(
      "version_conflict",
      "Transaction changed while it was being updated.",
      409,
    )
  }

  await logAuditEvent({
    actorId: args.userId,
    orgId: args.orgId,
    action: "update",
    entityType: "transaction",
    entityId: id,
    oldValues: current,
    newValues: { ...updates, reason: reason ?? null, idempotency_key: args.idempotencyKey ?? null },
  })

  return { data: { transaction: data }, message: "Transaction updated" }
}

async function transitionPaymentStatus(args: {
  supabase: SupabaseLike
  userId: string
  orgId: string
  capabilities: readonly AdminCapability[]
  command: Extract<FinanceCommand, { action: "transition_payment_status" }>
  idempotencyKey?: string | null
}) {
  const { command } = args
  const { data: current, error: currentError } = await args.supabase
    .from("financial_transactions")
    .select("id,payment_status,updated_at,created_by")
    .eq("id", command.id)
    .eq("org_id", args.orgId)
    .maybeSingle()

  if (currentError) throw new FinanceCommandError("db_error", "Unable to load transaction.", 503)
  if (!current) throw new FinanceCommandError("not_found", "Transaction not found.", 404)

  if (current.updated_at !== command.expected_updated_at) {
    throw new FinanceCommandError(
      "version_conflict",
      "Transaction changed while it was being updated.",
      409,
    )
  }

  if (current.payment_status === command.payment_status) {
    return {
      data: { transaction: current, already: true },
      message: "Payment status unchanged (idempotent)",
    }
  }

  assertPaymentStatusTransition(current.payment_status, command.payment_status)

  if (["paid", "refunded"].includes(command.payment_status)) {
    requireCap(args.capabilities, "finance.pay", "transition_payment_status")
    // SEC-202 — pay/refund requires separation from the transaction creator when known.
    assertStateAllowsAction({
      domain: "finance_transaction",
      state: current.payment_status,
      action: "pay",
      capabilities: args.capabilities,
      actorUserId: args.userId,
      priorActorUserId: current.created_by ?? null,
    })
  }

  const now = new Date().toISOString()
  const patch: Record<string, unknown> = {
    payment_status: command.payment_status,
    updated_at: now,
  }
  if (command.payment_status === "paid") {
    patch.paid_at = now
    patch.posted_at = now
  }
  if (command.payment_status === "refunded")
    patch.posted_at = now

  const { data, error } = await args.supabase
    .from("financial_transactions")
    .update(patch)
    .eq("id", command.id)
    .eq("org_id", args.orgId)
    .eq("updated_at", command.expected_updated_at)
    .select("*")
    .maybeSingle()

  if (error) throw new FinanceCommandError("db_error", "Failed to transition payment status.", 503)
  if (!data) {
    throw new FinanceCommandError(
      "version_conflict",
      "Transaction changed while it was being updated.",
      409,
    )
  }

  await logAuditEvent({
    actorId: args.userId,
    orgId: args.orgId,
    action: "update",
    entityType: "transaction",
    entityId: command.id,
    oldValues: { payment_status: current.payment_status },
    newValues: {
      payment_status: command.payment_status,
      reason: command.reason,
      idempotency_key: args.idempotencyKey ?? null,
    },
  })

  return { data: { transaction: data }, message: "Payment status updated" }
}

async function deleteTransaction(args: {
  supabase: SupabaseLike
  userId: string
  orgId: string
  command: Extract<FinanceCommand, { action: "delete_transaction" }>
  idempotencyKey?: string | null
}) {
  const { command } = args
  const { data: current, error: currentError } = await args.supabase
    .from("financial_transactions")
    .select("id,payment_status")
    .eq("id", command.id)
    .eq("org_id", args.orgId)
    .maybeSingle()

  if (currentError) throw new FinanceCommandError("db_error", "Unable to load transaction.", 503)
  if (!current) throw new FinanceCommandError("not_found", "Transaction not found.", 404)

  const mutateGuard = canMutateFinanceTransaction({
    paymentStatus: current.payment_status,
    action: "delete",
  })
  if (!mutateGuard.ok) {
    throw new FinanceCommandError(mutateGuard.code, mutateGuard.message, 409)
  }

  const { data, error } = await args.supabase
    .from("financial_transactions")
    .delete()
    .eq("id", command.id)
    .eq("org_id", args.orgId)
    .select("id")
    .maybeSingle()

  if (error) throw new FinanceCommandError("db_error", "Failed to delete transaction.", 503)
  if (!data) throw new FinanceCommandError("not_found", "Transaction not found.", 404)

  await logAuditEvent({
    actorId: args.userId,
    orgId: args.orgId,
    action: "delete",
    entityType: "transaction",
    entityId: command.id,
    oldValues: { payment_status: current.payment_status, reason: command.reason },
    newValues: { idempotency_key: args.idempotencyKey ?? null },
  })

  return { data: { success: true, id: command.id }, message: "Transaction deleted" }
}

async function createBudget(args: {
  supabase: SupabaseLike
  userId: string
  orgId: string
  command: Extract<FinanceCommand, { action: "create_budget" }>
  idempotencyKey?: string | null
}) {
  const { command } = args
  await assertOrgEntityReferences(args.supabase, args.orgId, {
    eventId: command.event_id,
    tourId: command.tour_id,
  })

  const { action: _a, reason, ...values } = command
  const { data, error } = await args.supabase
    .from("budgets")
    .insert(stampFinanceOrgId({
      orgId: args.orgId,
      row: { ...values, created_by: args.userId },
    }))
    .select("*")
    .single()

  if (error || !data)
    throw new FinanceCommandError("db_error", "Failed to create budget.", 503)

  await logAuditEvent({
    actorId: args.userId,
    orgId: args.orgId,
    action: "create",
    entityType: "budget",
    entityId: data.id,
    newValues: {
      category: command.category,
      allocated_amount: command.allocated_amount,
      reason: reason ?? null,
      idempotency_key: args.idempotencyKey ?? null,
    },
  })

  return { data: { budget: data }, status: 201, message: "Budget created" }
}

async function updateBudget(args: {
  supabase: SupabaseLike
  userId: string
  orgId: string
  command: Extract<FinanceCommand, { action: "update_budget" }>
  idempotencyKey?: string | null
}) {
  const { command } = args
  const { data: current, error: currentError } = await args.supabase
    .from("budgets")
    .select("*")
    .eq("id", command.id)
    .eq("org_id", args.orgId)
    .maybeSingle()

  if (currentError) throw new FinanceCommandError("db_error", "Unable to load budget.", 503)
  if (!current) throw new FinanceCommandError("not_found", "Budget not found.", 404)

  if (current.updated_at !== command.expected_updated_at) {
    throw new FinanceCommandError(
      "version_conflict",
      "Budget changed while it was being updated.",
      409,
    )
  }

  const {
    action: _a,
    id,
    expected_updated_at: _e,
    reason,
    ...updates
  } = command

  const eventId = Object.prototype.hasOwnProperty.call(updates, "event_id")
    ? updates.event_id
    : current.event_id
  const tourId = Object.prototype.hasOwnProperty.call(updates, "tour_id")
    ? updates.tour_id
    : current.tour_id
  if (!eventId && !tourId) {
    throw new FinanceCommandError(
      "budget_scope_required",
      "Budget must remain linked to an event or tour.",
      422,
    )
  }
  await assertOrgEntityReferences(args.supabase, args.orgId, { eventId, tourId })

  const { data, error } = await args.supabase
    .from("budgets")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("org_id", args.orgId)
    .eq("updated_at", command.expected_updated_at)
    .select("*")
    .maybeSingle()

  if (error) throw new FinanceCommandError("db_error", "Failed to update budget.", 503)
  if (!data) {
    throw new FinanceCommandError(
      "version_conflict",
      "Budget changed while it was being updated.",
      409,
    )
  }

  await logAuditEvent({
    actorId: args.userId,
    orgId: args.orgId,
    action: "update",
    entityType: "budget",
    entityId: id,
    oldValues: current,
    newValues: { ...updates, reason: reason ?? null, idempotency_key: args.idempotencyKey ?? null },
  })

  return { data: { budget: data }, message: "Budget updated" }
}

async function createSettlement(args: {
  supabase: SupabaseLike
  userId: string
  orgId: string
  command: Extract<FinanceCommand, { action: "create_settlement" }>
  idempotencyKey?: string | null
}) {
  const { command } = args
  await assertOrgEntityReferences(args.supabase, args.orgId, {
    eventId: command.event_id,
    tourId: command.tour_id,
  })

  const { action: _a, reason, ...values } = command
  const { data, error } = await args.supabase
    .from("settlements")
    .insert(stampFinanceOrgId({
      orgId: args.orgId,
      row: { ...values, status: "draft" },
    }))
    .select("*")
    .single()

  if (error || !data)
    throw new FinanceCommandError("db_error", "Failed to create settlement.", 503)

  await logAuditEvent({
    actorId: args.userId,
    orgId: args.orgId,
    action: "create",
    entityType: "settlement",
    entityId: data.id,
    newValues: {
      status: "draft",
      reason: reason ?? null,
      idempotency_key: args.idempotencyKey ?? null,
    },
  })

  return { data: { settlement: data }, status: 201, message: "Settlement created" }
}

async function updateSettlement(args: {
  supabase: SupabaseLike
  userId: string
  orgId: string
  command: Extract<FinanceCommand, { action: "update_settlement" }>
  idempotencyKey?: string | null
}) {
  const { command } = args
  const { data: current, error: currentError } = await args.supabase
    .from("settlements")
    .select("*")
    .eq("id", command.id)
    .eq("org_id", args.orgId)
    .maybeSingle()

  if (currentError) throw new FinanceCommandError("db_error", "Unable to load settlement.", 503)
  if (!current) throw new FinanceCommandError("not_found", "Settlement not found.", 404)

  if (current.status === "paid") {
    throw new FinanceCommandError(
      "immutable_record",
      "Paid settlements cannot be overwritten.",
      409,
    )
  }
  if (current.status === "finalized") {
    throw new FinanceCommandError(
      "immutable_record",
      "Finalized settlements can only transition to paid via transition_settlement_status.",
      409,
    )
  }
  if (command.expected_status && current.status !== command.expected_status) {
    throw new FinanceCommandError(
      "version_conflict",
      "Settlement status changed while it was being updated.",
      409,
    )
  }
  if (
    command.expected_updated_at
    && current.updated_at
    && current.updated_at !== command.expected_updated_at
  ) {
    throw new FinanceCommandError(
      "version_conflict",
      "Settlement changed while it was being updated.",
      409,
    )
  }

  const {
    action: _a,
    id,
    expected_updated_at: _eu,
    expected_status: _es,
    reason,
    ...updates
  } = command

  const eventId = Object.prototype.hasOwnProperty.call(updates, "event_id")
    ? updates.event_id
    : current.event_id
  const tourId = Object.prototype.hasOwnProperty.call(updates, "tour_id")
    ? updates.tour_id
    : current.tour_id
  if (!eventId && !tourId) {
    throw new FinanceCommandError(
      "settlement_scope_required",
      "Settlement must remain linked to an event or tour.",
      422,
    )
  }
  await assertOrgEntityReferences(args.supabase, args.orgId, { eventId, tourId })

  let query = args.supabase
    .from("settlements")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("org_id", args.orgId)
    .eq("status", current.status)

  if (command.expected_updated_at)
    query = query.eq("updated_at", command.expected_updated_at)

  const { data, error } = await query.select("*").maybeSingle()

  if (error) throw new FinanceCommandError("db_error", "Failed to update settlement.", 503)
  if (!data) {
    throw new FinanceCommandError(
      "version_conflict",
      "Settlement changed while it was being updated.",
      409,
    )
  }

  await logAuditEvent({
    actorId: args.userId,
    orgId: args.orgId,
    action: "update",
    entityType: "settlement",
    entityId: id,
    oldValues: current,
    newValues: { ...updates, reason: reason ?? null, idempotency_key: args.idempotencyKey ?? null },
  })

  return { data: { settlement: data }, message: "Settlement updated" }
}

async function transitionSettlementStatus(args: {
  supabase: SupabaseLike
  userId: string
  orgId: string
  capabilities: readonly AdminCapability[]
  command: Extract<FinanceCommand, { action: "transition_settlement_status" }>
  idempotencyKey?: string | null
}) {
  const { command } = args
  const { data: current, error: currentError } = await args.supabase
    .from("settlements")
    .select("*")
    .eq("id", command.id)
    .eq("org_id", args.orgId)
    .maybeSingle()

  if (currentError) throw new FinanceCommandError("db_error", "Unable to load settlement.", 503)
  if (!current) throw new FinanceCommandError("not_found", "Settlement not found.", 404)

  if (current.status !== command.expected_status) {
    throw new FinanceCommandError(
      "version_conflict",
      "Settlement status changed while it was being updated.",
      409,
    )
  }

  if (current.status === command.status) {
    return {
      data: { settlement: current, already: true },
      message: "Settlement status unchanged (idempotent)",
    }
  }

  assertSettlementStatusTransition(current.status, command.status)

  if (command.status === "finalized") {
    requireCap(args.capabilities, "finance.approve", "finalize settlement")
    // SEC-202 — state + SoD (prior = settled_by when revisiting; usually null on first finalize).
    assertStateAllowsAction({
      domain: "finance_settlement",
      state: current.status,
      action: "approve",
      capabilities: args.capabilities,
      actorUserId: args.userId,
      priorActorUserId: current.settled_by ?? null,
    })
  }
  if (command.status === "paid") {
    requireCap(args.capabilities, "finance.pay", "mark settlement paid")
    assertStateAllowsAction({
      domain: "finance_settlement",
      state: current.status,
      action: "pay",
      capabilities: args.capabilities,
      actorUserId: args.userId,
      priorActorUserId: current.settled_by ?? null,
    })
  }

  const patch: Record<string, unknown> = {
    status: command.status,
    updated_at: new Date().toISOString(),
  }
  if (command.status === "paid") {
    patch.settled_at = new Date().toISOString()
    patch.settled_by = args.userId
  }

  const { data, error } = await args.supabase
    .from("settlements")
    .update(patch)
    .eq("id", command.id)
    .eq("org_id", args.orgId)
    .eq("status", command.expected_status)
    .select("*")
    .maybeSingle()

  if (error) throw new FinanceCommandError("db_error", "Failed to transition settlement.", 503)
  if (!data) {
    throw new FinanceCommandError(
      "version_conflict",
      "Settlement changed while it was being updated.",
      409,
    )
  }

  await logAuditEvent({
    actorId: args.userId,
    orgId: args.orgId,
    action: command.status === "paid" ? "settle" : "update",
    entityType: "settlement",
    entityId: command.id,
    oldValues: { status: current.status },
    newValues: {
      status: command.status,
      reason: command.reason,
      idempotency_key: args.idempotencyKey ?? null,
    },
  })

  return { data: { settlement: data }, message: "Settlement status updated" }
}

async function createReversal(args: {
  supabase: SupabaseLike
  userId: string
  orgId: string
  capabilities: readonly AdminCapability[]
  command: Extract<FinanceCommand, { action: "create_reversal" }>
  idempotencyKey?: string | null
}) {
  const { command } = args
  requireCap(args.capabilities, "finance.pay", "create_reversal")

  const { data: original, error: loadError } = await args.supabase
    .from("financial_transactions")
    .select("*")
    .eq("id", command.transaction_id)
    .eq("org_id", args.orgId)
    .maybeSingle()

  if (loadError) throw new FinanceCommandError("db_error", "Unable to load transaction.", 503)
  if (!original) throw new FinanceCommandError("not_found", "Transaction not found.", 404)

  if (original.updated_at !== command.expected_updated_at) {
    throw new FinanceCommandError(
      "version_conflict",
      "Transaction changed while it was being reversed.",
      409,
    )
  }

  const { data: existingReversal } = await args.supabase
    .from("financial_transactions")
    .select("id")
    .eq("org_id", args.orgId)
    .eq("reverses_transaction_id", command.transaction_id)
    .maybeSingle()

  const guard = canCreateReversalForTransaction({
    paymentStatus: original.payment_status,
    alreadyReversed: Boolean(existingReversal),
  })
  if (!guard.ok) throw new FinanceCommandError(guard.code, guard.message, 422)

  const line = buildReversalLine({
    original: {
      type: original.type,
      category: original.category,
      amount: original.amount,
      event_id: original.event_id,
      tour_id: original.tour_id,
      description: original.description,
    },
    reason: command.reason,
  })

  const now = new Date().toISOString()
  const { data, error } = await args.supabase
    .from("financial_transactions")
    .insert(stampFinanceOrgId({
      orgId: args.orgId,
      row: {
        ...line,
        event_id: original.event_id,
        tour_id: original.tour_id,
        reverses_transaction_id: original.id,
        paid_at: now,
        posted_at: now,
        created_by: args.userId,
      },
    }))
    .select("*")
    .single()

  if (error || !data)
    throw new FinanceCommandError("db_error", "Failed to create reversal.", 503)

  await logAuditEvent({
    actorId: args.userId,
    orgId: args.orgId,
    action: "create",
    entityType: "transaction",
    entityId: data.id,
    oldValues: {
      id: original.id,
      type: original.type,
      amount: original.amount,
      payment_status: original.payment_status,
      category: original.category,
    },
    newValues: {
      link: "reversal",
      reverses_transaction_id: original.id,
      type: line.type,
      amount: line.amount,
      reason: command.reason,
      idempotency_key: args.idempotencyKey ?? null,
    },
  })

  return {
    data: { transaction: data, reversed: original.id },
    status: 201,
    message: "Reversal created",
  }
}

async function createAdjustment(args: {
  supabase: SupabaseLike
  userId: string
  orgId: string
  capabilities: readonly AdminCapability[]
  command: Extract<FinanceCommand, { action: "create_adjustment" }>
  idempotencyKey?: string | null
}) {
  const { command } = args
  requireCap(args.capabilities, "finance.pay", "create_adjustment")

  const { data: original, error: loadError } = await args.supabase
    .from("financial_transactions")
    .select("*")
    .eq("id", command.transaction_id)
    .eq("org_id", args.orgId)
    .maybeSingle()

  if (loadError) throw new FinanceCommandError("db_error", "Unable to load transaction.", 503)
  if (!original) throw new FinanceCommandError("not_found", "Transaction not found.", 404)

  if (original.updated_at !== command.expected_updated_at) {
    throw new FinanceCommandError(
      "version_conflict",
      "Transaction changed while it was being adjusted.",
      409,
    )
  }

  const guard = canCreateAdjustmentForTransaction({
    paymentStatus: original.payment_status,
  })
  if (!guard.ok) throw new FinanceCommandError(guard.code, guard.message, 422)

  const now = new Date().toISOString()
  const { data, error } = await args.supabase
    .from("financial_transactions")
    .insert(stampFinanceOrgId({
      orgId: args.orgId,
      row: {
        type: command.type,
        category: command.category,
        amount: command.amount,
        description: command.description
          || `Adjustment of ${original.category}: ${command.reason}`.slice(0, 2_000),
        event_id: original.event_id,
        tour_id: original.tour_id,
        adjusts_transaction_id: original.id,
        payment_status: "paid",
        paid_at: now,
        posted_at: now,
        created_by: args.userId,
      },
    }))
    .select("*")
    .single()

  if (error || !data)
    throw new FinanceCommandError("db_error", "Failed to create adjustment.", 503)

  await logAuditEvent({
    actorId: args.userId,
    orgId: args.orgId,
    action: "create",
    entityType: "transaction",
    entityId: data.id,
    oldValues: {
      id: original.id,
      type: original.type,
      amount: original.amount,
      category: original.category,
      payment_status: original.payment_status,
    },
    newValues: {
      link: "adjustment",
      adjusts_transaction_id: original.id,
      type: command.type,
      amount: command.amount,
      category: command.category,
      reason: command.reason,
      idempotency_key: args.idempotencyKey ?? null,
    },
  })

  return {
    data: { transaction: data, adjusted: original.id },
    status: 201,
    message: "Adjustment created",
  }
}

async function createSettlementAdjustment(args: {
  supabase: SupabaseLike
  userId: string
  orgId: string
  capabilities: readonly AdminCapability[]
  command: Extract<FinanceCommand, { action: "create_settlement_adjustment" }>
  idempotencyKey?: string | null
}) {
  const { command } = args
  requireCap(args.capabilities, "finance.approve", "create_settlement_adjustment")

  const { data: original, error: loadError } = await args.supabase
    .from("settlements")
    .select("*")
    .eq("id", command.settlement_id)
    .eq("org_id", args.orgId)
    .maybeSingle()

  if (loadError) throw new FinanceCommandError("db_error", "Unable to load settlement.", 503)
  if (!original) throw new FinanceCommandError("not_found", "Settlement not found.", 404)

  if (original.status !== command.expected_status) {
    throw new FinanceCommandError(
      "version_conflict",
      "Settlement status changed while it was being adjusted.",
      409,
    )
  }
  if (!isSettledSettlementStatus(original.status)) {
    throw new FinanceCommandError(
      "not_settled",
      "Only finalized/paid settlements require a linked adjustment draft.",
      422,
    )
  }

  const { data, error } = await args.supabase
    .from("settlements")
    .insert(stampFinanceOrgId({
      orgId: args.orgId,
      row: {
        event_id: original.event_id,
        tour_id: original.tour_id,
        total_gross_revenue: command.total_gross_revenue ?? original.total_gross_revenue,
        total_expenses: command.total_expenses ?? original.total_expenses,
        artist_payout: command.artist_payout ?? original.artist_payout,
        venue_payout: command.venue_payout ?? original.venue_payout,
        promoter_payout: command.promoter_payout ?? original.promoter_payout,
        deal_type: original.deal_type,
        guarantee_amount: original.guarantee_amount,
        door_percentage: original.door_percentage,
        notes: command.notes
          ?? `Adjustment of settlement ${original.id}: ${command.reason}`.slice(0, 4_000),
        status: "draft",
        adjusts_settlement_id: original.id,
      },
    }))
    .select("*")
    .single()

  if (error || !data)
    throw new FinanceCommandError("db_error", "Failed to create settlement adjustment.", 503)

  await logAuditEvent({
    actorId: args.userId,
    orgId: args.orgId,
    action: "create",
    entityType: "settlement",
    entityId: data.id,
    oldValues: {
      id: original.id,
      status: original.status,
      total_gross_revenue: original.total_gross_revenue,
      total_expenses: original.total_expenses,
      artist_payout: original.artist_payout,
    },
    newValues: {
      link: "adjustment",
      adjusts_settlement_id: original.id,
      status: "draft",
      reason: command.reason,
      idempotency_key: args.idempotencyKey ?? null,
    },
  })

  return {
    data: { settlement: data, adjusted: original.id },
    status: 201,
    message: "Settlement adjustment draft created",
  }
}
