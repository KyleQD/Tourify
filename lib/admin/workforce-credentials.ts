/**
 * WORK-405 — Skills and credentials (pure).
 *
 * Roles declare skill/credential requirements; worker credentials carry
 * issuer, expiry, verification status, and file references. The requirement
 * checker evaluates each role requirement against the worker's credential
 * portfolio and returns per-requirement results with blocking/warning policy.
 *
 * Models:
 *   SkillTag               — simple tag identifying a skill/competency
 *   CredentialRequirement  — what a role slot needs (type, level, expiry policy)
 *   WorkerCredential       — credential held by a person (issued/verified/expired)
 *   CredentialCheckResult  — outcome per requirement (met/missing/expired/expiring)
 *   CredentialPolicy       — org-configured thresholds (warn_days, block_days)
 *
 * Pure: no I/O, no `server-only`.
 */

// ---------------------------------------------------------------------------
// Skill tags
// ---------------------------------------------------------------------------

export type SkillLevel = "basic" | "intermediate" | "advanced" | "expert"

export interface SkillTag {
  tag_id: string
  label: string
  category: string | null
}

// ---------------------------------------------------------------------------
// Credential types
// ---------------------------------------------------------------------------

export type CredentialType =
  | "certification"   // formal issued certificate (e.g. rigging, first aid)
  | "license"         // government-issued license (driver, pyrotechnics)
  | "permit"          // venue/jurisdiction permit (security, food handler)
  | "access_level"    // tour/venue access badge tier
  | "training"        // completed training record
  | "background_check"// background screening
  | "other"

export type CredentialVerificationStatus =
  | "unverified"      // self-reported, not yet checked
  | "pending"         // verification in progress
  | "verified"        // confirmed by issuer/admin
  | "failed"          // verification attempt rejected
  | "revoked"         // previously verified, now revoked

// ---------------------------------------------------------------------------
// Role credential requirement
// ---------------------------------------------------------------------------

export type CredentialRequirementPolicy = "block" | "warn" | "info"

export interface CredentialRequirement {
  requirement_id: string
  /** Role or template slot this requirement belongs to. */
  role_slot_id: string
  credential_type: CredentialType
  /** Specific credential name/title required (e.g. "ETCP Rigger"). */
  credential_name: string
  /** Minimum skill level required. */
  min_skill_level: SkillLevel | null
  /** If true, a verified status is required (unverified blocks even if present). */
  requires_verification: boolean
  /** Days before expiry when this triggers expiring-soon (default: 30). */
  warn_expiry_days: number
  /** Policy when requirement is not met. */
  missing_policy: CredentialRequirementPolicy
  /** Policy when credential is expired. */
  expired_policy: CredentialRequirementPolicy
  notes: string | null
}

// ---------------------------------------------------------------------------
// Worker credential
// ---------------------------------------------------------------------------

