import type { HiringEntity } from "@/types/hiring-entity"

export type Phase13ScenarioKey =
  | "venue-security"
  | "venue-bartender"
  | "artist-tour-crew"
  | "organization-third-party-venue"
  | "direct-invite"
  | "eligibility-enforce"

export interface Phase13ScenarioConfig {
  key: Phase13ScenarioKey
  label: string
  employer: HiringEntity
  jobPostingId?: string
  applicationId?: string
  candidateId?: string
  invitationToken?: string
  staffMemberId?: string
  employmentAssignmentId?: string
  /** Per-scenario bearer token for the hiring actor (optional; falls back to PHASE13_AUTH_BEARER_TOKEN) */
  actorToken?: string
}

export interface Phase13EnvironmentConfig {
  appUrl: string
  supabaseUrl: string
  supabaseServiceRoleKey: string
  scenarios: Phase13ScenarioConfig[]
}

export interface Phase13CheckResult {
  scenarioKey: Phase13ScenarioKey | "global"
  name: string
  status: "pass" | "fail" | "warn" | "skip"
  message: string
  metadata?: Record<string, unknown>
}

export interface Phase13SmokeTestReport {
  startedAt: string
  finishedAt: string
  total: number
  passed: number
  failed: number
  warned: number
  skipped: number
  results: Phase13CheckResult[]
}
