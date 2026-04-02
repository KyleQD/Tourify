/**
 * Shared layout + surface styles for the public artist profile (music-first, Spotify-grade).
 * Keep radii and max-width consistent across hero, sections, and chrome (sticky bar, player).
 */

/** Main content column — readable measure, aligned with hero */
export const paShell = "max-w-6xl mx-auto w-full px-4 sm:px-6"

/** Primary elevated cards (sections) */
export const paCard =
  "rounded-[1.75rem] border border-white/10 bg-white/[0.04] shadow-xl shadow-black/30 backdrop-blur-sm"

/** Nested panels inside cards (featured row, EPK preview, stat tiles) */
export const paInset = "rounded-2xl border border-white/10 bg-black/25"

/** List rows, compact controls */
export const paRow =
  "rounded-2xl border border-white/10 bg-black/30 transition-colors hover:border-white/20 hover:bg-black/35"

/** Hero banner shell */
export const paHeroFrame =
  "relative w-full overflow-hidden rounded-[2rem] shadow-2xl shadow-black/50 ring-1 ring-white/10"

/** Banner proportion: wide stage (~21:9), clamped height for mobile */
export const paHeroAspect =
  "relative w-full aspect-[21/9] min-h-[200px] sm:min-h-[260px] max-h-[min(46vh,440px)] isolate"

/** Primary CTAs in hero */
export const paBtnRound = "rounded-full"

/** Sticky action bar — use inside `paShell` */
export const paStickyInner =
  "rounded-2xl border border-white/10 bg-black/65 backdrop-blur-xl shadow-lg shadow-black/40"

/** Bottom persistent player surface — wrap with `paShell` for width alignment */
export const paPlayerShell =
  "w-full rounded-2xl border border-white/10 bg-black/75 backdrop-blur-xl shadow-2xl shadow-black/50 overflow-hidden"
