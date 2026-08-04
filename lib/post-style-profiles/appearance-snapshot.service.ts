import { sanitizeForPost, sanitizePostStyleConfiguration } from "@/lib/appearance/sanitize"
import { getTemplateById } from "@/lib/appearance/template-registry"
import type {
  PostAppearanceInput,
  PostAppearanceSnapshotV2,
  PostAppearanceSnapshotV3,
} from "@/lib/appearance/contracts"
import type { EpkAppearance } from "@/lib/epk/epk-appearance"
import {
  createPostAppearanceSnapshotV2,
  createPostAppearanceSnapshotV3,
} from "@/lib/post-appearance/resolve"

export class AppearanceValidationError extends Error {
  constructor(
    message: string,
    public readonly reason: string,
  ) {
    super(message)
    this.name = "AppearanceValidationError"
  }
}

/**
 * Resolve a PostAppearanceInput into a sanitized, immutable V2/V3 snapshot.
 *
 * @param input         - The appearance input from the client
 * @param supabase      - Supabase client (needed for profile mode to load profile)
 * @param actingUserId  - The authenticated user id (for authorization)
 * @returns A sanitized snapshot ready to store in post_appearances.snapshot
 */
export async function resolveAppearanceSnapshot(
  input: PostAppearanceInput,
  supabase: any,
  actingUserId: string,
  actingOwner?: { type: string; id: string },
): Promise<PostAppearanceSnapshotV2 | PostAppearanceSnapshotV3> {
  if (input.mode === "standard") {
    throw new AppearanceValidationError(
      "Standard mode has no snapshot",
      "missing_snapshot",
    )
  }

  let templateId: string
  let rawConfiguration: unknown
  let templateVersion = 1
  let profileSchemaVersion: number | null = null

  if (input.mode === "profile") {
    const { data: profile, error } = await supabase
      .from("post_style_profiles")
      .select("template_id, template_version, schema_version, configuration, status, created_by, owner_type, owner_id, updated_at")
      .eq("id", input.profileId)
      .single()

    if (error || !profile) {
      throw new AppearanceValidationError(
        "Style profile not found",
        "invalid_schema",
      )
    }
    if (profile.created_by !== actingUserId) {
      throw new AppearanceValidationError(
        "Not authorized to use this style profile",
        "entitlement_mismatch",
      )
    }
    if (
      actingOwner &&
      (profile.owner_type !== actingOwner.type || profile.owner_id !== actingOwner.id)
    ) {
      throw new AppearanceValidationError(
        "This style belongs to a different posting account",
        "entitlement_mismatch",
      )
    }
    if (profile.status === "archived") {
      throw new AppearanceValidationError(
        "Style profile is archived",
        "disabled_template",
      )
    }
    if (
      input.expectedProfileVersion &&
      profile.updated_at &&
      input.expectedProfileVersion !== profile.updated_at
    ) {
      throw new AppearanceValidationError(
        "This saved style changed after the composer loaded it",
        "stale_profile",
      )
    }

    templateId = profile.template_id
    templateVersion = profile.template_version ?? 1
    profileSchemaVersion = profile.schema_version ?? null
    rawConfiguration = input.overrides
      ? { ...(profile.configuration as object), ...input.overrides }
      : profile.configuration
  } else {
    // Custom mode
    templateId = input.templateId
    templateVersion = input.templateVersion
    rawConfiguration = input.configuration
  }

  const template = getTemplateById(templateId)
  if (!template) {
    throw new AppearanceValidationError(
      `Unknown template: ${templateId}`,
      "unknown_template",
    )
  }
  if (template.lifecycle !== "active") {
    throw new AppearanceValidationError(
      `Template ${templateId} is ${template.lifecycle}`,
      "disabled_template",
    )
  }

  if (template.premiere) {
    const requestedSchemaVersion = input.mode === "custom"
      ? input.schemaVersion
      : profileSchemaVersion
    if (requestedSchemaVersion !== 3 || templateVersion !== template.version) {
      throw new AppearanceValidationError(
        "Premiere style version is not supported",
        "invalid_schema",
      )
    }
    const configuration = sanitizePostStyleConfiguration(rawConfiguration, templateId)
    return createPostAppearanceSnapshotV3(templateId, configuration, templateVersion)
  }

  const sanitizedTokens: EpkAppearance = sanitizeForPost(rawConfiguration, templateId)
  return createPostAppearanceSnapshotV2(templateId, sanitizedTokens, templateVersion)
}

/**
 * Compute a stable string hash for a snapshot (for cache keying).
 * Not cryptographically strong — for cache invalidation only.
 */
export function computeSnapshotHash(snapshot: PostAppearanceSnapshotV2 | PostAppearanceSnapshotV3): string {
  const { compiledAt: _compiledAt, ...stableSnapshot } = snapshot
  const str = JSON.stringify(stableSnapshot)
  let hash = 2166136261
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(16)
}
