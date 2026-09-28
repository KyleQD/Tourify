/**
 * EVENT-201 — Server/UI event readiness engine.
 * Stable rule IDs, severity, evidence, remediation from ADMIN_READINESS_RULES.
 */

import {
  ADMIN_READINESS_RULES,
  resolveReadinessRemediationUrl,
  type ReadinessOverridePolicy,
  type ReadinessSeverity,
} from "@/lib/admin/readiness-contract"
import type { EventReadinessInput } from "@/lib/admin/operations-readiness"

export interface EventReadinessFinding {
  id: string
  severity: ReadinessSeverity
  message: string
  evidence: Record<string, unknown>
  remediationUrl: string
  overridePolicy: ReadinessOverridePolicy
  label: string
}

export interface EventReadinessEvaluation {
  eventId: string | null
  orgId: string | null
  ok: boolean
  blockers: EventReadinessFinding[]
  warnings: EventReadinessFinding[]
  findings: EventReadinessFinding[]
  evaluatedAt: string
  source: "event_readiness_contract"
}

function filled(value: unknown): boolean {
  if (value === null || value === undefined) return false
  if (typeof value === "string") return value.trim().length > 0
  if (typeof value === "number") return Number.isFinite(value) && value > 0
  if (Array.isArray(value)) return value.length > 0
  if (typeof value === "object") return Object.keys(value).length > 0
  return Boolean(value)
}

function finding(args: {
  rule: (typeof ADMIN_READINESS_RULES)[keyof typeof ADMIN_READINESS_RULES]
  eventId?: string | null
  message?: string
  evidence: Record<string, unknown>
  label: string
}): EventReadinessFinding {
  return {
    id: args.rule.id,
    severity: args.rule.severity,
    message: args.message || args.rule.remediation,
    evidence: args.evidence,
    remediationUrl: resolveReadinessRemediationUrl(args.rule.remediationPath, {
      eventId: args.eventId,
    }),
    overridePolicy: args.rule.overridePolicy,
    label: args.label,
  }
}

