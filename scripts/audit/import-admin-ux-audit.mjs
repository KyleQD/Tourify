#!/usr/bin/env node

import { createHash } from "node:crypto"
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs"
import path from "node:path"

const ROOT = process.cwd()
const importedRoot = path.join(ROOT, "docs", "admin-audit", "sources", "admin-ux-audit")
const sourceRoot = path.resolve(process.argv[2] ?? importedRoot)

if (!existsSync(sourceRoot)) {
  console.error("Usage: node scripts/audit/import-admin-ux-audit.mjs [audit-directory]")
  process.exit(1)
}

const useImportedLayout = sourceRoot === importedRoot
const sources = {
  manifest: path.join(sourceRoot, "AUDIT_MANIFEST.json"),
  tasks: path.join(sourceRoot, useImportedLayout ? "" : "IMPLEMENTATION", "IMPLEMENTATION_TASK_REGISTER.csv"),
  findings: path.join(sourceRoot, useImportedLayout ? "" : "IMPLEMENTATION", "FINDING_IMPLEMENTATION_CROSSWALK.csv"),
  waves: path.join(sourceRoot, useImportedLayout ? "" : "IMPLEMENTATION", "PR_WAVE_REGISTER.csv"),
}

for (const [label, file] of Object.entries(sources)) {
  if (!existsSync(file)) {
    console.error(`Missing ${label} source: ${file}`)
    process.exit(1)
  }
}

function sha256(file) {
  return createHash("sha256").update(readFileSync(file)).digest("hex")
}

function parseCsv(contents) {
  const rows = []
  let row = []
  let cell = ""
  let quoted = false

  for (let index = 0; index < contents.length; index += 1) {
    const char = contents[index]
    if (quoted) {
      if (char === '"' && contents[index + 1] === '"') {
        cell += '"'
        index += 1
      } else if (char === '"') {
        quoted = false
      } else {
        cell += char
      }
      continue
    }
    if (char === '"') quoted = true
    else if (char === ",") {
      row.push(cell)
      cell = ""
    } else if (char === "\n") {
      row.push(cell.replace(/\r$/, ""))
      rows.push(row)
      row = []
      cell = ""
    } else cell += char
  }
  if (cell.length || row.length) {
    row.push(cell.replace(/\r$/, ""))
    rows.push(row)
  }

  const [headers, ...values] = rows.filter((candidate) => candidate.some(Boolean))
  return values.map((candidate) =>
    Object.fromEntries(headers.map((header, index) => [header, candidate[index] ?? ""])),
  )
}

function list(value) {
  if (!value || value === "None") return []
  return value.split(",").map((item) => item.trim()).filter(Boolean)
}

function waveDependencies(value) {
  return list(value).flatMap((item) => {
    const range = item.match(/^W(\d{2})-W(\d{2})$/)
    if (!range) return [item]
    const start = Number(range[1])
    const end = Number(range[2])
    return Array.from(
      { length: end - start + 1 },
      (_, offset) => `W${String(start + offset).padStart(2, "0")}`,
    )
  })
}

function canonicalBatchFor(taskId) {
  if (taskId === "ADMUX-0001") return "ADM-B00"
  if (taskId === "ADMUX-0002") return "ADM-B01"
  if (/^ADMUX-01/.test(taskId) || /^ADMUX-02/.test(taskId)) return "ADM-B13"
  if (/^ADMUX-030[12]$/.test(taskId) || taskId === "ADMUX-0502") return "ADM-B05"
  if (/^ADMUX-030[34]$/.test(taskId) || /^ADMUX-050[3-6]$/.test(taskId)) return "ADM-B04"
  if (taskId === "ADMUX-0305" || taskId === "ADMUX-0801") return "ADM-B11"
  if (taskId === "ADMUX-0306" || /^ADMUX-080[23]$/.test(taskId)) return "ADM-B12"
  if (taskId === "ADMUX-0601") return "ADM-B07"
  if (taskId === "ADMUX-0602") return "ADM-B06"
  if (taskId === "ADMUX-0603") return "ADM-B10"
  if (/^ADMUX-070[1-3]$/.test(taskId)) return "ADM-B09"
  if (/^ADMUX-070[45]$/.test(taskId)) return "ADM-B08"
  if (/^ADMUX-11/.test(taskId)) return "ADM-B14"
  if (
    taskId === "ADMUX-0307" ||
    /^ADMUX-04/.test(taskId) ||
    taskId === "ADMUX-0501" ||
    /^ADMUX-09/.test(taskId) ||
    /^ADMUX-10/.test(taskId)
  ) return "ADM-B13"
  throw new Error(`No canonical batch mapping for ${taskId}`)
}

const auditManifest = JSON.parse(readFileSync(sources.manifest, "utf8"))
const taskRows = parseCsv(readFileSync(sources.tasks, "utf8"))
const findingRows = parseCsv(readFileSync(sources.findings, "utf8"))
const waveRows = parseCsv(readFileSync(sources.waves, "utf8"))

if (taskRows.length !== 54) throw new Error(`Expected 54 ADMUX tasks, found ${taskRows.length}`)
if (findingRows.length !== 158) throw new Error(`Expected 158 AUX findings, found ${findingRows.length}`)
if (waveRows.length !== 18) throw new Error(`Expected 18 waves, found ${waveRows.length}`)

