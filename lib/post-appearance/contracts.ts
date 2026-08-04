import type { EpkAppearance } from "@/lib/epk/epk-appearance";
import type { EpkFontId } from "@/lib/epk/epk-preview-utils";
import type { PostTextureId } from "./texture-skins";

export type AppearanceSurface =
  | "epk"
  | "post-feed"
  | "post-detail"
  | "post-compact";
export type PostAppearanceSurface = "feed" | "profile" | "detail" | "compact";
export type PostTemplateFamily = "epk" | "page-appearance" | "post-premiere";

export type PremiereStyleId =
  | "16-bit-sprite"
  | "terminal"
  | "risograph"
  | "cmyk-dots"
  | "halftone-print"
  | "dithered-1-bit"
  | "punk-collage"
  | "bootleg-pixel";

export type PostTypeCase = "normal" | "uppercase";
export type PostTypeTracking = "tight" | "normal" | "wide";

export interface PostStyleTypography {
  headingFont: EpkFontId;
  bodyFont: EpkFontId;
  case: PostTypeCase;
  tracking: PostTypeTracking;
}

export interface PostStyleTreatment {
  intensity: number;
  patternScale: number;
  angle: number;
  distress: number;
  registrationOffset: number;
  invert: boolean;
}

export interface PostStyleConfigurationV3 {
  appearance: EpkAppearance;
  paletteId: string;
  /** Optional for backward compatibility with V3 snapshots published before texture skins. */
  textureId?: PostTextureId;
  typography: PostStyleTypography;
  treatment: PostStyleTreatment;
}

export interface PremierePalette {
  id: string;
  label: string;
  colors: {
    surface: string;
    foreground: string;
    primary: string;
    secondary: string;
    border: string;
  };
}

export interface PremiereControlManifest {
  intensityLabel: string;
  scaleLabel: string;
  offsetLabel: string;
  supportsAngle: boolean;
  supportsDistress: boolean;
  supportsInvert: boolean;
}

export interface PremiereTemplateMetadata {
  eyebrow: string;
  aliases: string[];
  palettes: PremierePalette[];
  controls: PremiereControlManifest;
  defaultConfiguration: PostStyleConfigurationV3;
}

export type ControlCapability =
  | { status: "supported" }
  | { status: "bounded"; constraints: Record<string, unknown> }
  | { status: "adapted"; adapter: string }
  | { status: "unsupported"; reason: string };

export type TemplateSurfaceCapability =
  | { status: "supported" }
  | { status: "compact-only" }
  | { status: "unsupported"; reason: string };

export interface AppearanceTemplateDefinition {
  id: string;
  version: number;
  label: string;
  description?: string;
  skinId: string;
  family: PostTemplateFamily;
  layoutId: string;
  aliases?: string[];
  previewClassName?: string;
  previewImage?: string;
  colors?: readonly string[];
  accentColor: string;
  capabilities: Record<AppearanceSurface, TemplateSurfaceCapability>;
  lifecycle: "active" | "retired" | "disabled";
  entitlement?: "free" | "premium";
  defaultAppearance?: EpkAppearance;
  premiere?: PremiereTemplateMetadata;
}

export interface PostSemanticTokensV2 {
  surface: string;
  text: string;
  mutedText: string;
  accent: string;
  secondaryAccent: string;
  border: string;
  headingFont: string;
  bodyFont: string;
  density: "compact" | "comfortable" | "spacious";
  radius: "sharp" | "rounded" | "pill";
  texture: "none" | "grain" | "paper" | "halftone" | "metal";
  effect: string;
  layoutId: string;
}

export interface AppearanceSnapshotV1 {
  schemaVersion: 1;
  templateId: string;
  templateVersion: number;
  tokens: EpkAppearance;
  compiledAt: string;
}

export interface PostAppearanceSnapshotV2 {
  schemaVersion: 2;
  templateId: string;
  templateVersion: number;
  tokens: PostSemanticTokensV2;
  legacyTokens: EpkAppearance;
  compiledAt: string;
}

export interface PostSemanticTokensV3 extends PostSemanticTokensV2 {
  typography: PostStyleTypography;
  treatment: PostStyleTreatment;
  paletteId: string;
  textureId?: PostTextureId;
}

export interface PostAppearanceSnapshotV3 {
  schemaVersion: 3;
  templateId: string;
  templateVersion: number;
  tokens: PostSemanticTokensV3;
  legacyTokens: EpkAppearance;
  configuration: PostStyleConfigurationV3;
  compiledAt: string;
}

export type PostAppearanceSnapshot =
  | AppearanceSnapshotV1
  | PostAppearanceSnapshotV2
  | PostAppearanceSnapshotV3;

export type PostAppearanceFallbackReason =
  | "missing_snapshot"
  | "invalid_schema"
  | "unknown_template"
  | "disabled_template"
  | "unsupported_surface"
  | "invalid_asset"
  | "token_constraint_failed"
  | "renderer_error"
  | "entitlement_mismatch"
  | "stale_profile";

export type PostAppearanceDTO =
  | {
      mode: "styled";
      templateId: string;
      templateVersion: number;
      schemaVersion: 1 | 2 | 3;
      snapshot: PostAppearanceSnapshot;
      snapshotHash?: string;
    }
  | {
      mode: "standard";
      fallbackReason?: PostAppearanceFallbackReason;
    };

export type PostAppearanceInput =
  | { mode: "standard" }
  | {
      mode: "profile";
      profileId: string;
      expectedProfileVersion?: string;
      overrides?: Partial<EpkAppearance>;
    }
  | {
      mode: "custom";
      templateId: string;
      templateVersion: number;
      schemaVersion: 1 | 2 | 3;
      configuration: unknown;
    };

export interface ResolvedPostAppearance {
  templateId: string;
  templateVersion: number;
  schemaVersion: 1 | 2 | 3;
  semantic: PostSemanticTokensV2 | PostSemanticTokensV3;
  legacyTokens: EpkAppearance;
  configuration?: PostStyleConfigurationV3;
}
