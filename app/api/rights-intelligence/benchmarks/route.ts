import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { RIGHTS_INTELLIGENCE_DISCLAIMER } from "@/lib/music/rights-intelligence/intelligence-disclaimer"
import { resolveMusicRightsIntelligenceFlags } from "@/lib/music/rights-intelligence/music-rights-intelligence-flags"
import { canPublishBenchmark } from "@/lib/music/rights-intelligence/benchmark-release"
import { getTrustedMusicWriteClient } from "@/lib/music/music-access"

export const dynamic = "force-dynamic"

const publishSchema = z.object({
  metric_run_id: z.string().uuid(),
  release_version: z.number().int().positive().default(1),
  output: z.record(z.unknown()).default({}),
  consent_passed: z.boolean(),
  quality_passed: z.boolean(),
  privacy_passed: z.boolean(),
  competition_passed: z.boolean(),
  methodology_passed: z.boolean(),
  source_fresh: z.boolean(),
  contains_recommendation: z.boolean().default(false),
  public_publish: z.boolean().default(false),
})

export async function GET(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth
  const flags = await resolveMusicRightsIntelligenceFlags(supabase, user.id)
  if (!flags.music_rights_intelligence_benchmarks_enabled)
    return jsonError({ status: 404, code: "feature_disabled", message: "Rights intelligence benchmarks are not available.", retryable: false })

  const { data, error } = await supabase
    .from("music_intelligence_benchmark_releases")
    .select("id, metric_run_id, release_version, disclosure, status, published_at, created_at, contains_recommendation")
    .in("status", ["approved", "published"])
    .eq("contains_recommendation", false)
    .order("created_at", { ascending: false })
    .limit(50)

  if (error)
    return jsonError({ status: 500, code: "benchmarks_query_failed", message: "Unable to load benchmarks.", retryable: true })

  return NextResponse.json({ data: data || [], disclaimer: RIGHTS_INTELLIGENCE_DISCLAIMER, enabled: true })
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiUser(request)
    if (!authResult.success) return authResult.response
    const { user, supabase } = authResult.auth
    const flags = await resolveMusicRightsIntelligenceFlags(supabase, user.id)
    if (!flags.music_rights_intelligence_benchmarks_enabled)
      return jsonError({ status: 404, code: "feature_disabled", message: "Rights intelligence benchmarks are not available.", retryable: false })

    const payload = publishSchema.parse(await request.json())
    if (payload.contains_recommendation)
      return jsonError({ status: 403, code: "recommendation_forbidden", message: "Benchmark releases must not contain recommendations.", retryable: false })

    const gate = canPublishBenchmark({
      consentPassed: payload.consent_passed,
      qualityPassed: payload.quality_passed,
      privacyPassed: payload.privacy_passed,
      competitionPassed: payload.competition_passed,
      methodologyPassed: payload.methodology_passed,
      sourceFresh: payload.source_fresh,
      containsRecommendation: payload.contains_recommendation,
    })
    if (!gate)
      return jsonError({ status: 403, code: "benchmark_gates_failed", message: "Benchmark publish gates failed.", retryable: false })

    if (payload.public_publish && !flags.music_rights_intelligence_benchmark_public_publish_enabled)
      return jsonError({ status: 403, code: "public_publish_gated", message: "Public benchmark publish remains separately gated.", retryable: false })

    const trusted = await getTrustedMusicWriteClient(supabase)
    const status = payload.public_publish ? "published" : "approved"
    const { data, error } = await trusted
      .from("music_intelligence_benchmark_releases")
      .insert({
        metric_run_id: payload.metric_run_id,
        release_version: payload.release_version,
        output: payload.output,
        disclosure: "Historical descriptive aggregate only. Not a price recommendation or legal advice.",
        privacy_review_passed: payload.privacy_passed,
        competition_review_passed: payload.competition_passed,
        methodology_review_passed: payload.methodology_passed,
        contains_recommendation: false,
        status,
        published_at: payload.public_publish ? new Date().toISOString() : null,
      })
      .select("id, status, release_version, disclosure")
      .single()

    if (error)
      return jsonError({ status: 500, code: "benchmark_create_failed", message: "Unable to create benchmark release.", retryable: true })

    return NextResponse.json({ data, disclaimer: RIGHTS_INTELLIGENCE_DISCLAIMER }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError)
      return jsonError({ status: 400, code: "validation_error", message: "Invalid benchmark payload.", retryable: false, issues: error.issues })
    return jsonError({ status: 500, code: "benchmark_create_failed", message: "Unable to create benchmark release.", retryable: true })
  }
}
