export type EventPageSkinId =
  | "modern"
  | "classic"
  | "minimal"
  | "bold"
  | "cinema"
  | "gallery"
  | "luxe"
  | "poster"
  | "coastal"

export interface EventPageSkinTokens {
  page: string
  heroFrame: string
  heroScrim: string
  heroFallback: string
  title: string
  card: string
  inset: string
  heading: string
  body: string
  muted: string
  badge: string
  stickyTabs: string
  tabActive: string
  btnPrimary: string
  btnPrimaryActive: string
  btnGhost: string
  btnGhostActive: string
  btnTicket: string
  statAttending: string
  statInterested: string
  statNotGoing: string
  isLightSurface: boolean
}

export const EVENT_PAGE_SKIN_IDS: EventPageSkinId[] = [
  "modern",
  "classic",
  "minimal",
  "bold",
  "cinema",
  "gallery",
  "luxe",
  "poster",
  "coastal",
]

export const EVENT_PAGE_TEMPLATE_PREVIEWS: Array<{
  id: EventPageSkinId
  name: string
  description: string
  colors: string[]
  accent: string
}> = [
  {
    id: "modern",
    name: "Modern",
    description: "Sleek dark glass with purple accents",
    colors: ["from-indigo-600", "via-purple-600", "to-pink-600"],
    accent: "bg-purple-400",
  },
  {
    id: "classic",
    name: "Classic",
    description: "Warm editorial cream and amber",
    colors: ["from-amber-600", "via-orange-500", "to-rose-500"],
    accent: "bg-amber-500",
  },
  {
    id: "minimal",
    name: "Minimal",
    description: "Pure black with monochrome type",
    colors: ["from-black", "via-zinc-900", "to-black"],
    accent: "bg-white",
  },
  {
    id: "bold",
    name: "Bold",
    description: "High-contrast electric yellow",
    colors: ["from-zinc-950", "via-yellow-600", "to-zinc-900"],
    accent: "bg-yellow-400",
  },
  {
    id: "cinema",
    name: "Cinema",
    description: "Letterbox dark with silver accents",
    colors: ["from-zinc-950", "via-zinc-800", "to-zinc-950"],
    accent: "bg-zinc-300",
  },
  {
    id: "gallery",
    name: "Gallery",
    description: "Clean light gallery walls",
    colors: ["from-neutral-100", "via-white", "to-neutral-200"],
    accent: "bg-neutral-800",
  },
  {
    id: "luxe",
    name: "Luxe",
    description: "Navy and gold premium night",
    colors: ["from-[#0a1628]", "via-[#1a3050]", "to-[#0a1628]"],
    accent: "bg-[#c9a962]",
  },
  {
    id: "poster",
    name: "Poster",
    description: "Loud poster-print coral on black",
    colors: ["from-[#140808]", "via-[#5c1a1a]", "to-[#140808]"],
    accent: "bg-[#f07167]",
  },
  {
    id: "coastal",
    name: "Coastal",
    description: "Soft seafoam and teal calm",
    colors: ["from-[#e8efe9]", "via-[#c5e0d6]", "to-[#dff0e8]"],
    accent: "bg-[#2d6a5a]",
  },
]

