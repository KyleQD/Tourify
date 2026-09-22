import type { EpkAppearance } from "@/lib/epk/epk-appearance";
import { ensurePostContrast, readableForeground } from "./contrast";
import { getDefaultPostAppearance, getTemplateById } from "./template-registry";
import type {
  AppearanceSnapshotV1,
  PostAppearanceSnapshot,
  PostAppearanceSnapshotV2,
  PostAppearanceSnapshotV3,
  PostSemanticTokensV2,
  PostSemanticTokensV3,
  PostStyleConfigurationV3,
  ResolvedPostAppearance,
} from "./contracts";

const DEFAULT_SURFACE = "#101323";

function radius(
  value: EpkAppearance["cardRadius"],
): PostSemanticTokensV2["radius"] {
  return value === "sharp" ? "sharp" : value === "pill" ? "pill" : "rounded";
}

const FONT_STACKS: Record<
  PostStyleConfigurationV3["typography"]["bodyFont"],
  string
> = {
  sans: "Inter, ui-sans-serif, system-ui, sans-serif",
  serif: "'Playfair Display', ui-serif, Georgia, serif",
  display: "'Bebas Neue', Impact, ui-sans-serif, sans-serif",
  geometric: "'Space Grotesk', ui-sans-serif, system-ui, sans-serif",
  mono: "'JetBrains Mono', ui-monospace, SFMono-Regular, monospace",
  editorial: "'Cormorant Garamond', ui-serif, Georgia, serif",
  condensed: "Oswald, 'Arial Narrow', ui-sans-serif, sans-serif",
  soft: "Outfit, ui-sans-serif, system-ui, sans-serif",
  slab: "'Roboto Slab', Rockwell, ui-serif, serif",
  wide: "Archivo, ui-sans-serif, system-ui, sans-serif",
};

function texture(
  effect: EpkAppearance["effectStyle"],
): PostSemanticTokensV2["texture"] {
  return effect === "grain" ? "grain" : "none";
}

export function semanticTokensFromAppearance(
  templateId: string,
  rawAppearance: EpkAppearance,
): {
  tokens: PostSemanticTokensV2;
  appearance: EpkAppearance;
  contrastCorrected: boolean;
} {
  const template = getTemplateById(templateId);
  const defaults = getDefaultPostAppearance(templateId);
  const surface =
    rawAppearance.cardBackgroundHex ??
    defaults.cardBackgroundHex ??
    DEFAULT_SURFACE;
  const contrast = ensurePostContrast(rawAppearance, surface);
  const foreground = contrast.appearance.textColorCustomHex ?? "#ffffff";
  const requestedAccent = contrast.appearance.accentHex ?? defaults.accentHex;
  const accent = readableForeground(requestedAccent, surface, 4.5);

  return {
    appearance: contrast.appearance,
    contrastCorrected: contrast.corrected || accent.corrected,
    tokens: {
      surface,
      text: foreground,
      mutedText: foreground,
      accent: accent.color,
      secondaryAccent:
        contrast.appearance.secondaryAccentHex ??
        defaults.secondaryAccentHex ??
        accent.color,
      border:
        contrast.appearance.borderColorHex ??
        defaults.borderColorHex ??
        accent.color,
      headingFont: "var(--font-sans, ui-sans-serif, system-ui, sans-serif)",
      bodyFont: "var(--font-sans, ui-sans-serif, system-ui, sans-serif)",
      density:
        contrast.appearance.sectionSpacing === "compact"
          ? "compact"
          : contrast.appearance.sectionSpacing === "relaxed"
            ? "spacious"
            : "comfortable",
      radius: radius(contrast.appearance.cardRadius),
      texture: texture(contrast.appearance.effectStyle),
      effect: contrast.appearance.effectStyle,
      layoutId: template?.layoutId ?? "standard",
    },
  };
}

export function createPostAppearanceSnapshotV2(
  templateId: string,
  appearance: EpkAppearance,
  templateVersion = 1,
): PostAppearanceSnapshotV2 {
  const resolved = semanticTokensFromAppearance(templateId, appearance);
  return {
    schemaVersion: 2,
    templateId,
    templateVersion,
    tokens: resolved.tokens,
    legacyTokens: resolved.appearance,
    compiledAt: new Date().toISOString(),
  };
}

export function createPostAppearanceSnapshotV3(
  templateId: string,
  configuration: PostStyleConfigurationV3,
  templateVersion = 1,
): PostAppearanceSnapshotV3 {
  const resolved = semanticTokensFromAppearance(
    templateId,
    configuration.appearance,
  );
  const textureByTemplate: Partial<
    Record<string, PostSemanticTokensV3["texture"]>
  > = {
    risograph: "paper",
    "cmyk-dots": "halftone",
    "halftone-print": "halftone",
    "punk-collage": "paper",
    "bootleg-pixel": "grain",
  };
  return {
    schemaVersion: 3,
    templateId,
    templateVersion,
    tokens: {
      ...resolved.tokens,
      headingFont: FONT_STACKS[configuration.typography.headingFont],
      bodyFont: FONT_STACKS[configuration.typography.bodyFont],
      texture: textureByTemplate[templateId] ?? resolved.tokens.texture,
      typography: configuration.typography,
      treatment: configuration.treatment,
      paletteId: configuration.paletteId,
      textureId: configuration.textureId ?? "none",
    },
    legacyTokens: resolved.appearance,
    configuration: {
      ...configuration,
      appearance: resolved.appearance,
    },
    compiledAt: new Date().toISOString(),
  };
}

export function resolvePostAppearanceSnapshot(
  snapshot: PostAppearanceSnapshot,
): ResolvedPostAppearance {
  if (snapshot.schemaVersion === 3) {
    return {
      templateId: snapshot.templateId,
      templateVersion: snapshot.templateVersion,
      schemaVersion: 3,
      semantic: snapshot.tokens,
      legacyTokens: snapshot.legacyTokens,
      configuration: snapshot.configuration,
    };
  }
  if (snapshot.schemaVersion === 2) {
    return {
      templateId: snapshot.templateId,
      templateVersion: snapshot.templateVersion,
      schemaVersion: 2,
      semantic: snapshot.tokens,
      legacyTokens: snapshot.legacyTokens,
    };
  }

  const legacy = snapshot as AppearanceSnapshotV1;
  const resolved = semanticTokensFromAppearance(
    legacy.templateId,
    legacy.tokens,
  );
  return {
    templateId: legacy.templateId,
    templateVersion: legacy.templateVersion,
    schemaVersion: 1,
    semantic: resolved.tokens,
    legacyTokens: resolved.appearance,
  };
}
