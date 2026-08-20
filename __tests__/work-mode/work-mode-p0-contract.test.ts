import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const root = process.cwd()

function read(path: string) {
  return readFileSync(join(root, path), "utf8")
}

describe("Work Hub + Work Mode P0 contracts", () => {
  it("ships additive worker publication, schedule, and attendance hardening", () => {
    const migration = read("supabase/migrations/20260819010000_work_system_p0_security_and_attendance.sql")

    expect(migration).toContain("check_in_opens_at")
    expect(migration).toContain("work_mode_check_in_assignment_action_key")
    expect(migration).toContain("staff_shifts_worker_read_own_assignment")
    expect(migration).toContain("work_mode_publications_worker_select")
    expect(migration).toContain("supersedes_publication_id")
  })

  it("keeps the worker read model shift-linked and event-timezone aware", () => {
    const model = read("lib/work-mode/read-model.ts")

    expect(model).toContain("staff_shift_id")
    expect(model).toContain("schedulesById")
    expect(model).toContain("effectiveEventId")
    expect(model).toContain("attendanceByAssignment")
    expect(model).toContain("requiresAcknowledgement")
  })

  it("makes Schedule primary while retaining assignments as a compatibility view", () => {
    const navigation = read("lib/work-mode/navigation.ts")
    const workspace = read("components/work-mode/work-mode-workspace.tsx")

    expect(navigation).toContain('{ id: "schedule", label: "Schedule"')
    expect(navigation).toContain('{ id: "assignments", label: "Assignments"')
    expect(workspace).toContain("Switch assignment")
    expect(workspace).toContain("Schedule pending")
  })

  it("keeps realtime narrow, flag-gated, and backed by a private cached read model", () => {
    const hook = read("hooks/use-work-mode.ts")
    const migration = read("supabase/migrations/20260819020000_work_system_realtime_publication.sql")

    expect(hook).toContain("NEXT_PUBLIC_FEATURE_WORK_MODE_REALTIME")
    expect(hook).toContain("WORK_MODE_SNAPSHOT_PREFIX")
    expect(hook).toContain("supabase.auth.getUser")
    expect(hook).toContain("document.addEventListener('visibilitychange'")
    expect(hook).toContain("table: 'employment_assignments'")
    expect(hook).toContain("table: 'staff_shifts'")
    expect(hook).toContain("table: 'work_mode_publications'")
    expect(migration).toContain("pg_publication_tables")
    expect(migration).toContain("public.employment_assignments")
    expect(migration).toContain("public.staff_shifts")
    expect(migration).toContain("public.work_mode_publications")
  })

  it("keeps attendance online-only and critical Work Mode controls touch-accessible", () => {
    const hook = read("hooks/use-work-mode.ts")
    const workspace = read("components/work-mode/work-mode-workspace.tsx")
    const hub = read("components/work-mode/work-hub-dashboard.tsx")

    expect(hook).toContain("window.addEventListener('offline'")
    expect(hook).toContain("!navigator.onLine")
    expect(hook).toContain("live server confirmation")
    expect(workspace).toContain("You’re offline")
    expect(workspace).toContain("min-h-11")
    expect(hub).toContain("options.timeZone = timeZone")
  })
})
