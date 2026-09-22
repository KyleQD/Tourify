import {
  DEFAULT_EPK_APPEARANCE,
  type EpkAppearance,
} from "@/lib/epk/epk-appearance";
import type {
  AppearanceTemplateDefinition,
  PostStyleConfigurationV3,
  PremiereControlManifest,
  PremierePalette,
  PremiereStyleId,
} from "./contracts";

const CAPABILITIES: AppearanceTemplateDefinition["capabilities"] = {
  epk: {
    status: "unsupported",
    reason: "Premiere styles are designed for posts.",
  },
  "post-feed": { status: "supported" },
  "post-detail": { status: "supported" },
  "post-compact": { status: "compact-only" },
};

function palette(
  id: string,
  label: string,
  surface: string,
  foreground: string,
  primary: string,
  secondary: string,
  border = primary,
): PremierePalette {
  return {
    id,
    label,
    colors: { surface, foreground, primary, secondary, border },
  };
}

function appearanceFromPalette(
  colors: PremierePalette["colors"],
  overrides: Partial<EpkAppearance> = {},
): EpkAppearance {
  return {
    ...DEFAULT_EPK_APPEARANCE,
    cardBackgroundHex: colors.surface,
    textColorCustomHex: colors.foreground,
    accentHex: colors.primary,
    secondaryAccentHex: colors.secondary,
    borderColorHex: colors.border,
    cardRadius: "sharp",
    borderStrength: "strong",
    surfaceStyle: "solid",
    effectStyle: "grain",
    effectIntensity: "medium",
    sectionSpacing: "compact",
    ...overrides,
  };
}

function configuration(
  selectedPalette: PremierePalette,
  textureId: PostStyleConfigurationV3["textureId"],
  typography: PostStyleConfigurationV3["typography"],
  treatment: Partial<PostStyleConfigurationV3["treatment"]>,
  appearance: Partial<EpkAppearance> = {},
): PostStyleConfigurationV3 {
  return {
    appearance: appearanceFromPalette(selectedPalette.colors, appearance),
    paletteId: selectedPalette.id,
    textureId,
    typography,
    treatment: {
      intensity: 72,
      patternScale: 12,
      angle: 15,
      distress: 38,
      registrationOffset: 3,
      invert: false,
      ...treatment,
    },
  };
}

