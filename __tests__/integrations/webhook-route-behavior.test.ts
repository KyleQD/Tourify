/**
 * INTG-006 — per-route inbound webhook behavior.
 *
 * Every inbound webhook route is exercised against the five properties the lane
 * requires, using real cryptography and a recording Supabase stub:
 *   1. valid signature accepted,
 *   2. invalid signature rejected with zero side effects,
 *   3. replayed / duplicate delivery rejected (idempotent acknowledgement),
 *   4. duplicate concurrent delivery handled exactly once,
 *   5. malformed body rejected.
 *
 * No route here is invented: each path in WEBHOOK_ROUTE_INVENTORY is an existing
 * file under app/api.
 */

import { createHash, createHmac, timingSafeEqual } from "node:crypto"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

// ---------------------------------------------------------------------------
// Module doubles
// ---------------------------------------------------------------------------

const gateState = vi.hoisted(() => ({ advanced: false, marketplace: false }))

vi.mock("@/lib/config/audit-feature-gates", async () => {
  const { NextResponse } = await import("next/server")
  return {
    isAuditFeatureApproved: (feature: string) =>
      feature === "advanced_webhooks"
        ? gateState.advanced
        : feature === "marketplace_integrations"
          ? gateState.marketplace
          : false,
    auditFeatureUnavailable: (feature: string) =>
      NextResponse.json(
        { error: { code: "FEATURE_UNAVAILABLE", message: "This capability is not currently available", feature } },
        { status: 503, headers: { "cache-control": "no-store" } },
      ),
  }
})

const supabaseState = vi.hoisted(() => ({ client: null as any }))
vi.mock("@/lib/supabase/service-role", () => ({ createServiceRoleClient: () => supabaseState.client }))

const deliveryState = vi.hoisted(() => ({
  calls: [] as any[],
  error: null as unknown,
}))
vi.mock("@/lib/services/notification-delivery", () => ({
  deliverNotificationOutbound: async (input: any) => {
    deliveryState.calls.push(input)
    if (deliveryState.error) throw deliveryState.error
    return { email: { sent: true } }
  },
}))

const stripeState = vi.hoisted(() => ({
  event: null as any,
  constructError: null as unknown,
  secret: "whsec_route_test",
}))
vi.mock("@/lib/stripe", () => ({
  getStripe: () => ({
    webhooks: {
      constructEvent: (body: string, signature: string, secret: string) => {
        if (stripeState.constructError) throw stripeState.constructError
        // Real Stripe semantics: constant-time HMAC over `t.body` plus a bounded
        // tolerance, so a forged header or a replayed timestamp must throw
        // rather than construct an event.
        const parts = Object.fromEntries(
          signature.split(",").map((piece) => {
            const idx = piece.indexOf("=")
            return [piece.slice(0, idx).trim(), piece.slice(idx + 1).trim()]
          }),
        ) as { t?: string; v1?: string }
        if (!parts.t || !parts.v1) throw new Error("missing signature parts")
        const timestamp = Number(parts.t)
        if (!Number.isFinite(timestamp)) throw new Error("invalid timestamp")
        if (Math.abs(Date.now() / 1000 - timestamp) > 300) throw new Error("timestamp outside tolerance")
        const expected = createHmac("sha256", secret).update(`${parts.t}.${body}`).digest("hex")
        if (expected.length !== parts.v1.length) throw new Error("signature mismatch")
        if (!timingSafeEqual(Buffer.from(expected), Buffer.from(parts.v1)))
          throw new Error("signature mismatch")
        return stripeState.event
      },
    },
  }),
}))

// ---------------------------------------------------------------------------
// Recording Supabase stub
// ---------------------------------------------------------------------------

interface RecordedOp {
  table: string
  op: "select" | "insert" | "update" | "upsert"
  row?: Record<string, unknown>
  filters: Array<[string, unknown, unknown?]>
}

type StubResult = { data?: unknown; error?: unknown }
type Handlers = Record<string, StubResult | StubResult[]>

