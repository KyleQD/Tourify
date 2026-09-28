import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

const rpc = vi.fn()

vi.mock("@/lib/supabase/service-role-job", () => ({
  executeServiceRoleJob: async (_context: unknown, run: (client: { rpc: typeof rpc }) => Promise<unknown>) => run({ rpc }),
}))

import {
  auditFailPolicyFor,
  SecurityAuditWriteError,
  writeSecurityAuditEvent,
} from "@/lib/security/write-security-audit-event"

describe("SEC-111 security audit writer", () => {
  beforeEach(() => {
    rpc.mockReset()
  })

  it("documents fail-closed for mutation/export and fail-open for reads", () => {
    expect(auditFailPolicyFor("mutation")).toBe("fail_closed")
    expect(auditFailPolicyFor("export")).toBe("fail_closed")
    expect(auditFailPolicyFor("privileged_read")).toBe("fail_open")
    expect(auditFailPolicyFor("authz_decision")).toBe("fail_open")
  })

  it("returns id on successful write", async () => {
    rpc.mockResolvedValue({ data: "evt-1", error: null })
    const result = await writeSecurityAuditEvent({
      actorUserId: "user-1",
      actingOrgId: "org-1",
      action: "tour.delete",
      actionClass: "mutation",
      result: "success",
    })
    expect(result.id).toBe("evt-1")
    expect(rpc).toHaveBeenCalledWith(
      "write_security_audit_event",
      expect.objectContaining({
        p_action: "tour.delete",
        p_action_class: "mutation",
      }),
    )
  })

  it("fail-closes mutations when the RPC errors", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "down" } })
    await expect(
      writeSecurityAuditEvent({
        actingOrgId: "org-1",
        action: "tour.delete",
        actionClass: "mutation",
        result: "success",
      }),
    ).rejects.toBeInstanceOf(SecurityAuditWriteError)
  })

  it("fail-opens privileged reads when the RPC errors", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "down" } })
    const result = await writeSecurityAuditEvent({
      actingOrgId: "org-1",
      action: "finance.export.preview",
      actionClass: "privileged_read",
      result: "success",
    })
    expect(result.id).toBeNull()
  })
})
