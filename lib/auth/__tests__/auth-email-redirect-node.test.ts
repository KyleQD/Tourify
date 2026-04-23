import { getConfiguredPublicSiteOrigin } from "@/lib/auth/public-site-origin"
import { getAuthSignUpEmailRedirectTo } from "@/lib/auth/auth-email-redirect"

describe("getConfiguredPublicSiteOrigin", () => {
  const saved = { ...process.env }

  afterEach(() => {
    process.env = { ...saved }
  })

  it("strips trailing slash from NEXT_PUBLIC_SITE_URL", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://app.example/"
    delete process.env.VERCEL_URL
    expect(getConfiguredPublicSiteOrigin()).toBe("https://app.example")
  })

  it("prefixes https when VERCEL_URL has no scheme", () => {
    delete process.env.NEXT_PUBLIC_SITE_URL
    process.env.VERCEL_URL = "my-app.vercel.app"
    expect(getConfiguredPublicSiteOrigin()).toBe("https://my-app.vercel.app")
  })

  it("falls back to localhost when unset", () => {
    delete process.env.NEXT_PUBLIC_SITE_URL
    delete process.env.VERCEL_URL
    expect(getConfiguredPublicSiteOrigin()).toBe("http://localhost:3000")
  })
})

describe("getAuthSignUpEmailRedirectTo (Node)", () => {
  const saved = { ...process.env }

  afterEach(() => {
    process.env = { ...saved }
  })

  it("appends signup callback path to configured origin", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://demo.example"
    delete process.env.VERCEL_URL
    expect(getAuthSignUpEmailRedirectTo()).toBe(
      "https://demo.example/auth/callback?type=signup&redirectTo=%2Flogin",
    )
  })
})
