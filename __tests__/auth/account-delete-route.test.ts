import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import fs from "node:fs";
import path from "node:path";

const mocks = vi.hoisted(() => ({
  authenticateApiRequest: vi.fn(),
  createServiceRoleClient: vi.fn(),
  rateCheck: vi.fn(),
}));

vi.mock("@/lib/auth/api-auth", () => ({
  authenticateApiRequest: mocks.authenticateApiRequest,
}));
vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: mocks.createServiceRoleClient,
}));
vi.mock("@/lib/utils/rate-limit", () => ({
  createRateLimiter: () => ({ check: mocks.rateCheck }),
}));

import { POST } from "@/app/api/account/delete/route";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_USER_ID = "22222222-2222-4222-8222-222222222222";

type StorageFixture = Record<
  string,
  {
    names?: string[];
    listError?: { message: string } | null;
    listErrors?: Array<{ message: string } | null>;
    removeError?: { message: string } | null;
    preserveNamesAfterRemove?: boolean;
  }
>;

function request(confirmation = "DELETE MY ACCOUNT") {
  return new NextRequest("https://tourify.app/api/account/delete", {
    method: "POST",
    body: JSON.stringify({ confirmation }),
  });
}

function serviceClient({
  scrubError = null,
  storageFixture = {},
}: {
  scrubError?: { message: string } | null;
  storageFixture?: StorageFixture;
} = {}) {
  const deleteUser = vi.fn().mockResolvedValue({ error: null });
  const auditInsert = vi.fn().mockResolvedValue({ error: null });
  const listCalls: Array<{
    bucket: string;
    prefix: string;
    options: { limit: number; offset: number };
  }> = [];
  const removeCalls: Array<{ bucket: string; paths: string[] }> = [];
  const listCallCounts = new Map<string, number>();
  const client = {
    from(table: string) {
      if (table === "profiles") {
        const chain: Record<string, unknown> = {};
        chain.select = () => chain;
        chain.eq = () => chain;
        chain.maybeSingle = async () => ({
          data: { id: USER_ID, account_type: "general" },
          error: null,
        });
        return chain;
      }
      if (table === "account_activity_log") return { insert: auditInsert };
      if (table === "job_applications") {
        return { update: () => ({ eq: async () => ({ error: scrubError }) }) };
      }
      throw new Error(`Unexpected table: ${table}`);
    },
    storage: {
      from: (bucket: string) => ({
        list: async (
          prefix: string,
          options: { limit: number; offset: number },
        ) => {
          listCalls.push({ bucket, prefix, options });
          const fixtureKey = `${bucket}:${prefix}`;
          const fixture = storageFixture[fixtureKey];
          const listCallIndex = listCallCounts.get(fixtureKey) ?? 0;
          listCallCounts.set(fixtureKey, listCallIndex + 1);
          return {
            data: (fixture?.names ?? [])
              .slice(options.offset, options.offset + options.limit)
              .map((name) => ({ name })),
            error:
              fixture?.listErrors?.[listCallIndex] ??
              fixture?.listError ??
              null,
          };
        },
        remove: async (paths: string[]) => {
          removeCalls.push({ bucket, paths });
          const prefix =
            paths[0]?.slice(0, paths[0].lastIndexOf("/") + 1) ?? "";
          const fixture = storageFixture[`${bucket}:${prefix}`];
          const error = fixture?.removeError ?? null;
          if (!error && fixture?.names && !fixture.preserveNamesAfterRemove) {
            const removedNames = new Set(
              paths.map((item) => item.slice(prefix.length)),
            );
            fixture.names = fixture.names.filter(
              (name) => !removedNames.has(name),
            );
          }
          return {
            error,
          };
        },
      }),
    },
    auth: { admin: { deleteUser } },
  };
  return { client, deleteUser, auditInsert, listCalls, removeCalls };
}

