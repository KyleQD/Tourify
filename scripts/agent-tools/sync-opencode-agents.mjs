#!/usr/bin/env node
// Syncs opencode agent definitions (.opencode/agent/<id>.md) from the
// engineering agent registry (docs/engineering/agents/registry.yaml) and each
// agent's CHARTER.md. Idempotent; use --check for a drift report.
//
//   npm run agents:opencode:sync
//   npm run agents:opencode:check
import { existsSync } from "node:fs"
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises"
import { join, relative } from "node:path"
import { parse as parseYaml } from "yaml"

const ROOT = process.cwd()
const ENG = join(ROOT, "docs/engineering")
const AGENTS_DIR = join(ENG, "agents")
const REGISTRY = join(AGENTS_DIR, "registry.yaml")
const OPENCODE_DIR = join(ROOT, ".opencode/agent")

const ORCHESTRATOR_MODE = "primary"
const RESTRICTED_LOOKUPS = new Map([
  ["qa", (id) => ({ permission: { edit: "deny", bash: "ask" }, extra: QA_EXTRA })],
  ["release", (id) => ({ permission: { edit: "deny", bash: "ask" }, extra: RELEASE_EXTRA })],
])

const COMMON_RULES = `You are part of the Tourify engineering team defined in
\`docs/engineering/agents/registry.yaml\`. Treat the repository documents as
the system of record; you are a replaceable worker executing against them.

Startup protocol:
1. Read \`docs/engineering/INDEX.md\`.
2. Read your charter and state: \`docs/engineering/agents/<id>/CHARTER.md\`
   and \`docs/engineering/agents/<id>/STATE.md\`.
3. Read your assigned task JSON under \`docs/engineering/tasks/<status>/<task-id>.json\`.
4. Use \`npm run agents:context -- --task <task-id>\` for a size-limited packet;
   load only the task working set and named references.

Operating rules:
- DEPENDENCY_MAP.md, SYSTEM_MAP.md, PROJECT_STATE.md, and DECISIONS.md are
  reference, not audit targets.
- Do not re-audit the repository. Expand the working set only when a caller,
  dependency, failing check, or schema edge requires it; record the path and
  reason in the task checkpoint.
- Preserve unrelated changes in the worktree.
- Prefer existing domain services, contracts, components, and verification
  commands over new ones.
- Supabase migrations are additive and are the database source of truth; keep
  authorization checks server-side and verify organization, venue, artist, or
  user scope at the data boundary.
- Record durable knowledge in \`STATE.md\`, architecture decisions in
  \`DECISIONS.md\`, and execution detail in the task record.
- Before handoff run \`npm run agents:validate\`; refresh topology with
  \`npm run agents:generate\` when maps are out of date.
- Cross-domain needs are handoffs, not silent scope expansion: create a
  dependency request under \`docs/engineering/handoffs/pending/\` per
  \`docs/engineering/handoffs/README.md\`.
- Never commit or push unless the user explicitly asks.`

const QA_EXTRA = `You verify against task acceptance criteria from the user's
perspective. You do not modify implementation code (\`edit\` is denied). Report
pass/return with concrete evidence; if the task is incomplete, keep the task
\`in_progress\` and record a checkpoint with the failing criteria.`

const RELEASE_EXTRA = `You own readiness: build, regression, migration checks,
and merge/release validation. You do not modify implementation code
(\`edit\` is denied). Record evidence under \`docs/engineering/\`.`

function frontmatter(lines) {
  return "---\n" + lines.join("\n") + "\n---\n"
}

function validateChar(id, yaml, path) {
  if (typeof yaml !== "object" || yaml === null) {
    throw new Error(`registry ${path}: expected a mapping at top level`)
  }
  if (!Array.isArray(yaml.agents)) throw new Error(`registry ${path}: missing agents list`)
  const byId = new Map(yaml.agents.map((a) => [a.id, a]))
  const missing = yaml.agents.map((a) => a.id).filter((x) => !byId.has(x))
  if (missing.length) throw new Error(`registry ${path}: dangling ids ${missing.join(", ")}`)
  const dupes = yaml.agents.map((a) => a.id).filter((x, i, arr) => arr.indexOf(x) !== arr.lastIndexOf(x))
  if (dupes.length) throw new Error(`registry ${path}: duplicate ids ${dupes.join(", ")}`)
  return byId
}