const taskIds = new Set(taskRows.map((row) => row.task_id))
const findingIds = new Set(findingRows.map((row) => row.finding_id))
if (taskIds.size !== taskRows.length) throw new Error("ADMUX task IDs are not unique")
if (findingIds.size !== findingRows.length) throw new Error("AUX finding IDs are not unique")

const tasks = taskRows.map((row) => ({
  taskId: row.task_id,
  wave: row.wave,
  phase: row.phase,
  workstream: row.workstream,
  title: row.title,
  dependencies: list(row.dependencies),
  findingIds: list(row.finding_ids),
  canonicalBatchId: canonicalBatchFor(row.task_id),
  acceptance: row.acceptance,
  verification: row.tests,
}))

for (const task of tasks) {
  for (const dependency of task.dependencies) {
    if (!taskIds.has(dependency)) throw new Error(`${task.taskId} references missing dependency ${dependency}`)
  }
}

const taskById = new Map(tasks.map((task) => [task.taskId, task]))
const findings = findingRows.map((row) => {
  const task = taskById.get(row.primary_task)
  if (!task) throw new Error(`${row.finding_id} references missing task ${row.primary_task}`)
  if (!task.findingIds.includes(row.finding_id)) {
    throw new Error(`${row.finding_id} is absent from ${row.primary_task}'s finding list`)
  }
  return {
    findingId: row.finding_id,
    severity: row.severity,
    area: row.area,
    taskId: row.primary_task,
    wave: row.wave,
    phase: row.phase,
    canonicalBatchId: task.canonicalBatchId,
    acceptance: row.acceptance,
  }
})

const destination = path.join(ROOT, "docs", "admin-audit", "sources", "admin-ux-audit")
mkdirSync(destination, { recursive: true })
const importedFiles = {
  manifest: path.join(destination, "AUDIT_MANIFEST.json"),
  tasks: path.join(destination, "IMPLEMENTATION_TASK_REGISTER.csv"),
  findings: path.join(destination, "FINDING_IMPLEMENTATION_CROSSWALK.csv"),
  waves: path.join(destination, "PR_WAVE_REGISTER.csv"),
}
for (const key of Object.keys(sources)) {
  if (path.resolve(sources[key]) !== path.resolve(importedFiles[key])) {
    copyFileSync(sources[key], importedFiles[key])
  }
}

const normalizedProgram = {
  schemaVersion: 1,
  sourceId: "SRC-ADMIN-UX-AUDIT",
  auditBaseline: {
    repository: auditManifest.repository,
    branch: auditManifest.branch,
    commit: auditManifest.commit,
    auditDate: auditManifest.audit_date,
  },
  counts: { findings: findings.length, tasks: tasks.length, waves: waveRows.length, decisions: 10 },
  statusPolicy: "This crosswalk contains no mutable status. ADMUX progress is derived from the linked canonical batch, workflow, finding, task, launch-gate, and evidence records.",
  waves: waveRows.map((row) => ({
    wave: row.wave,
    objective: row.objective,
    taskIds: list(row.task_ids),
    dependencies: waveDependencies(row.dependencies),
    canonicalBatchIds: [...new Set(list(row.task_ids).map((taskId) => canonicalBatchFor(taskId)))],
  })),
  tasks,
  findings,
}

writeFileSync(
  path.join(ROOT, "docs", "admin-audit", "registry", "ux-audit-program.json"),
  `${JSON.stringify(normalizedProgram, null, 2)}\n`,
)

const sourceManifestPath = path.join(ROOT, "docs", "admin-audit", "sources", "manifest.json")
const sourceManifest = JSON.parse(readFileSync(sourceManifestPath, "utf8"))
const importedSourceRecords = [
  ["SRC-ADMIN-UX-AUDIT-MANIFEST", "Admin post-implementation UX audit identity and counts", importedFiles.manifest],
  ["SRC-ADMIN-UX-TASKS", "54-task ADMUX implementation register", importedFiles.tasks],
  ["SRC-ADMIN-UX-FINDINGS", "158-finding AUX to ADMUX crosswalk", importedFiles.findings],
  ["SRC-ADMIN-UX-WAVES", "W00-W17 dependency and rollback register", importedFiles.waves],
].map(([sourceId, role, file]) => ({
  sourceId,
  role,
  path: path.relative(ROOT, file),
  sha256: sha256(file),
  authority: "historical_evidence",
}))
const importedIds = new Set(importedSourceRecords.map((record) => record.sourceId))
sourceManifest.sources = [
  ...sourceManifest.sources.filter((record) => !importedIds.has(record.sourceId)),
  ...importedSourceRecords,
]
sourceManifest.statusPolicy = "Imported sources preserve identity and acceptance traceability but cannot promote canonical status automatically."
writeFileSync(sourceManifestPath, `${JSON.stringify(sourceManifest, null, 2)}\n`)

console.log(`Imported ${findings.length} AUX findings, ${tasks.length} ADMUX tasks, and ${waveRows.length} waves.`)
