import "server-only"

import { createServiceRoleClient } from "@/lib/supabase/service-role"
import {
  agentHasScope,
  agentKeyPrefix,
  extractAgentSecret,
  hashAgentSecret,
  verifyAgentSecret,
  type AgentServiceScope,
} from "@/lib/auth/agent-service-core"

export type { AgentServiceScope } from "@/lib/auth/agent-service-core"

export interface AgentPrincipal {
  id: string
  slug: string
  displayName: string
  agentRole: string
  authUserId: string | null
  scopes: string[]
}

export interface AgentAuthResult {
  principal: AgentPrincipal
  credentialId: string
}

type AgentClient = ReturnType<typeof createServiceRoleClient>

function asPrincipal(row: Record<string, unknown>): AgentPrincipal {
  return {
    id: String(row.id),
    slug: String(row.slug),
    displayName: String(row.display_name),
    agentRole: String(row.agent_role),
    authUserId: typeof row.auth_user_id === "string" ? row.auth_user_id : null,
    scopes: Array.isArray(row.scopes) ? row.scopes.filter((scope): scope is string => typeof scope === "string") : [],
  }
}

/**
 * Authenticate an explicit agent service credential.
 *
 * This never falls back to a browser/session user. Routes must opt into this
 * helper and then enforce the returned principal's scope at the resource
 * boundary.
 */
export async function authenticateAgentRequest(
  request: Request,
  client: AgentClient = createServiceRoleClient(),
): Promise<AgentAuthResult | null> {
  const secret = extractAgentSecret(request)
  if (!secret) return null

  const prefix = agentKeyPrefix(secret)
  const { data: credential, error: credentialError } = await (client as any)
    .from("agent_credentials")
    .select("id, agent_id, secret_hash, expires_at, revoked_at")
    .eq("key_prefix", prefix)
    .maybeSingle()

  if (credentialError || !credential || credential.revoked_at) return null
  if (credential.expires_at && new Date(credential.expires_at).getTime() <= Date.now()) return null
  if (!verifyAgentSecret(secret, String(credential.secret_hash))) return null

  const { data: identity, error: identityError } = await (client as any)
    .from("agent_identities")
    .select("id, slug, display_name, agent_role, auth_user_id, scopes, status")
    .eq("id", credential.agent_id)
    .maybeSingle()

  if (identityError || !identity || identity.status !== "active") return null

  const principal = asPrincipal(identity)
  await Promise.all([
    (client as any).from("agent_credentials").update({ last_used_at: new Date().toISOString() }).eq("id", credential.id),
    (client as any).from("agent_identities").update({ last_seen_at: new Date().toISOString() }).eq("id", principal.id),
  ])

  return { principal, credentialId: String(credential.id) }
}

export function requireAgentScope(principal: AgentPrincipal, scope: AgentServiceScope): void {
  if (!agentHasScope(principal.scopes, scope)) {
    throw new Error(`Agent scope required: ${scope}`)
  }
}

export async function recordAgentAuditEvent(
  principal: AgentPrincipal,
  event: {
    action: string
    resourceType?: string
    resourceId?: string
    requestId?: string
    metadata?: Record<string, unknown>
  },
  client: AgentClient = createServiceRoleClient(),
): Promise<void> {
  const { error } = await (client as any).from("agent_audit_events").insert({
    agent_id: principal.id,
    auth_user_id: principal.authUserId,
    action: event.action,
    resource_type: event.resourceType ?? null,
    resource_id: event.resourceId ?? null,
    request_id: event.requestId ?? null,
    metadata: event.metadata ?? {},
  })
  if (error) throw error
}

export { agentKeyPrefix, hashAgentSecret }
