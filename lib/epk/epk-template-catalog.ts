import { EPK_REFERENCE_TEMPLATE_OPTIONS } from "@/lib/epk/epk-reference-template-options"
import type { EpkSkinId } from "@/lib/epk/epk-skin-tokens"

export interface EpkTemplateCatalogItem {
  id: string
  name: string
  description: string
  colors?: readonly string[]
  previewClassName?: string
  accent: string
  skinId: EpkSkinId | string
}

const BASE_TEMPLATES: EpkTemplateCatalogItem[] = [
  {
    id: "modern",
    name: "Modern",
    description: "Sleek gradients with premium aesthetics",
    colors: ["from-indigo-600", "via-purple-600", "to-pink-600"],
    accent: "bg-purple-400",
    skinId: "modern",
  },
  {
    id: "classic",
    name: "Classic",
    description: "Warm editorial layout for press and bookers",
    colors: ["from-orange-500", "via-pink-500", "to-purple-600"],
    accent: "bg-orange-400",
    skinId: "classic",
  },
  {
    id: "minimal",
    name: "Minimal",
    description: "Clean monochrome with subtle depth",
    colors: ["from-gray-50", "via-white", "to-gray-100"],
    accent: "bg-gray-600",
    skinId: "minimal",
  },
  {
    id: "bold",
    name: "Bold",
    description: "Electric highlights and strong contrast",
    colors: ["from-blue-900", "via-cyan-800", "to-teal-700"],
    accent: "bg-cyan-400",
    skinId: "bold",
  },
  {
    id: "cinema",
    name: "Cinema",
    description: "Letterbox charcoal with silver platinum type",
    colors: ["from-zinc-950", "via-zinc-900", "to-black"],
    accent: "bg-zinc-300",
    skinId: "cinema",
  },
  {
    id: "gallery",
    name: "Gallery",
    description: "Museum white with airy editorial space",
    colors: ["from-neutral-100", "via-white", "to-neutral-50"],
    accent: "bg-neutral-800",
    skinId: "gallery",
  },
  {
    id: "luxe",
    name: "Luxe",
    description: "Deep navy with champagne gold accents",
    colors: ["from-[#0a1628]", "via-[#0d1c32]", "to-[#081220]"],
    accent: "bg-[#c9a962]",
    skinId: "luxe",
  },
  {
    id: "poster",
    name: "Poster",
    description: "Concert ink with coral stamp energy",
    colors: ["from-[#140808]", "via-[#1a0c0c]", "to-[#5c1a1a]"],
    accent: "bg-[#f07167]",
    skinId: "poster",
  },
  {
    id: "coastal",
    name: "Coastal",
    description: "Soft sage sand with calm teal accents",
    colors: ["from-[#e8efe9]", "via-[#dff0e8]", "to-[#c5e0d6]"],
    accent: "bg-[#2d6a5a]",
    skinId: "coastal",
  },
]

export const EPK_TEMPLATE_CATALOG: EpkTemplateCatalogItem[] = [
  ...BASE_TEMPLATES,
  ...EPK_REFERENCE_TEMPLATE_OPTIONS.map((template) => ({
    id: template.id,
    name: template.name,
    description: template.description,
    previewClassName: template.previewClassName,
    accent: "bg-white/70",
    skinId: template.id,
  })),
]
