/**
 * HF-INTG-007-VENUE — venue integrations API is encrypted-envelope only.
 *
 * Asserts the venue integrations route reads token material exclusively via the
 * encrypted token vault (readVenueIntegrationSecrets) and never through the
 * retired venue_social_integrations plaintext columns:
 *   - GET health derives from row state + vault token presence (never plaintext)
 *   - POST disconnect clears the vault first and toggles row state only
 *   - POST refresh uses only the vault refresh grant and fails closed with an
 *     intentional 400 when the vault holds none (no legacy column fallback)
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { readFileSync } from "node:fs"
import path from "node:path"

vi.mock("@/lib/auth/api-auth", () => ({
  authenticateApiRequest: vi.fn(),
}))

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: vi.fn(),
}))

vi.mock("@/lib/venue/venue-access", () => ({
  canManageVenue: vi.fn(),
  getCurrentVenueContext: vi.fn(),
}))

vi.mock("@/lib/integrations/token-vault", () => ({
  deleteVenueIntegrationSecrets: vi.fn(),
  logIntegrationEvent: vi.fn(),
  readVenueIntegrationSecrets: vi.fn(),
  writeVenueIntegrationSecrets: vi.fn(),
}))

import { GET, POST } from "@/app/api/venue/integrations/route"
import { authenticateApiRequest } from "@/lib/auth/api-auth"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { canManageVenue, getCurrentVenueContext } from "@/lib/venue/venue-access"
import {
  deleteVenueIntegrationSecrets,
  logIntegrationEvent,
  readVenueIntegrationSecrets,
  writeVenueIntegrationSecrets,
} from "@/lib/integrations/token-vault"

const VENUE_ID = "11111111-1111-4111-8111-111111111111"
const CONNECTION_ID = "22222222-2222-4222-8222-222222222222"
const USER_ID = "33333333-3333-4333-8333-333333333333"

const mockedAuth = vi.mocked(authenticateApiRequest)
const mockedServiceClient = vi.mocked(createServiceRoleClient)
const mockedCanManage = vi.mocked(canManageVenue)
const mockedVenueContext = vi.mocked(getCurrentVenueContext)
const mockedReadSecrets = vi.mocked(readVenueIntegrationSecrets)
const mockedWriteSecrets = vi.mocked(writeVenueIntegrationSecrets)
const mockedDeleteSecrets = vi.mocked(deleteVenueIntegrationSecrets)
const mockedLogEvent = vi.mocked(logIntegrationEvent)

interface RecordedUpdate {
  table: string
  values: Record<string, unknown>
}

interface ServiceMock {
  selects: string[]
  updates: RecordedUpdate[]
  rpcCalls: Array<[string, unknown]>
  deletedIds: string[]
  awaitResult: Record<string, unknown>
  maybeSingleResult: Record<string, unknown>
  rpcResult: Record<string, unknown>
  from: ReturnType<typeof vi.fn>
  rpc: ReturnType<typeof vi.fn>
}

function createServiceMock(): ServiceMock {
  const mock: ServiceMock = {
    selects: [],
    updates: [],
    rpcCalls: [],
    deletedIds: [],
    awaitResult: { data: null, error: null },
    maybeSingleResult: { data: null, error: null },
    rpcResult: { data: true, error: null },
    from: vi.fn(),
    rpc: vi.fn(),
  }

  let currentTable = ""

  const chain: any = {
    // Awaiting a bare select→eq chain (GET / disconnect update) resolves the
    // current awaitResult, mirroring the supabase-js thenable builder.
    then: (onFulfilled: (value: unknown) => unknown) =>
      Promise.resolve(mock.awaitResult).then(onFulfilled),
    select: vi.fn((cols: string) => {
      mock.selects.push(cols)
      return chain
    }),
    eq: vi.fn(() => chain),
    maybeSingle: vi.fn(async () => mock.maybeSingleResult),
    update: vi.fn((values: Record<string, unknown>) => {
      mock.updates.push({ table: currentTable, values })
      return chain
    }),
    delete: vi.fn(async () => {
      mock.deletedIds.push(CONNECTION_ID)
      return { error: null }
    }),
  }

  mock.from.mockImplementation((table: string) => {
    currentTable = table
    return chain
  })
  mock.rpc.mockImplementation(async (fn: string, args?: unknown) => {
    mock.rpcCalls.push([fn, args ?? {}])
    return mock.rpcResult
  })

  return mock
}

function postRequest(body: Record<string, unknown>): any {
  return new Request("http://localhost/api/venue/integrations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as any
}

beforeEach(() => {
  mockedAuth.mockResolvedValue({ user: { id: USER_ID }, supabase: {} } as any)
  mockedCanManage.mockResolvedValue({ allowed: true } as any)
  mockedVenueContext.mockResolvedValue({ id: VENUE_ID } as any)
  mockedReadSecrets.mockResolvedValue({ accessToken: null, refreshToken: null })
  mockedWriteSecrets.mockResolvedValue()
  mockedDeleteSecrets.mockResolvedValue()
  mockedLogEvent.mockResolvedValue()
})

/** Create and wire the service-row client mock the handler will receive. */
function activateService(): ServiceMock {
  const service = createServiceMock()
  mockedServiceClient.mockReturnValue(service as any)
  return service
}