export interface WorkerCredential {
  credential_id: string
  person_id: string
  credential_type: CredentialType
  credential_name: string
  issuer: string | null
  issued_date: string | null
  expiry_date: string | null
  skill_level: SkillLevel | null
  verification_status: CredentialVerificationStatus
  /** Storage key or URL for the credential document. */
  file_ref: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

// ---------------------------------------------------------------------------
// Credential check result
// ---------------------------------------------------------------------------

export type CredentialMatchOutcome =
  | "met"             // requirement satisfied
  | "met_expiring"    // satisfied but expiring within warn window
  | "missing"         // no matching credential found
  | "expired"         // credential exists but past expiry_date
  | "unverified"      // credential exists but verification_status not verified
  | "insufficient_level" // credential exists but skill_level below minimum

export interface CredentialCheckItem {
  requirement: CredentialRequirement
  /** Best matching credential for this requirement (null if none). */
  matched_credential: WorkerCredential | null
  outcome: CredentialMatchOutcome
  /** True when this outcome blocks scheduling per policy. */
  is_blocking: boolean
  /** True when this is a warning (non-blocking). */
  is_warning: boolean
  /** Days until expiry (null if no expiry or no match). */
  days_until_expiry: number | null
  detail: string
}

export interface CredentialCheckResult {
  person_id: string
  role_slot_id: string
  items: CredentialCheckItem[]
  blocking_count: number
  warning_count: number
  /** True when no blocking issues — person meets this role's requirements. */
  is_eligible: boolean
}

// ---------------------------------------------------------------------------
// Skill level comparison
// ---------------------------------------------------------------------------

const SKILL_LEVEL_RANK: Record<SkillLevel, number> = {
  basic: 1,
  intermediate: 2,
  advanced: 3,
  expert: 4,
}

export function skillLevelMeetsRequirement(
  held: SkillLevel | null,
  required: SkillLevel | null,
): boolean {
  if (!required) return true
  if (!held) return false
  return SKILL_LEVEL_RANK[held] >= SKILL_LEVEL_RANK[required]
}

// ---------------------------------------------------------------------------
// Credential policy defaults
// ---------------------------------------------------------------------------

export const DEFAULT_WARN_EXPIRY_DAYS = 30

/** Determine blocking/warning from policy + outcome. */
function policyToFlags(policy: CredentialRequirementPolicy): { is_blocking: boolean; is_warning: boolean } {
  return {
    is_blocking: policy === "block",
    is_warning:  policy === "warn",
  }
}

// ---------------------------------------------------------------------------
// Check one requirement against a worker's credentials
// ---------------------------------------------------------------------------

function checkOneRequirement(
  req: CredentialRequirement,
  credentials: WorkerCredential[],
  nowIso: string,
): CredentialCheckItem {
  const nowMs = new Date(nowIso).getTime()
  const warnMs = req.warn_expiry_days * 86_400_000

  // Find credentials matching type + name (case-insensitive name match)
  const candidates = credentials.filter(
    (c) =>
      c.credential_type === req.credential_type &&
      c.credential_name.trim().toLowerCase() === req.credential_name.trim().toLowerCase(),
  )

  if (candidates.length === 0) {
    return {
      requirement: req,
      matched_credential: null,
      outcome: "missing",
      ...policyToFlags(req.missing_policy),
      days_until_expiry: null,
      detail: `No credential of type '${req.credential_type}' named '${req.credential_name}' found.`,
    }
  }

  // Pick best candidate: prefer verified, then most recently issued
  const sorted = [...candidates].sort((a, b) => {
    const vA = a.verification_status === "verified" ? 1 : 0
    const vB = b.verification_status === "verified" ? 1 : 0
    if (vA !== vB) return vB - vA
    return (b.issued_date ?? "").localeCompare(a.issued_date ?? "")
  })
  const best = sorted[0]

  // Check expiry
  let daysUntilExpiry: number | null = null
  if (best.expiry_date) {
    const expiryMs = new Date(best.expiry_date).getTime()
    daysUntilExpiry = Math.ceil((expiryMs - nowMs) / 86_400_000)

    if (expiryMs < nowMs) {
      return {
        requirement: req,
        matched_credential: best,
        outcome: "expired",
        ...policyToFlags(req.expired_policy),
        days_until_expiry: daysUntilExpiry,
        detail: `Credential '${best.credential_name}' expired on ${best.expiry_date}.`,
      }
    }

    if (expiryMs - nowMs < warnMs) {
      // Expiring soon — still met but warn
      return {
        requirement: req,
        matched_credential: best,
        outcome: "met_expiring",
        is_blocking: false,
        is_warning: true,
        days_until_expiry: daysUntilExpiry,
        detail: `Credential '${best.credential_name}' expires in ${daysUntilExpiry} day(s) (threshold: ${req.warn_expiry_days}).`,
      }
    }
  }

  // Check verification
  if (req.requires_verification && best.verification_status !== "verified") {
    return {
      requirement: req,
      matched_credential: best,
      outcome: "unverified",
      ...policyToFlags(req.missing_policy),
      days_until_expiry: daysUntilExpiry,
      detail: `Credential '${best.credential_name}' is '${best.verification_status}', verification required.`,
    }
  }

  // Check skill level
  if (!skillLevelMeetsRequirement(best.skill_level, req.min_skill_level)) {
    return {
      requirement: req,
      matched_credential: best,
      outcome: "insufficient_level",
      is_blocking: req.missing_policy === "block",
      is_warning: req.missing_policy === "warn",
      days_until_expiry: daysUntilExpiry,
      detail: `Skill level '${best.skill_level}' does not meet minimum '${req.min_skill_level}'.`,
    }
  }

  // All checks passed
  return {
    requirement: req,
    matched_credential: best,
    outcome: "met",
    is_blocking: false,
    is_warning: false,
    days_until_expiry: daysUntilExpiry,
    detail: `Requirement met.`,
  }
}

// ---------------------------------------------------------------------------
// Check all requirements for a person/role
// ---------------------------------------------------------------------------

export function checkRoleCredentials(args: {
  person_id: string
  role_slot_id: string
  requirements: CredentialRequirement[]
  credentials: WorkerCredential[]
  nowIso: string
}): CredentialCheckResult {
  const { person_id, role_slot_id, requirements, credentials, nowIso } = args

  const personCreds = credentials.filter((c) => c.person_id === person_id)
  const items = requirements.map((req) => checkOneRequirement(req, personCreds, nowIso))

  const blocking = items.filter((i) => i.is_blocking).length
  const warning  = items.filter((i) => i.is_warning).length

  return {
    person_id,
    role_slot_id,
    items,
    blocking_count: blocking,
    warning_count:  warning,
    is_eligible:    blocking === 0,
  }
}

// ---------------------------------------------------------------------------
// Bulk eligibility check across multiple persons/roles
// ---------------------------------------------------------------------------

export interface BulkCredentialCheckEntry {
  person_id: string
  role_slot_id: string
  requirements: CredentialRequirement[]
}

export interface BulkCredentialCheckResult {
  results: CredentialCheckResult[]
  eligible_count: number
  ineligible_count: number
  warning_only_count: number
}

export function checkBulkCredentials(args: {
  entries: BulkCredentialCheckEntry[]
  credentials: WorkerCredential[]
  nowIso: string
}): BulkCredentialCheckResult {
  const results = args.entries.map((e) =>
    checkRoleCredentials({
      person_id:    e.person_id,
      role_slot_id: e.role_slot_id,
      requirements: e.requirements,
      credentials:  args.credentials,
      nowIso:       args.nowIso,
    }),
  )

  return {
    results,
    eligible_count:    results.filter((r) => r.is_eligible && r.warning_count === 0).length,
    ineligible_count:  results.filter((r) => !r.is_eligible).length,
    warning_only_count:results.filter((r) => r.is_eligible && r.warning_count > 0).length,
  }
}
