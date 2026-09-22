import type { CSSProperties } from "react";
import { resolveEpkAppearanceForRender } from "@/lib/epk/epk-appearance";
import type { EpkSkinId, EpkSkinTokens } from "@/lib/epk/epk-skin-tokens";
import type { EpkAppearance } from "@/lib/epk/epk-appearance";
import { getTemplateById } from "@/lib/post-appearance/template-registry";
import { semanticTokensFromAppearance } from "@/lib/post-appearance/resolve";
import type { PostStyleConfigurationV3 } from "@/lib/post-appearance/contracts";
import type { EpkFontId } from "@/lib/epk/epk-preview-utils";
import {
  isPostTextureId,
  type PostTextureId,
} from "@/lib/post-appearance/texture-skins";

export interface PostCompiledAppearance {
  /** CSS custom properties to set on the post root element */
  cssVariables: CSSProperties;
  /** Tailwind class string for the post root element */
  rootClassName: string;
  /** Merged token strings from the resolved EPK skin */
  mergedTokens: EpkSkinTokens;
  /** Validated texture layer applied by PostStyleBoundary. */
  textureId: PostTextureId;
}

// Lookup tables for the three post-root appearance axes.
// These are the same values used inside epk-appearance.ts; duplicated here so
// compile.ts has no dependency on EPK internals beyond the public export.
const CARD_RADIUS_CLASS: Record<EpkAppearance["cardRadius"], string> = {
  sharp: "rounded-none",
  rounded: "rounded-2xl",
  pill: "rounded-3xl",
};

const BORDER_STRENGTH_CLASS: Record<EpkAppearance["borderStrength"], string> = {
  subtle: "border border-opacity-40",
  default: "border",
  strong: "border-2",
};

const SURFACE_STYLE_CLASS: Record<EpkAppearance["surfaceStyle"], string> = {
  default: "",
  glass: "backdrop-blur-xl bg-white/[0.075] shadow-2xl shadow-black/20",
  solid: "shadow-none",
  editorial: "shadow-[0_18px_60px_rgba(0,0,0,0.22)]",
  outlined: "bg-transparent shadow-none",
};

