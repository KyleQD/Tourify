import { readFileSync } from "fs"
import { resolve } from "path"

describe("grant tour admins stays tour-scoped", () => {
  it("panel uses the tour collaboration invitation boundary", () => {
    const panel = readFileSync(
      resolve(process.cwd(), "components/admin/grant-tour-admins-panel.tsx"),
      "utf8",
    )
    expect(panel).toContain("/collaboration-invites")
    expect(panel).not.toContain("/grant-admins")
    expect(panel).not.toContain("grant_org_membership")
  })

  it("collaboration invitations cannot create organization membership", () => {
    const route = readFileSync(
      resolve(
        process.cwd(),
        "app/api/admin/tours/[id]/collaboration-invites/route.ts",
      ),
      "utf8",
    )
    expect(route).toContain('.from("tour_collaboration_invitations")')
    expect(route).not.toContain('.from("org_members")')
    expect(route).not.toContain("grant_org_membership")
  })
})
