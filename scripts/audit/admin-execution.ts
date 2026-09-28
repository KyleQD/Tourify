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
import { spawnSync } from "node:child_process"
import { z } from "zod"

import {
  AdminBaselineSliceSchema,
  AdminContextPackSchema,
  AdminExecutionBatchSchema,
  AdminFindingSchema,
  AdminReferenceRecordSchema,
  AdminSpecTaskSchema,
  AdminWorkflowRecordSchema,
  AdminUxAuditProgramSchema,
  LaunchGateSchema,
  type AdminAuditStatus,
  type AdminBaselineSlice,
  type AdminExecutionBatch,
  type AdminFinding,
  type AdminReferenceRecord,
  type AdminSpecTask,
  type AdminWorkflowRecord,
  type LaunchGate,
} from "@/lib/admin/audit-registry-contracts"

const ROOT = process.cwd()
const AUDIT_ROOT = path.join(ROOT, "docs/admin-audit")
const REGISTRY_ROOT = path.join(AUDIT_ROOT, "registry")
const EVIDENCE_ROOT = path.join(AUDIT_ROOT, "evidence")
const GENERATED_CONTEXT_ROOT = path.join(AUDIT_ROOT, "generated/context")
const ARTIFACT_ROOT = path.join(ROOT, "audit-artifacts/admin-execution")
const MAX_CONTEXT_BYTES = 32 * 1024
const STATUS_ORDER: AdminAuditStatus[] = [
  "observed",
  "reproduced",
  "in_progress",
  "implemented",
  "ready_for_staging",
  "ready_for_independent_verification",
  "done",
]
const SOURCE_HASH_INPUTS = [
  path.join(ROOT, "lib/supabase/service-role-import-review.json"),
  path.join(ROOT, "lib/admin/api-route-registry.ts"),
  path.join(ROOT, "scripts/ci/admin-route-registry-baseline.json"),
]

function json(file: string): unknown {
  return JSON.parse(readFileSync(file, "utf8"))
}

function parseArray<T>(schema: z.ZodType<T>, file: string): T[] {
  return z.array(schema).parse(json(file))
}

function walkJson(directory: string, output: string[] = []): string[] {
  if (!existsSync(directory)) return output
  for (const entry of readdirSync(directory)) {
    const full = path.join(directory, entry)
    if (statSync(full).isDirectory()) walkJson(full, output)
    else if (entry.endsWith(".json")) output.push(full)
  }
  return output
}

function sha256Files(files: string[]): string {
  const hash = createHash("sha256")
  for (const file of [...files].sort()) {
    hash.update(path.relative(ROOT, file))
    hash.update("\0")
    hash.update(readFileSync(file))
    hash.update("\0")
  }
  return hash.digest("hex")
}

function registrySourceHash(): string {
  return sha256Files(
    [
      ...walkJson(REGISTRY_ROOT),
      ...walkJson(EVIDENCE_ROOT),
      ...SOURCE_HASH_INPUTS,
    ].filter(existsSync),
  )
}

function sourcePathHash(sourcePaths: string[], errors: string[], label: string): string {
  const files: string[] = []
  for (const sourcePath of sourcePaths) {
    const file = path.join(ROOT, sourcePath)
    if (!existsSync(file) || !statSync(file).isFile()) {
      errors.push(`${label} source path is missing or not a file: ${sourcePath}`)
      continue
    }
    files.push(file)
  }
  return sha256Files(files)
}

function statusAtLeast(actual: AdminAuditStatus, expected: AdminAuditStatus): boolean {
  return STATUS_ORDER.indexOf(actual) >= STATUS_ORDER.indexOf(expected)
}

function matchingTasks(batch: AdminExecutionBatch, tasks: AdminSpecTask[]): AdminSpecTask[] {
  const patterns = batch.specTaskPatterns.map((pattern) => new RegExp(pattern))
  const ids = new Set(batch.specTaskIds)
  return tasks.filter(
    (task) => ids.has(task.specTaskId) || patterns.some((pattern) => pattern.test(task.specTaskId)),
  )
}