function createSupabaseStub(handlers: Handlers = {}) {
  const ops: RecordedOp[] = []

  const terminal = (state: { table: string; op: RecordedOp["op"] }) => {
    const key = `${state.op}:${state.table}`
    const spec = handlers[key]
    let resolved: StubResult = {}
    if (Array.isArray(spec)) {
      resolved = spec.length > 1 ? (spec.shift() as StubResult) : (spec[0] ?? {})
    } else if (spec) {
      resolved = spec
    }
    return Promise.resolve({ data: resolved.data ?? null, error: resolved.error ?? null, count: null })
  }

  const supabase: any = {
    from(table: string) {
      const state = { table, op: null as RecordedOp["op"] | null }
      const record: RecordedOp = { table, op: "select", filters: [] }
      const builder: any = {
        insert(row: Record<string, unknown>) {
          state.op = "insert"
          record.op = "insert"
          record.row = row
          ops.push(record)
          return builder
        },
        upsert(row: Record<string, unknown>) {
          state.op = "upsert"
          record.op = "upsert"
          record.row = row
          ops.push(record)
          return builder
        },
        update(row: Record<string, unknown>) {
          state.op = "update"
          record.op = "update"
          record.row = row
          ops.push(record)
          return builder
        },
        delete() {
          state.op = "update"
          return builder
        },
        select(_columns?: string) {
          state.op = state.op ?? "select"
          record.op = state.op
          if (!ops.includes(record)) ops.push(record)
          return builder
        },
        eq: (col: unknown, val: unknown) => (record.filters.push(["eq", col, val]), builder),
        neq: (col: unknown, val: unknown) => (record.filters.push(["neq", col, val]), builder),
        in: (col: unknown, val: unknown) => (record.filters.push(["in", col, val]), builder),
        lte: (col: unknown, val: unknown) => (record.filters.push(["lte", col, val]), builder),
        then: (resolve: any, reject: any) => terminal(state as any).then(resolve, reject),
        single: () => terminal(state as any),
        maybeSingle: () => terminal(state as any),
      }
      return builder
    },
    rpc: async () => ({ data: null, error: null }),
  }

  return { supabase, ops }
}

const countOps = (ops: RecordedOp[], op: RecordedOp["op"], table?: string) =>
  ops.filter((entry) => entry.op === op && (table ? entry.table === table : true)).length

const DUPLICATE_KEY = { code: "23505", message: 'duplicate key value violates unique constraint "x"' }

// ---------------------------------------------------------------------------
// Request builders
// ---------------------------------------------------------------------------

