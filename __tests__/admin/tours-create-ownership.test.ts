import { readFileSync } from "fs"
import { resolve } from "path"

describe("tour create sets RLS ownership columns", () => {
  it("POST /api/tours sets created_by and user_id from the authenticated user", () => {
    const route = readFileSync(resolve(process.cwd(), "app/api/tours/route.ts"), "utf8")
    expect(route).toContain("user_id: user.id")
    expect(route).toContain("created_by: user.id")
  })
})
