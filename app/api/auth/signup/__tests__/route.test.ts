import { NextRequest } from "next/server"
import { POST } from "../route"

describe("POST /api/auth/signup", () => {
  it("returns 410 Gone with deprecation payload", async () => {
    const req = new NextRequest("http://localhost/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({ email: "x@y.com", password: "secret12" }),
    })
    const res = await POST(req)
    expect(res.status).toBe(410)
    const body = (await res.json()) as {
      deprecated?: boolean
      migrateTo?: string
      error?: string
    }
    expect(body.deprecated).toBe(true)
    expect(body.migrateTo).toBe("/login?tab=signup")
    expect(body.error).toMatch(/deprecated/i)
  })
})