export function evaluateEventReadiness(input: EventReadinessInput & {
  eventId?: string | null
  orgId?: string | null
}): EventReadinessEvaluation {
  const eventId = input.eventId ?? null
  const findings: EventReadinessFinding[] = []

  const hasSchedule = filled(input.start_at) || filled(input.date)
  const hasVenueAccount = input.venue_profile_status
    ? input.venue_profile_status === "verified"
    : filled(input.venue_account_id)
  const hasVenue = hasVenueAccount || filled(input.venue_id) || filled(input.venue_name)
  const hasTour = Boolean(input.tour_ids?.length)
  const hasAdvancing =
    filled(input.technical_rider) ||
    filled(input.hospitality_rider) ||
    filled(input.security_notes)
  const advanceStatus = String(input.advance_status || "").toLowerCase()
  const advanceStarted = [
    "sent",
    "in_progress",
    "review",
    "ready",
    "approved",
    "complete",
    "completed",
    "settled",
  ].includes(advanceStatus)
  const hasFinance =
    filled(input.ticket_price) ||
    filled(input.expected_revenue) ||
    filled(input.settlement_terms)
  const staffCount = input.staff_count ?? 0
  const hasTeam =
    (input.team_count ?? 0) > 0 || (input.vendor_count ?? 0) > 0 || staffCount > 0

  if (!filled(input.title)) {
    findings.push(
      finding({
        rule: ADMIN_READINESS_RULES.event_basics,
        eventId,
        label: "Event basics",
        evidence: { hasTitle: false },
      }),
    )
  }

  if (!hasSchedule) {
    findings.push(
      finding({
        rule: ADMIN_READINESS_RULES.event_schedule,
        eventId,
        label: "Schedule",
        evidence: {
          hasStartAt: filled(input.start_at),
          hasDate: filled(input.date),
          hasLoadIn: filled(input.load_in_time),
          hasSoundCheck: filled(input.sound_check_time),
        },
      }),
    )
  }

  if (!hasVenue) {
    findings.push(
      finding({
        rule: ADMIN_READINESS_RULES.event_venue_identity,
        eventId,
        label: "Venue",
        evidence: {
          hasVenueName: filled(input.venue_name),
          hasVenueId: filled(input.venue_id),
          hasVenueAccount,
        },
      }),
    )
  } else if (!hasVenueAccount) {
    findings.push(
      finding({
        rule: ADMIN_READINESS_RULES.event_venue_profile,
        eventId,
        label: "Venue profile",
        evidence: {
          hasVenueName: filled(input.venue_name),
          hasVenueId: filled(input.venue_id),
          hasVenueAccount: false,
          venueAccountIdProvided: filled(input.venue_account_id),
          venueProfileStatus: input.venue_profile_status ?? "not_verified_by_pure_engine",
        },
      }),
    )
  }

  if (hasTour && input.tour_ids && input.tour_ids.length > 1 && !filled(input.primary_tour_id)) {
    findings.push(
      finding({
        rule: ADMIN_READINESS_RULES.event_tour_assignment,
        eventId,
        label: "Tour assignment",
        evidence: {
          tourCount: input.tour_ids.length,
          hasPrimaryTour: false,
        },
      }),
    )
  }

  if (!advanceStarted && !hasAdvancing) {
    findings.push(
      finding({
        rule: ADMIN_READINESS_RULES.event_advancing,
        eventId,
        label: "Venue advance",
        evidence: {
          advanceStatus: advanceStatus || null,
          hasTechnicalRider: filled(input.technical_rider),
          hasHospitalityRider: filled(input.hospitality_rider),
          hasSecurityNotes: filled(input.security_notes),
        },
      }),
    )
  }

  if (staffCount === 0) {
    findings.push(
      finding({
        rule: ADMIN_READINESS_RULES.event_staffing,
        eventId,
        label: "Staff assignments",
        evidence: {
          staffCount,
          staffingStatus: input.staffing_status ?? "not_verified_by_pure_engine",
          teamCount: input.team_count ?? 0,
          vendorCount: input.vendor_count ?? 0,
          hasTeam,
        },
      }),
    )
  }

  if (!(input.has_logistics && input.has_site_map)) {
    findings.push(
      finding({
        rule: ADMIN_READINESS_RULES.event_logistics,
        eventId,
        label: "Logistics and site map",
        evidence: {
          hasLogistics: Boolean(input.has_logistics),
          hasSiteMap: Boolean(input.has_site_map),
        },
      }),
    )
  }

  if (!hasFinance) {
    findings.push(
      finding({
        rule: ADMIN_READINESS_RULES.event_finance,
        eventId,
        label: "Ticketing and finance",
        evidence: {
          hasTicketPrice: filled(input.ticket_price),
          hasExpectedRevenue: filled(input.expected_revenue),
          hasSettlementTerms: filled(input.settlement_terms),
        },
      }),
    )
  }

  if (!(hasSchedule && hasVenue && filled(input.day_sheet_notes))) {
    findings.push(
      finding({
        rule: ADMIN_READINESS_RULES.event_day_sheet,
        eventId,
        label: "Day sheet",
        evidence: {
          hasSchedule,
          hasVenue,
          hasDaySheetNotes: filled(input.day_sheet_notes),
        },
      }),
    )
  }

  if (!input.has_comms) {
    findings.push(
      finding({
        rule: ADMIN_READINESS_RULES.event_communications,
        eventId,
        label: "Communications",
        evidence: { hasComms: false },
      }),
    )
  }

  const blockers = findings.filter((row) => row.severity === "blocker")
  const warnings = findings.filter((row) => row.severity === "warning")

  return {
    eventId,
    orgId: input.orgId ?? null,
    ok: blockers.length === 0,
    blockers,
    warnings,
    findings,
    evaluatedAt: new Date().toISOString(),
    source: "event_readiness_contract",
  }
}

export function applyEventReadinessWarningOverrides(input: {
  evaluation: EventReadinessEvaluation
  overrideFindingIds?: readonly string[]
  hasOverrideCapability?: boolean
}): EventReadinessEvaluation {
  const overrides = new Set(input.overrideFindingIds || [])
  if (!overrides.size || !input.hasOverrideCapability) return input.evaluation

  const remainingWarnings = input.evaluation.warnings.filter((row) => {
    if (row.overridePolicy !== "capability_warning") return true
    return !overrides.has(row.id)
  })
  const overridden = input.evaluation.warnings.filter(
    (row) => row.overridePolicy === "capability_warning" && overrides.has(row.id),
  )

  return {
    ...input.evaluation,
    warnings: remainingWarnings,
    findings: [...input.evaluation.blockers, ...remainingWarnings],
    ok: input.evaluation.blockers.length === 0,
    // Preserve overridden ids in evidence trail via evaluatedAt stamp only;
    // callers audit overrideFindingIds separately.
    ...(overridden.length
      ? {
          evaluatedAt: input.evaluation.evaluatedAt,
        }
      : {}),
  }
}
