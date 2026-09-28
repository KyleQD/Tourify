import type { CSSProperties } from "react"
import { cn } from "@/lib/utils"
import type { ResolvedEpkAppearance } from "@/lib/epk/epk-appearance"
import {
  paCard,
  paHeroFrame,
  paInset,
  paPlayerShell,
  paRow,
  paShell,
  paStickyInner,
} from "@/components/public-artist/public-artist-ui"

/** Default (unset) public artist chrome — keeps today's purple/dark look. */
export function getDefaultPublicArtistUi() {
  return {
    shell: paShell,
    card: paCard,
    inset: paInset,
    row: paRow,
    heroFrame: paHeroFrame,
    stickyInner: paStickyInner,
    playerShell: paPlayerShell,
    btnPrimary: "rounded-full",
    btnGhost: "rounded-full border border-white/20",
    badge: "rounded-full",
    pageClassName: "",
    pageStyle: undefined as CSSProperties | undefined,
    wrapperClassName: "",
    rootStyle: undefined as CSSProperties | undefined,
    cardStyle: undefined as CSSProperties | undefined,
    insetStyle: undefined as CSSProperties | undefined,
    heroStyle: undefined as CSSProperties | undefined,
    btnPrimaryStyle: undefined as CSSProperties | undefined,
    btnGhostStyle: undefined as CSSProperties | undefined,
  }
}

export function getThemedPublicArtistUi(resolved: ResolvedEpkAppearance) {
  const t = resolved.mergedTokens
  return {
    shell: cn(paShell, resolved.contentMaxWidthClass || undefined),
    card: cn(t.card, resolved.color.effectClass, resolved.color.customBorder, resolved.color.customCardBg),
    inset: cn(t.cardMuted, resolved.color.customBorder),
    row: cn(t.cardMuted, "transition-colors hover:opacity-95"),
    heroFrame: cn(t.card, "relative w-full overflow-hidden shadow-2xl", resolved.color.effectClass),
    stickyInner: cn(t.card, "backdrop-blur-xl"),
    playerShell: cn(t.card, "w-full overflow-hidden backdrop-blur-xl"),
    btnPrimary: cn(t.btnPrimary, resolved.color.buttonRadius),
    btnGhost: cn(t.btnGhost, resolved.color.buttonRadius),
    badge: t.badge,
    pageClassName: cn(t.page, resolved.wrapperClassName, resolved.color.pageEffectClass),
    pageStyle: { ...resolved.rootStyle, ...resolved.styles.page } as CSSProperties,
    wrapperClassName: resolved.wrapperClassName,
    rootStyle: resolved.rootStyle,
    cardStyle: resolved.styles.card,
    insetStyle: resolved.styles.mutedCard,
    heroStyle: resolved.styles.heroShell,
    btnPrimaryStyle: resolved.styles.buttonPrimary,
    btnGhostStyle: resolved.styles.buttonGhost,
  }
}

export type PublicArtistThemedUi = ReturnType<typeof getDefaultPublicArtistUi>