export const EVENT_SKIN_TOKENS: Record<EventPageSkinId, EventPageSkinTokens> = {
  modern: {
    page: "min-h-screen bg-gradient-to-br from-black via-slate-950 to-black text-white",
    heroFrame: "relative w-full overflow-hidden rounded-[2rem] shadow-2xl shadow-black/50 ring-1 ring-white/10",
    heroScrim: "absolute inset-0 bg-gradient-to-t from-black via-black/55 to-black/20",
    heroFallback: "h-full w-full bg-gradient-to-br from-purple-900/60 via-pink-900/50 to-blue-900/60",
    title: "bg-gradient-to-r from-white via-purple-200 to-blue-200 bg-clip-text text-transparent",
    card: "rounded-[1.75rem] border border-white/10 bg-white/[0.04] shadow-xl shadow-black/30 backdrop-blur-sm",
    inset: "rounded-2xl border border-white/10 bg-black/25",
    heading: "font-semibold text-white",
    body: "text-white",
    muted: "text-white/55",
    badge: "rounded-full border border-purple-500/30 bg-purple-500/10 text-purple-200",
    stickyTabs: "rounded-2xl border border-white/10 bg-black/65 backdrop-blur-xl shadow-lg shadow-black/40",
    tabActive: "data-[state=active]:bg-purple-600/25 data-[state=active]:text-purple-200",
    btnPrimary: "rounded-full bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/20 hover:from-purple-500 hover:to-pink-500",
    btnPrimaryActive: "rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white ring-2 ring-purple-300/40",
    btnGhost: "rounded-full border border-white/20 bg-transparent text-white hover:bg-white/10",
    btnGhostActive: "rounded-full border-pink-400/40 bg-pink-500/20 text-pink-100 ring-2 ring-pink-400/30",
    btnTicket: "rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-500 hover:to-teal-500",
    statAttending: "border-green-500/25 bg-green-500/10 text-green-400",
    statInterested: "border-blue-500/25 bg-blue-500/10 text-blue-400",
    statNotGoing: "border-red-500/25 bg-red-500/10 text-red-400",
    isLightSurface: false,
  },
  classic: {
    page: "min-h-screen bg-[#f4f1ea] text-stone-900",
    heroFrame: "relative w-full overflow-hidden rounded-xl shadow-lg ring-1 ring-stone-300/80",
    heroScrim: "absolute inset-0 bg-gradient-to-t from-[#f4f1ea] via-stone-900/50 to-stone-900/30",
    heroFallback: "h-full w-full bg-gradient-to-br from-amber-700 via-rose-600 to-stone-800",
    title: "font-serif text-stone-50 drop-shadow-sm",
    card: "rounded-xl border border-stone-200/90 bg-white p-0 shadow-sm",
    inset: "rounded-xl border border-stone-200 bg-stone-50/80",
    heading: "font-serif font-semibold text-stone-900",
    body: "text-stone-900",
    muted: "text-stone-500",
    badge: "rounded-md border border-amber-200/80 bg-amber-50 text-amber-950",
    stickyTabs: "rounded-xl border border-stone-200 bg-white/90 shadow-sm backdrop-blur-xl",
    tabActive: "data-[state=active]:bg-amber-800/15 data-[state=active]:text-amber-900",
    btnPrimary: "rounded-lg bg-amber-800 text-white hover:bg-amber-900",
    btnPrimaryActive: "rounded-lg bg-amber-900 text-white ring-2 ring-amber-500/40",
    btnGhost: "rounded-lg border border-stone-300 bg-white text-stone-800 hover:bg-stone-50",
    btnGhostActive: "rounded-lg border-amber-400 bg-amber-50 text-amber-950 ring-2 ring-amber-300/50",
    btnTicket: "rounded-lg bg-emerald-700 text-white hover:bg-emerald-800",
    statAttending: "border-emerald-300 bg-emerald-50 text-emerald-800",
    statInterested: "border-sky-300 bg-sky-50 text-sky-800",
    statNotGoing: "border-rose-300 bg-rose-50 text-rose-800",
    isLightSurface: true,
  },
  minimal: {
    page: "min-h-screen bg-black text-white",
    heroFrame: "relative w-full overflow-hidden border border-white/20",
    heroScrim: "absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/40",
    heroFallback: "h-full w-full bg-zinc-900",
    title: "text-xs font-medium uppercase tracking-[0.35em] text-white/90 sm:text-sm md:text-base",
    card: "border border-white/12 bg-black",
    inset: "border border-white/10 bg-white/[0.02]",
    heading: "text-xs font-medium uppercase tracking-[0.28em] text-white/90",
    body: "text-white",
    muted: "text-white/45",
    badge: "rounded-none border border-white/20 bg-transparent text-xs uppercase tracking-widest text-white/70",
    stickyTabs: "border border-white/15 bg-black/80 backdrop-blur-xl",
    tabActive: "data-[state=active]:bg-white data-[state=active]:text-black",
    btnPrimary: "rounded-none border border-white bg-white px-6 text-xs uppercase tracking-[0.2em] text-black hover:bg-white/90",
    btnPrimaryActive: "rounded-none border border-white bg-white px-6 text-xs uppercase tracking-[0.2em] text-black ring-2 ring-white/40",
    btnGhost: "rounded-none border border-white/30 bg-transparent px-6 text-xs uppercase tracking-[0.2em] text-white hover:bg-white/10",
    btnGhostActive: "rounded-none border border-white bg-white/10 px-6 text-xs uppercase tracking-[0.2em] text-white",
    btnTicket: "rounded-none border border-emerald-400 bg-emerald-500 px-6 text-xs uppercase tracking-[0.2em] text-black hover:bg-emerald-400",
    statAttending: "border-white/20 bg-white/5 text-white",
    statInterested: "border-white/20 bg-white/5 text-white/80",
    statNotGoing: "border-white/20 bg-white/5 text-white/60",
    isLightSurface: false,
  },
  bold: {
    page: "min-h-screen bg-black text-white",
    heroFrame: "relative w-full overflow-hidden border-4 border-[#facc15]",
    heroScrim: "absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/30",
    heroFallback: "h-full w-full bg-gradient-to-br from-zinc-900 via-yellow-900/40 to-black",
    title: "font-black uppercase tracking-tight text-[#facc15]",
    card: "rounded-none border-4 border-[#facc15] bg-black",
    inset: "rounded-none border-2 border-white/25 bg-zinc-950",
    heading: "text-xl font-black uppercase tracking-tight text-[#facc15]",
    body: "text-white",
    muted: "text-white/75",
    badge: "rounded-none border-2 border-[#facc15] bg-[#facc15] text-xs font-black uppercase text-black",
    stickyTabs: "rounded-none border-2 border-[#facc15] bg-black/90 backdrop-blur-xl",
    tabActive: "data-[state=active]:bg-[#facc15] data-[state=active]:text-black data-[state=active]:font-black",
    btnPrimary: "rounded-none border-2 border-[#facc15] bg-[#facc15] text-sm font-black uppercase text-black hover:bg-[#eab308]",
    btnPrimaryActive: "rounded-none border-2 border-white bg-[#facc15] text-sm font-black uppercase text-black",
    btnGhost: "rounded-none border-2 border-white bg-transparent text-sm font-black uppercase text-white hover:bg-white hover:text-black",
    btnGhostActive: "rounded-none border-2 border-[#facc15] bg-zinc-950 text-sm font-black uppercase text-[#facc15]",
    btnTicket: "rounded-none border-2 border-emerald-400 bg-emerald-400 text-sm font-black uppercase text-black hover:bg-emerald-300",
    statAttending: "border-2 border-[#facc15] bg-zinc-950 text-[#facc15]",
    statInterested: "border-2 border-white bg-zinc-950 text-white",
    statNotGoing: "border-2 border-red-500 bg-zinc-950 text-red-400",
    isLightSurface: false,
  },
  cinema: {
    page: "relative min-h-screen overflow-hidden bg-[#0c0c0e] text-zinc-100",
    heroFrame: "relative w-full overflow-hidden rounded-sm shadow-2xl ring-1 ring-white/10",
    heroScrim: "absolute inset-0 bg-gradient-to-t from-[#0c0c0e] via-black/60 to-black/30",
    heroFallback: "h-full w-full bg-gradient-to-br from-zinc-800 via-zinc-900 to-black",
    title: "text-sm font-medium uppercase tracking-[0.28em] text-zinc-100 sm:text-base md:text-lg",
    card: "rounded-sm border border-white/10 bg-zinc-950/80",
    inset: "rounded-sm border border-white/8 bg-black/40",
    heading: "text-sm font-medium uppercase tracking-[0.22em] text-zinc-200",
    body: "text-zinc-100",
    muted: "text-zinc-500",
    badge: "rounded-sm border border-zinc-500/40 bg-zinc-900 text-xs uppercase tracking-[0.2em] text-zinc-300",
    stickyTabs: "rounded-sm border border-zinc-700/80 bg-black/75 backdrop-blur-xl",
    tabActive: "data-[state=active]:bg-zinc-200 data-[state=active]:text-zinc-950",
    btnPrimary: "rounded-sm bg-zinc-200 text-zinc-950 hover:bg-white",
    btnPrimaryActive: "rounded-sm bg-white text-zinc-950 ring-2 ring-zinc-400/40",
    btnGhost: "rounded-sm border border-zinc-500/50 bg-transparent text-zinc-200 hover:bg-white/5",
    btnGhostActive: "rounded-sm border-zinc-300 bg-white/10 text-zinc-100",
    btnTicket: "rounded-sm bg-emerald-600 text-white hover:bg-emerald-500",
    statAttending: "border-zinc-600 bg-black/50 text-zinc-100",
    statInterested: "border-zinc-600 bg-black/50 text-zinc-300",
    statNotGoing: "border-zinc-700 bg-black/50 text-zinc-500",
    isLightSurface: false,
  },
  gallery: {
    page: "min-h-screen bg-[#fafafa] text-neutral-900",
    heroFrame: "relative w-full overflow-hidden border border-neutral-200 shadow-sm",
    heroScrim: "absolute inset-0 bg-gradient-to-t from-[#fafafa] via-neutral-900/45 to-neutral-900/25",
    heroFallback: "h-full w-full bg-gradient-to-br from-neutral-400 via-neutral-600 to-neutral-800",
    title: "text-xs font-medium uppercase tracking-[0.3em] text-white drop-shadow sm:text-sm",
    card: "rounded-none border border-neutral-200 bg-white",
    inset: "rounded-none border border-neutral-200 bg-neutral-50",
    heading: "text-xs font-medium uppercase tracking-[0.28em] text-neutral-800",
    body: "text-neutral-900",
    muted: "text-neutral-500",
    badge: "rounded-none border border-neutral-300 bg-transparent text-xs uppercase tracking-[0.2em] text-neutral-700",
    stickyTabs: "rounded-none border border-neutral-200 bg-white/95 shadow-sm backdrop-blur-xl",
    tabActive: "data-[state=active]:bg-neutral-900 data-[state=active]:text-white",
    btnPrimary: "rounded-none bg-neutral-900 px-6 text-xs uppercase tracking-[0.15em] text-white hover:bg-neutral-800",
    btnPrimaryActive: "rounded-none bg-neutral-800 px-6 text-xs uppercase tracking-[0.15em] text-white ring-2 ring-neutral-400",
    btnGhost: "rounded-none border border-neutral-300 bg-white px-6 text-xs uppercase tracking-[0.15em] text-neutral-800 hover:bg-neutral-50",
    btnGhostActive: "rounded-none border-neutral-800 bg-neutral-100 px-6 text-xs uppercase tracking-[0.15em] text-neutral-900",
    btnTicket: "rounded-none bg-emerald-700 px-6 text-xs uppercase tracking-[0.15em] text-white hover:bg-emerald-600",
    statAttending: "border-neutral-300 bg-white text-neutral-900",
    statInterested: "border-neutral-300 bg-neutral-50 text-neutral-700",
    statNotGoing: "border-neutral-300 bg-neutral-50 text-neutral-500",
    isLightSurface: true,
  },
  luxe: {
    page: "relative min-h-screen overflow-hidden bg-[#0a1628] text-[#f5f0e8]",
    heroFrame: "relative w-full overflow-hidden rounded-2xl shadow-2xl ring-1 ring-[#c9a962]/30",
    heroScrim: "absolute inset-0 bg-gradient-to-t from-[#0a1628] via-[#0a1628]/70 to-black/30",
    heroFallback: "h-full w-full bg-gradient-to-br from-[#1a3050] via-[#0a1628] to-[#081220]",
    title: "font-serif tracking-wide text-[#e8dcc8]",
    card: "rounded-2xl border border-[#c9a962]/25 bg-[#0d1c32]/90",
    inset: "rounded-2xl border border-[#c9a962]/15 bg-[#081220]/80",
    heading: "font-serif font-semibold tracking-wide text-[#e8dcc8]",
    body: "text-[#f5f0e8]",
    muted: "text-[#8a7d68]",
    badge: "rounded-full border border-[#c9a962]/40 bg-[#c9a962]/10 text-xs tracking-wide text-[#e8d5a8]",
    stickyTabs: "rounded-2xl border border-[#c9a962]/25 bg-[#0a1628]/85 backdrop-blur-xl",
    tabActive: "data-[state=active]:bg-[#c9a962]/20 data-[state=active]:text-[#e8d5a8]",
    btnPrimary: "rounded-full bg-[#c9a962] text-[#0a1628] hover:bg-[#d4b978]",
    btnPrimaryActive: "rounded-full bg-[#d4b978] text-[#0a1628] ring-2 ring-[#c9a962]/50",
    btnGhost: "rounded-full border border-[#c9a962]/40 bg-transparent text-[#e8dcc8] hover:bg-[#c9a962]/10",
    btnGhostActive: "rounded-full border-[#c9a962] bg-[#c9a962]/15 text-[#e8d5a8]",
    btnTicket: "rounded-full bg-emerald-600 text-white hover:bg-emerald-500",
    statAttending: "border-[#c9a962]/30 bg-[#081220]/70 text-[#e8d5a8]",
    statInterested: "border-[#c9a962]/20 bg-[#081220]/70 text-[#b8a990]",
    statNotGoing: "border-white/10 bg-[#081220]/70 text-[#8a7d68]",
    isLightSurface: false,
  },
  poster: {
    page: "relative min-h-screen overflow-hidden bg-[#140808] text-[#faf3eb]",
    heroFrame: "relative w-full overflow-hidden border-2 border-[#f07167]",
    heroScrim: "absolute inset-0 bg-gradient-to-t from-[#140808] via-[#140808]/75 to-black/40",
    heroFallback: "h-full w-full bg-gradient-to-br from-[#5c1a1a] via-[#140808] to-black",
    title: "font-black uppercase tracking-tight text-[#f07167]",
    card: "rounded-none border-2 border-[#f07167] bg-[#1a0c0c]",
    inset: "rounded-none border border-[#f07167]/40 bg-[#120808]",
    heading: "font-black uppercase tracking-tight text-[#f07167]",
    body: "text-[#faf3eb]",
    muted: "text-[#faf3eb]/70",
    badge: "rounded-none border-2 border-[#faf3eb] bg-transparent text-xs font-black uppercase tracking-widest text-[#faf3eb]",
    stickyTabs: "rounded-none border-2 border-[#f07167] bg-[#140808]/90 backdrop-blur-xl",
    tabActive: "data-[state=active]:bg-[#f07167] data-[state=active]:text-[#140808] data-[state=active]:font-black",
    btnPrimary: "rounded-none border-2 border-[#f07167] bg-[#f07167] text-sm font-black uppercase text-[#140808] hover:bg-[#f48a82]",
    btnPrimaryActive: "rounded-none border-2 border-[#faf3eb] bg-[#f07167] text-sm font-black uppercase text-[#140808]",
    btnGhost: "rounded-none border-2 border-[#faf3eb] bg-transparent text-sm font-black uppercase text-[#faf3eb] hover:bg-[#faf3eb] hover:text-[#140808]",
    btnGhostActive: "rounded-none border-2 border-[#f07167] bg-[#1a0c0c] text-sm font-black uppercase text-[#f07167]",
    btnTicket: "rounded-none border-2 border-emerald-400 bg-emerald-500 text-sm font-black uppercase text-black hover:bg-emerald-400",
    statAttending: "border-2 border-[#f07167] bg-[#120808] text-[#f07167]",
    statInterested: "border-2 border-[#faf3eb]/50 bg-[#120808] text-[#faf3eb]",
    statNotGoing: "border-2 border-white/20 bg-[#120808] text-[#faf3eb]/60",
    isLightSurface: false,
  },
  coastal: {
    page: "min-h-screen bg-[#e8efe9] text-[#1a3a3a]",
    heroFrame: "relative w-full overflow-hidden rounded-3xl shadow-sm ring-1 ring-[#b8cfc4]/60",
    heroScrim: "absolute inset-0 bg-gradient-to-t from-[#e8efe9] via-[#1a3a3a]/45 to-[#1a3a3a]/25",
    heroFallback: "h-full w-full bg-gradient-to-br from-[#7ab8a8] via-[#3d7a6a] to-[#1a3a3a]",
    title: "tracking-tight text-white drop-shadow",
    card: "rounded-3xl border border-[#b8cfc4]/60 bg-[#f4f8f5]/90 shadow-sm",
    inset: "rounded-2xl border border-[#b8cfc4]/50 bg-[#dff0e8]/60",
    heading: "font-semibold tracking-tight text-[#1a3a3a]",
    body: "text-[#1a3a3a]",
    muted: "text-[#5a7a7a]",
    badge: "rounded-full border border-[#5a9a8a]/40 bg-[#c5e0d6]/50 text-[#1a3a3a]",
    stickyTabs: "rounded-3xl border border-[#b8cfc4]/60 bg-white/80 shadow-sm backdrop-blur-xl",
    tabActive: "data-[state=active]:bg-[#2d6a5a] data-[state=active]:text-white",
    btnPrimary: "rounded-full bg-[#2d6a5a] text-white hover:bg-[#245a4c]",
    btnPrimaryActive: "rounded-full bg-[#245a4c] text-white ring-2 ring-[#5a9a8a]/50",
    btnGhost: "rounded-full border border-[#5a9a8a]/50 bg-white/70 text-[#1a3a3a] hover:bg-white",
    btnGhostActive: "rounded-full border-[#2d6a5a] bg-[#c5e0d6]/60 text-[#1a3a3a]",
    btnTicket: "rounded-full bg-emerald-600 text-white hover:bg-emerald-500",
    statAttending: "border-[#5a9a8a]/40 bg-white/80 text-[#2d6a5a]",
    statInterested: "border-[#b8cfc4] bg-white/70 text-[#3d5c5c]",
    statNotGoing: "border-[#b8cfc4]/50 bg-white/60 text-[#5a7a7a]",
    isLightSurface: true,
  },
}

export function isEventPageLightSkin(skin: EventPageSkinId): boolean {
  return EVENT_SKIN_TOKENS[skin].isLightSurface
}

/** Maps stored template ids (and EPK legacy aliases) to event page skins. */
export function resolveEventPageSkinId(template: string | undefined | null): EventPageSkinId {
  const t = String(template || "modern").toLowerCase().trim()
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

export function getEventPageSkinTokens(template: string | undefined | null): EventPageSkinTokens {
  return EVENT_SKIN_TOKENS[resolveEventPageSkinId(template)]
}
