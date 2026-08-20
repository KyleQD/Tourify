import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const root = process.cwd()
const read = (path: string) => readFileSync(`${root}/${path}`, "utf8")
const migrationPath = "supabase/migrations/20260819235123_end_to_end_tour_shift_task_integration.sql"

describe("end-to-end tour, shift, and task integration", () => {
  it("models membership, concrete event scopes, shared shifts, worker task state, and delivery atomically", () => {
    const migration = read(migrationPath)
    for (const table of ["tour_member_event_scopes", "staff_shift_plans", "workflow_task_assignments", "workforce_delivery_outbox"]) {
      expect(migration).toContain(`public.${table}`)
      expect(migration).toContain(`alter table public.${table} enable row level security`)
    }
    expect(migration).toContain("staff_shift_plan_private_notes")
    expect(migration).toContain("staff_shifts_active_plan_worker_key")
    expect(migration).toContain("workflow_task_assignments_active_key")
    expect(migration).toContain("workforce_delivery_outbox_idempotency_key")
  })

  it("reconciles bulk evidence into one membership and current event scopes without inventing shifts", () => {
    const migration = read(migrationPath)
    expect(migration).toContain("insert into public.tour_team_members")
    expect(migration).toContain("insert into public.tour_member_event_scopes")
    expect(migration).toContain("'current_events_bulk'")
    expect(migration).toContain("superseded_by_id")
    expect(migration).toContain("legacy_groups")
    expect(migration).toContain("staff_shift_plan_id = plan.id")
    const reconciliation = migration.slice(migration.indexOf("-- Reconciliation"), migration.indexOf("-- Semantic uniqueness"))
    expect(reconciliation).not.toContain("insert into public.staff_shifts")
    expect(reconciliation).not.toContain("delete from public.staff_shift_assignments")
  })

  it("propagates future events only for opted-in members and publishes a shared shift in one transaction", () => {
    const migration = read(migrationPath)
    expect(migration).toContain("member.propagate_to_future_events")
    expect(migration).toContain("'future_rule'")
    expect(migration).toContain("private.publish_staff_shift_plan")
    expect(migration).toContain("Complete event location before publishing")
    expect(migration).toContain("Scheduling conflict")
    expect(migration).toContain("on conflict (staff_shift_id) where staff_shift_id is not null")
  })

  it("removes fake shift stubs and partial all-events fan-out from the roster dialog", () => {
    const dialog = read("components/hiring/roster-assignment-dialog.tsx")
    expect(dialog).not.toContain("ensureShiftStub")
    expect(dialog).not.toContain("09:00")
    expect(dialog).not.toContain("17:00")
    expect(dialog).not.toContain("assignments failed — the rest succeeded")
    expect(dialog).toContain("/api/admin/workforce/tour-memberships")
    expect(dialog).toContain("Current and future events")
    expect(dialog).toContain("No shift — tour access only")
  })

  it("uses roster identities for tasks and exposes worker-owned lifecycle actions", () => {
    const manager = read("components/admin/tour-team-manager.tsx")
    const taskRoute = read("app/api/workflows/threads/[id]/tasks/route.ts")
    const workerRoute = read("app/api/work/tasks/[taskAssignmentId]/actions/route.ts")
    expect(manager).not.toContain("Assignee user UUID")
    expect(manager).toContain("assignee_staff_member_ids")
    expect(taskRoute).toContain("create_workflow_task_assignments")
    expect(workerRoute).toContain("transition_workflow_task_assignment")
    for (const action of ["acknowledge", "start", "complete", "block"]) expect(workerRoute).toContain(`"${action}"`)
  })

  it("surfaces tours, accessible events, tasks, and schedule-pending state in Work Hub", () => {
    const model = read("lib/work-hub/read-model.ts")
    const ui = read("components/work-mode/work-hub-dashboard.tsx")
    const workMode = read("components/work-mode/work-mode-workspace.tsx")
    expect(model).toContain("tour_member_event_scopes")
    expect(model).toContain("workflow_task_assignments")
    expect(model).toContain("task_acknowledgement")
    expect(ui).toContain("Tours and event access")
    expect(ui).toContain("On tour — schedule not assigned yet")
    expect(ui).toContain("Assigned tasks")
    expect(ui).toContain("Acknowledge")
    expect(ui).toContain("Complete")
    expect(workMode).toContain("/api/work/tasks/")
    expect(workMode).toContain("No tasks assigned")
    expect(workMode).toContain("Shift briefing")
    expect(read("lib/work-mode/read-model.ts")).toContain("staff_shift_plans")
  })
})