function openBlockerCount(
  findings: AdminFinding[],
  tasks: AdminSpecTask[],
  workflows: AdminWorkflowRecord[],
): number {
  return [...findings, ...tasks, ...workflows].reduce(
    (count, record) => count + record.blockers.filter((blocker) => !blocker.resolvedAt).length,
    0,
  )
}

function derivedStatus(
  findings: AdminFinding[],
  tasks: AdminSpecTask[],
  workflows: AdminWorkflowRecord[],
): AdminAuditStatus | "blocked" {
  if (openBlockerCount(findings, tasks, workflows) > 0) return "blocked"
  const statuses = [...findings, ...tasks, ...workflows].map((record) => record.status)
  if (statuses.length === 0) return "observed"
  return statuses.reduce((lowest, status) =>
    STATUS_ORDER.indexOf(status) < STATUS_ORDER.indexOf(lowest) ? status : lowest,
  )
}

type Loaded = ReturnType<typeof load>

function load() {
  return {
    batches: parseArray(AdminExecutionBatchSchema, path.join(REGISTRY_ROOT, "execution-batches.json")),
    references: parseArray(AdminReferenceRecordSchema, path.join(REGISTRY_ROOT, "reference-map.json")),
    baselines: parseArray(AdminBaselineSliceSchema, path.join(REGISTRY_ROOT, "baselines.json")),
    findings: parseArray(AdminFindingSchema, path.join(REGISTRY_ROOT, "findings.json")),
    tasks: parseArray(AdminSpecTaskSchema, path.join(REGISTRY_ROOT, "spec-tasks.json")),
    workflows: parseArray(AdminWorkflowRecordSchema, path.join(REGISTRY_ROOT, "workflows.json")),
    gates: parseArray(LaunchGateSchema, path.join(REGISTRY_ROOT, "launch-gates.json")),
    uxAudit: AdminUxAuditProgramSchema.parse(json(path.join(REGISTRY_ROOT, "ux-audit-program.json"))),
  }
}

function uniqueErrors(label: string, ids: string[]): string[] {
  const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index)
  return duplicates.length
    ? [`${label} duplicate IDs: ${[...new Set(duplicates)].join(", ")}`]
    : []
}

