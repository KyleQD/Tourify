import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const root = process.cwd()

function read(path: string) {
  return readFileSync(join(root, path), "utf8")
}

describe("Work Hub route contracts", () => {
  it("renders a real /work hub instead of redirecting to Work Mode", () => {
    const page = read("app/work/page.tsx")
    const hub = read("components/work-mode/work-hub-dashboard.tsx")

    expect(page).toContain("WorkHubDashboard")
    expect(page).not.toContain("redirect(")
    expect(hub).toContain('fetch("/api/work-hub"')
    expect(hub).toContain("useWorkMode")
  })

  it("keeps compatibility assignment and worker publication routes connected", () => {
    const assignment = read("app/work/assignments/[id]/page.tsx")
    const publicationPage = read("app/work/publications/[id]/page.tsx")
    const publicationApi = read("app/api/work/publications/[id]/route.ts")
    const readModel = read("lib/work-mode/read-model.ts")

    expect(assignment).toContain("/work/today?assignment=")
    expect(publicationPage).toContain("WorkPublicationDetail")
    expect(publicationApi).toContain("getWorkModeAssignments")
    expect(readModel).toContain("/work/publications/")
  })

  it("uses primary Work Mode tabs while preserving secondary direct views", () => {
    const navigation = read("lib/work-mode/navigation.ts")
    const workspace = read("components/work-mode/work-mode-workspace.tsx")

    expect(navigation).toContain("WORK_MODE_PRIMARY_VIEWS")
    expect(navigation).toContain("WORK_MODE_SECONDARY_VIEWS")
    expect(workspace).toContain("WORK_MODE_PRIMARY_VIEWS.map")
    expect(workspace).toContain('view === "more"')
  })

  it("routes worker map task updates through a worker-scoped endpoint", () => {
    const viewer = read("components/site-maps/worker-site-map-viewer.tsx")
    const route = read("app/api/work/site-maps/[id]/tasks/route.ts")

    expect(viewer).toContain("/api/work/site-maps/")
    expect(viewer).not.toContain("/api/admin/logistics/site-maps/${siteMapId}/tasks")
    expect(route).toContain("ALLOWED_ACTIONS")
    expect(route).toContain("Task not assigned to this worker")
  })
})
