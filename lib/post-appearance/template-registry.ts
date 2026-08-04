import { EPK_TEMPLATE_CATALOG } from "@/lib/epk/epk-template-catalog"
import {
  getDefaultEpkAppearanceForTemplate,
  type EpkAppearance,
} from "@/lib/epk/epk-appearance"
import {
  ARTIST_PROFILE_TEMPLATES,
  artistProfileAppearanceToLegacyTheme,
} from "@/lib/public-artist/artist-profile-appearance"
import type {
  AppearanceTemplateDefinition,
  PostStyleConfigurationV3,
  TemplateSurfaceCapability,
} from "./contracts"
import { PREMIERE_POST_TEMPLATES } from "./premiere-styles"

const SURFACE_CAPABILITIES: AppearanceTemplateDefinition["capabilities"] = {
  epk: { status: "supported" },
  "post-feed": { status: "supported" },
  "post-detail": { status: "supported" },
  "post-compact": { status: "compact-only" },
}

const EPK_LAYOUTS: Record<string, string> = {
  modern: "spotlight",
  classic: "editorial",
  minimal: "minimal",
  bold: "billboard",
  cinema: "cinematic",
  gallery: "gallery",
  luxe: "luxury",
  poster: "poster",
  coastal: "coastal",
  scrapbook: "scrapbook",
  bandcard: "band-card",
  dossier: "dossier",
  pressgrid: "press-grid",
  redcolumn: "red-column",
  checkerboard: "checkerboard",
  editorial: "editorial-dark",
  whitespace: "whitespace",
  colorblock: "color-block",
  sunburst: "sunburst",
}

const PAGE_SKINS: Record<string, string> = {
  "cinematic-marquee": "cinema",
  "editorial-cover": "classic",
  "analog-rave": "poster",
  "swiss-signal": "minimal",
  "backstage-pass": "luxe",
  "audio-console": "bold",
}

const epkTemplates: AppearanceTemplateDefinition[] = EPK_TEMPLATE_CATALOG.map((item) => ({
  id: item.id,
  version: 1,
  label: item.name,
  description: item.description,
  skinId: item.skinId,
  family: "epk",
  layoutId: EPK_LAYOUTS[item.id] ?? "standard",
  ...(item.previewClassName ? { previewClassName: item.previewClassName } : {}),
  ...(item.colors ? { colors: item.colors } : {}),
  accentColor: item.accent,
  capabilities: SURFACE_CAPABILITIES,
  lifecycle: "retired",
  entitlement: "free",
  defaultAppearance: getDefaultEpkAppearanceForTemplate(item.id),
}))

const pageAppearanceTemplates: AppearanceTemplateDefinition[] = ARTIST_PROFILE_TEMPLATES.map(
  (item) => {
    const legacy = artistProfileAppearanceToLegacyTheme(item.defaultAppearance)
    return {
      id: item.id,
      version: 1,
      label: item.name,
      description: item.description,
      skinId: PAGE_SKINS[item.id],
      family: "page-appearance",
      layoutId: item.id,
      previewImage: item.previewImage,
      accentColor: legacy.epkAppearance.accentHex ?? "bg-purple-400",
      capabilities: SURFACE_CAPABILITIES,
      lifecycle: "retired",
      entitlement: "free",
      defaultAppearance: {
        ...legacy.epkAppearance,
        pageBackgroundHex: null,
      },
    }
  },
)

export const APPEARANCE_TEMPLATE_REGISTRY: AppearanceTemplateDefinition[] = [
  ...PREMIERE_POST_TEMPLATES,
  ...epkTemplates,
  ...pageAppearanceTemplates,
]

export const POST_TEMPLATE_CATALOG_VERSION = 3

export function getTemplateById(id: string): AppearanceTemplateDefinition | undefined {
  return APPEARANCE_TEMPLATE_REGISTRY.find((template) => template.id === id)
}

export function getActiveTemplates(): AppearanceTemplateDefinition[] {
  return APPEARANCE_TEMPLATE_REGISTRY.filter((template) => template.lifecycle === "active")
}

export function getTemplatesForFlag(allTemplatesEnabled: boolean): AppearanceTemplateDefinition[] {
  void allTemplatesEnabled
  return getActiveTemplates()
}

export function getDefaultPostAppearance(templateId: string): EpkAppearance {
  const template = getTemplateById(templateId)
  return template?.defaultAppearance ?? getDefaultEpkAppearanceForTemplate(templateId)
}

export function getDefaultPostStyleConfiguration(
  templateId: string,
): PostStyleConfigurationV3 | null {
  const configuration = getTemplateById(templateId)?.premiere?.defaultConfiguration
  return configuration
    ? {
        ...configuration,
        appearance: { ...configuration.appearance },
        typography: { ...configuration.typography },
        treatment: { ...configuration.treatment },
      }
    : null
}

export type { TemplateSurfaceCapability }