function validate(loaded: Loaded, checkHashes = true): string[] {
  const errors: string[] = []
  const { batches, references, baselines, findings, tasks, workflows, gates } = loaded
  const batchIds = new Set(batches.map((batch) => batch.batchId))
  const referenceIds = new Set(references.map((record) => record.referenceId))
  const baselineIds = new Set(baselines.map((record) => record.sliceId))
  const findingIds = new Set(findings.map((record) => record.findingId))
  const taskIds = new Set(tasks.map((record) => record.specTaskId))
  const workflowIds = new Set(workflows.map((record) => record.workflowId))
  const gateIds = new Set(gates.map((record) => record.gateId))

  errors.push(...uniqueErrors("batch", batches.map((record) => record.batchId)))
  errors.push(...uniqueErrors("reference", references.map((record) => record.referenceId)))
  errors.push(...uniqueErrors("baseline", baselines.map((record) => record.sliceId)))
  const expectedBatchIds = Array.from({ length: 15 }, (_, index) => `ADM-B${String(index).padStart(2, "0")}`)
  for (const expected of expectedBatchIds) {
    if (!batchIds.has(expected)) errors.push(`Missing execution batch ${expected}`)
  }
  for (const batch of batches) {
    if (batch.order !== Number(batch.batchId.slice(-2))) {
      errors.push(`${batch.batchId} has unstable order ${batch.order}`)
    }
    for (const dependency of batch.dependsOn) {
      if (!batchIds.has(dependency)) errors.push(`${batch.batchId} references missing dependency ${dependency}`)
      if (dependency >= batch.batchId) errors.push(`${batch.batchId} dependency must precede it: ${dependency}`)
    }
    for (const id of batch.primaryFindingIds) {
      if (!findingIds.has(id)) errors.push(`${batch.batchId} references missing finding ${id}`)
    }
    for (const id of batch.specTaskIds) {
      if (!taskIds.has(id)) errors.push(`${batch.batchId} references missing spec task ${id}`)
    }
    for (const id of batch.completionWorkflowIds) {
      if (!workflowIds.has(id)) errors.push(`${batch.batchId} references missing workflow ${id}`)
    }
    for (const id of batch.referenceIds) {
      if (!referenceIds.has(id)) errors.push(`${batch.batchId} references missing reference record ${id}`)
    }
    for (const id of batch.baselineSliceIds) {
      if (!baselineIds.has(id)) errors.push(`${batch.batchId} references missing baseline slice ${id}`)
    }
    for (const id of batch.gateIds) {
      if (!gateIds.has(id)) errors.push(`${batch.batchId} references missing launch gate ${id}`)
    }
    try {
      batch.specTaskPatterns.forEach((pattern) => new RegExp(pattern))
    } catch (error) {
      errors.push(`${batch.batchId} has invalid spec-task pattern: ${String(error)}`)
    }
  }

  const findingAssignments = new Map<string, string[]>()
  const taskAssignments = new Map<string, string[]>()
  const workflowAssignments = new Map<string, string[]>()
  for (const batch of batches) {
    for (const id of batch.primaryFindingIds) {
      findingAssignments.set(id, [...(findingAssignments.get(id) ?? []), batch.batchId])
    }
    for (const task of matchingTasks(batch, tasks)) {
      taskAssignments.set(task.specTaskId, [...(taskAssignments.get(task.specTaskId) ?? []), batch.batchId])
    }
    for (const id of batch.completionWorkflowIds) {
      workflowAssignments.set(id, [...(workflowAssignments.get(id) ?? []), batch.batchId])
    }
  }
  for (const finding of findings) {
    const assignments = findingAssignments.get(finding.findingId) ?? []
    if (assignments.length !== 1) errors.push(`${finding.findingId} has ${assignments.length} primary batches: ${assignments.join(", ") || "none"}`)
  }
  for (const task of tasks) {
    const assignments = taskAssignments.get(task.specTaskId) ?? []
    if (assignments.length !== 1) errors.push(`${task.specTaskId} has ${assignments.length} primary batches: ${assignments.join(", ") || "none"}`)
  }
  for (const workflow of workflows) {
    const assignments = workflowAssignments.get(workflow.workflowId) ?? []
    if (assignments.length !== 1) errors.push(`${workflow.workflowId} has ${assignments.length} completion batches: ${assignments.join(", ") || "none"}`)
  }

  for (const record of [...references, ...baselines]) {
    const label = "referenceId" in record ? record.referenceId : record.sliceId
    const actual = sourcePathHash(record.sourcePaths, errors, label)
    if (checkHashes && record.sourceSha256 !== actual) {
      errors.push(`${label} source hash is stale: expected ${record.sourceSha256}, actual ${actual}`)
    }
  }
  return errors
}

function linkedRecords(batch: AdminExecutionBatch, loaded: Loaded) {
  const findingSet = new Set(batch.primaryFindingIds)
  const workflowSet = new Set(batch.completionWorkflowIds)
  return {
    findings: loaded.findings.filter((record) => findingSet.has(record.findingId)),
    tasks: matchingTasks(batch, loaded.tasks),
    workflows: loaded.workflows.filter((record) => workflowSet.has(record.workflowId)),
  }
}

function stablePackBytes(pack: Record<string, unknown>): { contents: string; bytes: number } {
  let bytes = 1
  let contents = ""
  for (let attempt = 0; attempt < 8; attempt += 1) {
    pack.contextBytes = bytes
    contents = `${JSON.stringify(pack)}\n`
    const next = Buffer.byteLength(contents)
    if (next === bytes) return { contents, bytes }
    bytes = next
  }
  throw new Error("Could not stabilize contextBytes")
}

