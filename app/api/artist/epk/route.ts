import { NextRequest, NextResponse } from "next/server"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { normalizeAccountType } from "@/lib/accounts/account-types"
import { buildEpkAppearanceAiPrompt } from "@/lib/epk/epk-appearance-ai-prompt"
import { epkService } from "@/lib/services/epk.service"

export const dynamic = "force-dynamic"

function getRequestedArtistProfileIds(request: NextRequest, body?: Record<string, unknown> | null) {
  const candidates: string[] = []

  const addCandidate = (value: unknown) => {
    if (typeof value !== "string") return
    const trimmed = value.trim()
    if (trimmed && !candidates.includes(trimmed)) candidates.push(trimmed)
  }

  addCandidate(request.nextUrl.searchParams.get("profileId"))

  const bodyProfileId = body?.artistProfileId
  addCandidate(bodyProfileId)

  const headerProfileId = request.headers.get("x-acting-profile-id")
  const headerAccountType = normalizeAccountType(request.headers.get("x-acting-account-type"))
  if (headerProfileId && (headerAccountType === "artist" || headerAccountType === "service")) {
    addCandidate(headerProfileId)
  }

  return candidates
}

async function verifyArtistProfileCandidate(
  supabase: any,
  userId: string,
  artistProfileId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from("artist_profiles")
    .select("id")
    .eq("id", artistProfileId)
    .eq("user_id", userId)
    .maybeSingle()

  if (data?.id) return String(data.id)

  if (!error && artistProfileId === userId) {
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

    const data = await epkService.loadEPKData(
      user.id,
      profileId,
      supabase
    )
    const saveState = await epkService.getEPKSaveState(user.id, data.artistProfileId || profileId, supabase)
    const appearancePrompt = buildEpkAppearanceAiPrompt({
      surface: "epk",
      artistName: data.artistName ?? null,
      bio: data.bio ?? null,
      genres: data.genre ? [data.genre] : [],
      location: data.location ?? null,
      currentTemplate: data.template || "modern",
      currentFont: data.epkFont || "sans",
    })

    return NextResponse.json({
      data,
      artistProfileId: data.artistProfileId,
      publicUrl: saveState.publicUrl,
      hasSavedEpk: saveState.hasSavedEpk,
      lastSavedAt: saveState.lastSavedAt,
      isPublic: saveState.isPublic,
      appearancePrompt,
    })
  } catch (error) {
    console.error("Unexpected artist EPK GET error", error)
    return jsonError({
      status: 500,
      code: "artist_epk_load_failed",
      message: "Failed to load EPK data",
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
        code: "invalid_epk_payload",
        message: "Invalid EPK payload",
      })
    }

    const profileId = await resolveArtistProfileId(
      supabase,
      user.id,
      getRequestedArtistProfileIds(request, body as Record<string, unknown>)
    )

    const result = await epkService.saveEPKData(user.id, body, supabase, profileId)
    if (!result.success) {
      return jsonError({
        status: result.status,
        code: result.code,
        message: result.error,
        retryable: result.status >= 500,
      })
    }

    return NextResponse.json({
      data: result.data,
      publicUrl: result.publicUrl,
      artistProfileId: result.artistProfileId,
      epkSlug: result.epkSlug,
      isPublic: result.isPublic,
      hasSavedEpk: true,
      lastSavedAt: result.lastSavedAt || new Date().toISOString(),
    })
  } catch (error) {
    console.error("Unexpected artist EPK PUT error", error)
    return jsonError({
      status: 500,
      code: "artist_epk_save_failed",
      message: "Failed to save EPK data",
      retryable: true,
    })
  }
}
