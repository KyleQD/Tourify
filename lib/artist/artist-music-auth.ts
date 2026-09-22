import "server-only"

import { NextRequest } from "next/server"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"

export interface ArtistMusicProfileAccess {
  id: string
  user_id: string
}

/**
 * Canonical server boundary for artist-owned music routes.
 *
 * Route handlers should use this after the route is moved into the artist
 * ownership batch: authentication alone is insufficient; the session must
 * resolve to an artist profile before an artist_music resource is addressed.
 */
export async function requireArtistMusicUser(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult

  const { user, supabase } = authResult.auth
  const { data: artistProfile, error } = await supabase
    .from("artist_profiles")
    .select("id, user_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    return {
      success: false as const,
      response: jsonError({
        status: 500,
        code: "artist_profile_lookup_failed",
        message: "Unable to resolve the artist account.",
        retryable: true,
      }),
    }
  }

  if (!artistProfile) {
    return {
      success: false as const,
      response: jsonError({
        status: 403,
        code: "artist_profile_required",
        message: "An artist profile is required for this music workspace.",
        retryable: false,
      }),
    }
  }

  return {
    success: true as const,
    auth: {
      ...authResult.auth,
      artistProfile: artistProfile as ArtistMusicProfileAccess,
    },
  }
}