const POST_FONT_STACK: Record<EpkFontId, string> = {
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

// Per-skin base colors used to give the post card its distinctive look.
// Extracted from EPK_SKIN_TOKENS.page and .card background colors.
export const SKIN_BASE_COLORS: Partial<
  Record<string, { bg: string; text: string; border: string }>
> = {
  modern: { bg: "#101323", text: "#f8fafc", border: "rgba(255,255,255,0.10)" },
  classic: { bg: "#fffdf8", text: "#1c1917", border: "#d8cdbd" },
  minimal: { bg: "#050505", text: "#ffffff", border: "rgba(255,255,255,0.15)" },
  bold: { bg: "#080808", text: "#facc15", border: "#facc15" },
  cinema: { bg: "#0d0d0d", text: "#e8e8e8", border: "rgba(255,255,255,0.08)" },
  gallery: { bg: "#fafaf9", text: "#1c1917", border: "#e7e5e4" },
  luxe: { bg: "#0a1628", text: "#e8dfc8", border: "#c9a962" },
  poster: { bg: "#140808", text: "#f07167", border: "#f07167" },
  coastal: { bg: "#e8efe9", text: "#1a3830", border: "#2d6a5a" },
  scrapbook: { bg: "#fdf6e3", text: "#3d2b1f", border: "#c4a882" },
  bandcard: { bg: "#0a0a0a", text: "#ffffff", border: "#333333" },
  dossier: { bg: "#f5f0e8", text: "#2a1f14", border: "#c8b89a" },
  pressgrid: { bg: "#ffffff", text: "#111111", border: "#e5e7eb" },
  redcolumn: { bg: "#1a0505", text: "#fef2f2", border: "#dc2626" },
  checkerboard: { bg: "#000000", text: "#ffffff", border: "#ffffff" },
  editorial: { bg: "#fafafa", text: "#111827", border: "#e5e7eb" },
  whitespace: { bg: "#ffffff", text: "#374151", border: "#f3f4f6" },
  colorblock: { bg: "#1e1b4b", text: "#e0e7ff", border: "#4f46e5" },
  sunburst: { bg: "#fffbeb", text: "#78350f", border: "#f59e0b" },
};

/**
 * Compile an EpkAppearance + skin into scoped CSS variables and class names
 * suitable for a [data-post-appearance] root element.
 *
 * All CSS variables produced here are post-scoped. No page-level classes
 * (wrapperClassName targeting a full-page container) are emitted.
 */
export function compilePostAppearance(
  templateId: EpkSkinId | string,
  appearance: EpkAppearance,
  configuration?: PostStyleConfigurationV3,
): PostCompiledAppearance {
  const template = getTemplateById(templateId);
  const skin = template?.skinId ?? templateId;
  const resolved = resolveEpkAppearanceForRender({
    skin: skin as EpkSkinId,
    appearance,
  });
  const semantic = semanticTokensFromAppearance(templateId, appearance);
  const textureId = isPostTextureId(configuration?.textureId)
    ? configuration.textureId
    : "none";

  // Build a post-scoped root class string from the three card-level axes.
  // Intentionally omits wrapperClassName (font/heading scale) and
  // contentMaxWidthClass (page-layout-only) from the EPK resolved output.
  const rootClassName = [
    CARD_RADIUS_CLASS[appearance.cardRadius],
    BORDER_STRENGTH_CLASS[appearance.borderStrength],
    SURFACE_STYLE_CLASS[appearance.surfaceStyle],
    template ? `post-layout-${template.layoutId}` : "",
    configuration?.treatment.invert ? "post-style-inverted" : "",
  ]
    .filter(Boolean)
    .join(" ");

  // Merge skin base colors with any custom hex overrides from the user.
  // These become inline style properties so they reliably override Tailwind card classes.
  const base = SKIN_BASE_COLORS[skin] ?? {
    bg: "#101323",
    text: "#f8fafc",
    border: "rgba(255,255,255,0.1)",
  };
  const cardBg =
    appearance.cardBackgroundHex ?? appearance.pageBackgroundHex ?? base.bg;
  const cardText = semantic.tokens.text;
  const cardBorder = appearance.borderColorHex ?? base.border;

  const cssVariables: CSSProperties = {
    ...resolved.rootStyle,
    // Force the card's background/text via CSS variables so they win over
    // any hardcoded Tailwind bg-* or text-* classes on child elements.
    "--post-card-bg": cardBg,
    "--post-card-text": cardText,
    "--post-card-border": cardBorder,
    "--post-surface": semantic.tokens.surface,
    "--post-text": cardText,
    "--post-muted": semantic.tokens.mutedText,
    "--post-link": semantic.tokens.accent,
    "--post-action": semantic.tokens.accent,
    "--post-secondary-accent": semantic.tokens.secondaryAccent,
    "--post-heading-font": semantic.tokens.headingFont,
    "--post-body-font": semantic.tokens.bodyFont,
    "--post-primary": semantic.tokens.accent,
    "--post-secondary": semantic.tokens.secondaryAccent,
    ...(configuration
      ? {
          "--post-heading-font":
            POST_FONT_STACK[configuration.typography.headingFont],
          "--post-body-font":
            POST_FONT_STACK[configuration.typography.bodyFont],
          "--post-effect-mix": `${Math.max(4, Math.round(configuration.treatment.intensity * 0.28))}%`,
          "--post-pattern-size": `${configuration.treatment.patternScale}px`,
          "--post-pattern-angle": `${configuration.treatment.angle}deg`,
          "--post-distress-mix": `${Math.max(2, Math.round(configuration.treatment.distress * 0.24))}%`,
          "--post-registration-offset": `${configuration.treatment.registrationOffset}px`,
          "--post-texture-opacity": `${Math.min(0.38, 0.08 + configuration.treatment.intensity * 0.0028)}`,
          "--post-text-transform": configuration.typography.case,
          "--post-letter-spacing":
            configuration.typography.tracking === "tight"
              ? "-0.025em"
              : configuration.typography.tracking === "wide"
                ? "0.1em"
                : "normal",
        }
      : {}),
    // Accent for interactive elements
    ...(appearance.accentHex ? {} : { "--epk-accent": base.border }),
  } as CSSProperties;

  return {
    cssVariables,
    rootClassName,
    mergedTokens: resolved.mergedTokens,
    textureId,
  };
}

/**
 * Lightweight helper — returns just the three card-level colors for a skin + optional
 * appearance overrides. Used to colour the composer preview without a full compile.
 */
export function getSkinColorsForPreview(
  templateId: string,
  appearance?: Partial<
    Pick<
      EpkAppearance,
      | "cardBackgroundHex"
      | "pageBackgroundHex"
      | "textColorCustomHex"
      | "borderColorHex"
      | "accentHex"
    >
  >,
): { bg: string; text: string; border: string; accent: string } {
  const template = getTemplateById(templateId);
  const skinId = template?.skinId ?? templateId;
  const base = SKIN_BASE_COLORS[skinId] ?? {
    bg: "#101323",
    text: "#f8fafc",
    border: "rgba(255,255,255,0.10)",
  };
  const resolved = semanticTokensFromAppearance(templateId, {
    ...getDefaultPostAppearanceCompat(templateId),
    ...appearance,
  });
  return {
    bg: resolved.tokens.surface,
    text: resolved.tokens.text,
    border: appearance?.borderColorHex ?? base.border,
    accent: resolved.tokens.accent,
  };
}

function getDefaultPostAppearanceCompat(templateId: string): EpkAppearance {
  const template = getTemplateById(templateId);
  if (template?.defaultAppearance) return template.defaultAppearance;
  return getTemplateById("modern")!.defaultAppearance!;
}