const spritePalettes = [
  palette(
    "arcade-night",
    "Arcade Night",
    "#0b1026",
    "#f7f4ff",
    "#ff4fd8",
    "#53e7ff",
    "#7657ff",
  ),
  palette(
    "forest-quest",
    "Forest Quest",
    "#102319",
    "#f5ffd0",
    "#a7f542",
    "#ffcf4a",
    "#4fc98a",
  ),
  palette(
    "lava-level",
    "Lava Level",
    "#25100d",
    "#fff0ce",
    "#ff533d",
    "#ffc83d",
    "#ff784f",
  ),
];
const terminalPalettes = [
  palette(
    "phosphor",
    "Phosphor",
    "#031108",
    "#b7ffbf",
    "#4dff72",
    "#93ff9f",
    "#247a36",
  ),
  palette(
    "amber",
    "Amber Monitor",
    "#160e02",
    "#ffe4a3",
    "#ffb52e",
    "#ffe082",
    "#8f5e13",
  ),
  palette(
    "ice",
    "Ice Terminal",
    "#031017",
    "#cff7ff",
    "#59e6ff",
    "#8af1ff",
    "#277384",
  ),
];
const risoPalettes = [
  palette(
    "tomato-blue",
    "Tomato + Blue",
    "#f5edda",
    "#1d2330",
    "#ef4338",
    "#2357d8",
    "#c83d35",
  ),
  palette(
    "soy-violet",
    "Soy Violet",
    "#f4eedf",
    "#241828",
    "#8b3fd1",
    "#ff6d51",
    "#6e34a2",
  ),
  palette(
    "forest-flame",
    "Forest + Flame",
    "#f3efd9",
    "#15251f",
    "#1c7652",
    "#f15b35",
    "#1c7652",
  ),
];
const cmykPalettes = [
  palette(
    "process",
    "Process",
    "#fffdf7",
    "#151515",
    "#00a9e8",
    "#ec168c",
    "#151515",
  ),
  palette(
    "night-process",
    "Night Process",
    "#101014",
    "#fffdf7",
    "#00d7ff",
    "#ff3caf",
    "#ffe600",
  ),
  palette(
    "soft-proof",
    "Soft Proof",
    "#f7f1e8",
    "#292229",
    "#14a7a8",
    "#d23d77",
    "#d2a900",
  ),
];
const halftonePalettes = [
  palette(
    "newsprint",
    "Newsprint",
    "#efe9db",
    "#171511",
    "#d42d20",
    "#171511",
    "#171511",
  ),
  palette(
    "blue-ink",
    "Blue Ink",
    "#f1ead8",
    "#101f35",
    "#174ea6",
    "#ee5b34",
    "#174ea6",
  ),
  palette(
    "acid-press",
    "Acid Press",
    "#e8ff3b",
    "#151515",
    "#151515",
    "#e62d7a",
    "#151515",
  ),
];
const oneBitPalettes = [
  palette(
    "paper",
    "Paper",
    "#f8f5e9",
    "#080808",
    "#080808",
    "#f8f5e9",
    "#080808",
  ),
  palette(
    "negative",
    "Negative",
    "#070707",
    "#f8f8ed",
    "#f8f8ed",
    "#070707",
    "#f8f8ed",
  ),
  palette("lcd", "LCD", "#bfd39d", "#18251b", "#18251b", "#bfd39d", "#18251b"),
];
const punkPalettes = [
  palette(
    "xerox-red",
    "Xerox Red",
    "#eee6d6",
    "#111111",
    "#dd1f24",
    "#111111",
    "#111111",
  ),
  palette(
    "bruise",
    "Bruise",
    "#e9dfcf",
    "#171218",
    "#7c2bc2",
    "#ef392f",
    "#171218",
  ),
  palette(
    "hazard",
    "Hazard",
    "#f4dd23",
    "#111111",
    "#e32620",
    "#111111",
    "#111111",
  ),
];
const bootlegPalettes = [
  palette(
    "violet-crush",
    "Violet Crush",
    "#130f1f",
    "#f4edff",
    "#a85cff",
    "#47e7ff",
    "#ff4fa3",
  ),
  palette(
    "toxic-copy",
    "Toxic Copy",
    "#12170d",
    "#f3ffd9",
    "#b8ff3d",
    "#ff4ec7",
    "#769f24",
  ),
  palette(
    "dusty-cd",
    "Dusty CD",
    "#ddd5c8",
    "#19171c",
    "#5f49c7",
    "#d53777",
    "#19171c",
  ),
];

type PremiereSeed = {
  id: PremiereStyleId;
  label: string;
  description: string;
  eyebrow: string;
  aliases: string[];
  skinId: string;
  layoutId: string;
  palettes: PremierePalette[];
  textureId: NonNullable<PostStyleConfigurationV3["textureId"]>;
  typography: PostStyleConfigurationV3["typography"];
  treatment: Partial<PostStyleConfigurationV3["treatment"]>;
  appearance?: Partial<EpkAppearance>;
  controls: PremiereControlManifest;
};

