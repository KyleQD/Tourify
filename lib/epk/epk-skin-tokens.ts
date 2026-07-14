export type EpkSkinId =
  | "modern"
  | "classic"
  | "minimal"
  | "bold"
  | "cinema"
  | "gallery"
  | "luxe"
  | "poster"
  | "coastal"

export interface EpkSkinTokens {
  page: string
  /** Section / card shell */
  card: string
  cardMuted: string
  heading: string
  subheading: string
  badge: string
  btnPrimary: string
  btnGhost: string
  dashed: string
  accentIcon: string
  oneLinerWrap: string
  /** Secondary / supporting text */
  muted: string
  /** Uppercase micro labels (stats, contact dt) */
  label: string
  /** Press “Read” and similar links */
  link: string
  /** Hero / standalone stat cell shell */
  statCell: string
  /** Stat number emphasis */
  statValue: string
  /** Music track art placeholder when no cover */
  trackArtFallback: string
  /** Primary body text on cards (titles, venue names) */
  bodyStrong: string
  /** Social / booking outline button */
  outlineBtn: string
  /** Whether placeholders use light (dark-on-light) tone */
  isLightSurface: boolean
}

export const EPK_SKIN_TOKENS: Record<EpkSkinId, EpkSkinTokens> = {
  modern: {
    page: "relative min-h-screen overflow-hidden bg-[#07080f] text-white",
    card: "rounded-2xl border border-white/10 bg-white/[0.04] p-5 sm:p-6",
    cardMuted: "rounded-2xl border border-white/10 bg-white/[0.03]",
    heading: "text-lg font-semibold text-white",
    subheading: "text-sm text-white/80",
    badge: "rounded-lg border border-white/15 bg-white/10 px-3 py-1 text-sm font-normal text-white/90",
    btnPrimary: "rounded-xl bg-indigo-500 text-white hover:bg-indigo-400",
    btnGhost: "rounded-xl border border-white/20 bg-transparent text-white hover:bg-white/10",
    dashed: "border-dashed border-white/15 bg-white/[0.02]",
    accentIcon: "text-indigo-300",
    oneLinerWrap:
      "rounded-2xl border border-indigo-500/25 bg-indigo-500/10 px-5 py-4 sm:px-6 text-center text-base leading-relaxed text-indigo-100 sm:text-lg",
    muted: "text-white/50",
    label: "text-[11px] uppercase tracking-wide text-white/45",
    link: "text-indigo-300",
    statCell: "rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-center text-white",
    statValue: "text-lg font-semibold tabular-nums text-white sm:text-xl",
    trackArtFallback: "bg-gradient-to-br from-indigo-600 to-violet-600",
    bodyStrong: "font-medium text-white",
    outlineBtn: "border-white/20 bg-white/[0.04] text-white hover:bg-white/10",
    isLightSurface: false,
  },
  classic: {
    page: "min-h-screen bg-[#f4f1ea] text-stone-900",
    card: "rounded-xl border border-stone-200/90 bg-white p-5 shadow-sm sm:p-6",
    cardMuted: "rounded-xl border border-stone-200 bg-stone-50/80",
    heading: "font-serif text-xl font-semibold text-stone-900",
    subheading: "text-sm leading-relaxed text-stone-600",
    badge: "rounded-md border border-amber-200/80 bg-amber-50 px-3 py-1 text-sm text-amber-950",
    btnPrimary: "rounded-lg bg-amber-800 text-white hover:bg-amber-900",
    btnGhost: "rounded-lg border border-stone-300 bg-white text-stone-800 hover:bg-stone-50",
    dashed: "border-dashed border-stone-300 bg-stone-50/50",
    accentIcon: "text-amber-800",
    oneLinerWrap:
      "rounded-lg border-l-4 border-amber-800/70 bg-white px-5 py-4 text-center font-serif text-lg italic leading-relaxed text-stone-800 shadow-sm",
    muted: "text-stone-500",
    label: "text-[11px] uppercase tracking-wide text-stone-500",
    link: "text-amber-800",
    statCell: "rounded-xl border border-stone-200 bg-amber-50/50 px-3 py-3 text-center text-stone-900",
    statValue: "text-lg font-semibold tabular-nums text-stone-900 sm:text-xl",
    trackArtFallback: "bg-gradient-to-br from-amber-600 to-rose-500",
    bodyStrong: "font-medium text-stone-900",
    outlineBtn: "border-stone-300 bg-white text-stone-800 hover:bg-stone-50",
    isLightSurface: true,
  },
  minimal: {
    page: "min-h-screen bg-black text-white",
    card: "border border-white/12 bg-black p-5 sm:p-6",
    cardMuted: "border border-white/10 bg-white/[0.02]",
    heading: "text-xs font-medium uppercase tracking-[0.35em] text-white/90",
    subheading: "text-sm font-light leading-relaxed text-white/55",
    badge: "border border-white/20 bg-transparent px-3 py-1 text-xs uppercase tracking-widest text-white/70",
    btnPrimary: "rounded-none border border-white bg-white px-6 py-2 text-xs uppercase tracking-[0.2em] text-black hover:bg-white/90",
    btnGhost: "rounded-none border border-white/30 bg-transparent px-6 py-2 text-xs uppercase tracking-[0.2em] text-white hover:bg-white/10",
    dashed: "border-dashed border-white/20 bg-transparent",
    accentIcon: "text-white/50",
    oneLinerWrap:
      "border border-white/15 bg-white/[0.03] px-5 py-5 text-center text-sm font-light leading-relaxed tracking-wide text-white/75",
    muted: "text-white/45",
    label: "text-[11px] uppercase tracking-wide text-white/40",
    link: "text-white/70",
    statCell: "rounded-none border border-white/10 bg-white/[0.04] px-3 py-3 text-center",
    statValue: "text-lg font-semibold tabular-nums text-white sm:text-xl",
    trackArtFallback: "bg-white/10",
    bodyStrong: "font-medium text-white",
    outlineBtn: "rounded-none border border-white/30 bg-transparent text-white hover:bg-white/10",
    isLightSurface: false,
  },
  bold: {
    page: "min-h-screen bg-black text-white",
    card: "rounded-none border-4 border-[#facc15] bg-black p-5 sm:p-6",
    cardMuted: "rounded-none border-2 border-white/25 bg-zinc-950 p-4",
    heading: "text-2xl font-black uppercase tracking-tight text-[#facc15]",
    subheading: "text-sm font-bold uppercase tracking-wide text-white/85",
    badge: "rounded-none border-2 border-[#facc15] bg-[#facc15] px-3 py-1 text-xs font-black uppercase text-black",
    btnPrimary: "rounded-none border-2 border-[#facc15] bg-[#facc15] px-6 py-2 text-sm font-black uppercase text-black hover:bg-[#eab308]",
    btnGhost: "rounded-none border-2 border-white bg-transparent px-6 py-2 text-sm font-black uppercase text-white hover:bg-white hover:text-black",
    dashed: "border-4 border-dashed border-white/30 bg-zinc-950",
    accentIcon: "text-[#facc15]",
    oneLinerWrap:
      "border-l-8 border-[#facc15] bg-zinc-950 px-5 py-4 text-center text-base font-black uppercase leading-snug tracking-wide text-white",
    muted: "text-white/75",
    label: "text-[11px] uppercase tracking-wide text-white/80",
    link: "text-[#facc15]",
    statCell: "rounded-none border-2 border-[#facc15] bg-zinc-950 px-3 py-3 text-center text-white",
    statValue: "text-lg font-black tabular-nums text-[#facc15] sm:text-xl",
    trackArtFallback: "bg-zinc-800",
    bodyStrong: "font-black uppercase text-white",
    outlineBtn: "rounded-none border-2 border-white bg-transparent text-white hover:bg-white hover:text-black",
    isLightSurface: false,
  },
  cinema: {
    page: "relative min-h-screen overflow-hidden bg-[#0c0c0e] text-zinc-100",
    card: "rounded-sm border border-white/10 bg-zinc-950/80 p-5 sm:p-6",
    cardMuted: "rounded-sm border border-white/8 bg-black/40",
    heading: "text-sm font-medium uppercase tracking-[0.28em] text-zinc-200",
    subheading: "text-sm leading-relaxed text-zinc-400",
    badge: "rounded-sm border border-zinc-500/40 bg-zinc-900 px-3 py-1 text-xs uppercase tracking-[0.2em] text-zinc-300",
    btnPrimary: "rounded-sm bg-zinc-200 text-zinc-950 hover:bg-white",
    btnGhost: "rounded-sm border border-zinc-500/50 bg-transparent text-zinc-200 hover:bg-white/5",
    dashed: "border-dashed border-zinc-700 bg-black/30",
    accentIcon: "text-zinc-400",
    oneLinerWrap:
      "border-y border-zinc-700/80 bg-black/50 px-5 py-5 text-center text-base leading-relaxed tracking-wide text-zinc-300 sm:text-lg",
    muted: "text-zinc-500",
    label: "text-[11px] uppercase tracking-[0.2em] text-zinc-500",
    link: "text-zinc-300",
    statCell: "rounded-sm border border-white/10 bg-black/50 px-3 py-3 text-center text-zinc-100",
    statValue: "text-lg font-medium tabular-nums tracking-wide text-zinc-100 sm:text-xl",
    trackArtFallback: "bg-gradient-to-br from-zinc-700 to-zinc-900",
    bodyStrong: "font-medium tracking-wide text-zinc-100",
    outlineBtn: "rounded-sm border border-zinc-500/50 bg-transparent text-zinc-200 hover:bg-white/5",
    isLightSurface: false,
  },
  gallery: {
    page: "min-h-screen bg-[#fafafa] text-neutral-900",
    card: "rounded-none border border-neutral-200 bg-white p-6 sm:p-8",
    cardMuted: "rounded-none border border-neutral-200 bg-neutral-50",
    heading: "text-xs font-medium uppercase tracking-[0.3em] text-neutral-800",
    subheading: "text-sm leading-relaxed text-neutral-600",
    badge: "rounded-none border border-neutral-300 bg-transparent px-3 py-1 text-xs uppercase tracking-[0.2em] text-neutral-700",
    btnPrimary: "rounded-none bg-neutral-900 px-6 py-2 text-xs uppercase tracking-[0.15em] text-white hover:bg-neutral-800",
    btnGhost: "rounded-none border border-neutral-300 bg-white px-6 py-2 text-xs uppercase tracking-[0.15em] text-neutral-800 hover:bg-neutral-50",
    dashed: "border-dashed border-neutral-300 bg-neutral-50/80",
    accentIcon: "text-neutral-500",
    oneLinerWrap:
      "border-t border-b border-neutral-300 px-5 py-6 text-center text-lg font-light leading-relaxed text-neutral-800",
    muted: "text-neutral-500",
    label: "text-[11px] uppercase tracking-[0.2em] text-neutral-500",
    link: "text-neutral-800 underline-offset-4",
    statCell: "rounded-none border border-neutral-200 bg-white px-3 py-4 text-center text-neutral-900",
    statValue: "text-lg font-light tabular-nums text-neutral-900 sm:text-xl",
    trackArtFallback: "bg-neutral-200",
    bodyStrong: "font-medium text-neutral-900",
    outlineBtn: "rounded-none border border-neutral-300 bg-white text-neutral-800 hover:bg-neutral-50",
    isLightSurface: true,
  },
  luxe: {
    page: "relative min-h-screen overflow-hidden bg-[#0a1628] text-[#f5f0e8]",
    card: "rounded-2xl border border-[#c9a962]/25 bg-[#0d1c32]/90 p-5 sm:p-6",
    cardMuted: "rounded-2xl border border-[#c9a962]/15 bg-[#081220]/80",
    heading: "font-serif text-xl font-semibold tracking-wide text-[#e8dcc8]",
    subheading: "text-sm leading-relaxed text-[#b8a990]",
    badge: "rounded-full border border-[#c9a962]/40 bg-[#c9a962]/10 px-3 py-1 text-xs tracking-wide text-[#e8d5a8]",
    btnPrimary: "rounded-full bg-[#c9a962] px-6 text-[#0a1628] hover:bg-[#d4b978]",
    btnGhost: "rounded-full border border-[#c9a962]/40 bg-transparent text-[#e8dcc8] hover:bg-[#c9a962]/10",
    dashed: "border-dashed border-[#c9a962]/25 bg-[#081220]/50",
    accentIcon: "text-[#c9a962]",
    oneLinerWrap:
      "rounded-2xl border border-[#c9a962]/30 bg-[#c9a962]/8 px-5 py-5 text-center font-serif text-lg italic leading-relaxed text-[#e8dcc8]",
    muted: "text-[#8a7d68]",
    label: "text-[11px] uppercase tracking-[0.18em] text-[#8a7d68]",
    link: "text-[#c9a962]",
    statCell: "rounded-2xl border border-[#c9a962]/25 bg-[#081220]/70 px-3 py-3 text-center text-[#f5f0e8]",
    statValue: "text-lg font-serif tabular-nums text-[#e8d5a8] sm:text-xl",
    trackArtFallback: "bg-gradient-to-br from-[#1a3050] to-[#0a1628]",
    bodyStrong: "font-medium text-[#f5f0e8]",
    outlineBtn: "rounded-full border border-[#c9a962]/40 bg-transparent text-[#e8dcc8] hover:bg-[#c9a962]/10",
    isLightSurface: false,
  },
  poster: {
    page: "relative min-h-screen overflow-hidden bg-[#140808] text-[#faf3eb]",
    card: "rounded-none border-2 border-[#f07167] bg-[#1a0c0c] p-5 sm:p-6",
    cardMuted: "rounded-none border border-[#f07167]/40 bg-[#120808]",
    heading: "text-xl font-black uppercase tracking-tight text-[#f07167]",
    subheading: "text-sm font-semibold uppercase tracking-wide text-[#faf3eb]/85",
    badge: "rounded-none border-2 border-[#faf3eb] bg-transparent px-3 py-1 text-xs font-black uppercase tracking-widest text-[#faf3eb]",
    btnPrimary: "rounded-none border-2 border-[#f07167] bg-[#f07167] px-6 py-2 text-sm font-black uppercase text-[#140808] hover:bg-[#f48a82]",
    btnGhost: "rounded-none border-2 border-[#faf3eb] bg-transparent px-6 py-2 text-sm font-black uppercase text-[#faf3eb] hover:bg-[#faf3eb] hover:text-[#140808]",
    dashed: "border-2 border-dashed border-[#f07167]/40 bg-[#120808]",
    accentIcon: "text-[#f07167]",
    oneLinerWrap:
      "border-l-8 border-[#f07167] bg-[#1a0c0c] px-5 py-4 text-center text-base font-black uppercase leading-snug tracking-wide text-[#faf3eb]",
    muted: "text-[#faf3eb]/70",
    label: "text-[11px] uppercase tracking-wide text-[#faf3eb]/75",
    link: "text-[#f07167]",
    statCell: "rounded-none border-2 border-[#f07167] bg-[#120808] px-3 py-3 text-center text-[#faf3eb]",
    statValue: "text-lg font-black tabular-nums text-[#f07167] sm:text-xl",
    trackArtFallback: "bg-gradient-to-br from-[#5c1a1a] to-[#140808]",
    bodyStrong: "font-black uppercase text-[#faf3eb]",
    outlineBtn: "rounded-none border-2 border-[#faf3eb] bg-transparent text-[#faf3eb] hover:bg-[#faf3eb] hover:text-[#140808]",
    isLightSurface: false,
  },
  coastal: {
    page: "min-h-screen bg-[#e8efe9] text-[#1a3a3a]",
    card: "rounded-3xl border border-[#b8cfc4]/60 bg-[#f4f8f5]/90 p-5 shadow-sm sm:p-6",
    cardMuted: "rounded-2xl border border-[#b8cfc4]/50 bg-[#dff0e8]/60",
    heading: "text-lg font-semibold tracking-tight text-[#1a3a3a]",
    subheading: "text-sm leading-relaxed text-[#3d5c5c]",
    badge: "rounded-full border border-[#5a9a8a]/40 bg-[#c5e0d6]/50 px-3 py-1 text-sm text-[#1a3a3a]",
    btnPrimary: "rounded-full bg-[#2d6a5a] text-white hover:bg-[#245a4c]",
    btnGhost: "rounded-full border border-[#5a9a8a]/50 bg-white/70 text-[#1a3a3a] hover:bg-white",
    dashed: "border-dashed border-[#b8cfc4] bg-[#dff0e8]/40",
    accentIcon: "text-[#2d6a5a]",
    oneLinerWrap:
      "rounded-3xl border border-[#5a9a8a]/30 bg-white/70 px-5 py-5 text-center text-base leading-relaxed text-[#1a3a3a] sm:text-lg",
    muted: "text-[#5a7a7a]",
    label: "text-[11px] uppercase tracking-wide text-[#5a7a7a]",
    link: "text-[#2d6a5a]",
    statCell: "rounded-2xl border border-[#b8cfc4]/60 bg-white/80 px-3 py-3 text-center text-[#1a3a3a]",
    statValue: "text-lg font-semibold tabular-nums text-[#2d6a5a] sm:text-xl",
    trackArtFallback: "bg-gradient-to-br from-[#7ab8a8] to-[#3d7a6a]",
    bodyStrong: "font-medium text-[#1a3a3a]",
    outlineBtn: "rounded-full border border-[#5a9a8a]/50 bg-white/70 text-[#1a3a3a] hover:bg-white",
    isLightSurface: true,
  },
}

/** Skins that use light page backgrounds (placeholder / cover controls). */
export function isEpkLightSkin(skin: EpkSkinId): boolean {
  return EPK_SKIN_TOKENS[skin].isLightSurface
}

/** Maps editor template ids (and legacy accent aliases) to render skins. */
export function resolveEpkPreviewTemplateId(template: string | undefined): EpkSkinId {
  const t = String(template || "modern").toLowerCase()
  switch (t) {
    case "modern":
      return "modern"
    case "classic":
      return "classic"
    case "minimal":
      return "minimal"
    case "bold":
      return "bold"
    case "cinema":
      return "cinema"
    case "gallery":
      return "gallery"
    case "luxe":
      return "luxe"
    case "poster":
      return "poster"
    case "coastal":
      return "coastal"
    case "black":
      return "minimal"
    case "neon":
      return "bold"
    case "sunset":
      return "classic"
    default:
      return "modern"
  }
}
