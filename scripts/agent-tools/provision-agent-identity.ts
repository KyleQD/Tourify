import { createClient } from "@supabase/supabase-js"
import { randomBytes } from "node:crypto"
import { resolve } from "node:path"
import { config } from "dotenv"

import {
  agentKeyPrefix,
  createAgentSecret,
  hashAgentSecret,
} from "../../lib/auth/agent-service-core"

function loadEnv() {
  const invocationEnv = { ...process.env }
  config({ path: resolve(process.cwd(), ".env") })
  config({ path: resolve(process.cwd(), ".env.local"), override: true })
  Object.assign(process.env, invocationEnv)
}

function arg(name: string): string | undefined {
  const index = process.argv.indexOf(name)
  return index >= 0 ? process.argv[index + 1] : undefined
}

function requiredEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing ${name}`)
  return value
}

async function main() {
  loadEnv()
  const slug = arg("--agent")
  if (!slug) throw new Error("Usage: npm run agents:identity:provision -- --agent <slug> [--email <email>] [--password <password>]")

  const supabase = createClient(
    requiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
  const db = supabase as any

  const { data: identity, error: identityError } = await db
    .from("agent_identities")
    .select("id, slug, display_name, agent_role, status, auth_user_id")
    .eq("slug", slug)
    .maybeSingle()

  if (identityError) {
    if (identityError.code === "42P01" || identityError.code === "PGRST205") {
      throw new Error(
        "Agent identity tables are not available. Apply supabase/migrations/20260908130000_agent_service_identities.sql in the target environment first.",
      )
    }
    throw identityError
  }
  if (!identity) throw new Error(`Unknown agent identity: ${slug}`)
  if (identity.status === "revoked") throw new Error(`Agent identity is revoked: ${slug}`)
  if (identity.auth_user_id) throw new Error(`Agent identity is already linked to auth user ${identity.auth_user_id}`)

  const emailDomain = process.env.AGENT_EMAIL_DOMAIN || "agents.tourify.internal"
  const email = arg("--email") || `${slug.replace(/[^a-z0-9-]/gi, "-")}@${emailDomain}`
  const password = arg("--password") || randomBytes(36).toString("base64url")
  const agentSecret = createAgentSecret()

  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      account_type: "service",
      full_name: identity.display_name,
      agent_slug: identity.slug,
    },
    app_metadata: {
      actor_type: "agent",
      agent_id: identity.id,
      agent_role: identity.agent_role,
    },
  })

  if (createError || !created.user) throw createError || new Error("Supabase did not return the created user")

  try {
    const { error: credentialError } = await db.from("agent_credentials").insert({
      agent_id: identity.id,
      key_prefix: agentKeyPrefix(agentSecret),
      secret_hash: hashAgentSecret(agentSecret),
      metadata: { issued_for: identity.slug },
    })
    if (credentialError) throw credentialError

    const { error: updateError } = await db
      .from("agent_identities")
      .update({ auth_user_id: created.user.id, status: "active" })
      .eq("id", identity.id)
    if (updateError) throw updateError
  } catch (error) {
    await supabase.auth.admin.deleteUser(created.user.id)
    throw error
  }

  console.log(JSON.stringify({
    agent: identity.slug,
    email,
    password,
    agentKey: agentSecret,
    warning: "Save these credentials in a secret manager. The agent key is not recoverable from Tourify.",
  }, null, 2))
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
