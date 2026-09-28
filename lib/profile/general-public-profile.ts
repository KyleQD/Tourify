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

/**
 * DB-008 / Wave 35: the object-valued fields stay `Record<string, any>` on
 * purpose. They carry caller-supplied jsonb (`profiles.profile_data` /
 * `profiles.social_links`) whose key set is data-dependent, and the public
 * identity builder is the single privacy gate in front of it (see the
 * `show_phone` / `show_email` / `show_location` strips below). Returning a bare
 * structural type made the gate's own output untypeable at the call site
 * (`app/api/profile/[username]/route.ts`), so the gate's result was being
 * reshaped with untyped spreads — one of which referenced an undeclared
 * identifier and threw at runtime.
 */
function record(value: unknown): Record<string, any> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? { ...(value as Record<string, any>) }
    : {}
}

export interface GeneralPublicIdentity {
  accountType: "general"
  authorProfileId: string
  ownerUserId: string
  profileData: Record<string, any>
  socialLinks: Record<string, any>
  location: string | null | undefined
}

export function buildGeneralPublicIdentity(
  profile: GeneralProfileSource,
): GeneralPublicIdentity {
  const profileData = record(profile.profile_data)
  const socialLinks = record(profile.social_links)

  // Privacy gate. `profiles.show_phone` / `show_email` / `show_location` are real
  // boolean columns in the active chain (20250819100000_profiles_expand_fields.sql)
  // and are the ONLY publication switch. There is no `profiles.phone` column: the
  // canonical phone storage is `profiles.profile_data.phone` (see
  // app/api/settings/profile/route.ts), which is what gets stripped here. The
  // default for every flag is fail-closed, and a non-`true` `show_phone` always
  // removes the key rather than blanking it.
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
