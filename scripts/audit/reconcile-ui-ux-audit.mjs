#!/usr/bin/env node

import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { basename, dirname, join, resolve } from "node:path"

function parseCsv(source) {
  const rows = []
  let row = []
  let field = ""
  let quoted = false

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index]
    const next = source[index + 1]
    if (quoted && char === '"' && next === '"') {
      field += '"'
      index += 1
    } else if (char === '"') {
      quoted = !quoted
    } else if (char === "," && !quoted) {
      row.push(field)
      field = ""
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1
      row.push(field)
      if (row.some((value) => value.length > 0)) rows.push(row)
      row = []
      field = ""
    } else {
      field += char
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field)
    rows.push(row)
  }

  const [headers, ...data] = rows
  return data.map((values) =>
    Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])),
  )
}

function csvCell(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`
}

const VENUE_RECONCILIATION_EVIDENCE = {
  "VEN-01": {
    evidence:
      "VenueOperationsShell owns /venue chrome; root AppChrome is suppressed for operational Venue routes; canonical IA redirects and focused shell visibility tests.",
    basis:
      "Double chrome is removed and one responsive navigation model remains; manual viewport and assistive-technology acceptance is still required.",
  },
  "VEN-02": {
    evidence:
      "Canonical /venue/dashboard uses current venue context, real booking/event/staff sources, action-item prioritization, and explicit load/error/empty states.",
    basis:
      "Operational entry is implemented; moderated priority comprehension and responsive acceptance remain.",
  },
  "VEN-03": {
    evidence:
      "Strict venue profile update/public DTO contract, ownership checks, private-field stripping, real multi-venue detail/editor mutations, and contract tests.",
    basis:
      "Public and private profile data paths are separated; renderer parity and viewport acceptance remain.",
  },
  "VEN-04": {
    evidence:
      "Canonical compatibility lifecycle, revision/idempotency conflicts, operator-scoped backfill SQL, timeline evidence, explicit feature gate, and focused lifecycle tests.",
    basis:
      "Lifecycle implementation is complete behind the manual SQL gate; operator postflight and two-sided moderated acceptance remain.",
  },
  "VEN-05": {
    evidence:
      "Canonical Venue event list/calendar and /venue/events/[id] operations hub with legacy redirect inventory and role-aware Venue APIs.",
    basis:
      "Active paths converge on the event hub; cross-surface propagation and persona acceptance remain.",
  },
  "VEN-06": {
    evidence:
      "Authenticated scan APIs, event-scoped scanner authorization, restricted attendee contact, truthful offline-paused recovery, and focused offline-state tests.",
    basis:
      "Unsafe raw credential queuing and unauthorized totals are removed; safe cryptographic offline admission and field acceptance remain external release gates.",
  },
  "VEN-07": {
    evidence:
      "Event-scoped ticketing workspace and shared ticket credential/check-in/refund/settlement contracts with ticketing domain tests.",
    basis:
      "Canonical implementation exists; full venue persona sale-to-settlement acceptance remains.",
  },
  "VEN-08": {
    evidence:
      "Real manual transaction and ticketing sources, view/manage finance capability separation, tenant-scoped service-role queries, and finance API isolation tests.",
    basis:
      "Unsupported synthetic totals are removed; reconciliation and payout persona acceptance remain.",
  },
  "VEN-09": {
    evidence:
      "Canonical analytics reads verified ticketing/booking sources and retired dashboard analytics twins redirect to /venue/analytics.",
    basis:
      "Mock-backed active analytics are removed; chart-by-chart source/range/export acceptance remains.",
  },
  "VEN-10": {
    evidence:
      "Canonical /venue/staff workforce hub connects jobs, hiring applications, onboarding, roster, scheduling, and assignment-backed Work Mode contracts.",
    basis:
      "The active vertical is connected; moderated job-to-shift acceptance remains.",
  },
  "VEN-11": {
    evidence:
      "Canonical server-rendered Venue scheduler and authenticated venue-scoped shift/request APIs preserve persisted assignment and publication behavior.",
    basis:
      "Mock scheduler twins are outside canonical navigation; conflict/swap persona acceptance remains.",
  },
  "VEN-12": {
    evidence:
      "Central Venue permission contract, owner/team/staff/assignment resolution, permission catalog, finance/check-in capability enforcement, and hiring permission bridge.",
    basis:
      "Capability-aware controls are implemented; dangerous-action preview and audit-history acceptance remain.",
  },
  "VEN-13": {
    evidence:
      "Canonical /venue/documents and /venue/equipment surfaces use venue-scoped records; duplicate dashboard twins redirect to canonical routes.",
    basis:
      "Active mock fallbacks are removed from canonical entry points; version/custody/maintenance persona acceptance remains.",
  },
  "VEN-14": {
    evidence:
      "Canonical shared site-map workspace, versioned map contracts, Venue-scoped access, field/list affordances, and site-map domain tests.",
    basis:
      "Canonical editor/viewer exists; keyboard alternative and mobile field acceptance remain.",
  },
  "VEN-15": {
    evidence:
      "Canonical /venue/messages entry links booking/event contexts while legacy social/team communication routes are redirected or kept outside production navigation.",
    basis:
      "Active navigation converges on one inbox; attachment/read/escalation persona acceptance remains.",
  },
  "VEN-16": {
    evidence:
      "Canonical /venue/settings, real profile save contract, permission-aware public link, and legacy/mock integration entries removed from canonical navigation.",
    basis:
      "Save behavior and safe active routing exist; settings decomposition and live provider-health acceptance remain.",
  },
}

function reconcile(task) {
  if (task.task_id === "FND-001") {
    return {
      status: "blocked",
      evidence: "Operator-supplied hosted environment and migration-history evidence required.",
      basis: "The repository cannot prove the deployed database identity without external read-only evidence.",
    }
  }
  if (["FND-003", "FND-005"].includes(task.task_id)) {
    return {
      status: "blocked",
      evidence: "Human usability/accessibility evidence is not present.",
      basis: "Automated code evidence cannot replace moderated and assistive-technology validation.",
    }
  }
  if (task.task_id === "FND-010") {
    return {
      status: "verified complete",
      evidence:
        "Migration validation scanner, additive migration manifests, disabled reset routes, and completion ledgers.",
      basis: "Repository safeguards enforce additive delivery and reject destructive migration patterns.",
    }
  }
  if (task.module_id === "GEN-12") {
    return {
      status: "needs remediation",
      evidence:
        "Authenticated Work Mode APIs, canonical /work workspace, publication-backed worker modules, worker-action tests, and manual-only check-in/acknowledgement SQL package.",
      basis: "Implementation is complete behind the SQL feature gate; operator postflight plus accessibility and moderated journey evidence remain.",
    }
  }
  if (task.module_id === "PUB-03") {
    return {
      status: "needs remediation",
      evidence:
        "Canonical status-driven /auth/verification surface implements sent, waiting, verified, expired, rate-limited, recovery, resend, and support states.",
      basis: "Code and focused type evidence exist; email-provider delivery, mobile, keyboard, and screen-reader acceptance evidence remain.",
    }
  }
  if (task.module_id === "PUB-04") {
    return {
      status: "needs remediation",
      evidence:
        "Existing account mutations are preserved with seven-day non-sensitive local draft recovery, save status, normalized slugs, and authenticated trusted availability checks.",
      basis: "Progress and URL preflight are implemented; persona-wizard decomposition and responsive acceptance evidence remain.",
    }
  }
  if (task.module_id === "GEN-01") {
    return {
      status: "needs remediation",
      evidence:
        "General dashboard action center reads real applications, tickets, notifications, profile completion, and active assignments with partial/error states.",
      basis: "The fabricated goals and analytics claims were removed; responsive and moderated dashboard acceptance evidence remains.",
    }
  }
  if (task.module_id === "GEN-02") {
    return {
      status: "needs remediation",
      evidence:
        "Canonical /settings/profile editor provides identity, privacy, appearance entry, accurate public preview, validation, media, and save status; /profile redirects there.",
      basis: "The duplicate direct-database editor is out of the active path; portfolio consolidation and responsive public-preview acceptance remain.",
    }
  }
  if (task.module_id === "GEN-03") {
    return {
      status: "needs remediation",
      evidence:
        "Canonical /profile/:username now stays General, applies contact visibility before rendering, preserves published layout state, and no longer fabricates view counts.",
      basis: "Identity and privacy drift are remediated; the two renderer implementations still require component convergence and acceptance evidence.",
    }
  }
  if (task.module_id === "GEN-09") {
    return {
      status: "needs remediation",
      evidence:
        "Canonical /jobs/my-applications merges artist and staffing sources, normalizes statuses, recovers partial reads, and offers ownership-scoped conflict-safe withdrawal.",
      basis: "Browse/apply/track/withdraw are connected; draft resume, applicant messaging, and moderated employer handoff evidence remain.",
    }
  }
  if (task.module_id === "GEN-11") {
    return {
      status: "needs remediation",
      evidence:
        "Canonical /calendar agenda reads authenticated tickets, bookings, and assignments, removes raw ID entry, reports partial sources, and detects overlapping commitments.",
      basis: "The General agenda and conflict model are implemented; external subscription/export and responsive assistive-technology evidence remain.",
    }
  }
  if (task.module_id === "PUB-05") {
    return {
      status: "needs remediation",
      evidence:
        "Canonical Artist/Venue onboarding restores server-owned flow responses and step metadata, autosaves, validates required fields, and safely resumes after account creation.",
      basis: "Authorization, status compatibility, refresh/back/re-entry, and duplicate-creation recovery are implemented; responsive and assistive-technology acceptance remain.",
    }
  }
  if (task.module_id?.startsWith("ADM-")) {
    return {
      status: "needs remediation",
      evidence:
        ".agents/admin-dashboard-builder, .agents/admin-feature-spec-builder, and .agents/admin-ui-wiring ledgers.",
      basis: "Substantial implementation exists; each audit task still requires current acceptance evidence.",
    }
  }
  if (task.module_id?.startsWith("VEN-")) {
    const venueEvidence = VENUE_RECONCILIATION_EVIDENCE[task.module_id]
    return {
      status: "needs remediation",
      evidence:
        venueEvidence?.evidence ??
        ".agents/venue-pages-builder ledger and docs/audits/venue-canonical-ia.md.",
      basis:
        venueEvidence?.basis ??
        "Canonical Venue work exists; each audit task still requires current acceptance evidence.",
    }
  }
  if (task.task_id?.startsWith("FND-")) {
    return {
      status: "needs remediation",
      evidence: "Current app shell, shared UI primitives, CI scripts, and audit registries.",
      basis: "Foundation pieces exist but have not passed the attached audit's complete evidence bundle.",
    }
  }
  return {
    status: "not started",
    evidence: "No task-specific acceptance bundle located during the initial reconciliation.",
    basis: "Implementation may exist, but it is not credited without task-level evidence.",
  }
}

const ROUTE_REDIRECTS = new Map([
  ["/profile", "/settings/profile"],
  ["/admin", "/admin/dashboard"],
  ["/admin/dashboard/messages", "/admin/dashboard/communications"],
  ["/admin/dashboard/tours/create", "/admin/dashboard/tours/builder"],
  ["/admin/dashboard/tours/planner", "/admin/dashboard/tours/builder"],
  ["/admin/dashboard/events/planner", "/admin/dashboard/events/create"],
  ["/admin/dashboard/jobs", "/admin/dashboard/hiring?tab=jobs"],
  ["/admin/dashboard/onboarding", "/admin/dashboard/hiring?tab=onboarding"],
  ["/venue", "/venue/dashboard"],
  ["/venue/tickets", "/venue/dashboard/tickets"],
  ["/venue/site-maps", "/venue/dashboard/site-maps"],
  ["/venue/assets", "/venue/equipment"],
  ["/venue/dashboard/settings", "/venue/settings"],
  ["/venue/dashboard/analytics", "/venue/analytics"],
  ["/venue/dashboard/equipment", "/venue/equipment"],
  ["/venue/dashboard/documents", "/venue/documents"],
  ["/venue/dashboard/events", "/venue/events"],
  ["/venue/dashboard/events/map", "/venue/events"],
  ["/venue/dashboard/teams", "/venue/staff"],
])

const HIDDEN_ROUTE_PATTERNS = [
  /^\/debug(?:\/|$)/,
  /^\/admin\/debug(?:\/|$)/,
  /^\/artist\/debug(?:\/|$)/,
  /^\/(?:auth-demo|auth-test|test-friend-suggestions)(?:\/|$)/,
  /^\/admin\/(?:create-tables|reset-onboarding|setup)(?:\/|$)/,
  /^\/admin\/dashboard\/test-api(?:\/|$)/,
  /^\/migrations(?:\/|$)/,
  /^\/test-/,
]

function reconcileRoute(route) {
  const redirectTarget = ROUTE_REDIRECTS.get(route.route)
  if (redirectTarget) {
    return {
      disposition: "redirect",
      canonicalTarget: redirectTarget,
      owner: route.account_area,
      decisionBasis: "Canonical IA or current canonical-route ledger.",
    }
  }
  if (HIDDEN_ROUTE_PATTERNS.some((pattern) => pattern.test(route.route))) {
    return {
      disposition: "hide",
      canonicalTarget: "",
      owner: "Engineering / internal tools",
      decisionBasis: "Debug, migration, setup, or test surface; never production navigation.",
    }
  }
  return {
    disposition: "keep",
    canonicalTarget: route.route,
    owner: route.account_area,
    decisionBasis:
      route.audit_risk === "critical" || route.audit_risk === "high"
        ? "Canonical surface retained; audit remediation required before release acceptance."
        : "Canonical surface retained pending normal definition-of-done verification.",
  }
}

function componentRank(component) {
  const path = component.component_file
  if (path.startsWith("components/ui/")) return 0
  if (path.startsWith("components/")) return 1
  if (path.startsWith("app/")) return 2
  return 3
}

function reconcileComponents(components) {
  const canonicalByDuplicateGroup = new Map()
  for (const component of components) {
    if (!component.duplicate_group) continue
    const current = canonicalByDuplicateGroup.get(component.duplicate_group)
    if (
      !current ||
      componentRank(component) < componentRank(current) ||
      (componentRank(component) === componentRank(current) &&
        component.component_file.length < current.component_file.length)
    ) {
      canonicalByDuplicateGroup.set(component.duplicate_group, component)
    }
  }

  return components.map((component) => {
    const canonical = component.duplicate_group
      ? canonicalByDuplicateGroup.get(component.duplicate_group)
      : null
    if (canonical && canonical.component_file !== component.component_file) {
      return {
        ...component,
        disposition: "retire later",
        canonicalTarget: canonical.component_file,
        decisionBasis: "Exact duplicate; preserve until imports move and zero-use evidence is recorded.",
      }
    }
    if (Number(component.incomplete_markers || 0) > 0) {
      return {
        ...component,
        disposition: "hide",
        canonicalTarget: canonical?.component_file ?? component.component_file,
        decisionBasis: "Contains explicit incomplete/mock markers; do not mount on canonical production routes.",
      }
    }
    return {
      ...component,
      disposition: "keep",
      canonicalTarget: canonical?.component_file ?? component.component_file,
      decisionBasis:
        component.audit_risk === "critical" || component.audit_risk === "high"
          ? "Canonical component retained but requires audit remediation/decomposition."
          : "Retain and verify against the shared component definition of done.",
    }
  })
}

function writeCsv(path, rows, headers) {
  writeFileSync(
    path,
    [
      headers.map(csvCell).join(","),
      ...rows.map((row) => headers.map((header) => csvCell(row[header])).join(",")),
    ].join("\n") + "\n",
  )
}

const sourcePath = process.argv[2]
if (!sourcePath) {
  console.error("Usage: node scripts/audit/reconcile-ui-ux-audit.mjs <MASTER_UI_UX_TASK_TRACKER.csv>")
  process.exit(1)
}

const outputPath = resolve(
  process.cwd(),
  "docs/implementation/ui-ux-completion/MASTER_RECONCILIATION_LEDGER.csv",
)
const summaryPath = resolve(
  process.cwd(),
  "docs/implementation/ui-ux-completion/RECONCILIATION_SUMMARY.md",
)
const tasks = parseCsv(readFileSync(resolve(sourcePath), "utf8"))
const reconciled = tasks.map((task) => ({ ...task, ...reconcile(task) }))
const extraHeaders = ["reconciliation_status", "evidence", "basis", "reconciled_at"]
const sourceHeaders = Object.keys(tasks[0] ?? {})
const headers = [...sourceHeaders, ...extraHeaders]

mkdirSync(dirname(outputPath), { recursive: true })
writeFileSync(
  outputPath,
  [
    headers.map(csvCell).join(","),
    ...reconciled.map((task) =>
      headers
        .map((header) => {
          if (header === "reconciliation_status") return csvCell(task.status)
          if (header === "reconciled_at") return csvCell("2026-07-28")
          return csvCell(task[header])
        })
        .join(","),
    ),
  ].join("\n") + "\n",
)

const counts = reconciled.reduce((result, task) => {
  result[task.status] = (result[task.status] ?? 0) + 1
  return result
}, {})
const phaseRows = Object.entries(
  reconciled.reduce((result, task) => {
    const key = `${task.phase} / ${task.status}`
    result[key] = (result[key] ?? 0) + 1
    return result
  }, {}),
)
  .sort(([left], [right]) => left.localeCompare(right))
  .map(([key, count]) => `| ${key} | ${count} |`)

writeFileSync(
  summaryPath,
  `# UI/UX Audit Reconciliation Summary

Generated from the attached 2026-07-27 master tracker against the current working tree.

## Counts

| Status | Tasks |
| --- | ---: |
${Object.entries(counts)
  .map(([status, count]) => `| ${status} | ${count} |`)
  .join("\n")}
| **Total** | **${reconciled.length}** |

## Phase distribution

| Phase / status | Tasks |
| --- | ---: |
${phaseRows.join("\n")}

## Evidence rule

A completion ledger is supporting evidence, not automatic acceptance. A task becomes
\`verified complete\` only after its current code, tests, responsive/accessibility
matrix, runtime state behavior, and any external/manual SQL gate satisfy the audit's
definition of done.
`,
)

