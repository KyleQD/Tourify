"use client"

import type { ComponentProps } from "react"
import { DialogContent } from "@/components/ui/dialog"
import themeStyles from "@/components/public-artist/artist-profile-theme.module.css"
import {
  artistProfileAppearanceStyle,
  type ArtistProfileAppearance,
} from "@/lib/public-artist/artist-profile-appearance"
import { cn } from "@/lib/utils"

type ThemedDialogContentProps = ComponentProps<typeof DialogContent> & {
  profileAppearance?: ArtistProfileAppearance | null
}

/**
 * Dialog portals render outside the themed public-page tree, so the normalized
 * theme variables must be carried into the portal explicitly.
 */
export function ThemedDialogContent({
  profileAppearance,
  className,
  style,
  ...props
}: ThemedDialogContentProps) {
  return (
    <DialogContent
      className={cn(
        profileAppearance && themeStyles.themedDialog,
        "shadow-2xl shadow-black/60 backdrop-blur-xl",
        className
      )}
      style={{
        ...(profileAppearance ? artistProfileAppearanceStyle(profileAppearance) : {}),
        ...(profileAppearance
          ? {
              backgroundColor: profileAppearance.surfaceColor,
              borderColor: profileAppearance.accentColor,
              color: profileAppearance.textColor,
            }
          : {}),
        ...style,
      }}
      {...props}
    />
  )
}
