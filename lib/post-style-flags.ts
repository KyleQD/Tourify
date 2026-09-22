export const POST_STYLE_FLAG_NAMES = [
  "post_styles_read",
  "post_styles_write",
  "post_styles_editor",
  "post_styles_all_templates",
] as const

export type PostStyleFlagName = (typeof POST_STYLE_FLAG_NAMES)[number]
export type PostStyleFlags = Record<PostStyleFlagName, boolean>

export const DISABLED_POST_STYLE_FLAGS: PostStyleFlags = Object.fromEntries(
  POST_STYLE_FLAG_NAMES.map((name) => [name, false]),
) as PostStyleFlags

export function stableRolloutBucket(subject: string, flag: string): number {
  let hash = 2166136261
  for (const character of `${flag}:${subject}`) {
    hash ^= character.charCodeAt(0)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0) % 100
}

export async function resolvePostStyleFlags(
  supabase: any,
  subjectId?: string | null,
): Promise<PostStyleFlags> {
  const { data, error } = await supabase
    .from("feature_flags")
    .select("key, enabled, rollout_percentage")
    .in("key", [...POST_STYLE_FLAG_NAMES])

  if (error || !data) return { ...DISABLED_POST_STYLE_FLAGS }
  const result = { ...DISABLED_POST_STYLE_FLAGS }
  for (const row of data as Array<{
    key: PostStyleFlagName
    enabled: boolean
    rollout_percentage: number
  }>) {
    if (!POST_STYLE_FLAG_NAMES.includes(row.key)) continue
    const percentage = Math.min(100, Math.max(0, row.rollout_percentage || 0))
    result[row.key] =
      row.enabled &&
      (percentage === 100 ||
        Boolean(subjectId && stableRolloutBucket(subjectId, row.key) < percentage))
  }
  return result
}
