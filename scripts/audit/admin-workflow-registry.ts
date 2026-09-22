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
  AdminExecutionBatchSchema,
  AdminFindingSchema,
  AdminPersonaSchema,
  AdminSpecTaskSchema,
  AdminWorkflowRecordSchema,
  AdminUxAuditProgramSchema,
  LaunchGateSchema,
  RiskRecordSchema,
  type AdminEvidence,
  type AdminExecutionBatch,
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
const ADMIN_ROUTE_REGISTRY = path.join(ROOT, "lib/admin/api-route-registry.ts")
const ADMIN_ROUTE_BASELINE = path.join(
  ROOT,
  "scripts/ci/admin-route-registry-baseline.json",
)

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
    ADMIN_ROUTE_REGISTRY,
    ADMIN_ROUTE_BASELINE,
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
  const eligible = evidence.filter(
    (item) =>
      item.launchGateIds.includes(gate.gateId) &&
      item.result === "pass" &&
      gate.requiredEvidenceEnvironments.includes(
        item.environment as (typeof gate.requiredEvidenceEnvironments)[number],
      ),
  )

  if (!gate.requiresImmutableCommit) {
    const passingKinds = new Set(eligible.map((item) => item.kind))
    return gate.requiredEvidenceKinds.every((kind) => passingKinds.has(kind))
      ? "evidence_complete"
      : "not_verified"
  }

  const commits = new Set(
    eligible.flatMap((item) => (item.commitSha ? [item.commitSha] : [])),
  )
  for (const commit of commits) {
    const passingKinds = new Set(
      eligible
        .filter((item) => item.commitSha === commit)
        .map((item) => item.kind),
    )
    if (gate.requiredEvidenceKinds.every((kind) => passingKinds.has(kind))) {
      return "evidence_complete"
    }
  }

  return "not_verified"
}

function executionBatchStatus(
  batch: AdminExecutionBatch,
  findings: AdminFinding[],
  tasks: AdminSpecTask[],
  workflows: AdminWorkflowRecord[],
  statusOrder: string[],
) {
  const findingIds = new Set(batch.primaryFindingIds)
  const workflowIds = new Set(batch.completionWorkflowIds)
  const taskIds = new Set(batch.specTaskIds)
  const patterns = batch.specTaskPatterns.map((pattern) => new RegExp(pattern))
  const linked = [
    ...findings.filter((item) => findingIds.has(item.findingId)),
    ...tasks.filter(
      (item) => taskIds.has(item.specTaskId) || patterns.some((pattern) => pattern.test(item.specTaskId)),
    ),
    ...workflows.filter((item) => workflowIds.has(item.workflowId)),
  ]
  if (linked.some((item) => item.blockers.some((blocker) => !blocker.resolvedAt))) return "blocked"
  if (!linked.length) return "observed"
  return linked.reduce(
    (lowest, item) =>
      statusOrder.indexOf(item.status) < statusOrder.indexOf(lowest)
        ? item.status
        : lowest,
    linked[0].status,
  )
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
  batches: AdminExecutionBatch[],
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
  const batchRows = batches.map((batch) =>
    `| ${batch.batchId} | ${batch.title} | ${executionBatchStatus(batch, findings, tasks, workflows, program.statusOrder)} | ${batch.exitStatus} |`,
  )
  return `# Tourify Admin Completion Status

Generated from the canonical registry. Do not edit this file by hand.

- Baseline: \`${program.baseline.branch}@${program.baseline.commit.slice(0, 12)}\`
- Registry source SHA-256: \`${sourceHash}\`
- Findings: ${findings.length} (${p0Open} open P0; ${p1Open} open P1)
- Specification tasks: ${tasks.length}
- End-to-end workflows: ${workflows.length}
- Execution batches: ${batches.length}
- Evidence receipts: ${evidence.length}
- Reviewed service-role remediation items: ${serviceRoleReviews.length}
- Release posture: **NO-GO** until every required gate is evidence-complete.

## Status distribution

| Record type | Distribution |
| --- | --- |
| Findings | ${JSON.stringify(countBy(findings, (item) => item.status))} |
| Specification tasks | ${JSON.stringify(countBy(tasks, (item) => item.status))} |
| Workflows | ${JSON.stringify(countBy(workflows, (item) => item.status))} |

## Execution batches

| Batch | Deliverable | Derived status | Exit status |
| --- | --- | --- | --- |
${batchRows.join("\n")}

## Launch gates

| Gate | Requirement | Evidence state |
| --- | --- | --- |
${rows.join("\n")}
`
}

