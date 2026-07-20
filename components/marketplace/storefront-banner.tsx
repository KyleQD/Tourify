"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { ShoppingBag, Star } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import type { StorefrontThemeConfig } from "@/lib/marketplace/storefront-themes"
import { getFontStyleClasses } from "@/lib/marketplace/storefront-themes"

interface StorefrontBannerProps {
  displayName: string
  tagline?: string | null
  theme: StorefrontThemeConfig
  avatarUrl?: string | null
  bio?: string | null
  username?: string | null
  profileHref?: string | null
  ratingAverage?: number | null
  ratingCount?: number | null
  manageHref?: string | null
  onClearSeller?: () => void
  clearSellerLabel?: string
}

export function StorefrontBanner({
  displayName,
  tagline,
  theme,
  avatarUrl,
  bio,
  username,
  profileHref,
  ratingAverage,
  ratingCount,
  manageHref,
  onClearSeller,
  clearSellerLabel = "Browse all",
}: StorefrontBannerProps) {
  const { accentColor, bannerGradient, bannerStyle, effects, fontStyle } = theme
  const fontClasses = getFontStyleClasses(fontStyle)
  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() || "")
    .join("") || "?"
  const hasRating = typeof ratingAverage === "number" && Number(ratingCount || 0) > 0

  if (bannerStyle === "none") return null

  return (
    <div className="relative overflow-hidden rounded-2xl">
      <div
        className={`
          relative px-6 py-8 sm:px-8 sm:py-10
          ${bannerStyle === "gradient" ? `bg-gradient-to-br ${bannerGradient}` : ""}
          ${bannerStyle === "solid" ? "bg-slate-900" : ""}
        `}
      >
        {effects.floatingOrbs && (
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div
              className="absolute -top-10 -right-10 h-40 w-40 rounded-full blur-3xl animate-orb-drift opacity-20"
              style={{ backgroundColor: accentColor }}
            />
            <div
              className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full blur-3xl animate-orb-drift opacity-15"
              style={{ backgroundColor: accentColor, animationDelay: "3s" }}
            />
            <div
              className="absolute top-1/2 left-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full blur-2xl animate-float-slow opacity-10"
              style={{ backgroundColor: accentColor, animationDelay: "5s" }}
            />
          </div>
        )}

        {effects.glowBorder && (
          <div
            className="pointer-events-none absolute inset-0 rounded-2xl animate-shimmer-border bg-[length:300%_300%]"
            style={{
              backgroundImage: `linear-gradient(135deg, transparent, ${accentColor}20, transparent, ${accentColor}15, transparent)`,
              mask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
              maskComposite: "exclude",
              WebkitMaskComposite: "xor",
              padding: "1px",
            }}
          />
        )}

        <motion.div
          className="relative z-10 space-y-4"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3 sm:gap-4">
              {avatarUrl || username ? (
                <Avatar className="h-14 w-14 border border-white/15 sm:h-16 sm:w-16">
                  {avatarUrl ? <AvatarImage src={avatarUrl} alt={displayName} /> : null}
                  <AvatarFallback
                    className="text-sm font-semibold text-white"
                    style={{ backgroundColor: `${accentColor}40` }}
                  >
                    {initials}
                  </AvatarFallback>
                </Avatar>
              ) : (
                <div
                  className="flex h-14 w-14 items-center justify-center rounded-xl sm:h-16 sm:w-16"
                  style={{ backgroundColor: `${accentColor}20` }}
                >
                  <ShoppingBag className="h-6 w-6" style={{ color: accentColor }} />
                </div>
              )}

              <div className="min-w-0 flex-1">
                <h2 className={`text-xl font-bold text-white sm:text-2xl ${fontClasses}`}>
                  {effects.gradientText ? (
                    <span
                      className="bg-clip-text text-transparent bg-gradient-to-r animate-gradient-x bg-[length:200%_auto]"
                      style={{ backgroundImage: `linear-gradient(to right, ${accentColor}, white, ${accentColor})` }}
                    >
                      {displayName}
                    </span>
                  ) : (
                    displayName
                  )}
                </h2>
                {username ? (
                  <p className="mt-0.5 text-sm text-white/50">@{username}</p>
                ) : null}
                {tagline ? (
                  <p className="mt-1 text-sm text-white/70">{tagline}</p>
                ) : null}
                {hasRating ? (
                  <p className="mt-2 flex items-center gap-1.5 text-xs text-white/60">
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    <span>{Number(ratingAverage).toFixed(1)}</span>
                    <span>({ratingCount} reviews)</span>
                  </p>
                ) : null}
                {bio ? (
                  <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/55 line-clamp-2">
                    {bio}
                  </p>
                ) : null}
              </div>
            </div>

            {(profileHref || manageHref || onClearSeller) ? (
              <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                {profileHref ? (
                  <Button asChild size="sm" variant="outline" className="border-white/20 bg-black/20 text-white hover:bg-white/10">
                    <Link href={profileHref}>View profile</Link>
                  </Button>
                ) : null}
                {manageHref ? (
                  <Button asChild size="sm" className="text-white" style={{ backgroundColor: accentColor }}>
                    <Link href={manageHref}>Manage store</Link>
                  </Button>
                ) : null}
                {onClearSeller ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="text-white/70 hover:bg-white/10 hover:text-white"
                    onClick={onClearSeller}
                  >
                    {clearSellerLabel}
                  </Button>
                ) : null}
              </div>
            ) : null}
          </div>
        </motion.div>

        <div
          className="absolute bottom-0 left-0 right-0 h-px"
          style={{ background: `linear-gradient(to right, transparent, ${accentColor}40, transparent)` }}
        />
      </div>
    </div>
  )
}
