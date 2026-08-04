import { NextResponse } from "next/server"

export type AuditGatedFeature = "polls" | "marketplace_integrations" | "music_finance_offerings"

const ENV_KEYS: Record<AuditGatedFeature, string> = {
  polls: "FEATURE_AUDIT_POLLS_APPROVED",
  marketplace_integrations: "FEATURE_AUDIT_MARKETPLACE_INTEGRATIONS_APPROVED",
  music_finance_offerings: "FEATURE_AUDIT_MUSIC_FINANCE_OFFERINGS_APPROVED",
}

export function isAuditFeatureApproved(feature: AuditGatedFeature): boolean {
  const raw = process.env[ENV_KEYS[feature]]?.trim().toLowerCase()
  return raw === "1" || raw === "true" || raw === "on"
}

export function auditFeatureUnavailable(feature: AuditGatedFeature) {
  return NextResponse.json(
    {
      error: {
        code: "FEATURE_UNAVAILABLE",
        message: "This capability is not currently available",
        feature,
      },
    },
    { status: 503, headers: { "cache-control": "no-store" } },
  )
}

