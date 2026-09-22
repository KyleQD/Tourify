export type PostTextureId =
  | "none"
  | "paper-fiber"
  | "newsprint-dots"
  | "xerox-grain"
  | "canvas-weave"
  | "blueprint-grid"
  | "pixel-checker"
  | "speckled-ink"
  | "chrome-grid"
  | "photocopy-bands"
  | "starfield"
  | "circuit-trace"
  | "sticker-scrape"
  | "marquee-stars"
  | "blink-grid"
  | "rainbow-road"
  | "construction-zone";

export interface PostTextureSkin {
  id: PostTextureId;
  label: string;
  description: string;
  animated: boolean;
}

export const STATIC_POST_TEXTURES: readonly PostTextureSkin[] = [
  {
    id: "paper-fiber",
    label: "Paper Fiber",
    description: "Soft pulp, deckled grain, and warm print stock.",
    animated: false,
  },
  {
    id: "newsprint-dots",
    label: "Newsprint Dots",
    description: "Dense offset dots with imperfect ink coverage.",
    animated: false,
  },
  {
    id: "xerox-grain",
    label: "Xerox Grain",
    description: "Photocopier dust, toner noise, and hard contrast.",
    animated: false,
  },
  {
    id: "canvas-weave",
    label: "Canvas Weave",
    description: "Fine crossed threads with tactile depth.",
    animated: false,
  },
  {
    id: "blueprint-grid",
    label: "Blueprint Grid",
    description: "Technical graph lines and drafting subdivisions.",
    animated: false,
  },
  {
    id: "pixel-checker",
    label: "Pixel Checker",
    description: "Chunky two-step tiles for game-card energy.",
    animated: false,
  },
  {
    id: "speckled-ink",
    label: "Speckled Ink",
    description: "Loose ink flecks and screen-print variation.",
    animated: false,
  },
  {
    id: "chrome-grid",
    label: "Chrome Grid",
    description: "Reflective diagonal mesh with cyber sheen.",
    animated: false,
  },
  {
    id: "photocopy-bands",
    label: "Copy Bands",
    description: "Horizontal copier passes and faded toner bars.",
    animated: false,
  },
  {
    id: "starfield",
    label: "Starfield",
    description: "Tiny tiled stars from a midnight web page.",
    animated: false,
  },
  {
    id: "circuit-trace",
    label: "Circuit Trace",
    description: "Orthogonal signal paths and board contacts.",
    animated: false,
  },
  {
    id: "sticker-scrape",
    label: "Sticker Scrape",
    description: "Scuffed adhesive, scratches, and peeled edges.",
    animated: false,
  },
] as const;

export const ANIMATED_POST_TEXTURES: readonly PostTextureSkin[] = [
  {
    id: "marquee-stars",
    label: "Marquee Stars",
    description: "A scrolling star tile inspired by early fan sites.",
    animated: true,
  },
  {
    id: "blink-grid",
    label: "Blink Grid",
    description: "Pulsing table cells with a restrained BLINK rhythm.",
    animated: true,
  },
  {
    id: "rainbow-road",
    label: "Rainbow Road",
    description: "A looping web-safe rainbow signal ribbon.",
    animated: true,
  },
  {
    id: "construction-zone",
    label: "Under Construction",
    description: "Animated hazard tape from the classic web era.",
    animated: true,
  },
] as const;

export const POST_TEXTURE_SKINS: readonly PostTextureSkin[] = [
  ...STATIC_POST_TEXTURES,
  ...ANIMATED_POST_TEXTURES,
] as const;

const POST_TEXTURE_IDS = new Set<string>([
  "none",
  ...POST_TEXTURE_SKINS.map((texture) => texture.id),
]);

export function isPostTextureId(value: unknown): value is PostTextureId {
  return typeof value === "string" && POST_TEXTURE_IDS.has(value);
}
