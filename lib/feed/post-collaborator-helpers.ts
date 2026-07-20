/**
 * Pure helpers for feed post tags and collaborators (safe for client + tests).
 */

function uniqueUuids(values: unknown[]): string[] {
  const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return Array.from(
    new Set(
      (Array.isArray(values) ? values : [])
        .map((value) => String(value || '').trim())
        .filter((value) => uuidRe.test(value))
    )
  )
}

export function normalizeTaggedUserIds(raw: unknown, excludeUserId?: string): string[] {
  return uniqueUuids(Array.isArray(raw) ? raw : []).filter((id) => id !== excludeUserId)
}

export function normalizeCollaboratorInvites(
  raw: unknown,
  excludeUserId?: string
): Array<{ userId: string; profileId?: string | null }> {
  if (!Array.isArray(raw)) return []

  const invites: Array<{ userId: string; profileId?: string | null }> = []
  const seen = new Set<string>()

  for (const item of raw) {
    if (typeof item === 'string') {
      const userId = uniqueUuids([item])[0]
      if (!userId || userId === excludeUserId || seen.has(userId)) continue
      seen.add(userId)
      invites.push({ userId, profileId: null })
      continue
    }

    if (item && typeof item === 'object') {
      const record = item as Record<string, unknown>
      const userId = uniqueUuids([record.userId || record.user_id || record.id])[0]
      if (!userId || userId === excludeUserId || seen.has(userId)) continue
      const profileIdRaw = record.profileId || record.profile_id || null
      const profileId = profileIdRaw ? uniqueUuids([profileIdRaw])[0] || null : null
      seen.add(userId)
      invites.push({ userId, profileId })
    }
  }

  return invites
}
