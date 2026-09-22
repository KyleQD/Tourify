import { createHash, randomBytes, timingSafeEqual } from "node:crypto"

export const AGENT_KEY_PREFIX = "ta_"

export type AgentServiceScope = string

export function createAgentSecret(): string {
  return `${AGENT_KEY_PREFIX}${randomBytes(32).toString("base64url")}`
}

export function agentKeyPrefix(secret: string): string {
  return secret.slice(0, 12)
}

export function hashAgentSecret(secret: string): string {
  return createHash("sha256").update(secret, "utf8").digest("hex")
}

export function verifyAgentSecret(secret: string, expectedHash: string): boolean {
  const actual = Buffer.from(hashAgentSecret(secret), "hex")
  const expected = Buffer.from(expectedHash, "hex")
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}

export function extractAgentSecret(request: Request): string | null {
  const header = request.headers.get("authorization")?.trim() ?? ""
  const bearer = header.match(/^Bearer\s+(ta_[A-Za-z0-9_-]+)$/i)?.[1]
  if (bearer) return bearer

  const explicit = request.headers.get("x-tourify-agent-key")?.trim() ?? ""
  return /^ta_[A-Za-z0-9_-]+$/.test(explicit) ? explicit : null
}

export function agentHasScope(scopes: readonly string[], required: string): boolean {
  return scopes.includes(required) || scopes.includes(`${required.split(":")[0]}:*`) || scopes.includes("*")
}
