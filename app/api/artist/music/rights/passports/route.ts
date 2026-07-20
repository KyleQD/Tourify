import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { getTrustedMusicWriteClient } from "@/lib/music/music-access"
import {
  buildCredentialEnvelope,
  signCredentialEnvelope,
} from "@/lib/music-rights/credential"
import { resolveMusicRightsFlags } from "@/lib/music-rights/music-rights-flags"
import {
  buildPublicPassportManifest,
  hashPassportManifest,
  PASSPORT_CANONICALIZATION_VERSION,
  PASSPORT_SCHEMA_VERSION,
} from "@/lib/music-rights/passport-manifest"
import {
  assertOwnedProject,
  enqueueRightsOutboxEvent,
  writeRightsAuditEvent,
} from "@/lib/music-rights/rights-access"
import { createRateLimiter } from "@/lib/utils/rate-limit"

export const dynamic = "force-dynamic"
const limiter = createRateLimiter({ namespace: "music:rights:passports", limit: 20, windowSec: 60 })

const issueSchema = z.object({
  project_id: z.string().uuid(),
  expected_project_version: z.number().int().positive().optional(),
  public_credit_ids: z.array(z.string().uuid()).max(100).default([]),
  include_identifiers: z.array(z.enum(["ISRC", "ISWC", "UPC"])).max(10).default(["ISRC", "ISWC"]),
})

