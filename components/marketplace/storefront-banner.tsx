"use client"

import { motion } from "framer-motion"
import { ShoppingBag } from "lucide-react"
import type { StorefrontThemeConfig } from "@/lib/marketplace/storefront-themes"
import { getFontStyleClasses } from "@/lib/marketplace/storefront-themes"

interface StorefrontBannerProps {
  displayName: string
  tagline?: string | null
  theme: StorefrontThemeConfig
}

export function StorefrontBanner({ displayName, tagline, theme }: StorefrontBannerProps) {
  const { accentColor, bannerGradient, bannerStyle, effects, fontStyle } = theme
  const fontClasses = getFontStyleClasses(fontStyle)

  if (bannerStyle === "none") return null

  return (
    <div className="relative overflow-hidden rounded-2xl">
      {/* Background */}
      <div
        className={`
          relative px-6 py-8 sm:px-8 sm:py-10
          ${bannerStyle === "gradient" ? `bg-gradient-to-br ${bannerGradient}` : ""}
          ${bannerStyle === "solid" ? "bg-slate-900" : ""}
        `}
      >
        {/* Decorative floating orbs */}
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

        {/* Shimmer border effect */}
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

        {/* Content */}
        <motion.div
          className="relative z-10"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl"
              style={{ backgroundColor: `${accentColor}20` }}
            >
              <ShoppingBag className="h-5 w-5" style={{ color: accentColor }} />
            </div>
            <div>
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
              {tagline && (
                <p className="mt-0.5 text-sm text-white/60">{tagline}</p>
              )}
            </div>
          </div>
        </motion.div>

        {/* Bottom edge glow */}
        <div
          className="absolute bottom-0 left-0 right-0 h-px"
          style={{ background: `linear-gradient(to right, transparent, ${accentColor}40, transparent)` }}
        />
      </div>
    </div>
  )
}
