export interface TrackSocialStatus {
  liked: boolean
  inLibrary: boolean
}

type Listener = (status: TrackSocialStatus) => void

const cache = new Map<string, TrackSocialStatus>()
const listeners = new Map<string, Set<Listener>>()
const inflight = new Map<string, Promise<TrackSocialStatus>>()
let batchTimer: ReturnType<typeof setTimeout> | null = null
const pendingIds = new Set<string>()

function notify(id: string, status: TrackSocialStatus) {
  cache.set(id, status)
  const set = listeners.get(id)
  if (!set) return
  for (const listener of set) listener(status)
}

export function getCachedSocialStatus(
  musicId: string
): TrackSocialStatus | undefined {
  return cache.get(musicId)
}

export function setCachedSocialStatus(
  musicId: string,
  status: Partial<TrackSocialStatus>
) {
  const prev = cache.get(musicId) || { liked: false, inLibrary: false }
  const next = { ...prev, ...status }
  notify(musicId, next)
}

export function subscribeSocialStatus(
  musicId: string,
  listener: Listener
): () => void {
  let set = listeners.get(musicId)
  if (!set) {
    set = new Set()
    listeners.set(musicId, set)
  }
  set.add(listener)
  const cached = cache.get(musicId)
  if (cached) listener(cached)
  return () => {
    set?.delete(listener)
    if (set && set.size === 0) listeners.delete(musicId)
  }
}

async function flushBatch() {
  batchTimer = null
  const ids = Array.from(pendingIds)
  pendingIds.clear()
  if (ids.length === 0) return

  const missing = ids.filter((id) => !cache.has(id) && !inflight.has(id))
  if (missing.length === 0) return

  const request = fetch("/api/music/social-status", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ musicIds: missing }),
  })
    .then(async (res) => {
      if (!res.ok) {
        for (const id of missing) {
          const fallback = cache.get(id) || { liked: false, inLibrary: false }
          notify(id, fallback)
        }
        return
      }
      const json = await res.json()
      const data = (json.data || {}) as Record<string, TrackSocialStatus>
      for (const id of missing) {
        notify(id, data[id] || { liked: false, inLibrary: false })
      }
    })
    .catch(() => {
      for (const id of missing) {
        notify(id, cache.get(id) || { liked: false, inLibrary: false })
      }
    })
    .finally(() => {
      for (const id of missing) inflight.delete(id)
    })

  for (const id of missing) inflight.set(id, request.then(() => cache.get(id)!))
  await request
}

export function prefetchSocialStatus(musicIds: string[]) {
  for (const id of musicIds) {
    if (!id || cache.has(id) || inflight.has(id)) continue
    pendingIds.add(id)
  }
  if (pendingIds.size === 0) return
  if (batchTimer) return
  batchTimer = setTimeout(() => {
    void flushBatch()
  }, 16)
}

export async function ensureSocialStatus(
  musicId: string
): Promise<TrackSocialStatus> {
  const cached = cache.get(musicId)
  if (cached) return cached

  const existing = inflight.get(musicId)
  if (existing) return existing

  prefetchSocialStatus([musicId])
  await flushBatch()
  return cache.get(musicId) || { liked: false, inLibrary: false }
}
