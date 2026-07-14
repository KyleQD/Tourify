"use client"

import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import type { StorefrontThemeConfig } from "@/lib/marketplace/storefront-themes"
import { getCardStyleClasses, getFontStyleClasses } from "@/lib/marketplace/storefront-themes"

interface AnimatedProductCardProps {
  id: string
  title: string
  description?: string | null
  imageUrl?: string | null
  productType?: string | null
  category?: string
  price: number | null
  currency?: string
  index?: number
  theme: StorefrontThemeConfig
  isCheckoutLoading?: boolean
  onCheckout?: () => void
  layout?: StorefrontThemeConfig["layout"]
}

export function AnimatedProductCard({
  id,
  title,
  description,
  imageUrl,
  productType,
  category,
  price,
  currency = "USD",
  index = 0,
  theme,
  isCheckoutLoading,
  onCheckout,
  layout = "grid",
}: AnimatedProductCardProps) {
  const { effects, cardStyle, accentColor, fontStyle } = theme
  const cardClasses = getCardStyleClasses(cardStyle, accentColor)
  const fontClasses = getFontStyleClasses(fontStyle)

  const isListLayout = layout === "list"
  const isCarousel = layout === "carousel"

  const staggerDelay = effects.staggerEntrance ? index * 0.08 : 0
  const actionLabel =
    category === "music" || productType === "digital_asset"
      ? "Download"
      : category === "services" || productType === "service" || productType === "commission"
        ? "Book"
        : category === "tickets" || productType === "ticket"
          ? "Get Tickets"
          : category === "support" || productType === "tip"
            ? "Tip"
            : "Buy"

  return (
    <motion.div
      initial={effects.staggerEntrance ? { opacity: 0, y: 16, scale: 0.97 } : false}
      animate={effects.staggerEntrance ? { opacity: 1, y: 0, scale: 1 } : undefined}
      transition={{ duration: 0.4, delay: staggerDelay, ease: "easeOut" }}
      whileHover={effects.hoverLift ? { y: -6, scale: 1.02, transition: { duration: 0.2 } } : undefined}
      className={`
        group relative
        ${cardClasses}
        ${isCarousel ? "min-w-[260px] snap-center" : ""}
        ${isListLayout ? "flex flex-row items-center gap-4" : ""}
        ${effects.glowBorder ? "ring-1 ring-white/5" : ""}
      `}
      style={effects.glowBorder ? { boxShadow: `0 0 20px ${accentColor}25, 0 0 40px ${accentColor}10` } : undefined}
    >
      {/* Neon glow ring overlay */}
      {cardStyle === "neon" && (
        <div
          className="pointer-events-none absolute inset-0 rounded-2xl animate-glow-ring"
          style={{
            boxShadow: `inset 0 0 30px ${accentColor}15, 0 0 15px ${accentColor}20`,
          }}
        />
      )}

      {/* Image */}
      <div className={`relative overflow-hidden bg-black/20 ${isListLayout ? "h-24 w-24 flex-shrink-0 rounded-xl" : "aspect-square"}`}>
        {imageUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt={title}
              className={`
                h-full w-full object-cover transition-transform duration-500
                ${effects.hoverLift ? "group-hover:scale-110" : ""}
              `}
              loading="lazy"
            />
            {effects.shimmerImages && (
              <div className="pointer-events-none absolute inset-0 animate-image-shimmer bg-gradient-to-r from-transparent via-white/10 to-transparent bg-[length:200%_100%]" />
            )}
          </>
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-white/40">
            No image
          </div>
        )}
      </div>

      {/* Content */}
      <div className={`${isListLayout ? "flex-1 py-2" : "p-4"}`}>
        <div className={`truncate text-sm font-semibold text-white ${fontClasses}`}>
          {effects.gradientText ? (
            <span
              className="bg-clip-text text-transparent bg-gradient-to-r"
              style={{
                backgroundImage: `linear-gradient(to right, ${accentColor}, white, ${accentColor})`,
                backgroundSize: "200% auto",
              }}
            >
              {title}
            </span>
          ) : (
            title
          )}
        </div>

        {description && !isListLayout && (
          <div className="mt-1 line-clamp-2 text-xs text-white/55">{description}</div>
        )}

        <div className="mt-1 text-xs text-white/40">{productType?.replace(/_/g, " ") || "Product"}</div>

        <div className="mt-2 flex items-center justify-between gap-2">
          <span
            className="text-sm font-bold"
            style={{ color: accentColor }}
          >
            {price !== null ? `${currency} ${Number(price).toFixed(2)}` : "Price on request"}
          </span>

          {onCheckout && (
            <Button
              size="sm"
              disabled={isCheckoutLoading}
              onClick={onCheckout}
              className="rounded-full text-xs transition-all duration-200 hover:shadow-lg"
              style={{
                backgroundColor: `${accentColor}20`,
                borderColor: `${accentColor}40`,
                color: accentColor,
              }}
              variant="outline"
            >
              {isCheckoutLoading ? "..." : actionLabel}
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  )
}
