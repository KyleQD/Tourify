export type EnvironmentPhase = "build" | "runtime"

export type EnvironmentValueMap = Readonly<Record<string, string | undefined>>

export interface EnvironmentVariableContract {
  name: string
  availability: "build-and-runtime" | "runtime"
  exposure: "public" | "server-secret"
  requirement: "required" | "conditional" | "optional"
  purpose: string
}

export interface EnvironmentValidationIssue {
  code: "missing" | "invalid" | "incomplete_group" | "unsafe_reuse"
  variables: string[]
  message: string
}

export interface EnvironmentValidationResult {
  valid: boolean
  issues: EnvironmentValidationIssue[]
}

export const ENVIRONMENT_CONTRACT: readonly EnvironmentVariableContract[] = [
  {
    name: "NEXT_PUBLIC_SUPABASE_URL",
    availability: "build-and-runtime",
    exposure: "public",
    requirement: "required",
    purpose: "Supabase API origin used by browser and server clients.",
  },
  {
    name: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    availability: "build-and-runtime",
    exposure: "public",
    requirement: "required",
    purpose: "Supabase public/anonymous client key; never grants service-role access.",
  },
  {
    name: "NEXT_PUBLIC_SITE_URL",
    availability: "build-and-runtime",
    exposure: "public",
    requirement: "required",
    purpose: "Canonical HTTPS deployment origin for metadata, email links, and OAuth redirects.",
  },
  {
    name: "SUPABASE_SERVICE_ROLE_KEY",
    availability: "runtime",
    exposure: "server-secret",
    requirement: "required",
    purpose: "Server-only key for allowlisted service-role jobs.",
  },
  {
    name: "ENCRYPTION_KEY",
    availability: "runtime",
    exposure: "server-secret",
    requirement: "required",
    purpose: "Exactly 32 bytes encoded as 64 hexadecimal characters for protected platform data.",
  },
  {
    name: "INTERNAL_API_SECRET",
    availability: "runtime",
    exposure: "server-secret",
    requirement: "required",
    purpose: "Authenticates internal API-to-API requests.",
  },
  {
    name: "CRON_SECRET",
    availability: "runtime",
    exposure: "server-secret",
    requirement: "required",
    purpose: "Authenticates scheduled jobs and calendar feed tokens.",
  },
  {
    name: "MARKETPLACE_INTEGRATION_SECRET",
    availability: "runtime",
    exposure: "server-secret",
    requirement: "conditional",
    purpose: "Required when marketplace or social-provider credentials are stored.",
  },
  {
    name: "EMPLOYEE_CREDENTIALS_SECRET",
    availability: "runtime",
    exposure: "server-secret",
    requirement: "conditional",
    purpose: "Required when encrypted workforce credentials are enabled; ONBOARDING_CREDENTIALS_SECRET is an accepted alias.",
  },
  {
    name: "RESEND_API_KEY",
    availability: "runtime",
    exposure: "server-secret",
    requirement: "optional",
    purpose: "Transactional email adapter; the UI must report unavailable when it is not configured.",
  },
  {
    name: "NEXT_PUBLIC_MAPBOX_TOKEN",
    availability: "build-and-runtime",
    exposure: "public",
    requirement: "optional",
    purpose: "Map rendering adapter.",
  },
  {
    name: "AVIATIONSTACK_API_KEY",
    availability: "runtime",
    exposure: "server-secret",
    requirement: "optional",
    purpose: "Flight schedule lookup adapter.",
  },
  {
    name: "OPENAI_API_KEY",
    availability: "runtime",
    exposure: "server-secret",
    requirement: "optional",
    purpose: "AI-assisted features; absence must not fall back to mock results.",
  },
  {
    name: "STRIPE_SECRET_KEY",
    availability: "runtime",
    exposure: "server-secret",
    requirement: "optional",
    purpose: "Stripe ticketing and marketplace adapter.",
  },
  {
    name: "EVENT_DISCOVERY_V2",
    availability: "runtime",
    exposure: "server-secret",
    requirement: "optional",
    purpose: "Feature flag: discovery-index search path for events.",
  },
  {
    name: "NEXT_PUBLIC_EVENT_DISCOVERY_V2",
    availability: "build-and-runtime",
    exposure: "public",
    requirement: "optional",
    purpose: "Browser twin of EVENT_DISCOVERY_V2 for the events UI.",
  },
  {
    name: "EVENT_PROVIDER_TICKETMASTER",
    availability: "runtime",
    exposure: "server-secret",
    requirement: "optional",
    purpose: "Feature flag: Ticketmaster ingestion and display.",
  },
  {
    name: "TICKETMASTER_API_KEY",
    availability: "runtime",
    exposure: "server-secret",
    requirement: "conditional",
    purpose: "Required when EVENT_PROVIDER_TICKETMASTER is enabled; server-only.",
  },
  {
    name: "EVENT_PROVIDER_BANDSINTOWN",
    availability: "runtime",
    exposure: "server-secret",
    requirement: "optional",
    purpose: "Feature flag: Bandsintown artist-connected sync.",
  },
  {
    name: "EVENT_PROVIDER_BANDSINTOWN_PARTNER_MODE",
    availability: "runtime",
    exposure: "server-secret",
    requirement: "optional",
    purpose: "Feature flag: Bandsintown partner mode; requires partnership approval.",
  },
  {
    name: "BANDSINTOWN_APP_ID",
    availability: "runtime",
    exposure: "server-secret",
    requirement: "conditional",
    purpose: "Required when Bandsintown is enabled; server-only.",
  },
  {
    name: "EVENT_EXTERNAL_CLAIMS",
    availability: "runtime",
    exposure: "server-secret",
    requirement: "optional",
    purpose: "Feature flag: claiming and enrichment of imported events.",
  },
  {
    name: "EVENT_MAP_VIEW",
    availability: "runtime",
    exposure: "server-secret",
    requirement: "optional",
    purpose: "Feature flag: map view for event discovery.",
  },
  {
    name: "EVENT_RECOMMENDED_SORT",
    availability: "runtime",
    exposure: "server-secret",
    requirement: "optional",
    purpose: "Feature flag: recommended sort once scoring is ready.",
  },
  {
    name: "EVENT_PROVIDER_ADMIN_TOOLS",
    availability: "runtime",
    exposure: "server-secret",
    requirement: "optional",
    purpose: "Feature flag: provider health and sync admin surfaces.",
  },
] as const

