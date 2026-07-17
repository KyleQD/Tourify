import type { EpkSkinId } from "@/lib/epk/epk-skin-tokens"

export interface EpkReferenceTemplateOption {
  id: EpkSkinId
  name: string
  description: string
  previewClassName: string
  defaultFont: "sans" | "serif"
}

/**
 * Add these options to the existing EPK template picker data source.
 * Rendering support is already wired through epk-preview.tsx and the shared builder renderer.
 */
export const EPK_REFERENCE_TEMPLATE_OPTIONS: EpkReferenceTemplateOption[] = [
  {
    id: "scrapbook",
    name: "Scrapbook",
    description:
      "Warm editorial paper, rounded color fields, split portrait cover.",
    previewClassName:
      "bg-[linear-gradient(135deg,#d08156_0_34%,#f3efeb_34%_66%,#78978e_66%)]",
    defaultFont: "serif",
  },
  {
    id: "bandcard",
    name: "Band Card",
    description:
      "Compact black-and-yellow band sheet with high-impact hierarchy.",
    previewClassName: "bg-[linear-gradient(90deg,#090909_0_76%,#f5df18_76%)]",
    defaultFont: "sans",
  },
  {
    id: "dossier",
    name: "Dossier",
    description:
      "Photocopied paper, annotation energy, press-file presentation.",
    previewClassName:
      "bg-[linear-gradient(135deg,#d7d4ce,#f7f5f0_55%,#111_56%_58%,#f7f5f0_59%)]",
    defaultFont: "sans",
  },
  {
    id: "pressgrid",
    name: "Press Grid",
    description:
      "Clean white press sheet with banner photography and modular grids.",
    previewClassName: "bg-[linear-gradient(180deg,#111_0_44%,#fff_44%_100%)]",
    defaultFont: "sans",
  },
  {
    id: "redcolumn",
    name: "Red Column",
    description:
      "Red portrait column, vertical editorial labels, concise artist facts.",
    previewClassName: "bg-[linear-gradient(90deg,#e11118_0_42%,#eeeeec_42%)]",
    defaultFont: "sans",
  },
  {
    id: "checkerboard",
    name: "Checkerboard",
    description:
      "Purple race-grid accents, black information field, poster energy.",
    previewClassName:
      "bg-[linear-gradient(135deg,#8b3dff_0_20%,#050505_20%_80%,#8b3dff_80%)]",
    defaultFont: "sans",
  },
  {
    id: "editorial",
    name: "Editorial",
    description:
      "High-fashion split cover with oversized type and red/black contrast.",
    previewClassName: "bg-[linear-gradient(90deg,#ff3542_0_46%,#171717_46%)]",
    defaultFont: "sans",
  },
  {
    id: "whitespace",
    name: "Whitespace",
    description:
      "Airy white portfolio with image-led composition and precise rules.",
    previewClassName:
      "bg-[linear-gradient(135deg,#fff_0_70%,#2aa9c8_70%_73%,#f1f5f9_73%)]",
    defaultFont: "sans",
  },
  {
    id: "colorblock",
    name: "Color Block",
    description:
      "Full red art direction with sparse photography and thin typography.",
    previewClassName: "bg-[linear-gradient(135deg,#ef2d2d_0_78%,#111_78%)]",
    defaultFont: "sans",
  },
  {
    id: "sunburst",
    name: "Sunburst",
    description:
      "Yellow and red retro press kit with bold photography and section blocks.",
    previewClassName: "bg-[linear-gradient(135deg,#f6c743_0_75%,#d02d20_75%)]",
    defaultFont: "sans",
  },
]
