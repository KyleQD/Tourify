import { describe, expect, it } from "vitest"

import {
  AGENT_KEY_PREFIX,
  agentHasScope,
  agentKeyPrefix,
  createAgentSecret,
  extractAgentSecret,
  hashAgentSecret,
  verifyAgentSecret,
} from "@/lib/auth/agent-service-core"

describe("agent service credentials", () => {
  it("creates prefixed, non-empty secrets and verifies only the matching hash", () => {
    const secret = createAgentSecret()
    const hash = hashAgentSecret(secret)

    expect(secret.startsWith(AGENT_KEY_PREFIX)).toBe(true)
    expect(secret.length).toBeGreaterThan(32)
    expect(hash).toMatch(/^[0-9a-f]{64}$/)
    expect(verifyAgentSecret(secret, hash)).toBe(true)
    expect(verifyAgentSecret(`${secret}x`, hash)).toBe(false)
  })

  it("uses a stable lookup prefix without exposing the secret", () => {
    const secret = "ta_0123456789abcdefghijklmnopqrstuvwxyz"
    expect(agentKeyPrefix(secret)).toBe("ta_012345678")
    expect(agentKeyPrefix(secret)).not.toBe(secret)
  })

  it("accepts only explicit agent-key headers", () => {
    const valid = new Request("https://tourify.test/api/agent", {
      headers: { authorization: "Bearer ta_abcDEF_123" },
    })
    expect(extractAgentSecret(valid)).toBe("ta_abcDEF_123")

    const header = new Request("https://tourify.test/api/agent", {
      headers: { "x-tourify-agent-key": "ta_xyz-456" },
    })
    expect(extractAgentSecret(header)).toBe("ta_xyz-456")

    const jwt = new Request("https://tourify.test/api/agent", {
      headers: { authorization: "Bearer eyJhbGciOiJIUzI1NiJ9" },
    })
    expect(extractAgentSecret(jwt)).toBeNull()
  })

  it("supports exact, domain wildcard, and global scope grants", () => {
    expect(agentHasScope(["admin:read"], "admin:read")).toBe(true)
    expect(agentHasScope(["admin:*"] , "admin:write")).toBe(true)
    expect(agentHasScope(["*"], "release:write")).toBe(true)
    expect(agentHasScope(["admin:read"], "admin:write")).toBe(false)
  })
})