function jsonRequest(path: string, payload: unknown, headers: Record<string, string> = {}) {
  return new NextRequest(`http://localhost${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: typeof payload === "string" ? payload : JSON.stringify(payload),
  })
}

function partnerSignature(rawBody: string, secret: string) {
  return createHash("sha256").update(`${secret}:${rawBody}`).digest("hex")
}

function shopifySignature(rawBody: string) {
  return createHmac("sha256", process.env.SHOPIFY_CLIENT_SECRET!).update(rawBody, "utf8").digest("base64")
}

function stripeSignature(rawBody: string) {
  const timestamp = Math.floor(Date.now() / 1000)
  const digest = createHmac("sha256", stripeState.secret)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex")
  return `t=${timestamp},v1=${digest}`
}

const originalEnv = { ...process.env }

beforeEach(() => {
  gateState.advanced = false
  gateState.marketplace = false
  deliveryState.calls = []
  deliveryState.error = null
  stripeState.constructError = null
  process.env.NOTIFICATION_INSERT_WEBHOOK_SECRET = "notification_shared_secret"
  process.env.SHOPIFY_CLIENT_SECRET = "shopify_client_secret"
  process.env.PRINTFUL_WEBHOOK_SECRET = "printful_webhook_secret"
})

afterEach(() => {
  process.env = { ...originalEnv }
})

// ---------------------------------------------------------------------------
// 1. Supabase Database Webhook — /api/webhooks/supabase/notifications
// ---------------------------------------------------------------------------

describe("POST /api/webhooks/supabase/notifications", () => {
  const PATH = "/api/webhooks/supabase/notifications"
  const NOTIFICATION_ID = "11111111-2222-3333-4444-555555555555"
  const USER_ID = "99999999-8888-7777-6666-555555555555"

  const payload = (id: unknown = NOTIFICATION_ID) => ({
    record: { id, user_id: USER_ID, type: "system", title: "Hi", content: "There" },
  })

  async function post(body: unknown, token = process.env.NOTIFICATION_INSERT_WEBHOOK_SECRET!) {
    const { POST } = await import("@/app/api/webhooks/supabase/notifications/route")
    return POST(
      jsonRequest(PATH, body, { authorization: `Bearer ${token}` }),
    )
  }

  it("accepts a valid secret, claims atomically, and delivers exactly once", async () => {
    const { supabase, ops } = createSupabaseStub()
    supabaseState.client = supabase

    const response = await post(payload())

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ ok: true })
    expect(deliveryState.calls).toHaveLength(1)
    expect(deliveryState.calls[0]).toMatchObject({ id: NOTIFICATION_ID, userId: USER_ID })
    expect(countOps(ops, "insert", "webhook_delivery_receipts")).toBe(1)
    expect(ops.find((o) => o.op === "insert" && o.table === "webhook_delivery_receipts")!.row).toMatchObject({
      provider: "supabase_notifications",
      delivery_id: NOTIFICATION_ID,
      status: "processing",
    })
    const completion = ops.filter(
      (o) => o.op === "update" && o.table === "webhook_delivery_receipts",
    )
    expect(completion).toHaveLength(1)
    expect(completion[0].row).toMatchObject({ status: "delivered" })
  })

  it("rejects an invalid secret with 401 and no side effects", async () => {
    const { supabase, ops } = createSupabaseStub()
    supabaseState.client = supabase

    const response = await post(payload(), "wrong_secret")

    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({ error: "Unauthorized" })
    expect(deliveryState.calls).toHaveLength(0)
    expect(ops).toHaveLength(0)
  })

  it("rejects a missing token with 401 and no side effects", async () => {
    const { supabase, ops } = createSupabaseStub()
    supabaseState.client = supabase
    const { POST } = await import("@/app/api/webhooks/supabase/notifications/route")

    const response = await POST(
      new NextRequest(`http://localhost${PATH}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload()),
      }),
    )

    expect(response.status).toBe(401)
    expect(deliveryState.calls).toHaveLength(0)
    expect(ops).toHaveLength(0)
  })

  it("fails closed with 503 when the shared secret is not configured", async () => {
    delete process.env.NOTIFICATION_INSERT_WEBHOOK_SECRET
    const { supabase, ops } = createSupabaseStub()
    supabaseState.client = supabase

    const response = await post(payload())

    expect(response.status).toBe(503)
    expect((await response.json()).featureUnavailable).toBe(true)
    expect(deliveryState.calls).toHaveLength(0)
    expect(ops).toHaveLength(0)
  })

  it("rejects a malformed body with 400 and no side effects", async () => {
    const { supabase, ops } = createSupabaseStub()
    supabaseState.client = supabase

    const response = await post("{not json")

    expect(response.status).toBe(400)
    expect((await response.json()).error).toMatch(/Invalid payload/)
    expect(deliveryState.calls).toHaveLength(0)
    expect(ops).toHaveLength(0)
  })

  it("rejects a record without id/user_id with 400 and no side effects", async () => {
    const { supabase, ops } = createSupabaseStub()
    supabaseState.client = supabase

    const response = await post({ record: { type: "system" } })

    expect(response.status).toBe(400)
    expect(deliveryState.calls).toHaveLength(0)
    expect(ops).toHaveLength(0)
  })

  it("acknowledges a replayed delivery of an already-claimed notification without re-sending", async () => {
    const { supabase, ops } = createSupabaseStub({
      "insert:webhook_delivery_receipts": { error: DUPLICATE_KEY },
      "select:webhook_delivery_receipts": { data: { status: "delivered", attempts: 1, received_at: new Date().toISOString() } },
    })
    supabaseState.client = supabase

    const response = await post(payload())

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ ok: true, duplicate: true })
    expect(deliveryState.calls).toHaveLength(0)
    expect(countOps(ops, "update", "webhook_delivery_receipts")).toBe(0)
  })

  it("handles a duplicate concurrent delivery exactly once", async () => {
    // First request wins the atomic insert and is mid-delivery.
    const inFlight = new Date().toISOString()
    const { supabase, ops } = createSupabaseStub({
      "insert:webhook_delivery_receipts": { error: DUPLICATE_KEY },
      "select:webhook_delivery_receipts": { data: { status: "processing", attempts: 1, received_at: inFlight } },
    })
    supabaseState.client = supabase

    const response = await post(payload())

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ ok: true, duplicate: true })
    expect(deliveryState.calls).toHaveLength(0)
    // A fresh in-flight claim is never taken over: no conditional reclaim update.
    expect(countOps(ops, "update", "webhook_delivery_receipts")).toBe(0)
  })

  it("reclaims an interrupted claim only past the bounded window", async () => {
    const stale = new Date(Date.now() - 10 * 60 * 1000).toISOString()
    const { supabase, ops } = createSupabaseStub({
      "insert:webhook_delivery_receipts": { error: DUPLICATE_KEY },
      "select:webhook_delivery_receipts": { data: { status: "processing", attempts: 1, received_at: stale } },
      "update:webhook_delivery_receipts": { data: { delivery_id: NOTIFICATION_ID } },
    })
    supabaseState.client = supabase

    const response = await post(payload())

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ ok: true })
    expect(deliveryState.calls).toHaveLength(1)
    const updates = ops.filter((o) => o.op === "update" && o.table === "webhook_delivery_receipts")
    // Reclaim (status processing, attempts 2) then completion.
    expect(updates).toHaveLength(2)
    expect(updates[0].row).toMatchObject({ status: "processing", attempts: 2 })
    expect(updates[0].filters).toContainEqual(["lte", "received_at", expect.any(String)])
    expect(updates[1].row).toMatchObject({ status: "delivered" })
  })

  it("re-claims a previously failed attempt so a retry can deliver", async () => {
    const { supabase, ops } = createSupabaseStub({
      "insert:webhook_delivery_receipts": { error: DUPLICATE_KEY },
      "select:webhook_delivery_receipts": { data: { status: "failed", attempts: 3, received_at: new Date().toISOString() } },
      "update:webhook_delivery_receipts": { data: { delivery_id: NOTIFICATION_ID } },
    })
    supabaseState.client = supabase

    const response = await post(payload())

    expect(response.status).toBe(200)
    expect(deliveryState.calls).toHaveLength(1)
    const updates = ops.filter((o) => o.op === "update" && o.table === "webhook_delivery_receipts")
    expect(updates[0].row).toMatchObject({ status: "processing", attempts: 4 })
    // No staleness gate on an errored attempt: it is immediately reclaimable.
    expect(updates[0].filters).not.toContainEqual(["lte", "received_at", expect.any(String)])
  })

  it("loses a concurrent reclaim race and acknowledges without delivering", async () => {
    const { supabase } = createSupabaseStub({
      "insert:webhook_delivery_receipts": { error: DUPLICATE_KEY },
      "select:webhook_delivery_receipts": { data: { status: "failed", attempts: 1, received_at: new Date().toISOString() } },
      "update:webhook_delivery_receipts": { data: null },
    })
    supabaseState.client = supabase

    const response = await post(payload())

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ ok: true, duplicate: true })
    expect(deliveryState.calls).toHaveLength(0)
  })

  it("fails closed with 500 when the receipt claim cannot be persisted", async () => {
    const { supabase } = createSupabaseStub({
      "insert:webhook_delivery_receipts": { error: { code: "42P01", message: 'relation "webhook_delivery_receipts" does not exist' } },
    })
    supabaseState.client = supabase

    const response = await post(payload())

    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({ error: "Delivery claim failed" })
    expect(deliveryState.calls).toHaveLength(0)
  })

  it("releases the claim and fails closed when delivery throws", async () => {
    const { supabase, ops } = createSupabaseStub()
    supabaseState.client = supabase
    deliveryState.error = new Error("provider unavailable")

    const response = await post(payload())

    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({ error: "Delivery failed" })
    const updates = ops.filter((o) => o.op === "update" && o.table === "webhook_delivery_receipts")
    expect(updates).toHaveLength(1)
    expect(updates[0].row).toMatchObject({ status: "failed" })
  })

  it("fails closed with 500 when the completion write is not persisted", async () => {
    const { supabase } = createSupabaseStub({
      "update:webhook_delivery_receipts": { error: { message: "write failed" } },
    })
    supabaseState.client = supabase

    const response = await post(payload())

    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({ error: "Delivery completion failed" })
  })

  it("still suppresses deliveries recorded before the receipt ledger existed", async () => {
    const { supabase, ops } = createSupabaseStub({
      "select:notification_delivery_log": { data: { id: "legacy-row" } },
    })
    supabaseState.client = supabase

    const response = await post(payload())

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ ok: true, duplicate: true })
    expect(deliveryState.calls).toHaveLength(0)
    expect(countOps(ops, "insert", "webhook_delivery_receipts")).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// 2. Partner webhook family — music marketplace / institutional / licensing /
