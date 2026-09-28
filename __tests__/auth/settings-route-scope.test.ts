import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

/**
 * DB-008 / Wave 35 — USER-005 settings boundary authorization.
 *
 * `app/api/settings/route.ts` accepted a caller-supplied `profile_id` on both GET
 * and PUT and never compared it to the authenticated subject. RLS stopped the
 * cross-user WRITE (`profiles_update ... USING (id = auth.uid())`) but the route
 * still answered `success: true` for a zero-row update, and RLS did not stop the
 * cross-user READ at all: `profiles_select` is `USING (true)` in the active chain,
 * so GET returned another user's entire profile row — including the `metadata` and
 * `profile_data` jsonb blobs that carry contact fields — to any authenticated
 * caller. The route now scopes both verbs to the authenticated account.
 */

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: mocks.createClient,
}));

import { GET, PUT } from "@/app/api/settings/route";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_USER_ID = "22222222-2222-4222-8222-222222222222";

type QueryCall = { op: "select" | "update" | "insert" | "rpc"; table?: string; filters: Record<string, unknown> };

function buildClient() {
  const calls: QueryCall[] = [];

  function makeQuery(op: QueryCall["op"], table: string) {
    const filters: Record<string, unknown> = {};
    const query: any = {
      select: (columns?: string) => {
        calls.push({ op, table, filters, ...(columns ? { columns } : {}) } as any);
        return query;
      },
      eq: (column: string, value: unknown) => {
        filters[column] = value;
        return query;
      },
      neq: (column: string, value: unknown) => {
        filters[column] = value;
        return query;
      },
      update: (payload: unknown) => {
        query.__payload = payload;
        return query;
      },
      insert: () => query,
      single: () => Promise.resolve({ data: null, error: null }),
      maybeSingle: () => Promise.resolve({ data: null, error: null }),
      then: (resolve: (value: any) => unknown) =>
        resolve({ data: null, error: null }),
    };
    return query;
  }

  const supabase: any = {
    auth: { getUser: () => Promise.resolve({ data: { user: { id: USER_ID } }, error: null }) },
    from: (table: string) => makeQuery("select", table),
  };

  return { supabase, calls };
}

beforeEach(() => {
  mocks.createClient.mockReset();
});

describe("GET /api/settings scoping", () => {
  it("refuses a caller-supplied profile_id that is not the authenticated user", async () => {
    const { supabase } = buildClient();
    mocks.createClient.mockResolvedValue(supabase);

    const request = new NextRequest(
      `https://tourify.app/api/settings?account_type=general&profile_id=${OTHER_USER_ID}`,
    );
    const response = await GET(request);

    expect(response.status).toBe(403);
  });

  it("issues no query at all for a cross-account read", async () => {
    const { supabase, calls } = buildClient();
    mocks.createClient.mockResolvedValue(supabase);

    const request = new NextRequest(
      `https://tourify.app/api/settings?account_type=general&profile_id=${OTHER_USER_ID}`,
    );
    await GET(request);

    expect(calls).toHaveLength(0);
  });

  it("still serves the authenticated user's own settings", async () => {
    const { supabase, calls } = buildClient();
    mocks.createClient.mockResolvedValue(supabase);

    const request = new NextRequest("https://tourify.app/api/settings?account_type=general");
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(calls).toHaveLength(1);
    expect(calls[0].filters.id).toBe(USER_ID);
  });
});

describe("PUT /api/settings scoping", () => {
  function putRequest(profileId?: string) {
    return new NextRequest("https://tourify.app/api/settings", {
      method: "PUT",
      body: JSON.stringify({
        account_type: "general",
        profile_id: profileId,
        settings_data: { bio: "hello" },
      }),
    });
  }

  it("rejects a cross-account write with 403 before any update is issued", async () => {
    const { supabase } = buildClient();
    mocks.createClient.mockResolvedValue(supabase);

    const response = await PUT(putRequest(OTHER_USER_ID));

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      error: expect.stringContaining("Forbidden"),
    });
  });

  it("never issues the profile update for a cross-account write", async () => {
    const updateCalls: unknown[] = [];
    const supabase: any = {
      auth: { getUser: () => Promise.resolve({ data: { user: { id: USER_ID } }, error: null }) },
      from: (table: string) => {
        const query: any = {
          select: () => query,
          eq: () => query,
          update: (payload: unknown) => {
            updateCalls.push({ table, payload });
            return query;
          },
          single: () => Promise.resolve({ data: null, error: null }),
          then: (resolve: (value: any) => unknown) => resolve({ data: null, error: null }),
        };
        return query;
      },
    };
    mocks.createClient.mockResolvedValue(supabase);

    const response = await PUT(putRequest(OTHER_USER_ID));

    expect(response.status).toBe(403);
    expect(updateCalls).toEqual([]);
  });
});
