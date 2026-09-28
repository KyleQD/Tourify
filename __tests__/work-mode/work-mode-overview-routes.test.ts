import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/work-mode/read-model", () => ({
  getWorkModeOverview: vi.fn(),
  getWorkModeEvent: vi.fn(),
  WorkModeReadError: class WorkModeReadError extends Error {},
}));
vi.mock("@/lib/supabase/service-role-job", () => ({
  resolveServiceRoleJobOrgId: vi.fn(),
  executeServiceRoleJob: vi.fn(),
}));

import { GET as getOverview } from "@/app/api/work-mode/overview/route";
import { GET as getEvent } from "@/app/api/work-mode/events/[eventId]/route";
import { POST as respondToCommunication } from "@/app/api/work-mode/communications/[id]/respond/route";
import { createClient } from "@/lib/supabase/server";
import {
  getWorkModeEvent,
  getWorkModeOverview,
} from "@/lib/work-mode/read-model";
import { resolveServiceRoleJobOrgId } from "@/lib/supabase/service-role-job";

const mockedCreateClient = vi.mocked(createClient);
const mockedOverview = vi.mocked(getWorkModeOverview);
const mockedEvent = vi.mocked(getWorkModeEvent);
const mockedResolveOrg = vi.mocked(resolveServiceRoleJobOrgId);

describe("Work Mode overview and event routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedCreateClient.mockResolvedValue({
      auth: {
        getUser: vi
          .fn()
          .mockResolvedValue({ data: { user: { id: "worker-1" } } }),
      },
    } as never);
  });

  it("returns the global worker overview with private no-store caching", async () => {
    mockedOverview.mockResolvedValue({
      events: [{ eventId: "event-1" }],
    } as never);
    const response = await getOverview();
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect((await response.json()).data.events[0].eventId).toBe("event-1");
    expect(mockedOverview).toHaveBeenCalledWith(expect.anything(), "worker-1");
  });

  it("fails closed when the event is not in the worker's confirmed read model", async () => {
    mockedEvent.mockResolvedValue(null);
    const response = await getEvent(new Request("https://tourify.test"), {
      params: Promise.resolve({ eventId: "event-other" }),
    });
    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({ code: "not_found" });
    expect(mockedEvent).toHaveBeenCalledWith(
      expect.anything(),
      "worker-1",
      "event-other",
    );
  });

  it("rejects a communication that cannot resolve recipient-owned organization scope", async () => {
    mockedResolveOrg.mockResolvedValue(null);
    const response = await respondToCommunication(
      new Request("https://tourify.test", {
        method: "POST",
        body: JSON.stringify({
          source: "team_communication",
          action: "acknowledge",
        }),
      }) as never,
      { params: Promise.resolve({ id: "message-other" }) },
    );
    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({ code: "not_found" });
  });
});
