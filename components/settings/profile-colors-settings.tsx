"use client"

import { ProfileColorCustomizer } from "@/components/profile/profile-color-customizer"
import { useAuth } from "@/contexts/auth-context"
import { useProfileColors } from "@/hooks/use-profile-colors"

export function ProfileColorsSettings() {
  const { user } = useAuth()
  const profileId = user?.id ?? ""
  const { colors, loading, saveColors, updateColors } = useProfileColors(profileId)

  if (!user || loading) {
    return <div className="py-8 text-center text-white/70">Loading profile colors...</div>
  }

  return (
    <ProfileColorCustomizer
      profileId={profileId}
      currentColors={colors}
      onColorsChange={async (nextColors) => {
        await saveColors(nextColors)
      }}
      onPreview={updateColors}
    />
  )
}
