/**
 * Structured appearance telemetry events.
 * Logs to console in dev; replace with your observability provider.
 * Never includes raw user content or private asset URLs.
 */

export type AppearanceTelemetryEvent =
  | { type: "style_panel_opened"; accountType: string }
  | { type: "template_selected"; templateId: string; surface: string }
  | { type: "style_profile_saved"; templateId: string; isDefault: boolean }
  | { type: "styled_post_published"; templateId: string; templateVersion: number }
  | { type: "renderer_fallback"; reason: string; templateId?: string; surface: string }
  | { type: "asset_load_failed"; assetKind: string; surface: string }
  | { type: "style_disabled_by_policy"; reason: string }

export function trackAppearanceEvent(event: AppearanceTelemetryEvent): void {
  if (process.env.NODE_ENV === "development") {
    console.log("[appearance:telemetry]", event)
  }
  // TODO: wire to Sentry/PostHog/etc. in a future hardening pass
}
