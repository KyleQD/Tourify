/**
 * Client-side central resolution door (PLAYBACK_RESOLVER_IMPLEMENTATION_PLAN
 * §8 Step B). Tracks keep their legacy request shapes; new kinds use the
 * discriminated request contract. All responses are private,no-store by the
 * API and never persisted by callers.
 */
import type { PlayableMediaKind } from "@/lib/playback/types"

export interface ResolveResult {
  url: string | null
  error?: string
}

function messageForStatus(status: number): string {
  switch (status) {
    case 400: return "Invalid playback request."
    case 401: return "Sign in to listen."
    case 403: return "This source is not enabled yet."
    case 404: return "Not available."
    case 410: return "No longer available."
    case 429: return "Too many requests — slow down."
    default: return "Unable to start playback."
  }
}

export async function resolveViaPlaybackApi(
  body: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<ResolveResult> {
  try {
    const res = await fetch("/api/music/playback/resolve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      signal,
      body: JSON.stringify(body),
    })
    if (res.ok) {
      const data = await res.json()
      const url = data?.data?.sourceUrl
      if (url) return { url }
      return { url: null, error: "Playback URL missing" }
    }
    const errorBody = await res.json().catch(() => ({}))
    return {
      url: null,
      error: errorBody?.error?.message || messageForStatus(res.status),
    }
  } catch (error) {
    if ((error as Error)?.name === "AbortError") return { url: null }
    return { url: null, error: "Unable to load stream" }
  }
}

export function kindOf(item: { mediaKind?: PlayableMediaKind }): PlayableMediaKind {
  return item.mediaKind ?? "track"
}