function expectedPack(batch: AdminExecutionBatch, loaded: Loaded) {
  const linked = linkedRecords(batch, loaded)
  const status = derivedStatus(linked.findings, linked.tasks, linked.workflows)
  const referencesById = new Map(loaded.references.map((record) => [record.referenceId, record]))
  const baselinesById = new Map(loaded.baselines.map((record) => [record.sliceId, record]))
  const gatesById = new Map(loaded.gates.map((record) => [record.gateId, record]))
  const pack: Record<string, unknown> = {
    schemaVersion: 1,
    registrySourceSha256: registrySourceHash(),
    batchId: batch.batchId,
    derivedStatus: status,
    exitStatus: batch.exitStatus,
    contextBytes: 1,
    batch,
    findings: linked.findings.map((record) => ({
      findingId: record.findingId,
      priority: record.priority,
      status: record.status,
      title: record.title,
      solution: record.solution,
      acceptanceCriteria: record.acceptanceCriteria,
      verificationRequirements: record.verificationRequirements,
      ...(record.blockers.length ? { blockers: record.blockers } : {}),
    })),
    specTasks: linked.tasks.map((record) => ({
      specTaskId: record.specTaskId,
      order: record.order,
      status: record.status,
      title: record.title,
      acceptanceCriteria: record.acceptanceCriteria,
      ...(record.dependsOn.length ? { dependsOn: record.dependsOn } : {}),
      ...(record.blockers.length ? { blockers: record.blockers } : {}),
    })),
    workflows: linked.workflows.map((record) => ({
      workflowId: record.workflowId,
      status: record.status,
      title: record.title,
      producer: record.producer,
      recipients: record.recipients,
      command: record.command,
      dataBoundaries: record.dataBoundaries,
      recipientVisibleResult: record.recipientVisibleResult,
      recovery: record.recovery,
      auditEvent: record.auditEvent,
      requiredTestKinds: record.requiredTestKinds,
      ...(record.blockers.length ? { blockers: record.blockers } : {}),
    })),
    references: batch.referenceIds.map((id) => referencesById.get(id)),
    baselines: batch.baselineSliceIds.map((id) => baselinesById.get(id)),
    launchGates: batch.gateIds.map((id) => {
      const gate = gatesById.get(id)
      return gate
        ? {
            gateId: gate.gateId,
            title: gate.title,
            acceptance: gate.acceptance,
            requiredEvidenceKinds: gate.requiredEvidenceKinds,
            requiredEvidenceEnvironments: gate.requiredEvidenceEnvironments,
          }
        : undefined
    }),
  }
  const rendered = stablePackBytes(pack)
  if (rendered.bytes > MAX_CONTEXT_BYTES) {
    throw new Error(`${batch.batchId} context is ${rendered.bytes} bytes; limit is ${MAX_CONTEXT_BYTES}`)
  }
  AdminContextPackSchema.parse(JSON.parse(rendered.contents))
  return rendered.contents
}

function batchOption(): string | null {
  const inline = process.argv.find((value) => value.startsWith("--batch="))
  if (inline) return inline.slice("--batch=".length)
  const index = process.argv.indexOf("--batch")
  return index >= 0 ? process.argv[index + 1] ?? null : null
}

function writePacks(loaded: Loaded, selectedBatch?: string) {
  mkdirSync(GENERATED_CONTEXT_ROOT, { recursive: true })
  const batches = selectedBatch
    ? loaded.batches.filter((batch) => batch.batchId === selectedBatch)
    : loaded.batches
  if (selectedBatch && batches.length !== 1) throw new Error(`Unknown batch ${selectedBatch}`)
  for (const batch of batches) {
    writeFileSync(path.join(GENERATED_CONTEXT_ROOT, `${batch.batchId}.json`), expectedPack(batch, loaded))
  }
}

function checkPacks(loaded: Loaded): string[] {
  const errors: string[] = []
  for (const batch of loaded.batches) {
    const file = path.join(GENERATED_CONTEXT_ROOT, `${batch.batchId}.json`)
    let expected: string
    try {
      expected = expectedPack(batch, loaded)
    } catch (error) {
      errors.push(String(error))
      continue
    }
    if (!existsSync(file)) errors.push(`Generated context pack is missing: ${batch.batchId}`)
    else if (readFileSync(file, "utf8") !== expected) errors.push(`Generated context pack drift: ${batch.batchId}`)
  }
  return errors
}