function expectedViews(
  program: Program,
  batches: AdminExecutionBatch[],
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
      executionBatches: batches.length,
      launchGates: gates.length,
      evidence: evidence.length,
      adminRouteMethods: adminRouteMethods.length,
      serviceRoleReviewedDebt: serviceRoleReviews.length,
    },
    findingsByPriority: countBy(findings, (item) => item.priority),
    findingsByStatus: countBy(findings, (item) => item.status),
    specTasksByStatus: countBy(tasks, (item) => item.status),
    workflowsByStatus: countBy(workflows, (item) => item.status),
    executionBatches: batches.map((batch) => ({
      batchId: batch.batchId,
      status: executionBatchStatus(batch, findings, tasks, workflows, program.statusOrder),
      exitStatus: batch.exitStatus,
    })),
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
    ["STATUS.md", renderStatus(program, batches, findings, tasks, workflows, gates, evidence, serviceRoleReviews, sourceHash)],
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
  const batches = parseArray(AdminExecutionBatchSchema, registryFile("execution-batches.json"))
  const findings = parseArray(AdminFindingSchema, registryFile("findings.json"))
  const tasks = parseArray(AdminSpecTaskSchema, registryFile("spec-tasks.json"))
  const workflows = parseArray(AdminWorkflowRecordSchema, registryFile("workflows.json"))
  const personas = parseArray(AdminPersonaSchema, registryFile("personas.json"))
  const decisions = parseArray(AdminDecisionSchema, registryFile("decisions.json"))
  const uxAudit = AdminUxAuditProgramSchema.parse(json(registryFile("ux-audit-program.json")))
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
  const uxTaskIds = uxAudit.tasks.map((item) => item.taskId)
  const uxFindingIds = uxAudit.findings.map((item) => item.findingId)
  const uxWaveIds = uxAudit.waves.map((item) => item.wave)

  for (const [label, ids] of [
    ["finding", findingIds],
    ["spec task", taskIds],
    ["workflow", workflowIds],
    ["persona", personaIds],
    ["decision", decisionIds],
    ["risk", riskIds],
    ["launch gate", gateIds],
    ["evidence", evidenceIds],
    ["UX task", uxTaskIds],
    ["UX finding", uxFindingIds],
    ["UX wave", uxWaveIds],
  ] as Array<[string, string[]]>) validateUnique(errors, label, ids)

  validateExactSet(
    errors,
    "UX wave",
    uxWaveIds,
    Array.from({ length: 18 }, (_, index) => `W${String(index).padStart(2, "0")}`),
  )

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
  const uxTaskSet = new Set(uxTaskIds)
  const uxFindingSet = new Set(uxFindingIds)
  const uxWaveSet = new Set(uxWaveIds)

  for (const task of uxAudit.tasks) {
    validateReferences(errors, task.taskId, task.dependencies, uxTaskSet)
    validateReferences(errors, task.taskId, task.findingIds, uxFindingSet)
    fail(
      errors,
      uxAudit.waves.some((wave) => wave.wave === task.wave && wave.taskIds.includes(task.taskId)),
      `${task.taskId} is not assigned to its declared wave ${task.wave}`,
    )
  }
  for (const finding of uxAudit.findings) {
    validateReferences(errors, finding.findingId, [finding.taskId], uxTaskSet)
    const task = uxAudit.tasks.find((candidate) => candidate.taskId === finding.taskId)
    fail(errors, task?.wave === finding.wave, `${finding.findingId} wave does not match ${finding.taskId}`)
    fail(
      errors,
      task?.canonicalBatchId === finding.canonicalBatchId,
      `${finding.findingId} canonical batch does not match ${finding.taskId}`,
    )
  }
  for (const wave of uxAudit.waves) {
    validateReferences(errors, wave.wave, wave.taskIds, uxTaskSet)
    validateReferences(errors, wave.wave, wave.dependencies, uxWaveSet)
  }

  validateAcyclic(
    errors,
    "UX task",
    uxAudit.tasks.map((item) => ({ id: item.taskId, dependencies: item.dependencies })),
  )
  validateAcyclic(
    errors,
    "UX wave",
    uxAudit.waves.map((item) => ({ id: item.wave, dependencies: item.dependencies })),
  )

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
    batches,
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
