import { execFile } from "node:child_process"
import { promisify } from "node:util"
import { randomUUID } from "node:crypto"
import { createClient } from "@supabase/supabase-js"

const execFileAsync = promisify(execFile)

type Check = {
  name: string
  status: "pass" | "fail" | "skip"
  detail?: string
}

function env(name: string, fallback?: string) {
  return process.env[name] || fallback
}

function requiredEnv(name: string, fallback?: string) {
  const value = env(name, fallback)
  if (!value) throw new Error(`Missing required env: ${name}`)
  return value
}

function client(key: string) {
  return createClient(requiredEnv("SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL), key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

async function sql(databaseUrl: string, query: string) {
  const { stdout } = await execFileAsync("psql", [databaseUrl, "-tAc", query], {
    env: { ...process.env, PGPASSWORD: process.env.PGPASSWORD || "" },
  })
  return stdout.trim()
}

async function apiFetch(path: string, token?: string, method = "GET", body?: unknown) {
  const baseUrl = env("BASE_URL")?.replace(/\/$/, "")
  if (!baseUrl) throw new Error("BASE_URL is not set")
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const json = await response.json().catch(() => ({}))
  return { ok: response.ok, status: response.status, json }
}

async function run() {
  const checks: Check[] = []
  const service = client(requiredEnv("SUPABASE_SERVICE_ROLE_KEY"))
  const databaseUrl = env("STAGING_DATABASE_URL") || env("DATABASE_URL")
  const anonKey = env("NEXT_PUBLIC_SUPABASE_ANON_KEY") || env("SUPABASE_ANON_KEY")
  const bearer = env("AUTH_BEARER_TOKEN")

  try {
    const { data, error } = await service
      .schema("storage")
      .from("buckets")
      .select("id, public")
      .eq("id", "artist-music")
      .maybeSingle()
    if (error) throw error
    checks.push({
      name: "artist-music bucket is private",
      status: data && data.public === false ? "pass" : "fail",
      detail: data ? `public=${data.public}` : "bucket missing",
    })
  } catch (error) {
    checks.push({ name: "artist-music bucket is private", status: "fail", detail: String(error) })
  }

  if (databaseUrl) {
    try {
      const reloptions = await sql(
        databaseUrl,
        "select coalesce(array_to_string(c.reloptions, ','), '') from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relname = 'music_tracks';",
      )
      checks.push({
        name: "music_tracks view uses security_invoker",
        status: reloptions.includes("security_invoker=true") ? "pass" : "fail",
        detail: reloptions || "no reloptions",
      })
    } catch (error) {
      checks.push({ name: "music_tracks view uses security_invoker", status: "fail", detail: String(error) })
    }

    try {
      const rawColumns = await sql(
        databaseUrl,
        "select count(*) from information_schema.columns where table_schema = 'public' and table_name = 'music_tracks' and column_name in ('file_url', 'preview_file_url');",
      )
      checks.push({
        name: "music_tracks view does not expose raw audio columns",
        status: Number(rawColumns) === 0 ? "pass" : "fail",
        detail: `${rawColumns} raw URL columns`,
      })
    } catch (error) {
      checks.push({ name: "music_tracks view raw column check", status: "fail", detail: String(error) })
    }

    try {
      const insertPolicies = await sql(
        databaseUrl,
        "select count(*) from pg_policies where schemaname = 'public' and tablename in ('music_plays', 'music_engagement_events') and cmd = 'INSERT' and (roles::text like '%anon%' or roles::text like '%authenticated%');",
      )
      checks.push({
        name: "browser analytics insert policies are closed",
        status: Number(insertPolicies) === 0 ? "pass" : "fail",
        detail: `${insertPolicies} browser insert policies`,
      })
    } catch (error) {
      checks.push({ name: "analytics policy catalog check", status: "fail", detail: String(error) })
    }
  } else {
    checks.push({
      name: "database catalog checks",
      status: "skip",
      detail: "Set STAGING_DATABASE_URL or DATABASE_URL to verify view options and policies.",
    })
  }

  try {
    const { error } = await service.from("music_tracks").select("id, title, stream_url").limit(1)
    checks.push({
      name: "music_tracks public shape is queryable",
      status: error ? "fail" : "pass",
      detail: error?.message,
    })
  } catch (error) {
    checks.push({ name: "music_tracks public shape is queryable", status: "fail", detail: String(error) })
  }

  if (anonKey) {
    const anon = client(anonKey)
    const { error } = await anon.from("music_engagement_events").insert({
      music_id: randomUUID(),
      artist_user_id: randomUUID(),
      actor_user_id: randomUUID(),
      event_type: "play_started",
      access_level: "preview",
      source: "staging_smoke_anon_insert",
    })
    checks.push({
      name: "anon analytics insert is denied",
      status: error ? "pass" : "fail",
      detail: error ? error.message : "anonymous insert unexpectedly succeeded",
    })
  } else {
    checks.push({
      name: "anon analytics insert is denied",
      status: "skip",
      detail: "Set NEXT_PUBLIC_SUPABASE_ANON_KEY or SUPABASE_ANON_KEY.",
    })
  }

  if (env("BASE_URL") && bearer && env("TRACK_ID")) {
    const stream = await apiFetch(`/api/music/stream?trackId=${encodeURIComponent(env("TRACK_ID")!)}`, bearer)
    checks.push({
      name: "stream endpoint returns signed stream contract",
      status: stream.ok && typeof stream.json?.url === "string" && !stream.json.url.includes("/storage/v1/object/public/") ? "pass" : "fail",
      detail: `status=${stream.status} accessLevel=${stream.json?.accessLevel || "n/a"}`,
    })
  } else {
    checks.push({
      name: "stream endpoint returns signed stream contract",
      status: "skip",
      detail: "Set BASE_URL, AUTH_BEARER_TOKEN, and TRACK_ID.",
    })
  }

  if (env("BASE_URL") && bearer && env("FREE_TRACK_ID")) {
    const library = await apiFetch("/api/music/library", bearer, "POST", { musicId: env("FREE_TRACK_ID") })
    checks.push({
      name: "free track save creates library entitlement",
      status: library.ok || library.status === 409 ? "pass" : "fail",
      detail: `status=${library.status}`,
    })
  } else {
    checks.push({
      name: "free track save creates library entitlement",
      status: "skip",
      detail: "Set BASE_URL, AUTH_BEARER_TOKEN, and FREE_TRACK_ID.",
    })
  }

  if (env("BASE_URL") && bearer && env("FEATURE_TRACK_ID")) {
    const feature = await apiFetch("/api/music/profile-featured-track", bearer, "PATCH", {
      musicId: env("FEATURE_TRACK_ID"),
    })
    checks.push({
      name: "profile featured track can be set by musicId",
      status: feature.ok ? "pass" : "fail",
      detail: `status=${feature.status}`,
    })
  } else {
    checks.push({
      name: "profile featured track can be set by musicId",
      status: "skip",
      detail: "Set BASE_URL, AUTH_BEARER_TOKEN, and FEATURE_TRACK_ID.",
    })
  }

  if (env("BASE_URL") && bearer && env("ADMIN_MUSIC_ID")) {
    const hide = await apiFetch(`/api/admin/content/${env("ADMIN_MUSIC_ID")}`, bearer, "PATCH", {
      table: "artist_music",
      moderation_status: "flagged",
      is_visible: false,
    })
    checks.push({
      name: "admin moderation action updates track visibility",
      status: hide.ok ? "pass" : "fail",
      detail: `status=${hide.status}`,
    })
  } else {
    checks.push({
      name: "admin moderation action updates track visibility",
      status: "skip",
      detail: "Set BASE_URL, AUTH_BEARER_TOKEN, and ADMIN_MUSIC_ID.",
    })
  }

  for (const check of checks) {
    const symbol = check.status === "pass" ? "PASS" : check.status === "skip" ? "SKIP" : "FAIL"
    console.log(`[${symbol}] ${check.name}${check.detail ? ` - ${check.detail}` : ""}`)
  }

  if (checks.some((check) => check.status === "fail")) process.exit(1)
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})