const REQUIRED_FOR_PRODUCTION = ENVIRONMENT_CONTRACT
  .filter((item) => item.requirement === "required")
  .map((item) => item.name)

const COMPLETE_GROUPS: ReadonlyArray<ReadonlyArray<string>> = [
  ["RESEND_API_KEY", "RESEND_FROM_EMAIL"],
  ["UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN"],
  ["KV_REST_API_URL", "KV_REST_API_TOKEN"],
  ["FACEBOOK_APP_ID", "FACEBOOK_APP_SECRET"],
  ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"],
  ["TIKTOK_CLIENT_KEY", "TIKTOK_CLIENT_SECRET"],
  ["TWITTER_CLIENT_ID", "TWITTER_CLIENT_SECRET"],
  ["TWITTER_CODE_CHALLENGE", "TWITTER_CODE_VERIFIER"],
]

function valueOf(environment: EnvironmentValueMap, name: string): string {
  return environment[name]?.trim() ?? ""
}

function isHttpsUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === "https:" && Boolean(url.hostname) && !url.username && !url.password
  } catch {
    return false
  }
}

export function validateProductionEnvironment(
  phase: EnvironmentPhase,
  environment: EnvironmentValueMap = process.env,
): EnvironmentValidationResult {
  const issues: EnvironmentValidationIssue[] = []
  const missing = REQUIRED_FOR_PRODUCTION.filter((name) => !valueOf(environment, name))

  if (missing.length > 0) {
    issues.push({
      code: "missing",
      variables: missing,
      message: `Missing required production variables: ${missing.join(", ")}.`,
    })
  }

  for (const name of ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SITE_URL"] as const) {
    const value = valueOf(environment, name)
    if (value && !isHttpsUrl(value)) {
      issues.push({
        code: "invalid",
        variables: [name],
        message: `${name} must be an absolute HTTPS URL without embedded credentials.`,
      })
    }
  }

  const encryptionKey = valueOf(environment, "ENCRYPTION_KEY")
  if (encryptionKey && !/^[a-f0-9]{64}$/i.test(encryptionKey)) {
    issues.push({
      code: "invalid",
      variables: ["ENCRYPTION_KEY"],
      message: "ENCRYPTION_KEY must contain exactly 64 hexadecimal characters (32 bytes).",
    })
  }

  const anonymousKey = valueOf(environment, "NEXT_PUBLIC_SUPABASE_ANON_KEY")
  const serviceRoleKey = valueOf(environment, "SUPABASE_SERVICE_ROLE_KEY")
  if (anonymousKey && serviceRoleKey && anonymousKey === serviceRoleKey) {
    issues.push({
      code: "unsafe_reuse",
      variables: ["NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"],
      message: "The public Supabase key and server-only service-role key must be different.",
    })
  }

  for (const group of COMPLETE_GROUPS) {
    const configured = group.filter((name) => Boolean(valueOf(environment, name)))
    if (configured.length > 0 && configured.length < group.length) {
      const absent = group.filter((name) => !configured.includes(name))
      issues.push({
        code: "incomplete_group",
        variables: [...group],
        message: `Optional integration is only partly configured; also set ${absent.join(", ")} or remove the whole group.`,
      })
    }
  }

  return { valid: issues.length === 0, issues }
}

export function formatEnvironmentValidationError(
  phase: EnvironmentPhase,
  result: EnvironmentValidationResult,
): string {
  const details = result.issues.map((issue) => `- ${issue.message}`).join("\n")
  return [
    `[env-check] Production ${phase} environment is invalid (${result.issues.length} issue${result.issues.length === 1 ? "" : "s"}).`,
    details,
    "No values were printed. Configure the named variables, then retry.",
  ].join("\n")
}

export function assertProductionEnvironment(
  phase: EnvironmentPhase,
  environment: EnvironmentValueMap = process.env,
): void {
  const result = validateProductionEnvironment(phase, environment)
  if (!result.valid) throw new Error(formatEnvironmentValidationError(phase, result))
}
