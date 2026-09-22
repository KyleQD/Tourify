import { NextRequest, NextResponse } from "next/server"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { normalizeAccountType } from "@/lib/accounts/account-types"
import { invalidEpkAppearanceHexFields } from "@/lib/epk/epk-appearance"
import {
  buildEpkAppearanceAiPrompt,
  parseEpkAppearanceAiPayload,
  type EpkAppearanceAiPromptSnapshot,
} from "@/lib/epk/epk-appearance-ai-prompt"
import {
  DEFAULT_PUBLIC_ARTIST_APPEARANCE,
  mergePublicArtistAppearanceIntoSettings,
  normalizePublicArtistAppearance,
  publicArtistAppearanceToJson,
  readPublicArtistAppearanceFromSettings,
  type PublicArtistAppearance,
} from "@/lib/public-artist/public-artist-appearance"
import {
  mergeArtistProfileDesignState,
  normalizeArtistProfileAppearance,
  readArtistProfileDesignState,
  seedArtistProfileAppearanceFromLegacy,
  validateArtistProfileContrast,
  validateArtistProfileAppearancePayload,
} from "@/lib/public-artist/artist-profile-appearance"

export const dynamic = "force-dynamic"

function getRequestedArtistProfileIds(request: NextRequest, body?: Record<string, unknown> | null) {
  const candidates: string[] = []

  function addCandidate(value: unknown) {
    if (typeof value !== "string") return
    const trimmed = value.trim()
    if (trimmed && !candidates.includes(trimmed)) candidates.push(trimmed)
  }

  addCandidate(request.nextUrl.searchParams.get("profileId"))
  addCandidate(body?.artistProfileId)

  const headerProfileId = request.headers.get("x-acting-profile-id")
  const headerAccountType = normalizeAccountType(request.headers.get("x-acting-account-type"))
  if (headerProfileId && (headerAccountType === "artist" || headerAccountType === "service"))
    addCandidate(headerProfileId)

  return candidates
}

async function verifyArtistProfileCandidate(
  supabase: any,
  userId: string,
  artistProfileId: string
): Promise<string | null> {
  const { data } = await supabase
    .from("artist_profiles")
    .select("id")
    .eq("id", artistProfileId)
    .eq("user_id", userId)
    .maybeSingle()

  if (data?.id) return String(data.id)

  if (artistProfileId === userId) {
    const { data: legacyArtistProfile } = await supabase
      .from("artist_profiles")
      .select("id")
      .eq("user_id", artistProfileId)
      .maybeSingle()

    if (legacyArtistProfile?.id) return String(legacyArtistProfile.id)
  }

  return null
}

