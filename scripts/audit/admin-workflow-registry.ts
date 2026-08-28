#!/usr/bin/env tsx

import { createHash } from "node:crypto"
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs"
import path from "node:path"
import { z } from "zod"

import {
  AdminDecisionSchema,
  AdminEvidenceSchema,
  AdminFindingSchema,
  AdminPersonaSchema,
  AdminSpecTaskSchema,
  AdminWorkflowRecordSchema,
  LaunchGateSchema,
  RiskRecordSchema,
  type AdminEvidence,
  type AdminFinding,
  type AdminSpecTask,
  type AdminWorkflowRecord,
  type LaunchGate,
} from "@/lib/admin/audit-registry-contracts"
import { adminCommandCapabilityMatrix } from "@/lib/admin/api-route-registry"

const ROOT = process.cwd()
const AUDIT_ROOT = path.join(ROOT, "docs/admin-audit")
const REGISTRY_ROOT = path.join(AUDIT_ROOT, "registry")
const EVIDENCE_ROOT = path.join(AUDIT_ROOT, "evidence")
const GENERATED_ROOT = path.join(AUDIT_ROOT, "generated")
const WORKBOOK = path.join(GENERATED_ROOT, "TOURIFY_ADMIN_WORKFLOW_TRACKER.xlsx")
const WORKBOOK_MANIFEST = path.join(GENERATED_ROOT, "workbook-manifest.json")
const SERVICE_ROLE_REVIEW = path.join(ROOT, "lib/supabase/service-role-import-review.json")

const ServiceRoleReviewSchema = z
  .object({
    file: z.string().min(1),
    disposition: z.enum([
      "migrate_to_job",
      "replace_with_user_rls",
      "replace_with_rpc",
      "retire",
    ]),
    workflowId: z.string().regex(/^ADM-WF-\d{3}$/),
    findingId: z.string().regex(/^ADM-M-\d{3}$/),
    owner: z.string().min(1),
    rationale: z.string().min(20),
    reviewedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  })
  .strict()
type ServiceRoleReview = z.infer<typeof ServiceRoleReviewSchema>

type Program = {
  programId: string
  title: string
  registryVersion: number
  baseline: {
    branch: string
    commit: string
    parentCommit: string
    capturedPaths: number
    capturedAt: string
    humanInventorySignoff: string | null
  }
  statusOrder: string[]
  requiredCounts: Record<string, number>
  releasePolicy: Record<string, unknown>
}

function json<T>(file: string): T {
  return JSON.parse(readFileSync(file, "utf8")) as T
}

function registryFile(name: string) {
  return path.join(REGISTRY_ROOT, name)
}

function walkJson(dir: string, output: string[] = []): string[] {
  if (!existsSync(dir)) return output
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry)
    if (statSync(full).isDirectory()) walkJson(full, output)
    else if (entry.endsWith(".json")) output.push(full)
  }
  return output
}

function parseArray<T>(schema: z.ZodType<T>, file: string): T[] {
  return z.array(schema).parse(json(file))
}

function fail(errors: string[], condition: unknown, message: string) {
  if (!condition) errors.push(message)
}

function exactIds(prefix: string, count: number, digits = 3) {
  return Array.from(
    { length: count },
    (_, index) => `${prefix}${String(index + 1).padStart(digits, "0")}`,
  )
}

function validateUnique(errors: string[], label: string, ids: string[]) {
  const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index)
  if (duplicates.length) {
    errors.push(`${label} duplicate IDs: ${[...new Set(duplicates)].join(", ")}`)
  }
}

function validateExactSet(
  errors: string[],
  label: string,
  actual: string[],
  expected: string[],
) {
  const actualSet = new Set(actual)
  const expectedSet = new Set(expected)
  const missing = expected.filter((id) => !actualSet.has(id))
  const extra = actual.filter((id) => !expectedSet.has(id))
  if (missing.length) errors.push(`${label} missing IDs: ${missing.join(", ")}`)
  if (extra.length) errors.push(`${label} unexpected IDs: ${extra.join(", ")}`)
}

function validateReferences(
  errors: string[],
  source: string,
  values: string[],
  target: Set<string>,
) {
  for (const value of values) {
    if (!target.has(value)) errors.push(`${source} references missing ID ${value}`)
  }
}