afterEach(() => {
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})

describe("GET /api/venue/integrations (vault-derived health)", () => {
  const row = {
    id: CONNECTION_ID,
    platform: "youtube",
    account_handle: "@echo",
    is_connected: true,
    last_sync: "2026-09-20T00:00:00.000Z",
  }

  it("reports connected when the encrypted vault holds an access token", async () => {
    const service = activateService()
    service.awaitResult = { data: [row], error: null }
    mockedReadSecrets.mockResolvedValue({ accessToken: "envelope-access", refreshToken: "envelope-refresh" })

    const response = await GET(new Request(`http://localhost/api/venue/integrations?venue_id=${VENUE_ID}`) as any)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(service.selects[0]).toBe("id, platform, account_handle, is_connected, last_sync")
    expect(service.selects[0]).not.toMatch(/access_token|refresh_token/)
    expect(body.connections).toHaveLength(1)
    expect(body.connections[0]).toMatchObject({
      id: CONNECTION_ID,
      platform: "youtube",
      is_connected: true,
      has_token: true,
      health: "connected",
    })
  })

  it("fails closed to needs_reauth when the vault holds no access token", async () => {
    const service = activateService()
    service.awaitResult = { data: [row], error: null }
    mockedReadSecrets.mockResolvedValue({ accessToken: null, refreshToken: null })

    const response = await GET(new Request(`http://localhost/api/venue/integrations?venue_id=${VENUE_ID}`) as any)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.connections[0]).toMatchObject({
      has_token: false,
      health: "needs_reauth",
    })
  })

  it("resolves the venue through the current context when venue_id is absent", async () => {
    const service = activateService()
    service.awaitResult = { data: [row], error: null }
    mockedReadSecrets.mockResolvedValue({ accessToken: null, refreshToken: null })

    const response = await GET(new Request("http://localhost/api/venue/integrations") as any)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(mockedVenueContext).toHaveBeenCalledWith({}, USER_ID)
    expect(body.connections).toHaveLength(1)
  })
})

describe("POST /api/venue/integrations — disconnect (vault-only)", () => {
  it("deletes vault secrets first and toggles row state without touching legacy plaintext columns", async () => {
    const service = activateService()
    service.maybeSingleResult = { data: { id: CONNECTION_ID, venue_id: VENUE_ID, platform: "youtube" }, error: null }
    service.awaitResult = { data: null, error: null }

    const response = await POST(
      postRequest({ action: "disconnect", venue_id: VENUE_ID, connection_id: CONNECTION_ID }),
    )

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ success: true })
    expect(mockedDeleteSecrets).toHaveBeenCalledWith(CONNECTION_ID)
    expect(service.selects[0]).toBe("id, venue_id, platform")
    expect(service.selects[0]).not.toMatch(/refresh_token/)
    const disconnectUpdate = service.updates.find((u) => u.table === "venue_social_integrations")
    expect(disconnectUpdate).toBeDefined()
    expect(disconnectUpdate!.values).toEqual({ is_connected: false, updated_at: expect.any(String) })
    expect(disconnectUpdate!.values).not.toHaveProperty("access_token")
    expect(disconnectUpdate!.values).not.toHaveProperty("refresh_token")
    expect(mockedLogEvent).toHaveBeenCalledWith(
      expect.objectContaining({ action: "disconnect", platform: "youtube" }),
    )
  })
})

