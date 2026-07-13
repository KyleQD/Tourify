import type { Phase13EnvironmentConfig, Phase13ScenarioConfig, Phase13ScenarioKey } from "@/types/hiring-real-data-test"

function readRequiredEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

function readOptionalEnv(name: string): string | undefined {
  const value = process.env[name]
  return value && value.trim().length > 0 ? value : undefined
}

function buildScenario(args: {
  key: Phase13ScenarioKey
  label: string
  envPrefix: string
  entityType: "venue" | "organization" | "artist"
}): Phase13ScenarioConfig | null {
  const entityId = readOptionalEnv(`${args.envPrefix}_ENTITY_ID`)
  const displayName = readOptionalEnv(`${args.envPrefix}_DISPLAY_NAME`) ?? args.label

  if (!entityId) return null

  return {
    key: args.key,
    label: args.label,
    employer: {
      entityType: args.entityType,
      entityId,
      displayName,
      scope: {
        eventId: readOptionalEnv(`${args.envPrefix}_EVENT_ID`),
        tourId: readOptionalEnv(`${args.envPrefix}_TOUR_ID`),
        venueId: readOptionalEnv(`${args.envPrefix}_VENUE_ID`),
      },
    },
    jobPostingId: readOptionalEnv(`${args.envPrefix}_JOB_POSTING_ID`),
    applicationId: readOptionalEnv(`${args.envPrefix}_APPLICATION_ID`),
    candidateId: readOptionalEnv(`${args.envPrefix}_CANDIDATE_ID`),
    invitationToken: readOptionalEnv(`${args.envPrefix}_INVITATION_TOKEN`),
    staffMemberId: readOptionalEnv(`${args.envPrefix}_STAFF_MEMBER_ID`),
    employmentAssignmentId: readOptionalEnv(`${args.envPrefix}_EMPLOYMENT_ASSIGNMENT_ID`),
    actorToken: readOptionalEnv(`${args.envPrefix}_ACTOR_TOKEN`),
  }
}

export function getPhase13EnvironmentConfig(): Phase13EnvironmentConfig {
  const scenarios = [
    buildScenario({
      key: "venue-security",
      label: "Venue hires security guards",
      envPrefix: "PHASE13_VENUE_SECURITY",
      entityType: "venue",
    }),
    buildScenario({
      key: "venue-bartender",
      label: "Venue hires bartenders",
      envPrefix: "PHASE13_VENUE_BARTENDER",
      entityType: "venue",
    }),
    buildScenario({
      key: "artist-tour-crew",
      label: "Artist hires tour crew",
      envPrefix: "PHASE13_ARTIST_CREW",
      entityType: "artist",
    }),
    buildScenario({
      key: "organization-third-party-venue",
      label: "Organization staffs third-party venue",
      envPrefix: "PHASE13_ORG_STAFFING",
      entityType: "organization",
    }),
    buildScenario({
      key: "direct-invite",
      label: "Direct invite without application",
      envPrefix: "PHASE13_DIRECT_INVITE",
      entityType: "venue",
    }),
    buildScenario({
      key: "eligibility-enforce",
      label: "Eligibility gate enforce mode",
      envPrefix: "PHASE13_ELIGIBILITY_ENFORCE",
      entityType: "venue",
    }),
  ].filter(Boolean) as Phase13ScenarioConfig[]

  return {
    appUrl: readRequiredEnv("NEXT_PUBLIC_APP_URL"),
    supabaseUrl: readRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    supabaseServiceRoleKey: readRequiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
    scenarios,
  }
}
