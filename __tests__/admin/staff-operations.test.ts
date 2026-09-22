import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

import { evaluateNavHrefAccess } from "@/lib/admin/capability-aware-ui"
import { rankStaffOperationsTasks, staffOperationsTaskBucket } from "@/lib/admin/staff-operations-ranking"
import { legacyStaffOperationsRedirect } from "@/lib/admin/staff-operations-routing"
import type { StaffOperationsTask } from "@/types/staff-operations"
import { canManageStaffChannel, invalidStaffChannelMemberIds } from "@/lib/admin/staff-channel-membership"

const NOW = new Date("2026-07-31T12:00:00.000Z")

function task(overrides: Partial<StaffOperationsTask>): StaffOperationsTask {
  return {
    id: "task",
    source: "event_task",
    kind: "workflow",
    title: "Task",
    description: null,
    priority: "normal",
    status: "todo",
    dueAt: null,
    actorName: null,
    actionHref: "/admin/dashboard/staff",
    isOverdue: false,
    ...overrides,
  }
}

describe("Staff Operations consolidation", () => {
  it("redirects every removed tab and preserves entity query parameters", () => {
    for (const tab of ["applications", "jobs", "onboarding", "audit"]) {
      expect(legacyStaffOperationsRedirect({ tab, entity_type: "organization", entity_id: "org-1" }))
        .toBe(`/admin/dashboard/hiring?entity_type=organization&entity_id=org-1&tab=${tab}`)
    }
    expect(legacyStaffOperationsRedirect({ tab: "roster", entity_id: "org-1" }))
      .toBe("/admin/dashboard/staff?entity_id=org-1&tab=team")
    expect(legacyStaffOperationsRedirect({ tab: "payroll", entity_id: "org-1" }))
      .toBe("/admin/dashboard/payroll?entity_id=org-1")
  })

  it("orders urgent work using the documented deterministic buckets", () => {
    const items = [
      task({ id: "remaining", dueAt: "2026-08-05T00:00:00.000Z" }),
      task({ id: "coverage", source: "scheduling", status: "open", priority: "high", dueAt: "2026-08-01T00:00:00.000Z" }),
      task({ id: "today", dueAt: "2026-07-31T18:00:00.000Z" }),
      task({ id: "request", source: "request", status: "pending", priority: "high" }),
      task({ id: "critical", priority: "critical" }),
      task({ id: "overdue-critical", priority: "critical", isOverdue: true, dueAt: "2026-07-30T00:00:00.000Z" }),
    ]
    expect(rankStaffOperationsTasks(items, NOW).map((item) => item.id)).toEqual([
      "overdue-critical", "critical", "request", "today", "coverage", "remaining",
    ])
    expect(items.map((item) => staffOperationsTaskBucket(item, NOW))).toEqual([5, 4, 3, 2, 1, 0])
  })

  it("keeps Staff Operations and Payroll capability gated", () => {
    expect(evaluateNavHrefAccess({ href: "/admin/dashboard/staff", capabilities: ["workforce.view"] }).allowed).toBe(true)
    expect(evaluateNavHrefAccess({ href: "/admin/dashboard/payroll", capabilities: ["workforce.view"] }).allowed).toBe(true)
    expect(evaluateNavHrefAccess({ href: "/admin/dashboard/payroll", capabilities: ["content.view"] }).allowed).toBe(false)
  })

  it("rejects unrelated channel recipients and limits membership management", () => {
    expect(invalidStaffChannelMemberIds({
      requestedMemberIds: ["active", "pending", "unrelated", "active"],
      approvedActiveUserIds: ["active"],
      creatorUserId: "owner",
    })).toEqual(["pending", "unrelated"])
    expect(canManageStaffChannel("owner")).toBe(true)
    expect(canManageStaffChannel("admin")).toBe(true)
    expect(canManageStaffChannel("member")).toBe(false)
  })

  it("keeps the Payroll workspace explicitly disconnected from live data", () => {
    const source = readFileSync(resolve(process.cwd(), "app/admin/dashboard/payroll/page.tsx"), "utf8")
    expect(source).toContain("Payroll data is not connected yet")
    expect(source).not.toContain("fetch(")
    expect(source).not.toContain("supabase")
  })
})
