/**
 * FIN-103 — Map legacy /api/admin/finances(+settlements) bodies onto
 * canonical FinanceCommand(s). Prefer POST /api/admin/finances/commands.
 */

import {
  parseFinanceCommand,
  type FinanceCommand,
  type PaymentStatus,
  type SettlementStatus,
} from "@/lib/admin/finance-command-schemas"
import { FinanceCommandError } from "@/lib/admin/finance-command.service"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseLike = { from: (table: string) => any }

const DEFAULT_DELETE_REASON = "admin delete transaction"
const DEFAULT_PAYMENT_REASON = "admin payment status update"
const DEFAULT_SETTLEMENT_REASON = "admin settlement status update"

function asRecord(body: unknown): Record<string, unknown> | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null
  return body as Record<string, unknown>
}

function reasonOrDefault(value: unknown, fallback: string): string {
  if (typeof value === "string" && value.trim().length >= 3) return value.trim()
  return fallback
}

/**
 * Resolve one or more finance commands from a canonical or legacy body.
 * Legacy PATCH may yield [update_transaction, transition_payment_status].
 */
export async function resolveFinanceCommands(args: {
  supabase: SupabaseLike
  orgId: string
  body: unknown
  method: "POST" | "PATCH" | "DELETE"
  deleteId?: string | null
}): Promise<FinanceCommand[]> {
  const canonical = parseFinanceCommand(args.body)
  if (canonical.ok) return [canonical.data]

  if (args.method === "DELETE") {
    const id = args.deleteId
      || (asRecord(args.body)?.id as string | undefined)
    if (!id || typeof id !== "string") {
      throw new FinanceCommandError("validation_error", "Transaction id is required.", 400)
    }
    return [{
      action: "delete_transaction",
      id,
      reason: reasonOrDefault(asRecord(args.body)?.reason, DEFAULT_DELETE_REASON),
    }]
  }

  const body = asRecord(args.body)
  if (!body) {
    throw new FinanceCommandError("validation_error", "Request body must be an object.", 400)
  }

  if (args.method === "POST") {
    if (body.action === "create_transaction" || body.action === "create_budget") {
      const parsed = parseFinanceCommand(body)
      if (!parsed.ok) {
        throw new FinanceCommandError("validation_error", parsed.error, 400)
      }
      return [parsed.data]
    }
    // Legacy settlements POST (no action; may include status: draft)
    if (!body.action) {
      const { status: _status, ...settlementFields } = body
      const parsed = parseFinanceCommand({
        action: "create_settlement",
        ...settlementFields,
      })
      if (!parsed.ok) {
        throw new FinanceCommandError("validation_error", parsed.error, 400)
      }
      return [parsed.data]
    }
    throw new FinanceCommandError("validation_error", "Unsupported finance create action.", 400)
  }

  // PATCH — transaction / budget / settlement legacy shapes
  if (body.table === "transaction" || (body.id && body.payment_status !== undefined && !body.status && !body.table)) {
    return adaptTransactionPatch(args.supabase, args.orgId, body)
  }
  if (body.table === "budget") {
    return adaptBudgetPatch(args.supabase, args.orgId, body)
  }
  if (typeof body.id === "string" && (body.status !== undefined || body.total_gross_revenue !== undefined || body.artist_payout !== undefined || body.notes !== undefined || body.event_id !== undefined)) {
    return adaptSettlementPatch(args.supabase, args.orgId, body)
  }

  throw new FinanceCommandError(
    "validation_error",
    "Unrecognized finance mutation body — use action-based finance commands.",
    400,
  )
}

async function adaptTransactionPatch(
  supabase: SupabaseLike,
  orgId: string,
  body: Record<string, unknown>,
): Promise<FinanceCommand[]> {
  const id = body.id
  if (typeof id !== "string") {
    throw new FinanceCommandError("validation_error", "Transaction id is required.", 400)
  }

  const { data: current, error } = await supabase
    .from("financial_transactions")
    .select("id,payment_status,updated_at")
    .eq("id", id)
    .eq("org_id", orgId)
    .maybeSingle()

  if (error) throw new FinanceCommandError("db_error", "Unable to load transaction.", 503)
  if (!current) throw new FinanceCommandError("not_found", "Transaction not found.", 404)

  const {
    id: _id,
    table: _t,
    action: _a,
    payment_status: nextStatus,
    reason,
    expected_updated_at: _eu,
    ...fieldUpdates
  } = body

  const statusChanged =
    typeof nextStatus === "string"
    && nextStatus !== current.payment_status

  const updatePayload: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(fieldUpdates)) {
    if (value !== undefined) updatePayload[key] = value
  }

  const commands: FinanceCommand[] = []

  if (Object.keys(updatePayload).length > 0) {
    const parsed = parseFinanceCommand({
      action: "update_transaction",
      id,
      expected_updated_at: current.updated_at,
      ...updatePayload,
      reason: typeof reason === "string" ? reason : undefined,
    })
    if (!parsed.ok) {
      throw new FinanceCommandError("validation_error", parsed.error, 400)
    }
    commands.push(parsed.data)
  }

  if (statusChanged) {
    commands.push({
      action: "transition_payment_status",
      id,
      expected_updated_at: current.updated_at,
      payment_status: nextStatus as PaymentStatus,
      reason: reasonOrDefault(reason, DEFAULT_PAYMENT_REASON),
    })
  }

  if (commands.length === 0) {
    throw new FinanceCommandError("validation_error", "At least one update field is required.", 400)
  }

  // If both update + transition, second command must use updated_at from first result —
  // marked via expected_updated_at placeholder; executor refreshes between steps.
  return commands
}

