import { readFileSync } from "fs"
import { resolve } from "path"

describe("grant tour admins stays tour-scoped", () => {
  it("panel does not request org membership by default", () => {
    const panel = readFileSync(
      resolve(process.cwd(), "components/admin/grant-tour-admins-panel.tsx"),
      "utf8",
    )
    expect(panel).toContain("grant_org_membership: false")
    expect(panel).not.toContain("grant_org_membership: true")
  })

  it("API defaults grant_org_membership to false", () => {
    const route = readFileSync(
      resolve(process.cwd(), "app/api/admin/tours/[id]/grant-admins/route.ts"),
      "utf8",
    )
    expect(route).toMatch(/grant_org_membership:\s*z\.boolean\(\)\.optional\(\)\.default\(false\)/)
  })
})
