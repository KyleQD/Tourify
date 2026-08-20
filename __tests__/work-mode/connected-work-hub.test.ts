import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const root = process.cwd()
const read = (path: string) => readFileSync(`${root}/${path}`, "utf8")

describe("Connected Worker Work Hub", () => {
  it("reconciles assignment semantic keys, declined state, and shift soft delete", () => {
    const migration = read("supabase/migrations/20260819202546_connected_worker_work_hub.sql")
    expect(migration).toContain("job_application_id")
    expect(migration).toContain("job_posting_id")
    expect(migration).toContain("assignment_kind")
    expect(migration).toContain("'declined'")
    expect(migration).toContain("add column if not exists deleted_at")
    expect(migration).toContain("employment_assignments_staff_shift_semantic_key")
  })

  it("repairs the DreamStream-shaped detached generic assignment without replacing its id", () => {
    const migration = read("supabase/migrations/20260819202546_connected_worker_work_hub.sql")
    expect(migration).toContain("where assignment.staff_member_id is null")
    expect(migration).toContain("lower(assignment.role_title) in ('staff', 'crew')")
    expect(migration).toContain("coalesce(roster.position, roster.role")
    expect(migration).toContain("candidate.status in ('approved', 'accepted')")
    expect(migration).not.toContain("delete from public.employment_assignments")
  })

  it("does not create a fake assignment for roster-only approval", () => {
    const service = read("lib/services/hiring-roster.service.ts")
    expect(service).toContain("A roster relationship is complete on staff_members")
    expect(service).toContain("if (eventId || tourId)")
    expect(service).toContain('job_application_id: args.jobApplicationId')
    expect(service).toContain('assignment_kind: "event"')
  })

  it("provisions private coordinator membership and revokes it on offboarding", () => {
    const migration = read("supabase/migrations/20260819202546_connected_worker_work_hub.sql")
    expect(migration).toContain("ensure_workforce_coordinator_channel")
    expect(migration).toContain("Private work coordination channel")
    expect(migration).toContain("set left_at = coalesce(left_at, now())")
    expect(migration).toContain("set left_at = null")
    expect(migration).toContain("workforce_channel_links_worker_read")
  })

  it("serves the requested connected API and ordered worker experience", () => {
    const model = read("lib/work-hub/read-model.ts")
    const ui = read("components/work-mode/work-hub-dashboard.tsx")
    for (const key of ["attention", "applications", "engagements", "recommendedJobs", "partialSources", "generatedAt"]) {
      expect(model).toContain(key)
    }
    const headings = ["Needs attention", "My work", "Upcoming shifts", "Applications", "Work messages", "Recommended jobs", "History"].map((heading) => `title=\"${heading}\"`)
    for (let index = 1; index < headings.length; index += 1) {
      expect(ui.indexOf(headings[index - 1])).toBeLessThan(ui.indexOf(headings[index]))
    }
    expect(ui).toContain("On roster — schedule not assigned yet")
    expect(ui).toContain("Not shared yet")
    expect(ui).toContain("min-h-11")
  })

  it("uses typed publication layouts and explicit versioned audiences", () => {
    const detail = read("components/work-mode/work-publication-detail.tsx")
    const route = read("app/api/admin/events/[id]/work-mode/route.ts")
    for (const type of ["advance", "day_sheet", "command_broadcast", "site_map", "event_publish", "tour_publish"]) {
      expect(detail).toContain(`\"${type}\"`)
    }
    expect(detail).not.toContain("JSON.stringify(data.publication.payload")
    expect(route).toContain("selected_workers")
    expect(route).toContain("supersedes_publication_id")
    expect(route).toContain("requires_acknowledgement")
    expect(route).toContain("work_mode_publication_audiences")
  })
})
