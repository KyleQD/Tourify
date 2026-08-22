/**
 * Console data helpers.
 *
 * The curated `Database` type module predates World tables, so console pages
 * use explicitly-annotated structural clients here instead of weakening the
 * shared types. Private staging reads flow through the privileged server
 * client exactly like the playback resolver; the browser never receives raw
 * ingestion payloads.
 */
import { createHash } from "node:crypto"

import { getTrustedMusicWriteClient } from "@/lib/music/music-access"
import { createClient } from "@/lib/supabase/server"

export interface ConsoleCandidateRow {
  id: string
  entity_kind: string
  external_record_id: string
  normalized_payload: Record<string, unknown>
  match_status: string
  review_status: string
  confidence: number | null
  updated_at: string
  source: { source_key: string } | null
}

export interface ConsoleStationRow {
  id: string
  name: string
  directory_provider: string | null
  directory_external_id: string | null
  languages: string[] | null
  tags: string[] | null
  rights_status: string
  playback_status: string
  review_status: string
  publication_status: string
  metadata: Record<string, unknown> | null
  last_metadata_check_at: string | null
}

export interface ConsoleRunRow {
  adapter_key: string
  status: string
  request_count: number | null
  records_received: number | null
  candidates_created: number | null
  error_count: number | null
}

/** Structural subset used by console pages (runtime client satisfies it). */
export interface TrustedConsoleClient {
  from(table: string): any
}

export async function getConsoleContext(): Promise<{
  trusted: TrustedConsoleClient
}> {
  const supabase = await createClient()
  const trusted = (await getTrustedMusicWriteClient(supabase)) as unknown as TrustedConsoleClient
  return { trusted }
}

/** Session-scoped platform permission check (never service role). */
export async function hasWorldPermission(
  permission: string,
): Promise<boolean> {
  const supabase = await createClient()
  const { data } = await (supabase as unknown as {
    rpc: (
      fn: string,
      args: Record<string, unknown>,
    ) => Promise<{ data: boolean | null }>
  }).rpc("has_global_permission", { p_permission_name: permission })
  return data === true
}

/** Stable short id for list keys when only composite identity exists. */
export function stableKey(...parts: (string | number)[]): string {
  return createHash("sha1").update(parts.join("|")).digest("hex").slice(0, 16)
}

void (async () => {}) // keep tree-shaking honest about async-only exports