const seeds: PremiereSeed[] = [
  {
    id: "16-bit-sprite",
    label: "16-Bit Sprite",
    eyebrow: "PLAYER SELECT",
    description:
      "Polished sprite-era UI with stepped borders, pixel shadows, and arcade color.",
    aliases: ["16 bit", "sprite", "pixel game"],
    skinId: "bold",
    layoutId: "sprite",
    textureId: "pixel-checker",
    palettes: spritePalettes,
    typography: {
      headingFont: "wide",
      bodyFont: "mono",
      case: "uppercase",
      tracking: "wide",
    },
    treatment: {
      intensity: 78,
      patternScale: 8,
      angle: 0,
      distress: 8,
      registrationOffset: 4,
    },
    controls: {
      intensityLabel: "Arcade power",
      scaleLabel: "Pixel scale",
      offsetLabel: "Block shadow",
      supportsAngle: false,
      supportsDistress: false,
      supportsInvert: false,
    },
  },
  {
    id: "terminal",
    label: "Terminal",
    eyebrow: "SYSTEM ONLINE",
    description:
      "Phosphor terminal chrome, scanlines, prompt labels, and restrained CRT glow.",
    aliases: ["crt", "command line", "console"],
    skinId: "minimal",
    layoutId: "terminal",
    textureId: "photocopy-bands",
    palettes: terminalPalettes,
    typography: {
      headingFont: "mono",
      bodyFont: "mono",
      case: "normal",
      tracking: "normal",
    },
    treatment: {
      intensity: 62,
      patternScale: 5,
      angle: 0,
      distress: 12,
      registrationOffset: 2,
    },
    controls: {
      intensityLabel: "Phosphor glow",
      scaleLabel: "Scanline pitch",
      offsetLabel: "Ghosting",
      supportsAngle: false,
      supportsDistress: true,
      supportsInvert: true,
    },
    appearance: { borderStrength: "default", effectStyle: "glow" },
  },
  {
    id: "risograph",
    label: "Risograph",
    eyebrow: "TWO INK EDITION",
    description:
      "Warm stock, two-ink layers, fibrous texture, and deliberate registration drift.",
    aliases: ["riso", "two ink", "print"],
    skinId: "classic",
    layoutId: "risograph",
    textureId: "paper-fiber",
    palettes: risoPalettes,
    typography: {
      headingFont: "slab",
      bodyFont: "sans",
      case: "normal",
      tracking: "normal",
    },
    treatment: {
      intensity: 72,
      patternScale: 14,
      angle: 12,
      distress: 55,
      registrationOffset: 4,
    },
    controls: {
      intensityLabel: "Ink load",
      scaleLabel: "Fiber scale",
      offsetLabel: "Misregistration",
      supportsAngle: true,
      supportsDistress: true,
      supportsInvert: false,
    },
  },
  {
    id: "cmyk-dots",
    label: "CMYK Dots",
    eyebrow: "PROCESS PROOF",
    description:
      "Overlapping process screens, registration marks, and crisp editorial structure.",
    aliases: ["CYMKDots", "cmyk", "process dots"],
    skinId: "gallery",
    layoutId: "cmyk",
    textureId: "blueprint-grid",
    palettes: cmykPalettes,
    typography: {
      headingFont: "condensed",
      bodyFont: "geometric",
      case: "uppercase",
      tracking: "wide",
    },
    treatment: {
      intensity: 68,
      patternScale: 11,
      angle: 30,
      distress: 10,
      registrationOffset: 3,
    },
    controls: {
      intensityLabel: "Ink coverage",
      scaleLabel: "Dot size",
      offsetLabel: "Plate offset",
      supportsAngle: true,
      supportsDistress: false,
      supportsInvert: false,
    },
  },
  {
    id: "halftone-print",
    label: "Halftone Print",
    eyebrow: "LATE EDITION",
    description:
      "Newspaper dots, slab headlines, hard ink contrast, and a punchy offset shadow.",
    aliases: ["halftone", "newspaper", "comic print"],
    skinId: "poster",
    layoutId: "halftone",
    textureId: "newsprint-dots",
    palettes: halftonePalettes,
    typography: {
      headingFont: "slab",
      bodyFont: "condensed",
      case: "uppercase",
      tracking: "tight",
    },
    treatment: {
      intensity: 82,
      patternScale: 9,
      angle: 22,
      distress: 46,
      registrationOffset: 5,
    },
    controls: {
      intensityLabel: "Ink pressure",
      scaleLabel: "Dot size",
      offsetLabel: "Print shadow",
      supportsAngle: true,
      supportsDistress: true,
      supportsInvert: false,
    },
  },
  {
    id: "dithered-1-bit",
    label: "Dithered 1-Bit",
    eyebrow: "1 BIT / 2 COLOR",
    description:
      "Strict two-color Bayer patterns, binary labels, and uncompromising square geometry.",
    aliases: ["1 bit", "dither", "monochrome"],
    skinId: "minimal",
    layoutId: "one-bit",
    textureId: "xerox-grain",
    palettes: oneBitPalettes,
    typography: {
      headingFont: "mono",
      bodyFont: "mono",
      case: "uppercase",
      tracking: "normal",
    },
    treatment: {
      intensity: 88,
      patternScale: 6,
      angle: 0,
      distress: 0,
      registrationOffset: 2,
    },
    controls: {
      intensityLabel: "Threshold",
      scaleLabel: "Matrix size",
      offsetLabel: "Bit shadow",
      supportsAngle: false,
      supportsDistress: false,
      supportsInvert: true,
    },
  },
  {
    id: "punk-collage",
    label: "Punk Collage",
    eyebrow: "CUT / PASTE / REPEAT",
    description:
      "Torn-paper framing, tape marks, photocopy grit, and confrontational flyer type.",
    aliases: ["punk", "collage", "xerox", "zine"],
    skinId: "poster",
    layoutId: "punk",
    textureId: "sticker-scrape",
    palettes: punkPalettes,
    typography: {
      headingFont: "display",
      bodyFont: "condensed",
      case: "uppercase",
      tracking: "tight",
    },
    treatment: {
      intensity: 86,
      patternScale: 16,
      angle: -3,
      distress: 78,
      registrationOffset: 6,
    },
    controls: {
      intensityLabel: "Flyer energy",
      scaleLabel: "Paper grain",
      offsetLabel: "Cutout offset",
      supportsAngle: true,
      supportsDistress: true,
      supportsInvert: false,
    },
  },
  {
    id: "bootleg-pixel",
    label: "Bootleg Pixel",
    eyebrow: "UNLICENSED SIGNAL",
    description:
      "Degraded pixel grids, chromatic offsets, corrupted labels, and digital-zine attitude.",
    aliases: ["bootleg", "glitch pixel", "webcore"],
    skinId: "modern",
    layoutId: "bootleg",
    textureId: "chrome-grid",
    palettes: bootlegPalettes,
    typography: {
      headingFont: "wide",
      bodyFont: "mono",
      case: "uppercase",
      tracking: "wide",
    },
    treatment: {
      intensity: 84,
      patternScale: 10,
      angle: 0,
      distress: 64,
      registrationOffset: 5,
    },
    controls: {
      intensityLabel: "Signal damage",
      scaleLabel: "Pixel block",
      offsetLabel: "Chromatic split",
      supportsAngle: false,
      supportsDistress: true,
      supportsInvert: true,
    },
  },
];

export const PREMIERE_STYLE_IDS = seeds.map(
  (seed) => seed.id,
) as PremiereStyleId[];

export const PREMIERE_POST_TEMPLATES: AppearanceTemplateDefinition[] =
  seeds.map((seed) => {
    const selectedPalette = seed.palettes[0];
    const defaultConfiguration = configuration(
      selectedPalette,
      seed.textureId,
      seed.typography,
      seed.treatment,
      seed.appearance,
    );
    return {
      id: seed.id,
      version: 1,
      label: seed.label,
      description: seed.description,
      skinId: seed.skinId,
      family: "post-premiere",
      layoutId: seed.layoutId,
      aliases: seed.aliases,
      accentColor: selectedPalette.colors.primary,
      capabilities: CAPABILITIES,
      lifecycle: "active",
      entitlement: "free",
      defaultAppearance: defaultConfiguration.appearance,
      premiere: {
        eyebrow: seed.eyebrow,
        aliases: seed.aliases,
        palettes: seed.palettes,
        controls: seed.controls,
        defaultConfiguration,
      },
    };
  });

export function isPremiereStyleId(value: string): value is PremiereStyleId {
  return (PREMIERE_STYLE_IDS as string[]).includes(value);
}