export async function GET(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth
  const flags = await resolveMusicRightsFlags(supabase, user.id)
  const projectId = request.nextUrl.searchParams.get("projectId")
  let query = supabase
    .from("music_rights_passports")
    .select("*, music_rights_passport_versions(id, version, status, public_manifest_hash, issued_at), music_rights_credentials(id, public_id, status, issued_at)")
    .eq("owner_user_id", user.id)
    .order("updated_at", { ascending: false })
  if (projectId) query = query.eq("project_id", projectId)
  const { data, error } = await query
  if (error) return jsonError({ status: 500, code: "passports_query_failed", message: "Unable to load passports.", retryable: true })
  return NextResponse.json({ data: data || [], enabled: flags.music_rights_passport_enabled })
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiUser(request)
    if (!authResult.success) return authResult.response
    const { user, supabase } = authResult.auth
    if (!(await limiter.check(user.id)).success)
      return jsonError({ status: 429, code: "rate_limited", message: "Too many passport requests.", retryable: true })

    const flags = await resolveMusicRightsFlags(supabase, user.id)
    if (!flags.music_rights_passport_enabled)
      return jsonError({ status: 404, code: "feature_disabled", message: "Rights passport issuance is not available.", retryable: false })

    const payload = issueSchema.parse(await request.json())
    const trusted = await getTrustedMusicWriteClient(supabase)
    const project = await assertOwnedProject({ supabase: trusted, userId: user.id, projectId: payload.project_id })
    if (!project) return jsonError({ status: 404, code: "project_not_found", message: "Rights project not found.", retryable: false })
    if (payload.expected_project_version && project.version !== payload.expected_project_version)
      return jsonError({ status: 409, code: "version_conflict", message: "Project version changed; reload and retry." })

    const [{ data: recording }, { data: work }, { data: contributions }, { data: profile }] = await Promise.all([
      trusted.from("music_rights_sound_recordings").select("id, title, isrc").eq("project_id", project.id).maybeSingle(),
      trusted.from("music_rights_musical_works").select("id, title, iswc").eq("project_id", project.id).limit(1).maybeSingle(),
      trusted.from("music_rights_contributions")
        .select("id, role, confirmation_status, music_rights_parties(display_name)")
        .eq("project_id", project.id),
      trusted.from("profiles").select("full_name, username").eq("id", user.id).maybeSingle(),
    ])

    let passport = (await trusted
      .from("music_rights_passports")
      .select("*")
      .eq("project_id", project.id)
      .maybeSingle()).data

    if (!passport) {
      const { data: created, error: createError } = await trusted
        .from("music_rights_passports")
        .insert({
          project_id: project.id,
          owner_user_id: user.id,
          artist_music_id: project.artist_music_id,
          status: "draft",
          current_version: 0,
        })
        .select("*")
        .single()
      if (createError || !created)
        return jsonError({ status: 500, code: "passport_create_failed", message: "Unable to create passport.", retryable: true })
      passport = created
    }

    const previousVersion = passport.current_version > 0
      ? (await trusted
        .from("music_rights_passport_versions")
        .select("public_manifest_hash")
        .eq("passport_id", passport.id)
        .eq("version", passport.current_version)
        .maybeSingle()).data
      : null

    const selectedCredits = (contributions || [])
      .filter((row: any) => !payload.public_credit_ids.length || payload.public_credit_ids.includes(row.id))
      .filter((row: any) => row.confirmation_status !== "rejected")
      .map((row: any) => ({
        name: row.music_rights_parties?.display_name || "Contributor",
        roles: [row.role],
      }))

    const recordingIdentifiers: Record<string, string> = {}
    const workIdentifiers: Record<string, string> = {}
    if (payload.include_identifiers.includes("ISRC") && recording?.isrc) recordingIdentifiers.ISRC = recording.isrc
    if (payload.include_identifiers.includes("ISWC") && work?.iswc) workIdentifiers.ISWC = work.iswc

    const nextVersion = passport.current_version + 1
    const publicManifest = buildPublicPassportManifest({
      publicId: passport.public_id,
      passportVersion: nextVersion,
      artistName: profile?.full_name || profile?.username || "Artist",
      title: recording?.title || work?.title || project.title,
      recordingIdentifiers,
      workIdentifiers,
      publicCredits: selectedCredits,
      verification: {
        originStatus: "recorded",
        humanOriginStatus: flags.music_human_origin_v2_enabled ? "pending" : "not_requested",
        contributorStatus: selectedCredits.length ? "partial" : "unknown",
        documentStatus: "unknown",
        registryStatus: "unknown",
      },
      previousVersionHash: previousVersion?.public_manifest_hash || undefined,
      status: "issued",
    })
    const publicManifestHash = hashPassportManifest(publicManifest)

    const privateManifest = {
      ...publicManifest,
      projectId: project.id,
      artistMusicId: project.artist_music_id,
      soundRecordingId: recording?.id,
      musicalWorkId: work?.id,
      contributionIds: (contributions || []).map((row: any) => row.id),
      claimIds: [],
      agreementVersionHashes: [],
      evidenceRefs: [],
      sourceHashes: {},
    }

    const { data: version, error: versionError } = await trusted
      .from("music_rights_passport_versions")
      .insert({
        passport_id: passport.id,
        version: nextVersion,
        status: "issued",
        public_manifest: publicManifest,
        private_manifest: privateManifest,
        public_manifest_hash: publicManifestHash,
        previous_version_hash: previousVersion?.public_manifest_hash || null,
        schema_version: PASSPORT_SCHEMA_VERSION,
        canonicalization_version: PASSPORT_CANONICALIZATION_VERSION,
        created_by: user.id,
      })
      .select("*")
      .single()
    if (versionError || !version)
      return jsonError({ status: 500, code: "passport_version_create_failed", message: "Unable to issue passport version.", retryable: true })

    if (previousVersion) {
      await trusted.from("music_rights_passport_versions")
        .update({ status: "superseded" })
        .eq("passport_id", passport.id)
        .eq("version", passport.current_version)
    }

    const { data: updatedPassport, error: passportError } = await trusted
      .from("music_rights_passports")
      .update({
        status: "issued",
        current_version: nextVersion,
        updated_at: new Date().toISOString(),
      })
      .eq("id", passport.id)
      .select("*")
      .single()
    if (passportError || !updatedPassport)
      return jsonError({ status: 500, code: "passport_update_failed", message: "Unable to update passport.", retryable: true })

    const credentialPublicId = crypto.randomUUID()
    const envelope = signCredentialEnvelope(buildCredentialEnvelope({
      credentialPublicId,
      passportPublicId: updatedPassport.public_id,
      passportVersion: nextVersion,
      publicManifest,
      issuedAt: version.issued_at,
    }))

    const { data: credential, error: credentialError } = await trusted
      .from("music_rights_credentials")
      .insert({
        public_id: credentialPublicId,
        passport_id: updatedPassport.id,
        passport_version_id: version.id,
        envelope,
        proof: envelope.proof || {},
        status: "active",
        issued_at: version.issued_at,
      })
      .select("id, public_id, status, issued_at")
      .single()
    if (credentialError || !credential)
      return jsonError({ status: 500, code: "credential_create_failed", message: "Unable to create credential envelope.", retryable: true })

    await trusted.from("music_rights_credential_status").insert({
      credential_id: credential.id,
      status: "active",
      actor_user_id: user.id,
      actor_type: "artist",
      notes: "Issued with passport version",
    })

    await Promise.all([
      writeRightsAuditEvent({
        supabase: trusted,
        projectId: project.id,
        actorUserId: user.id,
        eventType: "music.rights.passport.issued",
        entityType: "passport",
        entityId: updatedPassport.id,
        eventData: { version: nextVersion, manifestHash: publicManifestHash },
      }),
      enqueueRightsOutboxEvent({
        supabase: trusted,
        projectId: project.id,
        eventType: "music.rights.passport.issued",
        dedupeKey: `passport:${updatedPassport.id}:v${nextVersion}`,
        payload: { passportId: updatedPassport.id, version: nextVersion, publicId: updatedPassport.public_id },
      }),
    ])

    return NextResponse.json({
      data: {
        passport: updatedPassport,
        version,
        credential,
        public_manifest: publicManifest,
        verify_path: `/music/verify/passport/${updatedPassport.public_id}`,
      },
    }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError)
      return jsonError({ status: 400, code: "invalid_request", message: "Invalid passport request.", issues: error.issues })
    console.error("Passport issue failed", error)
    return jsonError({ status: 500, code: "passport_internal_error", message: "Unexpected passport error.", retryable: true })
  }
}
