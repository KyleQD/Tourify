/**
 * P21-T01/T02 — followable World objects.
 *
 * Follows are typed references so existing social infrastructure can store
 * them without schema forks. Only the frozen kinds below are followable;
 * unknown kinds fail closed.
 */

export const FOLLOWABLE_KINDS = ["place", "country", "scene", "genre", "journey"] as const
export type FollowableKind = (typeof FOLLOWABLE_KINDS)[number]

export interface WorldFollowRef {
  kind: FollowableKind
  /** Canonical path/slug for the object (e.g. "us/mi/detroit", "birth-of-techno"). */
  key: string
}

export function isFollowableKind(value: string): value is FollowableKind {
  return (FOLLOWABLE_KINDS as readonly string[]).includes(value)
}

/** Validate + normalize a follow request. Deterministic; idempotent by pair. */
export function validateFollow(kind: string, key: string): WorldFollowRef | null {
  if (!isFollowableKind(kind)) return null
  const trimmed = key?.trim()
  if (!trimmed || trimmed.length > 160 || trimmed.includes("://")) return null
  return { kind, key: trimmed }
}

/** Stable identity for storage/dedupe (same pair ⇒ same id). */
export function followId(userId: string, ref: WorldFollowRef): string {
  return `${userId}|${ref.kind}|${ref.key}`
}