function selectNext(loaded: Loaded): AdminExecutionBatch | null {
  const byId = new Map(loaded.batches.map((batch) => [batch.batchId, batch]))
  const state = new Map(
    loaded.batches.map((batch) => {
      const linked = linkedRecords(batch, loaded)
      return [batch.batchId, derivedStatus(linked.findings, linked.tasks, linked.workflows)] as const
    }),
  )
  for (const batch of [...loaded.batches].sort((a, b) => a.order - b.order)) {
    const status = state.get(batch.batchId) ?? "observed"
    if (status !== "blocked" && statusAtLeast(status, batch.exitStatus)) continue
    const dependenciesReady = batch.dependsOn.every((id) => {
      const dependency = byId.get(id)
      const dependencyStatus = state.get(id)
      return Boolean(
        dependency &&
          dependencyStatus &&
          dependencyStatus !== "blocked" &&
          statusAtLeast(dependencyStatus, dependency.exitStatus),
      )
    })
    if (dependenciesReady) return batch
  }
  return null
}

function verifyFocused(batch: AdminExecutionBatch) {
  const batchRoot = path.join(ARTIFACT_ROOT, batch.batchId)
  mkdirSync(batchRoot, { recursive: true })
  let failures = 0
  batch.focusedCommands.forEach((command, index) => {
    const result = spawnSync(command, {
      cwd: ROOT,
      encoding: "utf8",
      env: process.env,
      maxBuffer: 50 * 1024 * 1024,
      shell: true,
      timeout: 30 * 60 * 1000,
    })
    const output = `${result.stdout ?? ""}${result.stderr ?? ""}`
    const file = path.join(batchRoot, `${String(index + 1).padStart(2, "0")}.log`)
    writeFileSync(file, output)
    const artifactSha256 = createHash("sha256").update(output).digest("hex")
    const passed = result.status === 0
    if (!passed) failures += 1
    console.log(`${passed ? "PASS" : "FAIL"} ${command} (${path.relative(ROOT, file)}; sha256=${artifactSha256})`)
    if (!passed) {
      const lines = output.split("\n").filter(Boolean)
      const actionable = lines.filter((line) => /error|fail|✗|×/i.test(line))
      for (const line of (actionable.length ? actionable : lines.slice(-20)).slice(0, 20)) {
        console.log(`  ${line.slice(0, 500)}`)
      }
    }
  })
  if (failures) process.exit(1)
}

function main() {
  const loaded = load()
  const printHashes = process.argv.includes("--print-source-hashes")
  if (printHashes) {
    const errors: string[] = []
    const hashes = [...loaded.references, ...loaded.baselines].map((record) => ({
      id: "referenceId" in record ? record.referenceId : record.sliceId,
      sourceSha256: sourcePathHash(record.sourcePaths, errors, "referenceId" in record ? record.referenceId : record.sliceId),
    }))
    console.log(JSON.stringify({ hashes, errors }, null, 2))
    if (errors.length) process.exit(1)
    return
  }

  const errors = validate(loaded)
  const selectedBatch = batchOption()
  if (process.argv.includes("--write")) writePacks(loaded, selectedBatch ?? undefined)
  if (process.argv.includes("--check") || (!process.argv.includes("--write") && !process.argv.includes("--next") && !process.argv.includes("--context") && !process.argv.includes("--verify"))) {
    errors.push(...checkPacks(loaded))
  }
  if (errors.length) {
    console.error(`Admin execution validation failed (${errors.length}):`)
    for (const error of errors) console.error(`- ${error}`)
    process.exit(1)
  }

  if (process.argv.includes("--context")) {
    if (!selectedBatch) throw new Error("--context requires --batch ADM-BXX")
    writePacks(loaded, selectedBatch)
    console.log(path.relative(ROOT, path.join(GENERATED_CONTEXT_ROOT, `${selectedBatch}.json`)))
    return
  }
  if (process.argv.includes("--next")) {
    const batch = selectNext(loaded)
    console.log(batch ? `${batch.batchId}\t${batch.title}` : "NO_READY_BATCH")
    return
  }
  if (process.argv.includes("--verify")) {
    if (!selectedBatch) throw new Error("--verify requires --batch ADM-BXX")
    const batch = loaded.batches.find((record) => record.batchId === selectedBatch)
    if (!batch) throw new Error(`Unknown batch ${selectedBatch}`)
    verifyFocused(batch)
    return
  }
  console.log(`Admin execution registry OK — ${loaded.batches.length} batches, ${loaded.tasks.length} tasks, ${loaded.findings.length} findings, ${loaded.workflows.length} workflows`)
}

main()