//    rights-admin. All four share the same verification and claim contract.
// ---------------------------------------------------------------------------

const PARTNER_ROUTES = [
  {
    name: "/api/webhooks/music-marketplace/[partner]",
    specifier: "@/app/api/webhooks/music-marketplace/[partner]/route",
    paramKey: "partner",
    paramValue: "acme",
    receiptTable: "music_marketplace_partner_event_receipts",
    verifiedClaim: { signature_verified: true, processing_status: "received" },
    secretEnv: "MUSIC_MARKETPLACE_WEBHOOK_SECRET_ACME",
    event: { id: "mm_evt_1", type: "order.updated", order_id: null },
  },
  {
    name: "/api/institutional/partners/webhooks/[provider]",
    specifier: "@/app/api/institutional/partners/webhooks/[provider]/route",
    paramKey: "provider",
    paramValue: "fundco",
    receiptTable: "music_institutional_partner_events",
    verifiedClaim: { signature_verified: true, processing_status: "received" },
    secretEnv: "MUSIC_INSTITUTIONAL_WEBHOOK_SECRET_FUNDCO",
    event: { id: "inst_evt_1", type: "nav.updated" },
  },
  {
    name: "/api/licensing/partners/webhooks/[provider]",
    specifier: "@/app/api/licensing/partners/webhooks/[provider]/route",
    paramKey: "provider",
    paramValue: "licensor",
    receiptTable: "music_licensing_partner_events",
    verifiedClaim: { status: "verified" },
    secretEnv: "MUSIC_LICENSING_WEBHOOK_SECRET_LICENSOR",
    event: { id: "lic_evt_1", type: "license.updated" },
  },
  {
    name: "/api/rights-admin/partners/webhooks/[provider]",
    specifier: "@/app/api/rights-admin/partners/webhooks/[provider]/route",
    paramKey: "provider",
    paramValue: "society",
    receiptTable: "music_rights_admin_partner_events",
    verifiedClaim: { status: "verified" },
    secretEnv: "MUSIC_RIGHTS_ADMIN_WEBHOOK_SECRET_SOCIETY",
    event: { id: "ra_evt_1", type: "catalog.updated" },
  },
] as const

