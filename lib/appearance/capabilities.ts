import type { EpkAppearance } from "@/lib/epk/epk-appearance"
import type { ControlCapability } from "./contracts"

/**
 * For every EpkAppearance field, declare its applicability on a post card surface.
 * Source of truth: docs/post-styles/EPK_POST_PARITY_MATRIX.md
 */
export const POST_FEED_CAPABILITY_MAP: Record<keyof EpkAppearance, ControlCapability> = {
  // ── Typography ──────────────────────────────────────────────────────────────
  fontSizeScale: {
    status: "bounded",
    constraints: { maxValue: "lg", clampXlTo: "lg" },
  },
  textColorPreset: { status: "supported" },
  textColorCustomHex: { status: "supported" },
  headingScale: {
    status: "bounded",
    constraints: { maxValue: "lg", clampXlTo: "lg" },
  },

  // ── Card Shape & Surface ────────────────────────────────────────────────────
  cardRadius: { status: "supported" },
  cardSurface: { status: "supported" },
  surfaceStyle: { status: "supported" },

  // ── Color Tokens ────────────────────────────────────────────────────────────
  accentHex: { status: "supported" },
  secondaryAccentHex: { status: "supported" },
  pageBackgroundHex: {
    status: "unsupported",
    reason:
      "Page background is a page-container concept. Feed posts render inside the host page's own background; applying this would bleed color outside the post boundary.",
  },
  cardBackgroundHex: { status: "supported" },
  borderColorHex: { status: "supported" },

  // ── Border ──────────────────────────────────────────────────────────────────
  borderStrength: { status: "supported" },

  // ── Button ──────────────────────────────────────────────────────────────────
  buttonStyle: { status: "supported" },
  buttonRadius: { status: "supported" },

  // ── Effects & Background ────────────────────────────────────────────────────
  effectStyle: {
    status: "bounded",
    constraints: {
      cardSafeValues: ["none", "glow", "glass", "shadow", "neon", "grain"],
      fallbackFor: ["spotlight", "poster"],
      fallbackValue: "shadow",
    },
  },
  effectIntensity: {
    status: "bounded",
    constraints: { maxValue: "medium", clampHighTo: "medium" },
  },
  backgroundStyle: {
    status: "adapted",
    adapter: "backgroundStyleToCardAdapter",
  },
  sectionDividerStyle: {
    status: "adapted",
    adapter: "sectionDividerToCardDividerAdapter",
  },

  // ── Media Treatment ─────────────────────────────────────────────────────────
  heroImageTreatment: { status: "supported" },

  // ── Avatar ──────────────────────────────────────────────────────────────────
  avatarShape: { status: "supported" },
  avatarSize: {
    status: "bounded",
    constraints: { maxValue: "md", clampLgXlTo: "md" },
  },

  // ── Page Layout ─────────────────────────────────────────────────────────────
  contentWidth: {
    status: "unsupported",
    reason:
      "Page-layout-only concept: constrains the EPK column within the viewport. Feed cards have no meaningful concept of content width — they fill their container slot.",
  },
  sectionSpacing: {
    status: "bounded",
    constraints: { maxValue: "default", clampRelaxedTo: "default" },
  },

  // ── Cover Image (Classic & Cinema templates only) ───────────────────────────
  coverHeight: {
    status: "unsupported",
    reason:
      "EPK hero cover height is a full-width page section concept. Post cards have no equivalent hero cover section.",
  },
  coverOverlay: {
    status: "unsupported",
    reason: "EPK hero cover overlay is page-specific. No equivalent in a post card layout.",
  },
}
