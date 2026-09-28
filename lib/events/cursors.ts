/**
 * lib/events/cursors.ts
 *
 * Opaque, stable cursors for discovery pagination. Cursor encodes the
 * ordering tuple of the last returned row so pagination is immune to
 * concurrent inserts (unlike offset).
 */

export interface NearbyCursor {
  kind: "nearby"
  distanceMeters: number
  startAt: string | null
  eventId: string
}

export interface UpcomingCursor {
  kind: "upcoming"
  startAt: string | null
  eventId: string
}

export type DiscoveryCursor = NearbyCursor | UpcomingCursor

export function encodeCursor(cursor: DiscoveryCursor): string {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url")
}

export function decodeCursor(raw: string | null | undefined): DiscoveryCursor | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(Buffer.from(raw, "base64url").toString("utf8"))
    if (parsed && parsed.kind === "nearby" && typeof parsed.distanceMeters === "number" && typeof parsed.eventId === "string") {
      return {
        kind: "nearby",
        distanceMeters: parsed.distanceMeters,
        startAt: typeof parsed.startAt === "string" ? parsed.startAt : null,
        eventId: parsed.eventId,
      }
    }
    if (parsed && parsed.kind === "upcoming" && typeof parsed.eventId === "string") {
      return {
        kind: "upcoming",
        startAt: typeof parsed.startAt === "string" ? parsed.startAt : null,
        eventId: parsed.eventId,
      }
    }
    return null
  } catch {
    return null
  }
}
