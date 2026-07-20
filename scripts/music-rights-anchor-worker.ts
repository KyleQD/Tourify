/**
 * Process outbox music.rights.anchor.requested events.
 * Marks anchors pending/confirmed/failed without invalidating off-chain passports.
 * Testnet stub only — no real mainnet transactions.
 */
import { randomUUID } from "node:crypto"
import { createClient } from "@supabase/supabase-js"
import {
  MUSIC_RIGHTS_ANCHOR_EVENT,
  doesAnchorFailureInvalidatePassport,
  mapAnchorWorkerStatus,
  resolveAnchorNetwork,
  type AnchorOutboxPayload,
} from "../lib/music-rights/blockchain-anchor"

const BATCH_SIZE = Number(process.env.MUSIC_RIGHTS_ANCHOR_BATCH || 20)
const MAX_ATTEMPTS = 8

type OutboxRow = {
  id: string
  project_id: string | null
  event_type: string
  dedupe_key: string
  payload: AnchorOutboxPayload
  status: string
  attempts: number
}

function requiredEnv(name: string, fallback?: string) {
  const value = process.env[name] || fallback
  if (!value) throw new Error(`Missing required env: ${name}`)
  return value
}

function createWorkerClient() {
  return createClient(
    requiredEnv("SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL),
    requiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}

function canSubmitToChain() {
  const network = resolveAnchorNetwork()
  if (network === "mainnet_disabled") return { ok: false as const, reason: "mainnet_disabled" }
  const rpc = process.env.MUSIC_RIGHTS_SEPOLIA_RPC_URL
  const key = process.env.MUSIC_RIGHTS_ANCHOR_SIGNER_KEY
  if (!rpc || !key) return { ok: false as const, reason: "sepolia_credentials_absent" }
  // Stub: credentials present but we still do not broadcast from this worker yet.
  return { ok: true as const, network, mode: "stub_confirm" as const }
}

async function claimOutbox(supabase: ReturnType<typeof createWorkerClient>, workerId: string) {
  const { data: candidates, error } = await supabase
    .from("music_rights_outbox_events")
    .select("*")
    .eq("event_type", MUSIC_RIGHTS_ANCHOR_EVENT)
    .in("status", ["pending", "failed"])
    .or(`next_retry_at.is.null,next_retry_at.lte.${new Date().toISOString()}`)
    .lt("attempts", MAX_ATTEMPTS)
    .order("created_at", { ascending: true })
    .limit(BATCH_SIZE)
  if (error) throw error

  const claimed: OutboxRow[] = []
  for (const candidate of candidates || []) {
    const attempts = Number(candidate.attempts || 0) + 1
    const { data } = await supabase
      .from("music_rights_outbox_events")
      .update({
        status: "processing",
        attempts,
        locked_at: new Date().toISOString(),
        locked_by: workerId,
        last_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", candidate.id)
      .in("status", ["pending", "failed"])
      .select("*")
      .maybeSingle()
    if (data) claimed.push(data as OutboxRow)
  }
  return claimed
}

async function processAnchor(
  supabase: ReturnType<typeof createWorkerClient>,
  event: OutboxRow,
) {
  const payload = event.payload
  const submit = canSubmitToChain()
  const now = new Date().toISOString()

  const baseAnchor = {
    project_id: payload.projectId || event.project_id,
    passport_id: payload.passportId || null,
    passport_version_id: payload.passportVersionId || null,
    network: payload.network || resolveAnchorNetwork(),
    passport_public_id_hash: payload.passportPublicIdHash,
    passport_version: payload.passportVersion,
    public_manifest_hash: payload.publicManifestHash,
    private_manifest_commitment: payload.privateManifestCommitment,
    credential_hash: payload.credentialHash,
    schema_version: payload.schemaVersion,
    issuer: payload.issuer,
    issued_at: payload.issuedAt,
    on_chain_status: payload.status,
    superseded_by_version: payload.supersededByVersion,
    reason_hash: payload.reasonHash,
    outbox_event_id: event.id,
    dedupe_key: payload.dedupeKey || event.dedupe_key,
    updated_at: now,
  }

  if (!submit.ok) {
    const status = mapAnchorWorkerStatus({ submitted: false, confirmed: false, failed: true })
    await supabase.from("music_rights_blockchain_anchors").upsert({
      ...baseAnchor,
      status,
      error_code: submit.reason,
      error_message: submit.reason === "sepolia_credentials_absent"
        ? "Sepolia RPC/signer keys absent; anchor left failed without invalidating passport."
        : "Mainnet anchoring disabled.",
    }, { onConflict: "network,dedupe_key" })

    await supabase.from("music_rights_outbox_events").update({
      status: "failed",
      last_error: submit.reason,
      next_retry_at: new Date(Date.now() + 5 * 60_000).toISOString(),
      locked_at: null,
      locked_by: null,
      updated_at: now,
    }).eq("id", event.id)

    // Explicit invariant for ops: passport remains valid off-chain.
    void doesAnchorFailureInvalidatePassport()
    return { status, reason: submit.reason }
  }

  // Stub confirmation path when credentials exist (no real broadcast in Phase 2 worker).
  const pendingStatus = mapAnchorWorkerStatus({ submitted: true, confirmed: false, failed: false })
  await supabase.from("music_rights_blockchain_anchors").upsert({
    ...baseAnchor,
    status: pendingStatus,
    tx_hash: `stub-pending-${event.id}`,
    confirmations: 0,
    error_code: null,
    error_message: null,
  }, { onConflict: "network,dedupe_key" })

  const confirmedStatus = mapAnchorWorkerStatus({ submitted: true, confirmed: true, failed: false })
  await supabase.from("music_rights_blockchain_anchors").update({
    status: confirmedStatus,
    tx_hash: `stub-confirmed-${event.id}`,
    confirmations: 1,
    block_number: 0,
    updated_at: new Date().toISOString(),
  }).eq("network", baseAnchor.network).eq("dedupe_key", baseAnchor.dedupe_key)

  await supabase.from("music_rights_outbox_events").update({
    status: "completed",
    locked_at: null,
    locked_by: null,
    updated_at: new Date().toISOString(),
  }).eq("id", event.id)

  await supabase.from("music_rights_outbox_events").upsert({
    project_id: event.project_id,
    event_type: "music.rights.anchor.confirmed",
    dedupe_key: `${event.dedupe_key}:confirmed`,
    payload: { outboxEventId: event.id, status: confirmedStatus, stub: true },
    status: "pending",
    updated_at: new Date().toISOString(),
  }, { onConflict: "event_type,dedupe_key" })

  return { status: confirmedStatus, reason: null }
}

async function main() {
  const workerId = `anchor-worker:${randomUUID()}`
  const supabase = createWorkerClient()
  const claimed = await claimOutbox(supabase, workerId)
  const results = []
  for (const event of claimed) {
    try {
      results.push({ id: event.id, ...(await processAnchor(supabase, event)) })
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown_error"
      await supabase.from("music_rights_outbox_events").update({
        status: "failed",
        last_error: message.slice(0, 500),
        next_retry_at: new Date(Date.now() + 60_000).toISOString(),
        locked_at: null,
        locked_by: null,
        updated_at: new Date().toISOString(),
      }).eq("id", event.id)
      results.push({ id: event.id, status: "failed", reason: message })
    }
  }
  console.log(JSON.stringify({
    workerId,
    processed: claimed.length,
    passportInvalidatedOnFailure: doesAnchorFailureInvalidatePassport(),
    results,
  }))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