describe("POST /api/venue/integrations — refresh (encrypted-envelope only)", () => {
  function refreshRequest() {
    return postRequest({ action: "refresh", venue_id: VENUE_ID, connection_id: CONNECTION_ID })
  }

  it("refreshes through the vault grant and writes encrypted envelopes only", async () => {
    const service = activateService()
    service.maybeSingleResult = { data: { id: CONNECTION_ID, venue_id: VENUE_ID, platform: "youtube" }, error: null }
    service.awaitResult = { data: null, error: null }
    mockedReadSecrets.mockResolvedValue({ accessToken: "stored-access", refreshToken: "stored-refresh" })
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ access_token: "new-access", refresh_token: "new-refresh", expires_in: 3600 }),
        { status: 200 },
      ),
    )
    vi.stubGlobal("fetch", fetchMock)

    const response = await POST(refreshRequest())

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ success: true })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0][0]).toBe("https://oauth2.googleapis.com/token")
    const sentBody = new URLSearchParams((fetchMock.mock.calls[0][1] as RequestInit).body as string)
    expect(sentBody.get("grant_type")).toBe("refresh_token")
    expect(sentBody.get("refresh_token")).toBe("stored-refresh")
    expect(mockedWriteSecrets).toHaveBeenCalledWith(CONNECTION_ID, {
      accessToken: "new-access",
      refreshToken: "new-refresh",
    })
    const refreshUpdate = service.updates.find((u) => u.table === "venue_social_integrations")
    expect(refreshUpdate!.values).toHaveProperty("is_connected", true)
    expect(refreshUpdate!.values).not.toHaveProperty("access_token")
    expect(refreshUpdate!.values).not.toHaveProperty("refresh_token")
    expect(mockedLogEvent).toHaveBeenCalledWith(
      expect.objectContaining({ action: "refresh", platform: "youtube" }),
    )
  })

  it("fails closed with an intentional 400 when the vault holds no refresh grant", async () => {
    const service = activateService()
    service.maybeSingleResult = { data: { id: CONNECTION_ID, venue_id: VENUE_ID, platform: "youtube" }, error: null }
    service.awaitResult = { data: null, error: null }
    // Vault-only: no legacy column fallback exists, so this stays fail-closed.
    mockedReadSecrets.mockResolvedValue({ accessToken: "stored-access", refreshToken: null })
    const fetchMock = vi.fn()
    vi.stubGlobal("fetch", fetchMock)

    const response = await POST(refreshRequest())
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toBe("Refresh credentials missing; reconnect this connection")
    expect(fetchMock).not.toHaveBeenCalled()
    expect(mockedWriteSecrets).not.toHaveBeenCalled()
    expect(service.updates).toHaveLength(0)
    expect(mockedLogEvent).toHaveBeenCalledWith(
      expect.objectContaining({ action: "sync_failed", platform: "youtube" }),
    )
  })

  it("returns 404 for a connection that does not belong to the venue", async () => {
    const service = activateService()
    service.maybeSingleResult = {
      data: { id: CONNECTION_ID, venue_id: VENUE_ID, platform: "youtube" },
      error: null,
    }

    const response = await POST(
      postRequest({
        action: "refresh",
        venue_id: "44444444-4444-4444-8444-444444444444",
        connection_id: CONNECTION_ID,
      }),
    )

    expect(response.status).toBe(404)
  })

  it("returns 400 for an unknown platform on record", async () => {
    const service = activateService()
    service.maybeSingleResult = {
      data: { id: CONNECTION_ID, venue_id: VENUE_ID, platform: "linkedin" },
      error: null,
    }

    const response = await POST(refreshRequest())
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toBe("Unknown platform on record")
  })
})

describe("venue integrations route source guard (INTG-007)", () => {
  it("keeps token material confined to the encrypted vault boundary", () => {
    const source = readFileSync(
      path.join(process.cwd(), "app/api/venue/integrations/route.ts"),
      "utf8",
    )
    // No legacy plaintext column selects/updates remain.
    expect(source).not.toContain('select("id, venue_id, platform, refresh_token")')
    expect(source).not.toContain("row.refresh_token")
    expect(source).not.toContain("access_token: null")
    expect(source).not.toContain("refresh_token: null")
    // The vault boundary is the only credential surface.
    expect(source).toContain("readVenueIntegrationSecrets")
    expect(source).toContain("writeVenueIntegrationSecrets")
  })
})