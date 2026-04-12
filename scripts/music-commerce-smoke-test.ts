/**
 * Music commerce smoke test
 *
 * Usage:
 * BASE_URL=http://localhost:3000 AUTH_BEARER_TOKEN=... npx tsx scripts/music-commerce-smoke-test.ts
 * Optional:
 * TRACK_ID=<uuid> PLAYLIST_ID=<uuid> ORDER_ITEM_ID=<uuid>
 */

function getRequiredEnv(name: string) {
  const value = process.env[name]
  if (!value) throw new Error(`Missing required env: ${name}`)
  return value
}

async function apiFetch({
  baseUrl,
  token,
  path,
  method = "GET",
  body,
}: {
  baseUrl: string
  token: string
  path: string
  method?: "GET" | "POST"
  body?: Record<string, unknown>
}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const json = await response.json().catch(() => ({}))
  return { ok: response.ok, status: response.status, json }
}

async function run() {
  const baseUrl = getRequiredEnv("BASE_URL").replace(/\/$/, "")
  const token = getRequiredEnv("AUTH_BEARER_TOKEN")
  console.log("Running music commerce smoke test")
  console.log(`Base URL: ${baseUrl}`)

  const backfillPreview = await apiFetch({
    baseUrl,
    token,
    path: "/api/marketplace/migrations/backfill-artist-music",
  })
  console.log("[1/6] Artist music backfill preview:", backfillPreview.status, backfillPreview.ok ? "ok" : "failed")
  if (!backfillPreview.ok) {
    console.error(backfillPreview.json)
    process.exit(1)
  }

  const library = await apiFetch({
    baseUrl,
    token,
    path: "/api/music/library?limit=5",
  })
  console.log("[2/6] Music library read:", library.status, library.ok ? "ok" : "failed")
  if (!library.ok) {
    console.error(library.json)
    process.exit(1)
  }

  const playlists = await apiFetch({
    baseUrl,
    token,
    path: "/api/music/playlists?includeItems=true",
  })
  console.log("[3/6] Playlist read:", playlists.status, playlists.ok ? "ok" : "failed")
  if (!playlists.ok) {
    console.error(playlists.json)
    process.exit(1)
  }

  const createPlaylist = await apiFetch({
    baseUrl,
    token,
    path: "/api/music/playlists",
    method: "POST",
    body: {
      title: `Smoke Test ${Date.now()}`,
      description: "Music commerce smoke playlist",
      visibility: "private",
    },
  })
  console.log("[4/6] Playlist create:", createPlaylist.status, createPlaylist.ok ? "ok" : "failed")
  if (!createPlaylist.ok) {
    console.error(createPlaylist.json)
    process.exit(1)
  }

  const trackId = process.env.TRACK_ID
  if (trackId) {
    const shareTrack = await apiFetch({
      baseUrl,
      token,
      path: "/api/music/share",
      method: "POST",
      body: {
        musicId: trackId,
        createPost: false,
      },
    })
    console.log("[5/6] Share track payload:", shareTrack.status, shareTrack.ok ? "ok" : "failed")
    if (!shareTrack.ok) {
      console.error(shareTrack.json)
      process.exit(1)
    }
  } else {
    console.log("[5/6] Share track payload skipped (set TRACK_ID)")
  }

  const orderItemId = process.env.ORDER_ITEM_ID
  if (orderItemId) {
    const delivery = await apiFetch({
      baseUrl,
      token,
      path: `/api/marketplace/delivery/${orderItemId}`,
    })
    console.log("[6/6] Entitlement delivery:", delivery.status, delivery.ok ? "ok" : "failed")
    if (!delivery.ok) {
      console.error(delivery.json)
      process.exit(1)
    }
  } else {
    console.log("[6/6] Entitlement delivery skipped (set ORDER_ITEM_ID)")
  }

  console.log("Music commerce smoke test completed successfully.")
}

run().catch(error => {
  console.error("Music commerce smoke test failed:", error)
  process.exit(1)
})

export {}
