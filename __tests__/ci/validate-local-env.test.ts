import { describe, expect, it } from "vitest"

import { validateLocalEnvironment, type EnvironmentValueMap } from "../../lib/config/environment-contract"

const completeEnvironment: EnvironmentValueMap = {
  NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "public-anon-key",
  NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
  SUPABASE_SERVICE_ROLE_KEY: "private-service-role-key",
  ENCRYPTION_KEY: "a".repeat(64),
  INTERNAL_API_SECRET: "internal-secret",
  CRON_SECRET: "cron-secret",
}

describe("local environment contract", () => {
  it("accepts a loopback Supabase and site URL", () => {
    expect(validateLocalEnvironment(completeEnvironment)).toEqual({ valid: true, issues: [] })
  })

  it("rejects non-loopback HTTP endpoints", () => {
    const result = validateLocalEnvironment({
      ...completeEnvironment,
      NEXT_PUBLIC_SUPABASE_URL: "http://supabase.example",
      NEXT_PUBLIC_SITE_URL: "http://tourify.example",
    })

    expect(result.valid).toBe(false)
    expect(result.issues.map((issue) => issue.code)).toEqual(["invalid", "invalid"])
  })

  it("requires a complete Upstash pair when local enforcement is enabled", () => {
    const result = validateLocalEnvironment({
      ...completeEnvironment,
      RATE_LIMIT_ENFORCE: "true",
      UPSTASH_REDIS_REST_URL: "https://rate-limit.example",
    })

    expect(result.valid).toBe(false)
    expect(result.issues).toEqual([
      expect.objectContaining({
        code: "incomplete_group",
        variables: ["UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN"],
      }),
    ])
  })
})
