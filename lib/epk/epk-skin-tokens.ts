export type EpkSkinId = "modern" | "classic" | "minimal" | "bold"

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
  },
}
