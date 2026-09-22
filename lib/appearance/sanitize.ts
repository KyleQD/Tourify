import {
  normalizeEpkAppearance,
  type EpkAppearance,
} from "@/lib/epk/epk-appearance";
import { ensurePostContrast } from "@/lib/post-appearance/contrast";
import { getDefaultPostAppearance } from "@/lib/post-appearance/template-registry";
import { getTemplateById } from "@/lib/post-appearance/template-registry";
import { EPK_FONT_IDS, type EpkFontId } from "@/lib/epk/epk-preview-utils";
import type { PostStyleConfigurationV3 } from "@/lib/post-appearance/contracts";
import { isPostTextureId } from "@/lib/post-appearance/texture-skins";

// Fields that are EPK page-layout-only, not safe for post cards
export const POST_UNSAFE_FIELDS = new Set<keyof EpkAppearance>([
  "pageBackgroundHex",
  "contentWidth",
  "coverHeight",
  "coverOverlay",
]);

/**
 * Sanitize an EpkAppearance for use in a post card snapshot.
 * Wraps normalizeEpkAppearance then nulls/defaults the page-layout-only fields.
 */
export function sanitizeForPost(
  raw: unknown,
  templateId?: string,
): EpkAppearance {
  const normalized = normalizeEpkAppearance(raw, templateId);
  const safe: EpkAppearance = {
    ...normalized,
    pageBackgroundHex: null,
    contentWidth: "default", // ignored at render; used as a safe default
    coverHeight: "medium", // ignored at render; used as a safe default
    coverOverlay: "medium", // ignored at render; used as a safe default
  };
  const defaults = getDefaultPostAppearance(templateId ?? "modern");
  const background =
    safe.cardBackgroundHex ?? defaults.cardBackgroundHex ?? "#101323";
  return ensurePostContrast(safe, background).appearance;
}

function clampNumber(
  raw: unknown,
  fallback: number,
  min: number,
  max: number,
): number {
  if (typeof raw !== "number" || !Number.isFinite(raw)) return fallback;
  return Math.min(max, Math.max(min, Math.round(raw)));
}

function approvedFont(raw: unknown, fallback: EpkFontId): EpkFontId {
  return typeof raw === "string" &&
    (EPK_FONT_IDS as readonly string[]).includes(raw)
    ? (raw as EpkFontId)
    : fallback;
}

/**
 * Validate and normalize the schema-V3 design-lab payload. The output contains
 * only bounded numbers, approved enum/font values, and sanitized EPK colors.
 */
export function sanitizePostStyleConfiguration(
  raw: unknown,
  templateId: string,
): PostStyleConfigurationV3 {
  const template = getTemplateById(templateId);
  const premiere = template?.premiere;
  const defaults = premiere?.defaultConfiguration;
  if (!premiere || !defaults) {
    throw new Error(`Template ${templateId} does not support schema V3`);
  }

  const value =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};
  const typography =
    value.typography && typeof value.typography === "object"
      ? (value.typography as Record<string, unknown>)
      : {};
  const treatment =
    value.treatment && typeof value.treatment === "object"
      ? (value.treatment as Record<string, unknown>)
      : {};
  const rawAppearance = value.appearance ?? value;
  const paletteIds = new Set(premiere.palettes.map((item) => item.id));
  const paletteId =
    typeof value.paletteId === "string" && paletteIds.has(value.paletteId)
      ? value.paletteId
      : defaults.paletteId;

  return {
    appearance: sanitizeForPost(rawAppearance, templateId),
    paletteId,
    textureId: isPostTextureId(value.textureId)
      ? value.textureId
      : (defaults.textureId ?? "none"),
    typography: {
      headingFont: approvedFont(
        typography.headingFont,
        defaults.typography.headingFont,
      ),
      bodyFont: approvedFont(typography.bodyFont, defaults.typography.bodyFont),
      case:
        typography.case === "uppercase" || typography.case === "normal"
          ? typography.case
          : defaults.typography.case,
      tracking:
        typography.tracking === "tight" ||
        typography.tracking === "normal" ||
        typography.tracking === "wide"
          ? typography.tracking
          : defaults.typography.tracking,
    },
    treatment: {
      intensity: clampNumber(
        treatment.intensity,
        defaults.treatment.intensity,
        0,
        100,
      ),
      patternScale: clampNumber(
        treatment.patternScale,
        defaults.treatment.patternScale,
        4,
        32,
      ),
      angle: premiere.controls.supportsAngle
        ? clampNumber(treatment.angle, defaults.treatment.angle, -45, 45)
        : defaults.treatment.angle,
      distress: premiere.controls.supportsDistress
        ? clampNumber(treatment.distress, defaults.treatment.distress, 0, 100)
        : defaults.treatment.distress,
      registrationOffset: clampNumber(
        treatment.registrationOffset,
        defaults.treatment.registrationOffset,
        0,
        8,
      ),
      invert: premiere.controls.supportsInvert
        ? treatment.invert === true
        : defaults.treatment.invert,
    },
  };
}
