type GeneralProfileSource = {
  id: string
  username: string | null
  full_name?: string | null
  bio?: string | null
  avatar_url?: string | null
  cover_image?: string | null
  location?: string | null
  website?: string | null
  profile_data?: unknown
  social_links?: unknown
  show_email?: boolean | null
  show_phone?: boolean | null
  show_location?: boolean | null
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? { ...(value as Record<string, unknown>) }
    : {}
}

export function buildGeneralPublicIdentity(profile: GeneralProfileSource) {
  const profileData = record(profile.profile_data)
  const socialLinks = record(profile.social_links)

  if (profile.show_phone !== true) delete profileData.phone
  if (profile.show_email !== true) {
    delete profileData.email
    delete socialLinks.email
  }

  const location = profile.show_location === false ? null : profile.location
  if (profile.show_location === false) delete profileData.location

  return {
    accountType: "general" as const,
    authorProfileId: profile.id,
    ownerUserId: profile.id,
    profileData: {
      ...profileData,
      name: profile.full_name || profileData.name || profile.username || "Tourify member",
      bio: profile.bio || profileData.bio || null,
      location,
      website: profile.website || profileData.website || null,
    },
    socialLinks: {
      ...socialLinks,
      website: profile.website || socialLinks.website || null,
    },
    location,
  }
}