const registryDirectory = dirname(resolve(sourcePath))
const routeSource = join(registryDirectory, "ROUTE_INVENTORY.csv")
const componentSource = join(registryDirectory, "COMPONENT_INVENTORY.csv")
const routes = parseCsv(readFileSync(routeSource, "utf8")).map((route) => ({
  ...route,
  ...reconcileRoute(route),
}))
const components = reconcileComponents(parseCsv(readFileSync(componentSource, "utf8")))
const routeRegisterPath = resolve(
  process.cwd(),
  "docs/implementation/ui-ux-completion/CANONICAL_ROUTE_REGISTER.csv",
)
const componentRegisterPath = resolve(
  process.cwd(),
  "docs/implementation/ui-ux-completion/CANONICAL_COMPONENT_REGISTER.csv",
)
writeCsv(routeRegisterPath, routes, [
  "route",
  "source_file",
  "account_area",
  "product_domain",
  "audit_risk",
  "disposition",
  "canonicalTarget",
  "owner",
  "decisionBasis",
])
writeCsv(componentRegisterPath, components, [
  "component_file",
  "component_group",
  "component_kind",
  "audit_risk",
  "duplicate_group",
  "incomplete_markers",
  "disposition",
  "canonicalTarget",
  "decisionBasis",
])

console.log(`Reconciled ${reconciled.length} tasks`)
console.log(`Ledger: ${outputPath}`)
console.log(`Summary: ${summaryPath}`)
console.log(`Routes: ${routes.length} from ${basename(routeSource)}`)
console.log(`Components: ${components.length} from ${basename(componentSource)}`)
