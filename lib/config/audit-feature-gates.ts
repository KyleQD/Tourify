import { NextResponse } from "next/server"
import {
  isLaunchCapabilityAvailable,
  type LaunchCapabilityName,
} from "@/lib/config/launch-capabilities"

export type AuditGatedFeature =
  | "polls"
  | "marketplace_integrations"
  | "music_finance_offerings"
  | "advanced_webhooks"

const ENV_KEYS: Record<AuditGatedFeature, string> = {
  polls: "FEATURE_AUDIT_POLLS_APPROVED",
  marketplace_integrations: "FEATURE_AUDIT_MARKETPLACE_INTEGRATIONS_APPROVED",
  music_finance_offerings: "FEATURE_AUDIT_MUSIC_FINANCE_OFFERINGS_APPROVED",
  advanced_webhooks: "FEATURE_AUDIT_ADVANCED_WEBHOOKS_APPROVED",
}

const LAUNCH_CAPABILITIES: Record<AuditGatedFeature, LaunchCapabilityName> = {
  polls: "polls",
  marketplace_integrations: "marketplace_provider_integrations",
  music_finance_offerings: "music_finance_offerings",
  advanced_webhooks: "advanced_music_webhooks",
}

export function isAuditFeatureApproved(feature: AuditGatedFeature): boolean {
  const raw = process.env[ENV_KEYS[feature]]?.trim().toLowerCase()
  const explicitlyApproved = raw === "1" || raw === "true" || raw === "on"
  return isLaunchCapabilityAvailable(LAUNCH_CAPABILITIES[feature], explicitlyApproved)
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