function validateAcyclic(
  errors: string[],
  label: string,
  records: Array<{ id: string; dependencies: string[] }>,
) {
  const graph = new Map(records.map((record) => [record.id, record.dependencies]))
  const visiting = new Set<string>()
  const visited = new Set<string>()

  function visit(id: string, trail: string[]) {
    if (visiting.has(id)) {
      errors.push(`${label} dependency cycle: ${[...trail, id].join(" -> ")}`)
      return
    }
    if (visited.has(id)) return
    visiting.add(id)
    for (const dependency of graph.get(id) ?? []) visit(dependency, [...trail, id])
    visiting.delete(id)
    visited.add(id)
  }

  for (const record of records) visit(record.id, [])
}

function csvCell(value: unknown) {
  const text = Array.isArray(value) ? value.join("; ") : value == null ? "" : String(value)
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

function csv(rows: unknown[][]) {
  return `${rows.map((row) => row.map(csvCell).join(",")).join("\n")}\n`
}

function countBy<T>(records: T[], getKey: (record: T) => string) {
  return Object.fromEntries(
    [...records.reduce((counts, record) => {
      const key = getKey(record)
      counts.set(key, (counts.get(key) ?? 0) + 1)
      return counts
    }, new Map<string, number>())].sort(([a], [b]) => a.localeCompare(b)),
  )
}

function registrySourceHash() {
  const files = [
    ...walkJson(REGISTRY_ROOT),
    ...walkJson(EVIDENCE_ROOT),
    SERVICE_ROLE_REVIEW,
  ].filter(existsSync).sort()
  const hash = createHash("sha256")
  for (const file of files) {
    hash.update(path.relative(ROOT, file))
    hash.update("\0")
    hash.update(readFileSync(file))
    hash.update("\0")
  }
  return hash.digest("hex")
}

function gateStatus(gate: LaunchGate, evidence: AdminEvidence[]) {
  const attached = evidence.filter((item) => item.launchGateIds.includes(gate.gateId))
  const passingKinds = new Set(
    attached.filter((item) => item.result === "pass").map((item) => item.kind),
  )
  return gate.requiredEvidenceKinds.every((kind) => passingKinds.has(kind))
    ? "evidence_complete"
    : "not_verified"
}

function validateDoneEvidence(
  errors: string[],
  label: string,
  record: {
    status: string
    implementationCommit: string | null
    independentVerifier: string | null
    evidenceIds: string[]
  },
  evidenceById: Map<string, AdminEvidence>,
) {
  if (record.status !== "done") return
  fail(errors, record.implementationCommit, `${label} is Done without an implementation commit`)
  fail(errors, record.independentVerifier, `${label} is Done without an independent verifier`)
  const attached = record.evidenceIds.map((id) => evidenceById.get(id)).filter(Boolean) as AdminEvidence[]
  const passingKinds = new Set(
    attached.filter((item) => item.result === "pass").map((item) => item.kind),
  )
  const required = [
    "commit",
    "ci_run",
    "migration_apply",
    "api_capture",
    "rls_matrix",
    "retry_recovery",
    "rollback",
    "independent_verification",
    "product_signoff",
    "security_signoff",
  ]
  for (const kind of required) {
    fail(errors, passingKinds.has(kind as AdminEvidence["kind"]), `${label} is Done without passing ${kind} evidence`)
  }
}

function renderStatus(
  program: Program,
  findings: AdminFinding[],
  tasks: AdminSpecTask[],
  workflows: AdminWorkflowRecord[],
  gates: LaunchGate[],
  evidence: AdminEvidence[],
  serviceRoleReviews: ServiceRoleReview[],
  sourceHash: string,
) {
  const p0Open = findings.filter((item) => item.priority === "P0" && item.status !== "done").length
  const p1Open = findings.filter((item) => item.priority === "P1" && item.status !== "done").length
  const rows = gates.map(
    (gate) => `| ${gate.gateId} | ${gate.title} | ${gateStatus(gate, evidence)} |`,
  )
  return `# Tourify Admin Completion Status

Generated from the canonical registry. Do not edit this file by hand.

- Baseline: \`${program.baseline.branch}@${program.baseline.commit.slice(0, 12)}\`
- Registry source SHA-256: \`${sourceHash}\`
- Findings: ${findings.length} (${p0Open} open P0; ${p1Open} open P1)
- Specification tasks: ${tasks.length}
- End-to-end workflows: ${workflows.length}
- Evidence receipts: ${evidence.length}
- Reviewed service-role remediation items: ${serviceRoleReviews.length}
- Release posture: **NO-GO** until every required gate is evidence-complete.

## Status distribution

| Record type | Distribution |
| --- | --- |
| Findings | ${JSON.stringify(countBy(findings, (item) => item.status))} |
| Specification tasks | ${JSON.stringify(countBy(tasks, (item) => item.status))} |
| Workflows | ${JSON.stringify(countBy(workflows, (item) => item.status))} |

## Launch gates

| Gate | Requirement | Evidence state |
| --- | --- | --- |
${rows.join("\n")}
`
}

function expectedViews(
  program: Program,
  findings: AdminFinding[],
  tasks: AdminSpecTask[],
  workflows: AdminWorkflowRecord[],
  gates: LaunchGate[],
  evidence: AdminEvidence[],
  serviceRoleReviews: ServiceRoleReview[],
) {
  const adminRouteMethods = adminCommandCapabilityMatrix()
  const sourceHash = registrySourceHash()
  const findingsCsv = csv([
    ["Finding ID", "Kind", "Priority", "State", "Domain", "Wave", "Status", "Title", "Solution", "Workflows", "Owner", "Blockers", "Evidence"],
    ...findings.map((item) => [
      item.findingId,
      item.findingKind,
      item.priority,
      item.state,
      item.domain,
      item.deliveryWave,
      item.status,
      item.title,
      item.solution,
      item.workflowIds,
      item.owner,
      item.blockers.map((blocker) => blocker.blockerId),
      item.evidenceIds,
    ]),
  ])
  const workflowsCsv = csv([
    ["Workflow ID", "Title", "Domain", "Wave", "Disposition", "Status", "Producer", "Recipients", "Capability", "Tenant target", "Findings", "Owner", "Blockers", "Evidence"],
    ...workflows.map((item) => [
      item.workflowId,
      item.title,
      item.domain,
      item.deliveryWave,
      item.disposition,
      item.status,
      item.producer.personaId,
      item.recipients.map((recipient) => recipient.personaId),
      item.command.capability,
      item.command.tenantTarget,
      item.findingIds,
      item.owner,
      item.blockers.map((blocker) => blocker.blockerId),
      item.evidenceIds,
    ]),
  ])
  const coverage = {
    generatedFrom: program.programId,
    registrySourceSha256: sourceHash,
    baseline: program.baseline,
    counts: {
      findings: findings.length,
      specTasks: tasks.length,
      workflows: workflows.length,
      launchGates: gates.length,
      evidence: evidence.length,
      adminRouteMethods: adminRouteMethods.length,
      serviceRoleReviewedDebt: serviceRoleReviews.length,
    },
    findingsByPriority: countBy(findings, (item) => item.priority),
    findingsByStatus: countBy(findings, (item) => item.status),
    specTasksByStatus: countBy(tasks, (item) => item.status),
    workflowsByStatus: countBy(workflows, (item) => item.status),
    blockers: {
      findings: findings.reduce((count, item) => count + item.blockers.length, 0),
      specTasks: tasks.reduce((count, item) => count + item.blockers.length, 0),
      workflows: workflows.reduce((count, item) => count + item.blockers.length, 0),
    },
    unassigned: {
      findings: findings.filter((item) => !item.owner).length,
      workflows: workflows.filter((item) => !item.owner).length,
    },
    adminRouteMethods: {
      byDisposition: countBy(adminRouteMethods, (item) => item.disposition),
      byVisibility: countBy(adminRouteMethods, (item) => item.visibility),
      byServiceRole: countBy(adminRouteMethods, (item) => item.serviceRole),
      missingWorkflow: adminRouteMethods.filter((item) => item.workflowIds.length === 0).length,
      missingTestEvidence: adminRouteMethods.filter((item) => item.testIds.length === 0).length,
    },
    serviceRoleReviewedDebt: {
      byDisposition: countBy(serviceRoleReviews, (item) => item.disposition),
      byWorkflow: countBy(serviceRoleReviews, (item) => item.workflowId),
      byFinding: countBy(serviceRoleReviews, (item) => item.findingId),
    },
    launchGates: gates.map((gate) => ({
      gateId: gate.gateId,
      status: gateStatus(gate, evidence),
    })),
  }
  return new Map<string, string>([
    ["STATUS.md", renderStatus(program, findings, tasks, workflows, gates, evidence, serviceRoleReviews, sourceHash)],
    ["findings.csv", findingsCsv],
    ["workflows.csv", workflowsCsv],
    ["coverage.json", `${JSON.stringify(coverage, null, 2)}\n`],
  ])
}

function validateWorkbook(errors: string[], sourceHash: string) {
  fail(errors, existsSync(WORKBOOK), "Generated Admin audit workbook is missing")
  fail(errors, existsSync(WORKBOOK_MANIFEST), "Generated Admin audit workbook manifest is missing")
  if (!existsSync(WORKBOOK) || !existsSync(WORKBOOK_MANIFEST)) return
  const manifest = json<{
    registrySourceSha256?: string
    workbookSha256?: string
    workbookPath?: string
  }>(WORKBOOK_MANIFEST)
  const workbookHash = createHash("sha256").update(readFileSync(WORKBOOK)).digest("hex")
  fail(errors, manifest.registrySourceSha256 === sourceHash, "Workbook registry source hash is stale")
  fail(errors, manifest.workbookSha256 === workbookHash, "Workbook hash does not match its manifest")
  fail(
    errors,
    manifest.workbookPath === "generated/TOURIFY_ADMIN_WORKFLOW_TRACKER.xlsx",
    "Workbook manifest path is invalid",
  )
}

function main() {
  const write = process.argv.includes("--write")
  const check = process.argv.includes("--check") || !write
  const requireWorkbook = process.argv.includes("--require-workbook")
  const errors: string[] = []

  const program = json<Program>(registryFile("program.json"))
  const findings = parseArray(AdminFindingSchema, registryFile("findings.json"))
  const tasks = parseArray(AdminSpecTaskSchema, registryFile("spec-tasks.json"))
  const workflows = parseArray(AdminWorkflowRecordSchema, registryFile("workflows.json"))
  const personas = parseArray(AdminPersonaSchema, registryFile("personas.json"))
  const decisions = parseArray(AdminDecisionSchema, registryFile("decisions.json"))
  const risks = parseArray(RiskRecordSchema, registryFile("risks.json"))
  const gates = parseArray(LaunchGateSchema, registryFile("launch-gates.json"))
  const evidence = walkJson(EVIDENCE_ROOT).map((file) => AdminEvidenceSchema.parse(json(file)))
  const serviceRoleReviews = parseArray(ServiceRoleReviewSchema, SERVICE_ROLE_REVIEW)

  fail(errors, program.programId === "TOURIFY-ADMIN-COMPLETION", "Unexpected program ID")
  fail(errors, /^[0-9a-f]{40}$/.test(program.baseline.commit), "Baseline commit must be a full SHA")
  fail(errors, program.baseline.branch === "codex/admin-workflow-completion", "Baseline branch is not the approved branch")

  const findingIds = findings.map((item) => item.findingId)
  const taskIds = tasks.map((item) => item.specTaskId)
  const workflowIds = workflows.map((item) => item.workflowId)
  const personaIds = personas.map((item) => item.personaId)
  const decisionIds = decisions.map((item) => item.decisionId)
  const riskIds = risks.map((item) => item.riskId)
  const gateIds = gates.map((item) => item.gateId)
  const evidenceIds = evidence.map((item) => item.evidenceId)

  for (const [label, ids] of [
    ["finding", findingIds],
    ["spec task", taskIds],
    ["workflow", workflowIds],
    ["persona", personaIds],
    ["decision", decisionIds],
    ["risk", riskIds],
    ["launch gate", gateIds],
    ["evidence", evidenceIds],
  ] as Array<[string, string[]]>) validateUnique(errors, label, ids)

  validateExactSet(errors, "ADM finding", findingIds.filter((id) => id.startsWith("ADM-M-")), exactIds("ADM-M-", 64))
  validateExactSet(errors, "audit governance finding", findingIds.filter((id) => id.startsWith("AOA-")), exactIds("AOA-", 15))
  validateExactSet(errors, "workflow", workflowIds, exactIds("ADM-WF-", 20))
  validateExactSet(errors, "launch gate", gateIds, exactIds("LG-", 18, 2))
  validateExactSet(errors, "risk", riskIds, exactIds("RISK-", 6))
  fail(errors, tasks.length === 362, `Expected 362 spec tasks, found ${tasks.length}`)
  for (let index = 0; index < tasks.length; index += 1) {
    fail(errors, tasks[index].order === index + 1, `Spec task ${tasks[index].specTaskId} has unstable order`)
  }

  const findingSet = new Set(findingIds)
  const taskSet = new Set(taskIds)
  const workflowSet = new Set(workflowIds)
  const personaSet = new Set(personaIds)
  const riskSet = new Set(riskIds)
  const gateSet = new Set(gateIds)
  const evidenceSet = new Set(evidenceIds)

  for (const finding of findings) {
    validateReferences(errors, finding.findingId, finding.workflowIds, workflowSet)
    validateReferences(errors, finding.findingId, finding.specTaskIds, taskSet)
    validateReferences(errors, finding.findingId, finding.launchGateIds, gateSet)
    validateReferences(errors, finding.findingId, finding.riskIds, riskSet)
    validateReferences(errors, finding.findingId, finding.evidenceIds, evidenceSet)
    validateReferences(errors, finding.findingId, finding.dependsOn, findingSet)
  }
  for (const task of tasks) {
    validateReferences(errors, task.specTaskId, task.dependsOn, taskSet)
    validateReferences(errors, task.specTaskId, task.workflowIds, workflowSet)
    validateReferences(errors, task.specTaskId, task.findingIds, findingSet)
    validateReferences(errors, task.specTaskId, task.evidenceIds, evidenceSet)
  }
  for (const workflow of workflows) {
    validateReferences(errors, workflow.workflowId, workflow.findingIds, findingSet)
    validateReferences(errors, workflow.workflowId, workflow.specTaskIds, taskSet)
    validateReferences(errors, workflow.workflowId, workflow.evidenceIds, evidenceSet)
    validateReferences(errors, workflow.workflowId, [workflow.producer.personaId], personaSet)
    validateReferences(
      errors,
      workflow.workflowId,
      workflow.recipients.map((recipient) => recipient.personaId),
      personaSet,
    )
  }
  for (const gate of gates) validateReferences(errors, gate.gateId, gate.dependsOn, gateSet)
  for (const item of evidence) {
    validateReferences(errors, item.evidenceId, item.findingIds, findingSet)
    validateReferences(errors, item.evidenceId, item.workflowIds, workflowSet)
    validateReferences(errors, item.evidenceId, item.specTaskIds, taskSet)
    validateReferences(errors, item.evidenceId, item.launchGateIds, gateSet)
  }
  for (const item of serviceRoleReviews) {
    validateReferences(errors, item.file, [item.workflowId], workflowSet)
    validateReferences(errors, item.file, [item.findingId], findingSet)
  }

  for (const id of findingIds.filter((item) => item.startsWith("ADM-M-"))) {
    fail(errors, workflows.some((workflow) => workflow.findingIds.includes(id)), `${id} is not linked from any workflow`)
  }

  validateAcyclic(
    errors,
    "Finding",
    findings.map((item) => ({ id: item.findingId, dependencies: item.dependsOn })),
  )
  validateAcyclic(
    errors,
    "Spec task",
    tasks.map((item) => ({ id: item.specTaskId, dependencies: item.dependsOn })),
  )
  validateAcyclic(
    errors,
    "Launch gate",
    gates.map((item) => ({ id: item.gateId, dependencies: item.dependsOn })),
  )

  const evidenceById = new Map(evidence.map((item) => [item.evidenceId, item]))
  for (const finding of findings) validateDoneEvidence(errors, finding.findingId, finding, evidenceById)
  for (const workflow of workflows) validateDoneEvidence(errors, workflow.workflowId, workflow, evidenceById)

  for (const command of adminCommandCapabilityMatrix()) {
    const label = `${command.method} ${command.route}`
    fail(errors, command.workflowIds.length > 0, `${label} has no owning workflow`)
    fail(errors, command.testIds.length > 0, `${label} has no test evidence mapping`)
    validateReferences(errors, label, [...command.workflowIds], workflowSet)
  }

  const views = expectedViews(
    program,
    findings,
    tasks,
    workflows,
    gates,
    evidence,
    serviceRoleReviews,
  )
  if (write) {
    mkdirSync(GENERATED_ROOT, { recursive: true })
    for (const [name, contents] of views) writeFileSync(path.join(GENERATED_ROOT, name), contents)
  }
  if (check) {
    for (const [name, expected] of views) {
      const file = path.join(GENERATED_ROOT, name)
      if (!existsSync(file)) errors.push(`Generated view is missing: ${name}`)
      else if (readFileSync(file, "utf8") !== expected) errors.push(`Generated view drift: ${name}`)
    }
  }
  if (requireWorkbook) validateWorkbook(errors, registrySourceHash())

  if (errors.length) {
    console.error(`Admin audit registry validation failed (${errors.length}):`)
    for (const error of errors) console.error(`- ${error}`)
    process.exit(1)
  }

  console.log(
    `Admin audit registry OK — ${findings.length} findings, ${tasks.length} spec tasks, ${workflows.length} workflows, ${gates.length} launch gates, ${evidence.length} evidence receipts`,
  )
}

main()
