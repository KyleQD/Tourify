import { describe, expect, it } from "vitest"
import {
  formatEnvironmentValidationError,
  validateProductionEnvironment,
  type EnvironmentValueMap,
} from "../../lib/config/environment-contract"

const completeEnvironment: EnvironmentValueMap = {
  NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "public-anon-key",
  NEXT_PUBLIC_SITE_URL: "https://tourify.example",
  SUPABASE_SERVICE_ROLE_KEY: "private-service-role-key",
  ENCRYPTION_KEY: "a".repeat(64),
  INTERNAL_API_SECRET: "internal-secret",
  CRON_SECRET: "cron-secret",
}

describe("production environment contract", () => {
  it("accepts the complete required contract", () => {
    expect(validateProductionEnvironment("build", completeEnvironment)).toEqual({
      valid: true,
      issues: [],
    })
  })

  it("aggregates missing values without printing their contents", () => {
    const result = validateProductionEnvironment("build", {})
    const message = formatEnvironmentValidationError("build", result)

    expect(result.valid).toBe(false)
    expect(result.issues).toHaveLength(1)
    expect(message).toContain("NEXT_PUBLIC_SUPABASE_URL")
    expect(message).toContain("SUPABASE_SERVICE_ROLE_KEY")
    expect(message).toContain("No values were printed")
  })

  it("rejects malformed URLs, encryption keys, and reused Supabase keys", () => {
    const result = validateProductionEnvironment("runtime", {
      ...completeEnvironment,
      NEXT_PUBLIC_SUPABASE_URL: "http://project.supabase.co",
      NEXT_PUBLIC_SITE_URL: "not-a-url",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "same-key",
      SUPABASE_SERVICE_ROLE_KEY: "same-key",
      ENCRYPTION_KEY: "short",
    })

    expect(result.issues.map((issue) => issue.code)).toEqual([
      "invalid",
      "invalid",
      "invalid",
      "unsafe_reuse",
    ])
  })

  it("fails a partially configured optional integration as one grouped issue", () => {
    const result = validateProductionEnvironment("runtime", {
      ...completeEnvironment,
      RESEND_API_KEY: "resend-key",
    })

    expect(result.valid).toBe(false)
    expect(result.issues).toEqual([
      expect.objectContaining({
        code: "incomplete_group",
        variables: ["RESEND_API_KEY", "RESEND_FROM_EMAIL"],
      }),
    ])
  })
})
