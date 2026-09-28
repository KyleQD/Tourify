import type { PostAppearanceDTO } from "@/lib/appearance/contracts"
import { getTemplateById } from "@/lib/appearance/template-registry"
import { trackAppearanceEvent } from "@/lib/appearance/telemetry"

export interface RawPostAppearanceRow {
  template_id?: string | null
  template_version?: number | null
  schema_version?: number | null
  snapshot?: unknown
  snapshot_hash?: string | null
  status?: string | null
}

/**
 * Single canonical decoder for post appearance data across all feed surfaces.
 * Returns "standard" mode when no appearance exists or validation fails.
 *
 * Handles both Supabase LEFT JOIN shapes:
 *   - Array:  post_appearances: [{ template_id, snapshot, ... }]  (typical join result)
 *   - Object: post_appearances: { template_id, snapshot, ... }    (some query paths)
 *   - null / undefined                                             (no appearance row)
 */
export function resolvePostAppearanceDTO(
  raw: RawPostAppearanceRow | RawPostAppearanceRow[] | null | undefined,
  postId?: string,
): PostAppearanceDTO {
  // Normalise: unwrap array — Supabase LEFT JOIN always returns [] or [row]
  const rawRow: RawPostAppearanceRow | null = Array.isArray(raw)
    ? (raw[0] ?? null)
    : (raw ?? null)

  if (!rawRow || !rawRow.template_id) {
    return { mode: "standard" }
  }

  if (rawRow.status === "neutralized") {
    trackAppearanceEvent({
      type: "renderer_fallback",
      reason: "disabled_template",
      surface: "feed",
    })
    return { mode: "standard", fallbackReason: "disabled_template" }
  }

  const template = getTemplateById(rawRow.template_id)
  if (!template) {
    trackAppearanceEvent({
      type: "renderer_fallback",
      reason: "unknown_template",
      templateId: rawRow.template_id,
      surface: "feed",
    })
    return { mode: "standard", fallbackReason: "unknown_template" }
  }

  if (template.lifecycle !== "active") {
    // Retired templates still render for historical posts
    // (per spec §PR-11) — don't fall back for retired, only disabled
  }

  const snapshot =
    rawRow.snapshot && typeof rawRow.snapshot === "object"
      ? rawRow.snapshot as Record<string, unknown>
      : null
  const snapshotVersion = snapshot?.schemaVersion
  if (
    !snapshot ||
    (rawRow.schema_version !== 1 && rawRow.schema_version !== 2 && rawRow.schema_version !== 3) ||
    snapshotVersion !== rawRow.schema_version ||
    ((rawRow.schema_version === 2 || rawRow.schema_version === 3) && (!snapshot.tokens || !snapshot.legacyTokens)) ||
    (rawRow.schema_version === 3 && !snapshot.configuration)
  ) {
    trackAppearanceEvent({
      type: "renderer_fallback",
      reason: "invalid_schema",
      templateId: rawRow.template_id,
      surface: "feed",
    })
    return { mode: "standard", fallbackReason: "invalid_schema" }
  }

  return {
    mode: "styled",
    templateId: rawRow.template_id,
    templateVersion: rawRow.template_version ?? 1,
    schemaVersion: (rawRow.schema_version ?? 1) as 1 | 2 | 3,
    snapshot: rawRow.snapshot as any,
    snapshotHash: rawRow.snapshot_hash ?? undefined,
  }
}
