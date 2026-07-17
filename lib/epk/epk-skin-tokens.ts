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
  | "scrapbook"
  | "bandcard"
  | "dossier"
  | "pressgrid"
  | "redcolumn"
  | "checkerboard"
  | "editorial"
  | "whitespace"
  | "colorblock"
  | "sunburst"

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
    page: "relative min-h-screen overflow-hidden bg-[#060711] text-slate-50",
    card: "rounded-[1.75rem] border border-white/10 bg-[#101323]/78 p-5 sm:p-7",
    cardMuted: "rounded-2xl border border-white/10 bg-white/[0.045]",
    heading: "text-xl font-semibold tracking-[-0.025em] text-white sm:text-2xl",
    subheading: "text-sm leading-7 text-slate-300/80",
    badge:
      "rounded-full border border-indigo-300/20 bg-indigo-400/10 px-3 py-1 text-xs font-medium text-indigo-100",
    btnPrimary:
      "rounded-xl border border-indigo-300/20 bg-indigo-500 px-5 text-white shadow-[0_12px_30px_rgba(79,70,229,0.28)] hover:bg-indigo-400",
    btnGhost:
      "rounded-xl border border-white/15 bg-white/[0.045] text-white backdrop-blur-md hover:bg-white/10",
    dashed: "rounded-2xl border border-dashed border-white/15 bg-white/[0.025]",
    accentIcon: "text-indigo-300",
    oneLinerWrap:
      "rounded-[1.75rem] border border-indigo-400/20 bg-[linear-gradient(135deg,rgba(99,102,241,0.14),rgba(255,255,255,0.035))] px-6 py-6 text-center text-base leading-8 text-indigo-50 shadow-[0_20px_60px_rgba(0,0,0,0.22)] sm:px-10 sm:text-lg",
    muted: "text-slate-400/70",
    label: "text-[10px] uppercase tracking-[0.2em] text-slate-400/65",
    link: "text-indigo-300",
    statCell:
      "rounded-2xl border border-white/10 bg-black/20 px-3 py-4 text-center text-white backdrop-blur-md",
    statValue:
      "text-xl font-semibold tabular-nums tracking-[-0.03em] text-white sm:text-2xl",
    trackArtFallback:
      "rounded-xl bg-gradient-to-br from-indigo-500 via-violet-600 to-fuchsia-600",
    bodyStrong: "font-medium tracking-[-0.01em] text-white",
    outlineBtn:
      "rounded-xl border-white/15 bg-white/[0.04] text-white hover:bg-white/10",
    isLightSurface: false,
  },
  classic: {
    page: "relative min-h-screen bg-[#f3eee4] text-stone-900",
    card: "rounded-xl border border-[#d8cdbd] bg-[#fffdf8]/95 p-5 shadow-[0_16px_45px_rgba(93,64,35,0.07)] sm:p-7",
    cardMuted: "rounded-lg border border-[#ded4c5] bg-[#f8f3ea]",
    heading: "font-serif text-2xl font-semibold tracking-tight text-stone-900",
    subheading: "font-serif text-[15px] leading-7 text-stone-600",
    badge:
      "rounded-md border border-amber-900/20 bg-amber-800/[0.07] px-3 py-1 text-xs font-medium text-amber-950",
    btnPrimary:
      "rounded-md bg-[#6f3e24] px-5 text-white shadow-sm hover:bg-[#5d321e]",
    btnGhost:
      "rounded-md border border-stone-300 bg-[#fffdf8] text-stone-800 hover:bg-white",
    dashed: "rounded-lg border border-dashed border-stone-300 bg-[#f8f3ea]/65",
    accentIcon: "text-[#7c4a2d]",
    oneLinerWrap:
      "rounded-lg border-y border-[#cbbba7] bg-[#fffdf8]/80 px-6 py-7 text-center font-serif text-lg italic leading-8 text-stone-800 shadow-[0_12px_35px_rgba(93,64,35,0.05)] sm:px-12",
    muted: "text-stone-500",
    label: "text-[10px] uppercase tracking-[0.2em] text-stone-500",
    link: "text-[#7c4a2d]",
    statCell:
      "rounded-lg border border-[#ded4c5] bg-[#f8f3ea] px-3 py-4 text-center text-stone-900",
    statValue:
      "font-serif text-xl font-semibold tabular-nums text-stone-900 sm:text-2xl",
    trackArtFallback:
      "rounded-md bg-gradient-to-br from-[#9a5e35] to-[#c08b5f]",
    bodyStrong: "font-serif font-semibold text-stone-900",
    outlineBtn:
      "rounded-md border-stone-300 bg-[#fffdf8] text-stone-800 hover:bg-white",
    isLightSurface: true,
  },
  minimal: {
    page: "relative min-h-screen bg-[#050505] text-white",
    card: "rounded-none border border-white/15 bg-transparent p-5 sm:p-7",
    cardMuted: "rounded-none border border-white/12 bg-transparent",
    heading:
      "text-[11px] font-medium uppercase tracking-[0.34em] text-white/90",
    subheading: "text-sm font-light leading-7 tracking-[0.015em] text-white/58",
    badge:
      "rounded-none border border-white/25 bg-transparent px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-white/70",
    btnPrimary:
      "rounded-none border border-white bg-white px-6 py-2 text-[10px] font-medium uppercase tracking-[0.22em] text-black hover:bg-white/90",
    btnGhost:
      "rounded-none border border-white/30 bg-transparent px-6 py-2 text-[10px] font-medium uppercase tracking-[0.22em] text-white hover:bg-white/[0.08]",
    dashed: "rounded-none border border-dashed border-white/18 bg-transparent",
    accentIcon: "text-white/55",
    oneLinerWrap:
      "rounded-none border-y border-white/15 bg-transparent px-6 py-8 text-center text-sm font-light leading-8 tracking-[0.05em] text-white/72 sm:px-14",
    muted: "text-white/42",
    label: "text-[10px] uppercase tracking-[0.22em] text-white/40",
    link: "text-white/78 underline-offset-4",
    statCell:
      "rounded-none border border-white/12 bg-white/[0.02] px-3 py-4 text-center",
    statValue:
      "text-xl font-light tabular-nums tracking-[-0.03em] text-white sm:text-2xl",
    trackArtFallback: "rounded-none bg-white/[0.07]",
    bodyStrong: "font-normal tracking-wide text-white",
    outlineBtn:
      "rounded-none border-white/30 bg-transparent text-white hover:bg-white/[0.08]",
    isLightSurface: false,
  },
  bold: {
    page: "relative min-h-screen bg-[#050505] text-white",
    card: "rounded-none border-4 border-[#facc15] bg-[#080808] p-5 sm:p-7",
    cardMuted: "rounded-none border-2 border-white/25 bg-[#111111]",
    heading:
      "text-2xl font-black uppercase leading-none tracking-[-0.04em] text-[#facc15]",
    subheading:
      "text-sm font-bold uppercase leading-6 tracking-[0.05em] text-white/86",
    badge:
      "rounded-none border-2 border-[#facc15] bg-[#facc15] px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-black",
    btnPrimary:
      "rounded-none border-2 border-[#facc15] bg-[#facc15] px-6 py-2 text-xs font-black uppercase tracking-[0.08em] text-black hover:bg-[#ffe45c]",
    btnGhost:
      "rounded-none border-2 border-white bg-transparent px-6 py-2 text-xs font-black uppercase tracking-[0.08em] text-white hover:bg-white hover:text-black",
    dashed: "rounded-none border-4 border-dashed border-white/28 bg-[#111111]",
    accentIcon: "text-[#facc15]",
    oneLinerWrap:
      "rounded-none border-4 border-[#facc15] bg-[#111111] px-6 py-6 text-center text-base font-black uppercase leading-6 tracking-[0.06em] text-white shadow-[8px_8px_0_rgba(250,204,21,0.65)]",
    muted: "text-white/68",
    label: "text-[10px] font-black uppercase tracking-[0.18em] text-white/72",
    link: "text-[#facc15]",
    statCell:
      "rounded-none border-2 border-[#facc15] bg-[#111111] px-3 py-4 text-center text-white",
    statValue:
      "text-xl font-black tabular-nums tracking-[-0.04em] text-[#facc15] sm:text-2xl",
    trackArtFallback: "rounded-none bg-[#222222]",
    bodyStrong: "font-black uppercase tracking-[-0.015em] text-white",
    outlineBtn:
      "rounded-none border-2 border-white bg-transparent text-white hover:bg-white hover:text-black",
    isLightSurface: false,
  },
  cinema: {
    page: "relative min-h-screen overflow-hidden bg-[#09090b] text-zinc-100",
    card: "rounded-sm border border-white/10 bg-[#0d0d10]/88 p-5 sm:p-7",
    cardMuted: "rounded-sm border border-white/[0.08] bg-black/35",
    heading: "text-sm font-medium uppercase tracking-[0.3em] text-zinc-200",
    subheading: "text-sm leading-7 text-zinc-400",
    badge:
      "rounded-sm border border-zinc-500/40 bg-zinc-900/80 px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-zinc-300",
    btnPrimary: "rounded-sm bg-zinc-100 px-5 text-zinc-950 hover:bg-white",
    btnGhost:
      "rounded-sm border border-zinc-500/50 bg-black/20 text-zinc-200 hover:bg-white/5",
    dashed: "rounded-sm border border-dashed border-zinc-700 bg-black/30",
    accentIcon: "text-zinc-400",
    oneLinerWrap:
      "rounded-sm border-y border-zinc-700/80 bg-black/45 px-6 py-7 text-center text-base leading-8 tracking-[0.04em] text-zinc-300 sm:px-12 sm:text-lg",
    muted: "text-zinc-500",
    label: "text-[10px] uppercase tracking-[0.24em] text-zinc-500",
    link: "text-zinc-300",
    statCell:
      "rounded-sm border border-white/10 bg-black/45 px-3 py-4 text-center text-zinc-100",
    statValue:
      "font-mono text-xl tabular-nums tracking-[0.04em] text-zinc-100 sm:text-2xl",
    trackArtFallback: "rounded-sm bg-gradient-to-br from-zinc-700 to-zinc-950",
    bodyStrong: "font-medium tracking-[0.025em] text-zinc-100",
    outlineBtn:
      "rounded-sm border-zinc-500/50 bg-black/20 text-zinc-200 hover:bg-white/5",
    isLightSurface: false,
  },
  gallery: {
    page: "relative min-h-screen bg-[#f7f7f5] text-neutral-900",
    card: "rounded-none border border-neutral-200 bg-transparent p-6 sm:p-9",
    cardMuted: "rounded-none border border-neutral-200 bg-transparent",
    heading: "text-xs font-medium uppercase tracking-[0.32em] text-neutral-800",
    subheading: "text-sm leading-7 text-neutral-600",
    badge:
      "rounded-none border border-neutral-300 bg-transparent px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-neutral-700",
    btnPrimary:
      "rounded-none bg-neutral-900 px-6 py-2 text-[10px] uppercase tracking-[0.18em] text-white hover:bg-neutral-800",
    btnGhost:
      "rounded-none border border-neutral-300 bg-transparent px-6 py-2 text-[10px] uppercase tracking-[0.18em] text-neutral-800 hover:bg-white",
    dashed:
      "rounded-none border border-dashed border-neutral-300 bg-neutral-50/55",
    accentIcon: "text-neutral-500",
    oneLinerWrap:
      "rounded-none border-y border-neutral-300 bg-transparent px-6 py-9 text-center text-lg font-light leading-8 text-neutral-800 sm:px-16",
    muted: "text-neutral-500",
    label: "text-[10px] uppercase tracking-[0.22em] text-neutral-500",
    link: "text-neutral-900 underline-offset-4",
    statCell:
      "rounded-none border border-neutral-200 bg-white/65 px-3 py-5 text-center text-neutral-900",
    statValue:
      "text-xl font-light tabular-nums tracking-[-0.04em] text-neutral-900 sm:text-2xl",
    trackArtFallback: "rounded-none bg-neutral-200",
    bodyStrong: "font-medium text-neutral-900",
    outlineBtn:
      "rounded-none border-neutral-300 bg-transparent text-neutral-800 hover:bg-white",
    isLightSurface: true,
  },
  luxe: {
    page: "relative min-h-screen overflow-hidden bg-[#120b13] text-[#f7efe2]",
    card: "rounded-[1.75rem] border border-[#d2b26f]/25 bg-[#1b111d]/88 p-5 sm:p-7",
    cardMuted: "rounded-2xl border border-[#d2b26f]/15 bg-[#0e090f]/58",
    heading:
      "font-serif text-2xl font-semibold tracking-[0.015em] text-[#f0dfbf]",
    subheading: "text-sm leading-7 text-[#c4b6a4]",
    badge:
      "rounded-full border border-[#d2b26f]/35 bg-[#d2b26f]/10 px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-[#f0dfbf]",
    btnPrimary:
      "rounded-full bg-[#d2b26f] px-6 text-[#160e17] shadow-[0_14px_36px_rgba(210,178,111,0.16)] hover:bg-[#e0c487]",
    btnGhost:
      "rounded-full border border-[#d2b26f]/35 bg-white/[0.025] text-[#f0dfbf] hover:bg-[#d2b26f]/10",
    dashed:
      "rounded-2xl border border-dashed border-[#d2b26f]/25 bg-[#0e090f]/45",
    accentIcon: "text-[#d2b26f]",
    oneLinerWrap:
      "rounded-[1.75rem] border border-[#d2b26f]/28 bg-[linear-gradient(135deg,rgba(210,178,111,0.1),rgba(255,255,255,0.015))] px-6 py-7 text-center font-serif text-lg italic leading-8 text-[#f0dfbf] shadow-[0_24px_70px_rgba(0,0,0,0.28)] sm:px-12",
    muted: "text-[#a49482]",
    label: "text-[10px] uppercase tracking-[0.22em] text-[#a49482]",
    link: "text-[#d2b26f]",
    statCell:
      "rounded-2xl border border-[#d2b26f]/22 bg-black/20 px-3 py-4 text-center text-[#f7efe2]",
    statValue: "font-serif text-xl tabular-nums text-[#f0dfbf] sm:text-2xl",
    trackArtFallback:
      "rounded-xl bg-gradient-to-br from-[#6e3f55] to-[#1a101c]",
    bodyStrong: "font-medium text-[#f7efe2]",
    outlineBtn:
      "rounded-full border-[#d2b26f]/35 bg-white/[0.025] text-[#f0dfbf] hover:bg-[#d2b26f]/10",
    isLightSurface: false,
  },
  poster: {
    page: "relative min-h-screen overflow-hidden bg-[#130909] text-[#fff4e8]",
    card: "rounded-none border-2 border-[#f07167] bg-[#1c0d0d] p-5 sm:p-7",
    cardMuted: "rounded-none border border-[#f07167]/45 bg-[#110707]",
    heading:
      "text-2xl font-black uppercase leading-none tracking-[-0.035em] text-[#f07167]",
    subheading:
      "text-sm font-semibold uppercase leading-6 tracking-[0.055em] text-[#fff4e8]/84",
    badge:
      "rounded-none border-2 border-[#fff4e8] bg-transparent px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-[#fff4e8]",
    btnPrimary:
      "rounded-none border-2 border-[#f07167] bg-[#f07167] px-6 py-2 text-xs font-black uppercase tracking-[0.08em] text-[#130909] hover:bg-[#f58b83]",
    btnGhost:
      "rounded-none border-2 border-[#fff4e8] bg-transparent px-6 py-2 text-xs font-black uppercase tracking-[0.08em] text-[#fff4e8] hover:bg-[#fff4e8] hover:text-[#130909]",
    dashed:
      "rounded-none border-2 border-dashed border-[#f07167]/45 bg-[#110707]",
    accentIcon: "text-[#f07167]",
    oneLinerWrap:
      "rounded-none border-l-8 border-[#f07167] bg-[#1c0d0d] px-6 py-6 text-center text-base font-black uppercase leading-6 tracking-[0.055em] text-[#fff4e8] shadow-[8px_8px_0_rgba(240,113,103,0.3)]",
    muted: "text-[#fff4e8]/66",
    label:
      "text-[10px] font-black uppercase tracking-[0.18em] text-[#fff4e8]/68",
    link: "text-[#f07167]",
    statCell:
      "rounded-none border-2 border-[#f07167] bg-[#110707] px-3 py-4 text-center text-[#fff4e8]",
    statValue:
      "text-xl font-black tabular-nums tracking-[-0.04em] text-[#f07167] sm:text-2xl",
    trackArtFallback:
      "rounded-none bg-gradient-to-br from-[#6d2323] to-[#160808]",
    bodyStrong: "font-black uppercase tracking-[-0.01em] text-[#fff4e8]",
    outlineBtn:
      "rounded-none border-2 border-[#fff4e8] bg-transparent text-[#fff4e8] hover:bg-[#fff4e8] hover:text-[#130909]",
    isLightSurface: false,
  },
  coastal: {
    page: "relative min-h-screen bg-[#e8f0ea] text-[#173d39]",
    card: "rounded-[2rem] border border-[#abcbbd]/65 bg-[#f9fbf8]/88 p-5 shadow-[0_18px_55px_rgba(45,106,90,0.08)] sm:p-7",
    cardMuted: "rounded-2xl border border-[#b7d2c6]/65 bg-white/62",
    heading: "text-xl font-semibold tracking-[-0.025em] text-[#173d39]",
    subheading: "text-sm leading-7 text-[#466762]",
    badge:
      "rounded-full border border-[#5a9a8a]/35 bg-[#d6e9e0]/70 px-3 py-1 text-xs text-[#173d39]",
    btnPrimary:
      "rounded-full bg-[#2d6a5a] px-5 text-white shadow-[0_12px_30px_rgba(45,106,90,0.15)] hover:bg-[#24584b]",
    btnGhost:
      "rounded-full border border-[#6aa08f]/45 bg-white/65 text-[#173d39] hover:bg-white",
    dashed: "rounded-2xl border border-dashed border-[#abcbbd] bg-white/42",
    accentIcon: "text-[#2d6a5a]",
    oneLinerWrap:
      "rounded-[2rem] border border-[#7fae9d]/35 bg-white/66 px-6 py-7 text-center text-base leading-8 text-[#173d39] shadow-[0_18px_50px_rgba(45,106,90,0.07)] sm:px-12 sm:text-lg",
    muted: "text-[#5c7c76]",
    label: "text-[10px] uppercase tracking-[0.18em] text-[#5c7c76]",
    link: "text-[#2d6a5a]",
    statCell:
      "rounded-2xl border border-[#b7d2c6]/70 bg-white/72 px-3 py-4 text-center text-[#173d39]",
    statValue:
      "text-xl font-semibold tabular-nums tracking-[-0.035em] text-[#2d6a5a] sm:text-2xl",
    trackArtFallback:
      "rounded-xl bg-gradient-to-br from-[#82b9a8] to-[#3c7d6a]",
    bodyStrong: "font-medium text-[#173d39]",
    outlineBtn:
      "rounded-full border-[#6aa08f]/45 bg-white/65 text-[#173d39] hover:bg-white",
    isLightSurface: true,
  },

  scrapbook: {
    page: "relative min-h-screen overflow-hidden bg-[#8f756b] text-[#241d19]",
    card: "rounded-none border border-[#d9cec6] bg-[#fbf8f4] p-5 shadow-[0_18px_55px_rgba(50,34,26,0.14)] sm:p-7",
    cardMuted: "rounded-none border border-[#ded4cd] bg-[#f4efea]",
    heading: "font-serif text-2xl font-semibold tracking-tight text-[#211a17]",
    subheading: "font-serif text-[15px] leading-7 text-[#574b45]",
    badge:
      "rounded-full border border-[#76968c]/45 bg-[#dce8e2] px-3 py-1 text-xs font-medium text-[#294b43]",
    btnPrimary: "rounded-full bg-[#d08156] px-5 text-white hover:bg-[#bd7048]",
    btnGhost:
      "rounded-full border border-[#9a8175] bg-white/75 text-[#3d302b] hover:bg-white",
    dashed: "rounded-none border border-dashed border-[#b8a89f] bg-[#f7f1eb]",
    accentIcon: "text-[#d08156]",
    oneLinerWrap:
      "rounded-none border-y border-[#c9b8ae] bg-[#fbf8f4] px-6 py-7 text-center font-serif text-lg italic leading-8 text-[#3d302b]",
    muted: "text-[#7b6a62]",
    label: "text-[10px] uppercase tracking-[0.2em] text-[#7b6a62]",
    link: "text-[#47756a]",
    statCell:
      "rounded-full border border-[#bdaea5] bg-white/75 px-3 py-4 text-center text-[#2f2723]",
    statValue:
      "font-serif text-xl font-semibold tabular-nums text-[#d08156] sm:text-2xl",
    trackArtFallback:
      "rounded-none bg-gradient-to-br from-[#d08156] to-[#6f9187]",
    bodyStrong: "font-serif font-semibold text-[#241d19]",
    outlineBtn:
      "rounded-full border-[#9a8175] bg-white/75 text-[#3d302b] hover:bg-white",
    isLightSurface: true,
  },
  bandcard: {
    page: "relative min-h-screen overflow-hidden bg-[#090909] text-white",
    card: "rounded-none border-l-4 border-[#f5df18] bg-[#111111] p-5 sm:p-6",
    cardMuted: "rounded-none border border-white/15 bg-[#181818]",
    heading: "text-2xl font-black uppercase tracking-[-0.04em] text-white",
    subheading: "text-sm font-medium leading-6 text-white/72",
    badge:
      "rounded-none bg-[#f5df18] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-black",
    btnPrimary:
      "rounded-none bg-[#f5df18] px-5 font-black uppercase text-black hover:bg-[#fff05a]",
    btnGhost:
      "rounded-none border border-white/40 bg-transparent font-bold uppercase text-white hover:bg-white hover:text-black",
    dashed:
      "rounded-none border-2 border-dashed border-[#f5df18]/55 bg-[#111111]",
    accentIcon: "text-[#f5df18]",
    oneLinerWrap:
      "rounded-none border-y-2 border-[#f5df18] bg-black px-5 py-5 text-center text-base font-black uppercase leading-6 text-white",
    muted: "text-white/58",
    label: "text-[10px] font-black uppercase tracking-[0.18em] text-[#f5df18]",
    link: "text-[#f5df18]",
    statCell:
      "rounded-none border border-[#f5df18]/55 bg-black px-3 py-3 text-center text-white",
    statValue: "text-xl font-black tabular-nums text-[#f5df18] sm:text-2xl",
    trackArtFallback: "rounded-none bg-[#f5df18]",
    bodyStrong: "font-black uppercase text-white",
    outlineBtn:
      "rounded-none border-white/40 bg-transparent font-bold uppercase text-white hover:bg-white hover:text-black",
    isLightSurface: false,
  },
  dossier: {
    page: "relative min-h-screen overflow-hidden bg-[#d7d4ce] text-[#111111]",
    card: "rounded-none border border-black/20 bg-[#f7f5f0] p-5 shadow-[7px_9px_0_rgba(0,0,0,0.12)] sm:p-7",
    cardMuted: "rounded-none border border-black/18 bg-[#ece9e2]",
    heading: "text-xl font-black uppercase tracking-[-0.03em] text-black",
    subheading: "text-sm leading-7 text-black/68",
    badge:
      "rounded-none border border-black bg-transparent px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-black",
    btnPrimary:
      "rounded-none border-2 border-black bg-black px-5 font-bold uppercase text-white hover:bg-[#252525]",
    btnGhost:
      "rounded-none border-2 border-black bg-transparent font-bold uppercase text-black hover:bg-black hover:text-white",
    dashed: "rounded-none border-2 border-dashed border-black/40 bg-[#f3f0ea]",
    accentIcon: "text-black",
    oneLinerWrap:
      "rounded-none border-2 border-black bg-[#f7f5f0] px-6 py-6 text-center text-base font-bold uppercase leading-7 text-black shadow-[6px_6px_0_rgba(0,0,0,0.12)]",
    muted: "text-black/55",
    label: "text-[10px] font-bold uppercase tracking-[0.18em] text-black/60",
    link: "text-black underline",
    statCell:
      "rounded-none border-2 border-black bg-[#f7f5f0] px-3 py-4 text-center text-black",
    statValue: "text-xl font-black tabular-nums text-black sm:text-2xl",
    trackArtFallback: "rounded-none bg-black",
    bodyStrong: "font-bold text-black",
    outlineBtn:
      "rounded-none border-2 border-black bg-transparent font-bold uppercase text-black hover:bg-black hover:text-white",
    isLightSurface: true,
  },
  pressgrid: {
    page: "relative min-h-screen overflow-hidden bg-[#f4f4f2] text-[#111111]",
    card: "rounded-none border-t border-black/70 bg-white p-5 sm:p-7",
    cardMuted: "rounded-none border border-black/15 bg-[#fafafa]",
    heading: "text-2xl font-black uppercase tracking-[-0.045em] text-black",
    subheading: "text-sm leading-7 text-black/65",
    badge:
      "rounded-none border border-black/25 bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-black",
    btnPrimary:
      "rounded-none bg-black px-5 font-bold uppercase text-white hover:bg-[#222222]",
    btnGhost:
      "rounded-none border border-black/35 bg-white font-bold uppercase text-black hover:bg-black hover:text-white",
    dashed: "rounded-none border border-dashed border-black/25 bg-white",
    accentIcon: "text-[#f04b32]",
    oneLinerWrap:
      "rounded-none border-y border-black/70 bg-white px-6 py-7 text-center text-lg font-medium leading-8 text-black",
    muted: "text-black/48",
    label: "text-[10px] uppercase tracking-[0.22em] text-black/48",
    link: "text-[#d83724]",
    statCell:
      "rounded-none border-y border-black/25 bg-white px-3 py-4 text-center text-black",
    statValue: "text-xl font-black tabular-nums text-black sm:text-2xl",
    trackArtFallback: "rounded-none bg-gradient-to-br from-[#f04b32] to-black",
    bodyStrong: "font-bold text-black",
    outlineBtn:
      "rounded-none border-black/35 bg-white font-bold uppercase text-black hover:bg-black hover:text-white",
    isLightSurface: true,
  },
  redcolumn: {
    page: "relative min-h-screen overflow-hidden bg-[#eeeeec] text-[#222222]",
    card: "rounded-none border-0 bg-[#f7f7f5] p-5 shadow-none sm:p-7",
    cardMuted: "rounded-none border-0 border-l-4 border-[#e11118] bg-white",
    heading: "text-2xl font-black uppercase tracking-[-0.04em] text-[#202020]",
    subheading: "text-sm leading-7 text-[#4a4a4a]",
    badge:
      "rounded-none border-0 bg-[#e11118] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white",
    btnPrimary:
      "rounded-none bg-[#e11118] px-5 font-bold uppercase text-white hover:bg-[#bd0c12]",
    btnGhost:
      "rounded-none border border-[#2c2c2c] bg-transparent font-bold uppercase text-[#222222] hover:bg-[#222222] hover:text-white",
    dashed: "rounded-none border border-dashed border-[#e11118]/45 bg-white",
    accentIcon: "text-[#e11118]",
    oneLinerWrap:
      "rounded-none border-l-8 border-[#e11118] bg-white px-6 py-7 text-left text-lg font-medium leading-8 text-[#252525]",
    muted: "text-[#777777]",
    label: "text-[10px] uppercase tracking-[0.2em] text-[#e11118]",
    link: "text-[#e11118]",
    statCell:
      "rounded-none border-0 border-b-2 border-[#e11118] bg-white px-3 py-4 text-center text-[#222222]",
    statValue: "text-xl font-black tabular-nums text-[#e11118] sm:text-2xl",
    trackArtFallback: "rounded-none bg-[#e11118]",
    bodyStrong: "font-bold text-[#222222]",
    outlineBtn:
      "rounded-none border-[#2c2c2c] bg-transparent font-bold uppercase text-[#222222] hover:bg-[#222222] hover:text-white",
    isLightSurface: true,
  },
  checkerboard: {
    page: "relative min-h-screen overflow-hidden bg-[#050505] text-white",
    card: "rounded-none border border-[#8b3dff] bg-black p-5 sm:p-7",
    cardMuted: "rounded-none border border-white/20 bg-[#0d0d0d]",
    heading: "text-2xl font-black uppercase tracking-[-0.04em] text-white",
    subheading: "text-sm font-medium leading-7 text-white/70",
    badge:
      "rounded-none border border-[#9b57ff] bg-[#7c2ee8] px-3 py-1 text-[10px] font-black uppercase tracking-[0.15em] text-white",
    btnPrimary:
      "rounded-none bg-[#8b3dff] px-5 font-black uppercase text-white hover:bg-[#a868ff]",
    btnGhost:
      "rounded-none border border-white bg-transparent font-black uppercase text-white hover:bg-white hover:text-black",
    dashed: "rounded-none border-2 border-dashed border-[#8b3dff] bg-black",
    accentIcon: "text-[#9b57ff]",
    oneLinerWrap:
      "rounded-none border-2 border-[#8b3dff] bg-black px-6 py-6 text-center text-base font-black uppercase leading-7 text-white",
    muted: "text-white/55",
    label: "text-[10px] font-black uppercase tracking-[0.18em] text-[#b88cff]",
    link: "text-[#b88cff]",
    statCell:
      "rounded-none border border-[#8b3dff] bg-black px-3 py-4 text-center text-white",
    statValue: "text-xl font-black tabular-nums text-[#9b57ff] sm:text-2xl",
    trackArtFallback: "rounded-none bg-[#8b3dff]",
    bodyStrong: "font-black uppercase text-white",
    outlineBtn:
      "rounded-none border-white bg-transparent font-black uppercase text-white hover:bg-white hover:text-black",
    isLightSurface: false,
  },
  editorial: {
    page: "relative min-h-screen overflow-hidden bg-[#171717] text-white",
    card: "rounded-none border border-white/10 bg-[#1d1d1d] p-5 sm:p-8",
    cardMuted: "rounded-none border border-white/10 bg-[#242424]",
    heading: "text-3xl font-semibold tracking-[-0.05em] text-white",
    subheading: "text-sm leading-7 text-white/68",
    badge:
      "rounded-none border border-[#ff3542] bg-transparent px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#ff5864]",
    btnPrimary:
      "rounded-none bg-[#ff3542] px-5 font-semibold text-white hover:bg-[#ff5864]",
    btnGhost:
      "rounded-none border border-white/35 bg-transparent text-white hover:bg-white hover:text-black",
    dashed: "rounded-none border border-dashed border-white/20 bg-[#1a1a1a]",
    accentIcon: "text-[#ff3542]",
    oneLinerWrap:
      "rounded-none border-l-4 border-[#ff3542] bg-[#1d1d1d] px-6 py-7 text-left text-lg leading-8 text-white",
    muted: "text-white/45",
    label: "text-[10px] uppercase tracking-[0.24em] text-[#ff5864]",
    link: "text-[#ff5864]",
    statCell:
      "rounded-none border-y border-white/15 bg-[#1d1d1d] px-3 py-4 text-center text-white",
    statValue: "text-xl font-semibold tabular-nums text-[#ff3542] sm:text-2xl",
    trackArtFallback:
      "rounded-none bg-gradient-to-br from-[#ff3542] to-[#101010]",
    bodyStrong: "font-semibold text-white",
    outlineBtn:
      "rounded-none border-white/35 bg-transparent text-white hover:bg-white hover:text-black",
    isLightSurface: false,
  },
  whitespace: {
    page: "relative min-h-screen overflow-hidden bg-white text-[#121212]",
    card: "rounded-none border-0 border-t border-black/20 bg-white p-5 shadow-none sm:p-8",
    cardMuted: "rounded-none border border-black/10 bg-white",
    heading: "text-2xl font-semibold tracking-[-0.045em] text-black",
    subheading: "text-sm leading-7 text-black/58",
    badge:
      "rounded-none border border-black/20 bg-white px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-black/70",
    btnPrimary: "rounded-none bg-black px-5 text-white hover:bg-[#222222]",
    btnGhost:
      "rounded-none border border-black/30 bg-white text-black hover:bg-black hover:text-white",
    dashed: "rounded-none border border-dashed border-black/20 bg-[#fafafa]",
    accentIcon: "text-[#2aa9c8]",
    oneLinerWrap:
      "rounded-none border-y border-black/15 bg-white px-6 py-8 text-center text-xl font-light leading-9 text-black",
    muted: "text-black/42",
    label: "text-[10px] uppercase tracking-[0.22em] text-black/42",
    link: "text-[#1688a5]",
    statCell: "rounded-none border-0 bg-white px-3 py-4 text-center text-black",
    statValue: "text-xl font-medium tabular-nums text-black sm:text-2xl",
    trackArtFallback: "rounded-none bg-[#2aa9c8]",
    bodyStrong: "font-medium text-black",
    outlineBtn:
      "rounded-none border-black/30 bg-white text-black hover:bg-black hover:text-white",
    isLightSurface: true,
  },
  colorblock: {
    page: "relative min-h-screen overflow-hidden bg-[#ef2d2d] text-white",
    card: "rounded-none border border-white/25 bg-transparent p-5 sm:p-7",
    cardMuted: "rounded-none border border-white/20 bg-white/[0.07]",
    heading: "text-3xl font-light tracking-[-0.05em] text-white",
    subheading: "text-sm leading-7 text-white/82",
    badge:
      "rounded-none border border-white/40 bg-transparent px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-white",
    btnPrimary: "rounded-none bg-black px-5 text-white hover:bg-[#222222]",
    btnGhost:
      "rounded-none border border-white bg-transparent text-white hover:bg-white hover:text-[#ef2d2d]",
    dashed: "rounded-none border border-dashed border-white/35 bg-transparent",
    accentIcon: "text-black",
    oneLinerWrap:
      "rounded-none border-y border-white/40 bg-transparent px-6 py-8 text-center text-xl font-light leading-8 text-white",
    muted: "text-white/62",
    label: "text-[10px] uppercase tracking-[0.22em] text-white/65",
    link: "text-black",
    statCell:
      "rounded-none border-y border-white/35 bg-transparent px-3 py-4 text-center text-white",
    statValue: "text-xl font-medium tabular-nums text-black sm:text-2xl",
    trackArtFallback: "rounded-none bg-black",
    bodyStrong: "font-semibold text-white",
    outlineBtn:
      "rounded-none border-white bg-transparent text-white hover:bg-white hover:text-[#ef2d2d]",
    isLightSurface: false,
  },
  sunburst: {
    page: "relative min-h-screen overflow-hidden bg-[#f6c743] text-[#c7271c]",
    card: "rounded-none border-0 bg-[#f6c743] p-5 sm:p-7",
    cardMuted: "rounded-none border-2 border-[#d02d20] bg-[#f7cf59]",
    heading: "text-3xl font-black tracking-[-0.045em] text-[#d02d20]",
    subheading: "text-sm font-medium leading-7 text-[#8c2e21]",
    badge:
      "rounded-none border-2 border-[#d02d20] bg-transparent px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#d02d20]",
    btnPrimary:
      "rounded-none bg-[#d02d20] px-5 font-black uppercase text-[#ffd85e] hover:bg-[#a91f17]",
    btnGhost:
      "rounded-none border-2 border-[#d02d20] bg-transparent font-black uppercase text-[#d02d20] hover:bg-[#d02d20] hover:text-[#ffd85e]",
    dashed: "rounded-none border-2 border-dashed border-[#d02d20] bg-[#f7cf59]",
    accentIcon: "text-[#d02d20]",
    oneLinerWrap:
      "rounded-none border-y-2 border-[#d02d20] bg-[#f6c743] px-6 py-7 text-center text-lg font-black leading-8 text-[#d02d20]",
    muted: "text-[#9d4a32]",
    label: "text-[10px] font-black uppercase tracking-[0.18em] text-[#d02d20]",
    link: "text-[#b42018]",
    statCell:
      "rounded-none border-2 border-[#d02d20] bg-[#f7cf59] px-3 py-4 text-center text-[#d02d20]",
    statValue: "text-xl font-black tabular-nums text-[#d02d20] sm:text-2xl",
    trackArtFallback: "rounded-none bg-[#d02d20]",
    bodyStrong: "font-black text-[#d02d20]",
    outlineBtn:
      "rounded-none border-2 border-[#d02d20] bg-transparent font-black uppercase text-[#d02d20] hover:bg-[#d02d20] hover:text-[#ffd85e]",
    isLightSurface: true,
  },
}

/** Skins that use light page backgrounds (placeholder / cover controls). */
export function isEpkLightSkin(skin: EpkSkinId): boolean {
  return EPK_SKIN_TOKENS[skin].isLightSurface
}

/** Maps editor template ids (and legacy accent aliases) to render skins. */
export function resolveEpkPreviewTemplateId(
  template: string | undefined,
): EpkSkinId {
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
    case "scrapbook":
      return "scrapbook"
    case "bandcard":
      return "bandcard"
    case "dossier":
      return "dossier"
    case "pressgrid":
      return "pressgrid"
    case "redcolumn":
      return "redcolumn"
    case "checkerboard":
      return "checkerboard"
    case "editorial":
      return "editorial"
    case "whitespace":
      return "whitespace"
    case "colorblock":
      return "colorblock"
    case "sunburst":
      return "sunburst"
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