function missionFrom(charter) {
  const m = /^## Mission\s*\n+(.+?)(?:\n\n|\n## |$)/ms.exec(charter ?? "")
  if (!m) return ""
  return m[1].replace(/\s+/g, " ").trim()
}

function buildPrompt(id, purpose, mission, extra) {
  const role = id === "orchestrator" ? "primary orchestrator" : "domain"
  const display = id === "orchestrator" ? "Orchestrator" : id
  return `You are the Tourify ${display} agent (${role}).
${mission ? `Charter mission: ${mission}` : ""}
Purpose: ${purpose}

${COMMON_RULES.replaceAll("<id>", id)}
${extra ?? ""}`.trim() + "\n"
}

function describe(id, restricted) {
  if (id === "orchestrator") return "Routes bounded work, manages dependencies, and maintains project-level execution truth."
  if (restricted) return "Independent quality/release verification; edit is denied."
  return "Owns one Tourify domain and executes bounded tasks from the engineering registry."
}

async function main() {
  const checkOnly = process.argv.includes("--check")
  if (!checkOnly) await mkdir(OPENCODE_DIR, { recursive: true })
  const registryText = await readFile(REGISTRY, "utf8")
  const registry = parseYaml(registryText)
  const byId = validateChar(null, registry, relative(ROOT, REGISTRY))

  const stateByAgent = new Map()
  for (const dir of await readdir(AGENTS_DIR, { withFileTypes: true })) {
    if (!dir.isDirectory()) continue
    const charterPath = join(AGENTS_DIR, dir.name, "CHARTER.md")
    stateByAgent.set(dir.name, existsSync(charterPath) ? missionFrom(await readFile(charterPath, "utf8")) : "")
  }

  const targets = []
  for (const agent of registry.agents) {
    const { id } = agent
    const purpose = agent.purpose ?? ""
    const mission = stateByAgent.get(id) ?? ""
    const restricted = RESTRICTED_LOOKUPS.has(id) ? RESTRICTED_LOOKUPS.get(id)(agent) : null
    targets.push({
      id,
      mode: id === "orchestrator" ? ORCHESTRATOR_MODE : "subagent",
      permission: restricted ? Object.entries(restricted.permission) : undefined,
      prompt: buildPrompt(id, purpose, mission, restricted?.extra),
      restricted: !!restricted,
    })
  }

  const writeLog = []
  for (const target of targets) {
    const file = join(OPENCODE_DIR, `${target.id}.md`)
    const body =
      frontmatter([
        "mode: " + target.mode,
        `description: ${describe(target.id, target.restricted)}`,
        ...(target.permission ? [`permission:\n  ${target.permission.map(([k, v]) => `${k}: ${v}`).join("\n  ")}`] : []),
      ]) +
      "\n" +
      target.prompt
    const existing = existsSync(file) ? await readFile(file, "utf8") : null
    if (existing === body) {
      writeLog.push(`unchanged  ${relative(ROOT, file)}`)
      continue
    }
    if (checkOnly) {
      writeLog.push(`drift     ${relative(ROOT, file)}`)
      continue
    }
    await writeFile(file, body)
    writeLog.push(`written   ${relative(ROOT, file)}`)
  }

  const count = registry.agents.length
  if (checkOnly) {
    const drifted = writeLog.filter((l) => l.startsWith("drift")).length
    process.stdout.write(`opencode agent sync check: ${count} agents, ${writeLog.length - drifted} current, ${drifted} drifted\n`)
    process.exit(drifted ? 2 : 0)
  }
  process.stdout.write(writeLog.join("\n") + `\nopencode agent sync: ${count} agents defined under ${relative(ROOT, OPENCODE_DIR)}/\n`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})