describe("POST /api/account/delete", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.rateCheck.mockResolvedValue({ success: true });
  });

  it("requires a verified user before rate limiting or mutation", async () => {
    mocks.authenticateApiRequest.mockResolvedValue(null);
    const response = await POST(request());
    expect(response.status).toBe(401);
    expect(mocks.rateCheck).not.toHaveBeenCalled();
    expect(mocks.createServiceRoleClient).not.toHaveBeenCalled();
  });

  it("scopes rate limiting to the authenticated user", async () => {
    mocks.authenticateApiRequest.mockResolvedValue({ user: { id: USER_ID } });
    const { client } = serviceClient();
    mocks.createServiceRoleClient.mockReturnValue(client);
    await POST(request("wrong"));
    expect(mocks.rateCheck).toHaveBeenCalledWith(`user:${USER_ID}`);
  });

  it("fails closed when a required PII scrub fails", async () => {
    mocks.authenticateApiRequest.mockResolvedValue({ user: { id: USER_ID } });
    const { client, deleteUser } = serviceClient({
      scrubError: { message: "database unavailable" },
    });
    mocks.createServiceRoleClient.mockReturnValue(client);
    const response = await POST(request());
    expect(response.status).toBe(503);
    expect(deleteUser).not.toHaveBeenCalled();
  });

  it("deletes direct and certification objects from private-docs for only the authenticated user", async () => {
    mocks.authenticateApiRequest.mockResolvedValue({ user: { id: USER_ID } });
    const { client, listCalls, removeCalls } = serviceClient({
      storageFixture: {
        [`private-docs:${USER_ID}/`]: { names: ["profile-document.pdf"] },
        [`private-docs:staff-credentials/${USER_ID}/`]: {
          names: ["food-safety.pdf"],
        },
        [`private-docs:${OTHER_USER_ID}/`]: {
          names: ["other-user-document.pdf"],
        },
        [`private-docs:staff-credentials/${OTHER_USER_ID}/`]: {
          names: ["other-user-credential.pdf"],
        },
      },
    });
    mocks.createServiceRoleClient.mockReturnValue(client);

    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(listCalls).toContainEqual({
      bucket: "private-docs",
      prefix: `${USER_ID}/`,
      options: { limit: 1000, offset: 0 },
    });
    expect(listCalls).toContainEqual({
      bucket: "private-docs",
      prefix: `staff-credentials/${USER_ID}/`,
      options: { limit: 1000, offset: 0 },
    });
    expect(listCalls.some(({ prefix }) => prefix.includes(OTHER_USER_ID))).toBe(
      false,
    );
    expect(removeCalls).toContainEqual({
      bucket: "private-docs",
      paths: [`${USER_ID}/profile-document.pdf`],
    });
    expect(removeCalls).toContainEqual({
      bucket: "private-docs",
      paths: [`staff-credentials/${USER_ID}/food-safety.pdf`],
    });
    expect(
      removeCalls
        .flatMap(({ paths }) => paths)
        .some((item) => item.includes(OTHER_USER_ID)),
    ).toBe(false);
  });

  it("removes every maximum-size batch before deleting the auth user", async () => {
    mocks.authenticateApiRequest.mockResolvedValue({ user: { id: USER_ID } });
    const objectNames = Array.from(
      { length: 1005 },
      (_, index) => `document-${index}.pdf`,
    );
    const { client, deleteUser, listCalls, removeCalls } = serviceClient({
      storageFixture: {
        [`private-docs:${USER_ID}/`]: { names: objectNames },
      },
    });
    mocks.createServiceRoleClient.mockReturnValue(client);

    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(
      listCalls.filter(
        ({ bucket, prefix }) =>
          bucket === "private-docs" && prefix === `${USER_ID}/`,
      ),
    ).toHaveLength(3);
    expect(
      removeCalls
        .filter(
          ({ bucket, paths }) =>
            bucket === "private-docs" && paths[0]?.startsWith(`${USER_ID}/`),
        )
        .map(({ paths }) => paths.length),
    ).toEqual([1000, 5]);
    expect(deleteUser).toHaveBeenCalledWith(USER_ID, false);
  });

  it("fails closed on a later-page list error and deletes the remainder on retry", async () => {
    mocks.authenticateApiRequest.mockResolvedValue({ user: { id: USER_ID } });
    const firstBatch = Array.from(
      { length: 1000 },
      (_, index) => `document-${index}.pdf`,
    );
    const finalName = "document-1000.pdf";
    const firstAttempt = serviceClient({
      storageFixture: {
        [`private-docs:${USER_ID}/`]: {
          names: [...firstBatch, finalName],
          listErrors: [null, { message: "Bucket not found" }],
        },
      },
    });
    const retry = serviceClient({
      storageFixture: {
        [`private-docs:${USER_ID}/`]: { names: [finalName] },
      },
    });
    mocks.createServiceRoleClient
      .mockReturnValueOnce(firstAttempt.client)
      .mockReturnValueOnce(retry.client);
    const errorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    const firstResponse = await POST(request());
    const retryResponse = await POST(request());

    expect(firstResponse.status).toBe(503);
    expect(firstAttempt.deleteUser).not.toHaveBeenCalled();
    expect(firstAttempt.removeCalls).toContainEqual({
      bucket: "private-docs",
      paths: firstBatch.map((name) => `${USER_ID}/${name}`),
    });
    expect(errorSpy).toHaveBeenCalledWith(
      "[account-delete] storage cleanup incomplete:",
      [`private-docs:${USER_ID}/:list`],
    );
    expect(retryResponse.status).toBe(200);
    expect(retry.removeCalls).toContainEqual({
      bucket: "private-docs",
      paths: [`${USER_ID}/${finalName}`],
    });
    expect(retry.deleteUser).toHaveBeenCalledWith(USER_ID, false);
    errorSpy.mockRestore();
  });

  it("fails closed when a successful remove makes no listing progress", async () => {
    mocks.authenticateApiRequest.mockResolvedValue({ user: { id: USER_ID } });
    const { client, deleteUser, listCalls, removeCalls } = serviceClient({
      storageFixture: {
        [`private-docs:${USER_ID}/`]: {
          names: ["document.pdf"],
          preserveNamesAfterRemove: true,
        },
      },
    });
    mocks.createServiceRoleClient.mockReturnValue(client);
    const errorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    const response = await POST(request());

    expect(response.status).toBe(503);
    expect(deleteUser).not.toHaveBeenCalled();
    expect(removeCalls).toContainEqual({
      bucket: "private-docs",
      paths: [`${USER_ID}/document.pdf`],
    });
    expect(
      listCalls.filter(
        ({ bucket, prefix }) =>
          bucket === "private-docs" && prefix === `${USER_ID}/`,
      ),
    ).toHaveLength(2);
    expect(errorSpy).toHaveBeenCalledWith(
      "[account-delete] storage cleanup incomplete:",
      [`private-docs:${USER_ID}/:no-progress`],
    );
    errorSpy.mockRestore();
  });

  it("fails closed on a listed object name that could escape the authenticated user prefix", async () => {
    mocks.authenticateApiRequest.mockResolvedValue({ user: { id: USER_ID } });
    const { client, deleteUser, removeCalls } = serviceClient({
      storageFixture: {
        [`private-docs:staff-credentials/${USER_ID}/`]: {
          names: [`../${OTHER_USER_ID}/credential.pdf`],
        },
      },
    });
    mocks.createServiceRoleClient.mockReturnValue(client);

    const response = await POST(request());

    expect(response.status).toBe(503);
    expect(deleteUser).not.toHaveBeenCalled();
    expect(removeCalls).toEqual([]);
  });

  it("reports partial storage failure and safely retries already-removed prefixes", async () => {
    mocks.authenticateApiRequest.mockResolvedValue({ user: { id: USER_ID } });
    const errorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const firstAttempt = serviceClient({
      storageFixture: {
        [`private-docs:${USER_ID}/`]: { names: ["profile-document.pdf"] },
        [`private-docs:staff-credentials/${USER_ID}/`]: {
          names: ["food-safety.pdf"],
          removeError: { message: "storage unavailable" },
        },
      },
    });
    const retry = serviceClient({
      storageFixture: {
        [`private-docs:${USER_ID}/`]: { names: [] },
        [`private-docs:staff-credentials/${USER_ID}/`]: {
          names: ["food-safety.pdf"],
        },
      },
    });
    mocks.createServiceRoleClient
      .mockReturnValueOnce(firstAttempt.client)
      .mockReturnValueOnce(retry.client);

    const firstResponse = await POST(request());
    const retryResponse = await POST(request());

    expect(firstResponse.status).toBe(503);
    expect(await firstResponse.json()).toEqual({
      error:
        "Stored files could not be removed. Your account remains active; please try again.",
    });
    expect(firstAttempt.deleteUser).not.toHaveBeenCalled();
    expect(firstAttempt.auditInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: USER_ID,
        action_type: "account_deletion_requested",
      }),
    );
    expect(errorSpy).toHaveBeenCalledWith(
      "[account-delete] storage cleanup incomplete:",
      [`private-docs:staff-credentials/${USER_ID}/:remove`],
    );
    expect(retryResponse.status).toBe(200);
    expect(retry.deleteUser).toHaveBeenCalledWith(USER_ID, false);
    expect(retry.removeCalls).toContainEqual({
      bucket: "private-docs",
      paths: [`staff-credentials/${USER_ID}/food-safety.pdf`],
    });
    errorSpy.mockRestore();
  });

  it("keeps elevated Storage credentials server-only", async () => {
    mocks.authenticateApiRequest.mockResolvedValue({ user: { id: USER_ID } });
    const { client } = serviceClient();
    mocks.createServiceRoleClient.mockReturnValue(client);

    const response = await POST(request());
    const responseText = await response.text();
    const routeSource = fs.readFileSync(
      path.join(process.cwd(), "app/api/account/delete/route.ts"),
      "utf8",
    );

    expect(responseText).not.toMatch(
      /service.?role|secret|SUPABASE_SERVICE_ROLE_KEY/i,
    );
    expect(routeSource).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
  });

  it("deletes only the authenticated auth user after cleanup succeeds", async () => {
    mocks.authenticateApiRequest.mockResolvedValue({ user: { id: USER_ID } });
    const { client, deleteUser } = serviceClient();
    mocks.createServiceRoleClient.mockReturnValue(client);
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(deleteUser).toHaveBeenCalledWith(USER_ID, false);
    expect(response.headers.get("cache-control")).toContain("no-store");
  });
});