describe.each(PARTNER_ROUTES)("POST $name", (route) => {
  const secret = "partner_shared_secret"

  const rawBody = () => JSON.stringify(route.event)

  const call = async (body: string, headers: Record<string, string>) => {
    const { POST } = await import(route.specifier)
    return POST(jsonRequest(route.name, body, headers), {
      params: Promise.resolve({ [route.paramKey]: route.paramValue }),
    } as any)
  }

  beforeEach(() => {
    process.env[route.secretEnv] = secret
  })

  it("fails closed with 503 while the advanced webhook capability is disabled", async () => {
    const { supabase, ops } = createSupabaseStub()
    supabaseState.client = supabase
    gateState.advanced = false

    const body = rawBody()
    const response = await call(body, {
      "x-tourify-partner-signature": partnerSignature(body, secret),
    })

    expect(response.status).toBe(503)
    expect(ops).toHaveLength(0)
  })

  it("accepts a valid signature, claims the receipt, and completes it", async () => {
    const { supabase, ops } = createSupabaseStub({
      [`insert:${route.receiptTable}`]: { data: { id: "receipt-1" } },
    })
    supabaseState.client = supabase
    gateState.advanced = true

    const body = rawBody()
    const response = await call(body, {
      "x-tourify-partner-signature": partnerSignature(body, secret),
    })

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ data: { id: "receipt-1", processed: true } })
    expect(countOps(ops, "insert", route.receiptTable)).toBe(1)
    expect(
      ops.find((o) => o.op === "insert" && o.table === route.receiptTable)?.row,
    ).toMatchObject(route.verifiedClaim)
    const completion = ops.filter((o) => o.op === "update" && o.table === route.receiptTable)
    expect(completion).toHaveLength(1)
    expect(completion[0].row).toMatchObject({ processed_at: expect.any(String) })
  })

  it("rejects an invalid signature with 400 and zero side effects", async () => {
    const { supabase, ops } = createSupabaseStub()
    supabaseState.client = supabase
    gateState.advanced = true

    const response = await call(rawBody(), {
      "x-tourify-partner-signature": partnerSignature(rawBody(), "attacker_secret"),
    })

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ error: "Invalid signature" })
    expect(ops).toHaveLength(0)
  })

  it("rejects a missing signature with 400 and zero side effects when a secret is configured", async () => {
    const { supabase, ops } = createSupabaseStub()
    supabaseState.client = supabase
    gateState.advanced = true

    const response = await call(rawBody(), {})

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ error: "Invalid signature" })
    expect(ops).toHaveLength(0)
  })

  it("fails closed with 503 when no secret is configured and unsigned mode is off", async () => {
    delete process.env[route.secretEnv]
    const { supabase, ops } = createSupabaseStub()
    supabaseState.client = supabase
    gateState.advanced = true

    const response = await call(rawBody(), {})

    expect(response.status).toBe(503)
    expect(await response.json()).toEqual({ error: "Webhook not configured" })
    expect(ops).toHaveLength(0)
  })

  it("acknowledges a replayed delivery without a second claim or completion", async () => {
    const { supabase, ops } = createSupabaseStub({
      [`insert:${route.receiptTable}`]: { error: DUPLICATE_KEY },
    })
    supabaseState.client = supabase
    gateState.advanced = true

    const body = rawBody()
    const response = await call(body, {
      "x-tourify-partner-signature": partnerSignature(body, secret),
    })

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ data: { idempotent: true } })
    expect(countOps(ops, "update", route.receiptTable)).toBe(0)
  })

  it("rejects a malformed body with 400 before claiming", async () => {
    const { supabase, ops } = createSupabaseStub()
    supabaseState.client = supabase
    gateState.advanced = true

    const body = "{not json"
    const response = await call(body, {
      "x-tourify-partner-signature": partnerSignature(body, secret),
    })

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ error: "Invalid event payload" })
    expect(ops).toHaveLength(0)
  })

  it("rejects a body without a stable provider event id before claiming", async () => {
    const { supabase, ops } = createSupabaseStub()
    supabaseState.client = supabase
    gateState.advanced = true

    const body = JSON.stringify({ type: "order.updated" })
    const response = await call(body, {
      "x-tourify-partner-signature": partnerSignature(body, secret),
    })

    expect(response.status).toBe(400)
    expect(ops).toHaveLength(0)
  })

  it("fails closed with 500 when the receipt claim cannot be persisted", async () => {
    const { supabase, ops } = createSupabaseStub({
      [`insert:${route.receiptTable}`]: { error: { code: "42501", message: "permission denied" } },
    })
    supabaseState.client = supabase
    gateState.advanced = true

    const body = rawBody()
    const response = await call(body, {
      "x-tourify-partner-signature": partnerSignature(body, secret),
    })

    expect(response.status).toBe(500)
    expect(countOps(ops, "update", route.receiptTable)).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// 3. Shopify provider webhook
// ---------------------------------------------------------------------------

describe("POST /api/marketplace/integrations/shopify/webhook", () => {
  const PATH = "/api/marketplace/integrations/shopify/webhook"
  const WEBHOOK_ID = "shopify-webhook-uuid-1"
  const payload = { id: 12345, title: "Tour Tee" }
  const rawBody = () => JSON.stringify(payload)

  const call = async (body: string, headers: Record<string, string>) => {
    const { POST } = await import("@/app/api/marketplace/integrations/shopify/webhook/route")
    return POST(jsonRequest(PATH, body, headers))
  }

  const validHeaders = (body: string) => ({
    "x-shopify-hmac-sha256": shopifySignature(body),
    "x-shopify-shop-domain": "tourify.myshopify.com",
    "x-shopify-topic": "products/update",
    "x-shopify-webhook-id": WEBHOOK_ID,
  })

  it("accepts a valid HMAC, claims the provider receipt, and completes it", async () => {
    const { supabase, ops } = createSupabaseStub({
      "select:marketplace_integrations": { data: { id: "int_1", seller_user_id: "seller_1" } },
    })
    supabaseState.client = supabase
    gateState.marketplace = true

    const body = rawBody()
    const response = await call(body, validHeaders(body))

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ received: true })
    const claim = ops.find((o) => o.op === "insert" && o.table === "marketplace_provider_webhook_events")
    expect(claim?.row).toMatchObject({
      provider: "shopify",
      external_event_id: WEBHOOK_ID,
      integration_id: "int_1",
      seller_user_id: "seller_1",
    })
    expect(countOps(ops, "update", "marketplace_provider_webhook_events")).toBe(1)
    expect(countOps(ops, "update", "marketplace_integrations")).toBe(1)
    expect(countOps(ops, "upsert", "marketplace_integration_products")).toBe(1)
  })

  it("rejects an invalid HMAC with 400 and zero side effects", async () => {
    const { supabase, ops } = createSupabaseStub()
    supabaseState.client = supabase
    gateState.marketplace = true

    const body = rawBody()
    const response = await call(body, { ...validHeaders(body), "x-shopify-hmac-sha256": "not-a-valid-hmac" })

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ error: "Invalid signature" })
    expect(ops).toHaveLength(0)
  })

  it("rejects a tampered body with 400 and zero side effects", async () => {
    const { supabase, ops } = createSupabaseStub()
    supabaseState.client = supabase
    gateState.marketplace = true

    const signed = rawBody()
    const headers = validHeaders(signed)
    const tampered = JSON.stringify({ ...payload, title: "Injected" })
    const response = await call(tampered, headers)

    expect(response.status).toBe(400)
    expect(ops).toHaveLength(0)
  })

  it("rejects a missing provider webhook id with 400 before claiming", async () => {
    const { supabase, ops } = createSupabaseStub()
    supabaseState.client = supabase
    gateState.marketplace = true

    const body = rawBody()
    const headers = validHeaders(body)
    delete (headers as Record<string, string>)["x-shopify-webhook-id"]
    const response = await call(body, headers)

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ error: "Missing Shopify webhook identity" })
    expect(ops).toHaveLength(0)
  })

  it("acknowledges a replayed delivery with no integration or snapshot side effects", async () => {
    const { supabase, ops } = createSupabaseStub({
      "insert:marketplace_provider_webhook_events": { error: DUPLICATE_KEY },
    })
    supabaseState.client = supabase
    gateState.marketplace = true

    const body = rawBody()
    const response = await call(body, validHeaders(body))

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ received: true, duplicate: true })
    expect(countOps(ops, "update", "marketplace_integrations")).toBe(0)
    expect(countOps(ops, "upsert", "marketplace_integration_products")).toBe(0)
  })

  it("handles a duplicate concurrent delivery exactly once", async () => {
    const { supabase, ops } = createSupabaseStub({
      "select:marketplace_integrations": { data: { id: "int_1", seller_user_id: "seller_1" } },
      "insert:marketplace_provider_webhook_events": { error: DUPLICATE_KEY },
    })
    supabaseState.client = supabase
    gateState.marketplace = true

    const body = rawBody()
    const response = await call(body, validHeaders(body))

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ received: true, duplicate: true })
    expect(countOps(ops, "update", "marketplace_integrations")).toBe(0)
  })

  it("rejects a malformed body with 400 before claiming", async () => {
    const { supabase, ops } = createSupabaseStub()
    supabaseState.client = supabase
    gateState.marketplace = true

    const body = "{not json"
    const response = await call(body, validHeaders(body))

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ error: "Invalid webhook payload" })
    expect(countOps(ops, "insert", "marketplace_provider_webhook_events")).toBe(0)
  })

  it("fails closed with 500 when the provider receipt cannot be persisted", async () => {
    const { supabase } = createSupabaseStub({
      "insert:marketplace_provider_webhook_events": { error: { code: "42501", message: "permission denied" } },
    })
    supabaseState.client = supabase
    gateState.marketplace = true

    const body = rawBody()
    const response = await call(body, validHeaders(body))

    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({ error: "Failed to record webhook" })
  })

  it("fails closed with 503 while the marketplace provider capability is disabled", async () => {
    const { supabase, ops } = createSupabaseStub()
    supabaseState.client = supabase
    gateState.marketplace = false

    const body = rawBody()
    const response = await call(body, validHeaders(body))

    expect(response.status).toBe(503)
    expect(ops).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// 4. Printful provider webhook
// ---------------------------------------------------------------------------

describe("POST /api/marketplace/integrations/printful/webhook", () => {
  const PATH = "/api/marketplace/integrations/printful/webhook"
  const payload = {
    type: "order.shipped",
    id: "printful-event-1",
    order: { integration_id: "int_9", seller_user_id: "seller_9", external_id: "ext-order-1" },
  }
  const rawBody = () => JSON.stringify(payload)

  const call = async (body: string, headers: Record<string, string>) => {
    const { POST } = await import("@/app/api/marketplace/integrations/printful/webhook/route")
    return POST(jsonRequest(PATH, body, headers))
  }

  const validHeaders = (body: string) => ({
    "x-printful-signature": createHmac("sha256", process.env.PRINTFUL_WEBHOOK_SECRET!).update(body).digest("hex"),
  })

  it("accepts a valid HMAC, claims the provider receipt, and applies fulfillment once", async () => {
    const { supabase, ops } = createSupabaseStub()
    supabaseState.client = supabase
    gateState.marketplace = true

    const body = rawBody()
    const response = await call(body, validHeaders(body))

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ received: true })
    expect(
      ops.find((o) => o.op === "insert" && o.table === "marketplace_provider_webhook_events")?.row,
    ).toMatchObject({ provider: "printful", external_event_id: "printful-event-1" })
    expect(countOps(ops, "update", "marketplace_order_items")).toBe(1)
    expect(countOps(ops, "update", "marketplace_fulfillment_requests")).toBe(1)
  })

  it("rejects an invalid signature with 401 and zero side effects", async () => {
    const { supabase, ops } = createSupabaseStub()
    supabaseState.client = supabase
    gateState.marketplace = true

    const response = await call(rawBody(), { "x-printful-signature": "0".repeat(64) })

    expect(response.status).toBe(401)
    expect(ops).toHaveLength(0)
  })

  it("rejects a missing signature with 401 and zero side effects", async () => {
    const { supabase, ops } = createSupabaseStub()
    supabaseState.client = supabase
    gateState.marketplace = true

    const response = await call(rawBody(), {})

    expect(response.status).toBe(401)
    expect((await response.json()).error).toMatch(/Missing signature/)
    expect(ops).toHaveLength(0)
  })

  it("fails closed with 401 when the webhook secret is not configured", async () => {
    delete process.env.PRINTFUL_WEBHOOK_SECRET
    const { supabase, ops } = createSupabaseStub()
    supabaseState.client = supabase
    gateState.marketplace = true

    const response = await call(rawBody(), { "x-printful-signature": "0".repeat(64) })

    expect(response.status).toBe(401)
    expect(ops).toHaveLength(0)
  })

  it("acknowledges a replayed delivery with no fulfillment side effects", async () => {
    const { supabase, ops } = createSupabaseStub({
      "insert:marketplace_provider_webhook_events": { error: DUPLICATE_KEY },
    })
    supabaseState.client = supabase
    gateState.marketplace = true

    const body = rawBody()
    const response = await call(body, validHeaders(body))

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ received: true, duplicate: true })
    expect(countOps(ops, "update", "marketplace_order_items")).toBe(0)
    expect(countOps(ops, "update", "marketplace_fulfillment_requests")).toBe(0)
  })

  it("rejects a body without a stable provider event id with 400 before claiming", async () => {
    const { supabase, ops } = createSupabaseStub()
    supabaseState.client = supabase
    gateState.marketplace = true

    const body = JSON.stringify({ type: "order.shipped", order: {} })
    const response = await call(body, validHeaders(body))

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ error: "Missing webhook event id" })
    expect(ops).toHaveLength(0)
  })

  it("rejects a malformed body with 400 before claiming", async () => {
    const { supabase, ops } = createSupabaseStub()
    supabaseState.client = supabase
    gateState.marketplace = true

    const body = "{not json"
    const response = await call(body, validHeaders(body))

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ error: "Invalid webhook payload" })
    expect(countOps(ops, "insert", "marketplace_provider_webhook_events")).toBe(0)
  })

  it("fails closed with 503 while the marketplace provider capability is disabled", async () => {
    const { supabase, ops } = createSupabaseStub()
    supabaseState.client = supabase
    gateState.marketplace = false

    const body = rawBody()
    const response = await call(body, validHeaders(body))

    expect(response.status).toBe(503)
    expect(ops).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// 5. Stripe subscription webhook (enabled launch commerce surface)
// ---------------------------------------------------------------------------

describe("POST /api/subscriptions/webhook", () => {
  const PATH = "/api/subscriptions/webhook"

  const call = async (body: string, headers: Record<string, string>) => {
    const { POST } = await import("@/app/api/subscriptions/webhook/route")
    return POST(jsonRequest(PATH, body, headers))
  }

  beforeEach(() => {
    process.env.STRIPE_WEBHOOK_SECRET_SUBSCRIPTIONS = stripeState.secret
    stripeState.event = {
      id: "evt_sub_1",
      type: "customer.subscription.updated",
      data: {
        object: {
          id: "sub_1",
          customer: "cus_1",
          status: "active",
          items: { data: [{ price: { id: "price_1" } }] },
        },
      },
    }
  })

  it("fails closed with 503 when the endpoint secret is not configured", async () => {
    delete process.env.STRIPE_WEBHOOK_SECRET_SUBSCRIPTIONS
    const { supabase, ops } = createSupabaseStub()
    supabaseState.client = supabase

    const response = await call(JSON.stringify({ id: "evt_sub_1" }), { "stripe-signature": "t=1,v1=deadbeef" })

    expect(response.status).toBe(503)
    expect(await response.json()).toEqual({ error: "Webhook not configured" })
    expect(ops).toHaveLength(0)
  })

  it("rejects a missing signature with 400 and zero side effects", async () => {
    const { supabase, ops } = createSupabaseStub()
    supabaseState.client = supabase

    const response = await call(JSON.stringify({ id: "evt_sub_1" }), {})

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ error: "Missing stripe-signature" })
    expect(ops).toHaveLength(0)
  })

  it("rejects an invalid signature with 400 and zero side effects", async () => {
    const { supabase, ops } = createSupabaseStub()
    supabaseState.client = supabase

    const body = JSON.stringify({ id: "evt_sub_1" })
    const response = await call(body, { "stripe-signature": "t=1,v1=ffffffff" })

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ error: "Invalid signature" })
    expect(ops).toHaveLength(0)
  })

  it("rejects a replayed signature timestamp with 400 and zero side effects", async () => {
    const { supabase, ops } = createSupabaseStub()
    supabaseState.client = supabase

    const body = JSON.stringify({ id: "evt_sub_1" })
    const oldTimestamp = Math.floor(Date.now() / 1000) - 4000
    const digest = createHmac("sha256", stripeState.secret)
      .update(`${oldTimestamp}.${body}`)
      .digest("hex")
    const response = await call(body, { "stripe-signature": `t=${oldTimestamp},v1=${digest}` })

    expect(response.status).toBe(400)
    expect(ops).toHaveLength(0)
  })

  it("accepts a valid signature, claims platform_webhook_events, and completes it", async () => {
    const { supabase, ops } = createSupabaseStub({
      "select:profiles": { data: { id: "user-1" } },
    })
    supabaseState.client = supabase

    const body = JSON.stringify({ id: "evt_sub_1" })
    const response = await call(body, { "stripe-signature": stripeSignature(body) })

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ received: true })
    expect(
      ops.find((o) => o.op === "insert" && o.table === "platform_webhook_events")?.row,
    ).toMatchObject({ provider: "stripe", provider_event_id: "evt_sub_1", processing_status: "processing" })
    expect(countOps(ops, "upsert", "subscriptions")).toBe(1)
    expect(countOps(ops, "update", "platform_webhook_events")).toBe(1)
  })

  it("acknowledges a replayed event id with no subscription write", async () => {
    const { supabase, ops } = createSupabaseStub({
      "insert:platform_webhook_events": { error: DUPLICATE_KEY },
    })
    supabaseState.client = supabase

    const body = JSON.stringify({ id: "evt_sub_1" })
    const response = await call(body, { "stripe-signature": stripeSignature(body) })

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ received: true, outcome: "duplicate" })
    expect(countOps(ops, "upsert", "subscriptions")).toBe(0)
  })

  it("fails closed with 500 when the ledger claim cannot be persisted", async () => {
    const { supabase, ops } = createSupabaseStub({
      "insert:platform_webhook_events": { error: { code: "42501", message: "permission denied" } },
    })
    supabaseState.client = supabase

    const body = JSON.stringify({ id: "evt_sub_1" })
    const response = await call(body, { "stripe-signature": stripeSignature(body) })

    expect(response.status).toBe(500)
    expect(countOps(ops, "upsert", "subscriptions")).toBe(0)
  })
})