async function adaptBudgetPatch(
  supabase: SupabaseLike,
  orgId: string,
  body: Record<string, unknown>,
): Promise<FinanceCommand[]> {
  const id = body.id
  if (typeof id !== "string") {
    throw new FinanceCommandError("validation_error", "Budget id is required.", 400)
  }

  const { data: current, error } = await supabase
    .from("budgets")
    .select("id,updated_at")
    .eq("id", id)
    .eq("org_id", orgId)
    .maybeSingle()

  if (error) throw new FinanceCommandError("db_error", "Unable to load budget.", 503)
  if (!current) throw new FinanceCommandError("not_found", "Budget not found.", 404)

  const {
    id: _id,
    table: _t,
    action: _a,
    reason,
    expected_updated_at: _eu,
    ...updates
  } = body

  const parsed = parseFinanceCommand({
    action: "update_budget",
    id,
    expected_updated_at: current.updated_at,
    ...updates,
    reason: typeof reason === "string" ? reason : undefined,
  })
  if (!parsed.ok) {
    throw new FinanceCommandError("validation_error", parsed.error, 400)
  }
  return [parsed.data]
}

async function adaptSettlementPatch(
  supabase: SupabaseLike,
  orgId: string,
  body: Record<string, unknown>,
): Promise<FinanceCommand[]> {
  const id = body.id
  if (typeof id !== "string") {
    throw new FinanceCommandError("validation_error", "Settlement id is required.", 400)
  }

  const { data: current, error } = await supabase
    .from("settlements")
    .select("id,status,updated_at")
    .eq("id", id)
    .eq("org_id", orgId)
    .maybeSingle()

  if (error) throw new FinanceCommandError("db_error", "Unable to load settlement.", 503)
  if (!current) throw new FinanceCommandError("not_found", "Settlement not found.", 404)

  const {
    id: _id,
    status: nextStatus,
    reason,
    expected_updated_at: _eu,
    expected_status: _es,
    ...fieldUpdates
  } = body

  const statusChanged =
    typeof nextStatus === "string"
    && nextStatus !== current.status

  const updatePayload: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(fieldUpdates)) {
    if (value !== undefined) updatePayload[key] = value
  }

  const commands: FinanceCommand[] = []

  if (Object.keys(updatePayload).length > 0) {
    const parsed = parseFinanceCommand({
      action: "update_settlement",
      id,
      expected_updated_at: current.updated_at || undefined,
      expected_status: current.status,
      ...updatePayload,
      reason: typeof reason === "string" ? reason : undefined,
    })
    if (!parsed.ok) {
      throw new FinanceCommandError("validation_error", parsed.error, 400)
    }
    commands.push(parsed.data)
  }

  if (statusChanged) {
    commands.push({
      action: "transition_settlement_status",
      id,
      expected_status: current.status as SettlementStatus,
      status: nextStatus as SettlementStatus,
      reason: reasonOrDefault(reason, DEFAULT_SETTLEMENT_REASON),
    })
  }

  if (commands.length === 0) {
    throw new FinanceCommandError("validation_error", "At least one update field is required.", 400)
  }

  return commands
}

/**
 * Execute one or more resolved commands, refreshing CAS tokens between steps
 * when a prior update changes updated_at / status.
 */
export async function executeFinanceCommandChain(args: {
  supabase: SupabaseLike
  userId: string
  orgId: string
  capabilities: readonly import("@/lib/auth/admin-capabilities").AdminCapability[]
  commands: FinanceCommand[]
  idempotencyKey?: string | null
  execute: typeof import("@/lib/admin/finance-command.service").executeFinanceCommand
}): Promise<{ data: unknown; message?: string; status?: number }> {
  let last: { data: unknown; message?: string; status?: number } = { data: null }

  for (let i = 0; i < args.commands.length; i++) {
    let command = args.commands[i]

    // After an update_*, refresh expected_* for a following transition_* on same id
    if (i > 0 && command.action === "transition_payment_status") {
      const { data: row } = await args.supabase
        .from("financial_transactions")
        .select("updated_at")
        .eq("id", command.id)
        .eq("org_id", args.orgId)
        .maybeSingle()
      if (row?.updated_at)
        command = { ...command, expected_updated_at: row.updated_at }
    }
    if (i > 0 && command.action === "transition_settlement_status") {
      const { data: row } = await args.supabase
        .from("settlements")
        .select("status")
        .eq("id", command.id)
        .eq("org_id", args.orgId)
        .maybeSingle()
      if (row?.status)
        command = { ...command, expected_status: row.status }
    }

    last = await args.execute({
      supabase: args.supabase,
      userId: args.userId,
      orgId: args.orgId,
      capabilities: args.capabilities,
      command,
      idempotencyKey: args.idempotencyKey,
    })
  }

  return last
}