async function resolveArtistProfileId(
  supabase: any,
  userId: string,
  candidates: string[]
): Promise<string | null> {
  for (const candidate of candidates) {
    const verified = await verifyArtistProfileCandidate(supabase, userId, candidate)
    if (verified) return verified
  }

  const { data: session } = await supabase
    .from("user_sessions")
    .select("active_profile_id, active_account_type")
    .eq("user_id", userId)
    .maybeSingle()

  const sessionType = normalizeAccountType(session?.active_account_type)
  if (
    session?.active_profile_id &&
    (sessionType === "artist" || sessionType === "service")
  ) {
    const verified = await verifyArtistProfileCandidate(
      supabase,
      userId,
      String(session.active_profile_id)
    )
    if (verified) return verified
  }

  if (candidates.length > 0) return null

  const { data: latestProfile } = await supabase
    .from("artist_profiles")
    .select("id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  return latestProfile?.id ? String(latestProfile.id) : null
}

async function loadArtistProfileRow(supabase: any, artistProfileId: string) {
  const { data, error } = await supabase
    .from("artist_profiles")
    .select("id, user_id, artist_name, url_slug, bio, genres, settings, social_links, updated_at")
    .eq("id", artistProfileId)
    .maybeSingle()

  if (error) throw error
  return data
}

async function loadPrivateProfileDesignDraft(supabase: any, artistProfileId: string) {
  const { data, error } = await supabase
    .from("artist_profile_design_drafts")
    .select("draft, updated_at")
    .eq("artist_profile_id", artistProfileId)
    .maybeSingle()

  if (error) {
    console.warn("Failed to load private artist profile design draft", error)
    return null
  }
  return data?.draft ? normalizeArtistProfileAppearance(data.draft) : null
}

function buildPromptSnapshot(profile: {
  artist_name?: string | null
  bio?: string | null
  genres?: unknown
  settings?: unknown
}, appearance: PublicArtistAppearance): EpkAppearanceAiPromptSnapshot {
  const professional =
    profile.settings &&
    typeof profile.settings === "object" &&
    !Array.isArray(profile.settings)
      ? ((profile.settings as Record<string, unknown>).professional as
          | Record<string, unknown>
          | undefined)
      : undefined
  const location =
    typeof professional?.location === "string" ? professional.location : null

  return {
    surface: "public_artist_profile",
    artistName: profile.artist_name ? String(profile.artist_name) : null,
    bio: profile.bio ? String(profile.bio) : null,
    genres: Array.isArray(profile.genres)
      ? profile.genres.filter((g): g is string => typeof g === "string")
      : [],
    location,
    currentTemplate: appearance.template,
    currentFont: appearance.epkFont,
  }
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireApiUser(request)
    if (!authResult.success) return authResult.response
    const { user, supabase } = authResult.auth

    const profileId = await resolveArtistProfileId(
      supabase,
      user.id,
      getRequestedArtistProfileIds(request)
    )

    if (!profileId) {
      return jsonError({
        status: 404,
        code: "artist_profile_not_found",
        message: "Artist profile not found",
      })
    }

    const profile = await loadArtistProfileRow(supabase, profileId)
    if (!profile) {
      return jsonError({
        status: 404,
        code: "artist_profile_not_found",
        message: "Artist profile not found",
      })
    }

    const stored = readPublicArtistAppearanceFromSettings(profile.settings)
    const appearance = stored ?? {
      ...DEFAULT_PUBLIC_ARTIST_APPEARANCE,
      epkAppearance: { ...DEFAULT_PUBLIC_ARTIST_APPEARANCE.epkAppearance },
    }
    const prompt = buildEpkAppearanceAiPrompt(buildPromptSnapshot(profile, appearance))
    const publicDesign = readArtistProfileDesignState(profile.settings)
    const privateDraft = await loadPrivateProfileDesignDraft(supabase, profileId)
    const design = {
      ...publicDesign,
      draft: privateDraft,
    }
    const seedAppearance =
      design.draft ?? design.published ?? seedArtistProfileAppearanceFromLegacy(stored)

    const { data: ownerProfile } = await supabase
      .from("profiles")
      .select("username, avatar_url, cover_image, metadata, location")
      .eq("id", user.id)
      .maybeSingle()

    // Check if the artist has EPK style sync enabled
    const { data: epkSettings } = await supabase
      .from("artist_epk_settings")
      .select("settings")
      .eq("user_id", user.id)
      .eq("artist_profile_id", profileId)
      .maybeSingle()

    const useEpkStyleOnProfile = Boolean(
      epkSettings?.settings &&
        typeof epkSettings.settings === "object" &&
        !Array.isArray(epkSettings.settings) &&
        (epkSettings.settings as Record<string, unknown>).useEpkStyleOnProfile
    )

    return NextResponse.json({
      success: true,
      artistProfileId: profileId,
      appearance: publicArtistAppearanceToJson(appearance),
      isConfigured: Boolean(stored),
      useEpkStyleOnProfile,
      prompt,
      artistName: profile.artist_name ? String(profile.artist_name) : null,
      bio: profile.bio ? String(profile.bio) : null,
      genres: Array.isArray(profile.genres)
        ? profile.genres.filter((g: unknown): g is string => typeof g === "string")
        : [],
      profileDesign: design,
      seedAppearance,
      previewProfile: {
        artistName: profile.artist_name ? String(profile.artist_name) : "Artist",
        username: profile.url_slug || ownerProfile?.username || null,
        bio: profile.bio ? String(profile.bio) : null,
        genres: Array.isArray(profile.genres)
          ? profile.genres.filter((g: unknown): g is string => typeof g === "string")
          : [],
        avatarUrl: ownerProfile?.avatar_url || null,
        coverUrl:
          ownerProfile?.cover_image ||
          (ownerProfile?.metadata && typeof ownerProfile.metadata === "object"
            ? (ownerProfile.metadata as Record<string, unknown>).header_url
            : null) ||
          null,
        location: ownerProfile?.location || null,
      },
    })
  } catch (error) {
    console.error("Unexpected artist public appearance GET error", error)
    return jsonError({
      status: 500,
      code: "artist_public_appearance_load_failed",
      message: "Failed to load public appearance",
      retryable: true,
    })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authResult = await requireApiUser(request)
    if (!authResult.success) return authResult.response
    const { user, supabase } = authResult.auth

    const body = await request.json().catch(() => null)
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return jsonError({
        status: 422,
        code: "invalid_public_appearance_payload",
        message: "Invalid appearance payload",
      })
    }

    const bodyRecord = body as Record<string, unknown>
    const profileId = await resolveArtistProfileId(
      supabase,
      user.id,
      getRequestedArtistProfileIds(request, bodyRecord)
    )

    if (!profileId) {
      return jsonError({
        status: 404,
        code: "artist_profile_not_found",
        message: "Artist profile not found",
      })
    }

    const action = typeof bodyRecord.action === "string" ? bodyRecord.action : "save"

    if (
      action === "save_draft" ||
      action === "publish" ||
      action === "discard_draft" ||
      action === "restore_published"
    ) {
      const profile = await loadArtistProfileRow(supabase, profileId)
      if (!profile) {
        return jsonError({
          status: 404,
          code: "artist_profile_not_found",
          message: "Artist profile not found",
        })
      }

      const currentDesign = readArtistProfileDesignState(profile.settings)
      const currentPrivateDraft = await loadPrivateProfileDesignDraft(supabase, profileId)
      const now = new Date().toISOString()
      let nextDraft = currentPrivateDraft
      let nextPublicDesign = {
        ...currentDesign,
        // Drafts must never be stored on the publicly readable artist profile row.
        draft: null,
      }
      let normalized = currentPrivateDraft ?? currentDesign.published

      if (action === "save_draft" || action === "publish") {
        const payloadErrors = validateArtistProfileAppearancePayload(bodyRecord.appearance)
        if (payloadErrors.length) {
          return NextResponse.json(
            {
              success: false,
              code: "invalid_artist_profile_appearance",
              message: "The profile appearance payload is invalid.",
              errors: payloadErrors,
            },
            { status: 422 }
          )
        }
        normalized = normalizeArtistProfileAppearance(bodyRecord.appearance)
        if (action === "publish") {
          const contrastErrors = validateArtistProfileContrast(normalized)
          if (contrastErrors.length) {
            return NextResponse.json(
              {
                success: false,
                code: "appearance_contrast_failed",
                message: "Some colors do not meet accessible contrast requirements.",
                errors: contrastErrors,
              },
              { status: 422 }
            )
          }
        }
      }

      if ((action === "save_draft" || action === "publish") && normalized) {
        const { error: draftError } = await supabase
          .from("artist_profile_design_drafts")
          .upsert(
            {
              artist_profile_id: profileId,
              owner_user_id: user.id,
              draft: normalized,
              updated_at: now,
            },
            { onConflict: "artist_profile_id" }
          )

        if (draftError) {
          console.error("Failed to save private artist profile design draft", draftError)
          return jsonError({
            status: 500,
            code: "artist_profile_design_draft_save_failed",
            message: "Failed to save the private profile design draft",
            retryable: true,
          })
        }
        nextDraft = normalized
      }

      if (action === "publish" && normalized) {
        nextPublicDesign = {
          version: 1,
          draft: null,
          published: normalized,
          updatedAt: now,
          publishedAt: now,
        }
      } else if (action === "discard_draft") {
        const { error: discardError } = await supabase
          .from("artist_profile_design_drafts")
          .delete()
          .eq("artist_profile_id", profileId)
          .eq("owner_user_id", user.id)

        if (discardError) {
          console.error("Failed to discard artist profile design draft", discardError)
          return jsonError({
            status: 500,
            code: "artist_profile_design_draft_discard_failed",
            message: "Failed to discard the profile design draft",
            retryable: true,
          })
        }
        nextDraft = null
      } else if (action === "restore_published") {
        if (!currentDesign.published) {
          return jsonError({
            status: 409,
            code: "published_appearance_not_found",
            message: "There is no published appearance to restore.",
          })
        }

        const { error: restoreError } = await supabase
          .from("artist_profile_design_drafts")
          .upsert(
            {
              artist_profile_id: profileId,
              owner_user_id: user.id,
              draft: currentDesign.published,
              updated_at: now,
            },
            { onConflict: "artist_profile_id" }
          )

        if (restoreError) {
          console.error("Failed to restore published artist profile design", restoreError)
          return jsonError({
            status: 500,
            code: "artist_profile_design_restore_failed",
            message: "Failed to restore the published profile design",
            retryable: true,
          })
        }
        nextDraft = currentDesign.published
      }

      const nextSettings = mergeArtistProfileDesignState(profile.settings, nextPublicDesign)
      const { error } = await supabase
        .from("artist_profiles")
        .update({ settings: nextSettings, updated_at: now })
        .eq("id", profileId)
        .eq("user_id", user.id)

      if (error) {
        console.error("Failed to save artist profile design", error)
        return jsonError({
          status: 500,
          code: "artist_profile_design_save_failed",
          message: "Failed to save profile design",
          retryable: true,
        })
      }

      return NextResponse.json({
        success: true,
        artistProfileId: profileId,
        action,
        profileDesign: {
          ...nextPublicDesign,
          draft: nextDraft,
        },
        appearance: nextDraft ?? nextPublicDesign.published,
      })
    }

    if (action === "validate") {
      const paste =
        typeof bodyRecord.json === "string"
          ? bodyRecord.json
          : typeof bodyRecord.appearance === "string"
            ? bodyRecord.appearance
            : JSON.stringify(bodyRecord.appearance ?? bodyRecord)
      const parsed = parseEpkAppearanceAiPayload(paste)
      if (!parsed.success) {
        return NextResponse.json(
          {
            success: false,
            errors: parsed.errors,
          },
          { status: 422 }
        )
      }
      return NextResponse.json({
        success: true,
        appearance: publicArtistAppearanceToJson(parsed.data),
      })
    }

    const rawAppearance = bodyRecord.appearance ?? bodyRecord
    const invalidHex = invalidEpkAppearanceHexFields(
      (rawAppearance as Record<string, unknown>)?.epkAppearance
    )
    if (invalidHex.length) {
      return jsonError({
        status: 422,
        code: "invalid_epk_appearance",
        message: `Invalid hex color fields: ${invalidHex.join(", ")}`,
      })
    }

    const appearance = normalizePublicArtistAppearance(rawAppearance)
    const profile = await loadArtistProfileRow(supabase, profileId)
    if (!profile) {
      return jsonError({
        status: 404,
        code: "artist_profile_not_found",
        message: "Artist profile not found",
      })
    }

    const nextSettings = mergePublicArtistAppearanceIntoSettings(profile.settings, appearance)
    const { error } = await supabase
      .from("artist_profiles")
      .update({ settings: nextSettings, updated_at: new Date().toISOString() })
      .eq("id", profileId)
      .eq("user_id", user.id)

    if (error) {
      console.error("Failed to save public appearance", error)
      return jsonError({
        status: 500,
        code: "artist_public_appearance_save_failed",
        message: "Failed to save public appearance",
        retryable: true,
      })
    }

    const prompt = buildEpkAppearanceAiPrompt(buildPromptSnapshot(profile, appearance))

    return NextResponse.json({
      success: true,
      artistProfileId: profileId,
      appearance: publicArtistAppearanceToJson(appearance),
      isConfigured: true,
      prompt,
    })
  } catch (error) {
    console.error("Unexpected artist public appearance PUT error", error)
    return jsonError({
      status: 500,
      code: "artist_public_appearance_save_failed",
      message: "Failed to save public appearance",
      retryable: true,
    })
  }
}
