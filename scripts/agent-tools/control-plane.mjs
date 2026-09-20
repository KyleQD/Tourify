#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const root = process.cwd()
const q = String.fromCharCode(96)
const fence = q.repeat(3)
const ignored = new Set(['.git', '.next', 'node_modules', 'coverage', 'dist', 'build', '.expo', '.turbo'])
const command = process.argv[2] || 'help'
const argv = process.argv.slice(3)

function md(lines) {
  return lines.join('\n') + '\n'
}

function code(value) {
  return q + value + q
}

function git(args, fallback = 'unknown') {
  try {
    return execFileSync('git', args, {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim()
  } catch {
    return fallback
  }
}

function snapshot() {
  const status = git(['status', '--porcelain'], '')
  const entries = status ? status.split('\n').filter(Boolean) : []
  return {
    sha: git(['rev-parse', 'HEAD']),
    branch: git(['branch', '--show-current'], 'detached'),
    dirty: entries.length > 0,
    changedCount: entries.length,
    generatedAt: new Date().toISOString(),
  }
}

function rel(file) {
  return path.relative(root, file).split(path.sep).join('/')
}

function inside(candidate) {
  const resolved = path.resolve(root, candidate)
  if (resolved !== root && !resolved.startsWith(root + path.sep)) {
    throw new Error('Path escapes repository: ' + candidate)
  }
  return resolved
}

function walk(start, predicate = () => true) {
  const base = inside(start)
  if (!fs.existsSync(base)) return []
  const files = []
  function visit(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (entry.isDirectory() && (entry.name.startsWith('.') || ignored.has(entry.name))) continue
      const full = path.join(directory, entry.name)
      if (entry.isDirectory()) visit(full)
      else if (predicate(full)) files.push(full)
    }
  }
  visit(base)
  return files.sort((a, b) => rel(a).localeCompare(rel(b)))
}

function write(relativePath, content) {
  const destination = inside(relativePath)
  fs.mkdirSync(path.dirname(destination), { recursive: true })
  fs.writeFileSync(destination, content.endsWith('\n') ? content : content + '\n')
}

function writeIfMissing(relativePath, content) {
  const destination = inside(relativePath)
  if (fs.existsSync(destination)) return false
  write(relativePath, content)
  return true
}

function parseArgs() {
  const values = new Map()
  const flags = new Set()
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index]
    if (!token.startsWith('--')) continue
    if (!argv[index + 1] || argv[index + 1].startsWith('--')) {
      flags.add(token)
      continue
    }
    const existing = values.get(token) || []
    existing.push(argv[index + 1])
    values.set(token, existing)
    index += 1
  }
  return {
    has(name) {
      return flags.has(name) || values.has(name)
    },
    one(name, fallback) {
      const found = values.get(name)
      return found ? found[found.length - 1] : fallback
    },
    many(name) {
      return values.get(name) || []
    },
  }
}

function generatedHeader(title, generator, state) {
  const tree = state.dirty ? 'dirty (' + state.changedCount + ' entries)' : 'clean'
  return md([
    '# ' + title,
    '',
    '<!-- generated: do not edit -->',
    '',
    '- Source SHA: ' + code(state.sha),
    '- Branch: ' + code(state.branch),
    '- Working tree: ' + tree,
    '- Generated at: ' + state.generatedAt,
    '- Generator: ' + code(generator),
    '',
  ])
}

const domains = {
  orchestrator: {
    mission: 'Route bounded work, manage dependencies and overlaps, and maintain project-level execution truth.',
    paths: ['AGENTS.md', 'ARCHITECTURE.md', 'docs/engineering/**', 'docs/DEVELOPMENT_WORKFLOW.md', 'docs/DEVELOPMENT_BACKLOG.md', '.agents/**'],
  },
  admin: {
    mission: 'Own admin dashboards, admin operations, authorization gates, and audit registries.',
    paths: ['app/admin/**', 'app/api/admin/**', 'components/admin/**', 'lib/admin/**', '__tests__/admin/**', '.agents/admin-*/**'],
  },
  artist: {
    mission: 'Own artist identity, private and public profiles, EPKs, dashboards, and artist workflows.',
    paths: ['app/artist/**', 'app/api/artist/**', 'components/artist/**', 'components/artist-profile/**', 'components/public-artist/**', 'lib/artist/**', '__tests__/artist/**'],
  },
  venue: {
    mission: 'Own venue identity, public profiles, bookings, venue operations, and venue kit.',
    paths: ['app/venue/**', 'app/venues/**', 'app/api/venue/**', 'components/venue/**', 'components/venues/**', 'components/venue-kit/**', 'lib/venue/**', '__tests__/venue/**'],
  },
  organization: {
    mission: 'Own organization identity, membership, tours, collaboration, and tenant context.',
    paths: ['app/organization/**', 'app/orgs/**', 'app/tours/**', 'app/api/orgs/**', 'app/api/tours/**', 'components/public-organization/**', 'lib/organization/**', '__tests__/organization/**'],
  },
  'general-user': {
    mission: 'Own authentication, onboarding, user profiles, settings, accounts, and the general dashboard.',
    paths: ['app/auth/**', 'app/login/**', 'app/signup/**', 'app/onboarding/**', 'app/profile/**', 'app/settings/**', 'app/dashboard/**', 'components/auth/**', 'components/onboarding/**', 'components/profile/**', 'lib/auth/**', '__tests__/auth/**', '__tests__/onboarding/**'],
  },
  work: {
    mission: 'Own jobs, hiring, workforce, staffing, shifts, onboarding, and work mode.',
    paths: ['app/work/**', 'app/jobs/**', 'app/staffing/**', 'app/api/hiring/**', 'app/api/job-applications/**', 'components/hiring/**', 'components/job-posting/**', 'components/work-mode/**', 'lib/hiring/**', 'lib/work-mode/**', '__tests__/hiring/**', '__tests__/jobs/**', '__tests__/work-mode/**'],
  },
  discover: {
    mission: 'Own search, discovery, world data, directories, news, and recommendations.',
    paths: ['app/discover/**', 'app/search/**', 'app/news/**', 'app/api/search/**', 'components/discover/**', 'components/search/**', 'components/world/**', 'lib/search/**', 'lib/world/**', '__tests__/search/**', '__tests__/world/**'],
  },
  music: {
    mission: 'Own music catalog, playback, rights, royalties, ingestion, and music worker flows.',
    paths: ['app/music/**', 'app/api/music/**', 'components/music/**', 'lib/music/**', 'lib/playback/**', 'scripts/music-*.ts', '__tests__/music/**'],
  },
  marketplace: {
    mission: 'Own marketplace listings, services, carts, checkout, orders, and commerce workflows.',
    paths: ['app/marketplace/**', 'app/services/**', 'app/api/marketplace/**', 'components/marketplace/**', 'lib/marketplace/**', '__tests__/marketplace/**'],
  },
  ticketing: {
    mission: 'Own tickets, allocations, transfers, wallet, guest list, door operations, and settlement interfaces.',
    paths: ['app/tickets/**', 'app/api/ticketing/**', 'components/ticketing/**', 'components/ticket-type/**', 'lib/ticketing/**', '__tests__/ticketing/**'],
  },
  social: {
    mission: 'Own feed, posts, follows, friends, groups, messaging, notifications, and collaboration.',
    paths: ['app/feed/**', 'app/posts/**', 'app/friends/**', 'app/groups/**', 'app/messages/**', 'app/notifications/**', 'app/collaboration/**', 'components/feed/**', 'components/social/**', 'components/messaging/**', 'lib/social/**', '__tests__/social/**', '__tests__/messaging/**'],
  },
  database: {
    mission: 'Own Supabase migrations, schema evolution, RLS, RPCs, generated types, and data integrity.',
    paths: ['supabase/**', 'lib/supabase/**', 'lib/database.types.ts', 'docs/engineering/migration-validation/**', '__tests__/**/*migration*', '__tests__/security/**'],
  },
  'design-system': {
    mission: 'Own shared UI primitives, accessibility, layout, tokens, and interaction consistency.',
    paths: ['app/globals.css', 'components/ui/**', 'components/layout/**', 'components/surface/**', 'tailwind.config.ts', 'components.json'],
  },
  integrations: {
    mission: 'Own external providers, webhooks, credential boundaries, workers, and integration resilience.',
    paths: ['app/api/webhooks/**', 'app/api/integrations/**', 'lib/integrations/**', 'lib/services/*email*', 'scripts/*worker*', '__tests__/integrations/**'],
  },
  qa: {
    mission: 'Own test strategy, fixtures, end-to-end journeys, regression evidence, and quality gates.',
    paths: ['__tests__/**', 'tests/**', 'scripts/qa/**', 'playwright.config.ts', 'vitest.config.ts', 'jest.config.cjs', 'docs/qa-*.md'],
  },
  release: {
    mission: 'Own CI, deployment, environment validation, observability, cron, and release readiness.',
    paths: ['.github/workflows/**', 'vercel.json', 'docker/**', 'instrumentation.ts', 'sentry.*.config.ts', 'scripts/ci/**', 'scripts/deploy.sh', 'docs/PRODUCTION_DEPLOYMENT_GUIDE.md'],
  },
}

function titleFor(id) {
  return id.split('-').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ')
}

function rootAgents() {
  return md([
    '# Tourify agent operating guide',
    '',
    'This repository uses ' + code('docs/engineering/') + ' as durable engineering memory. Keep this file concise; use the linked documents for detail.',
    '',
    '## Start here',
    '',
    'For every task:',
    '',
    '1. Read ' + code('docs/engineering/INDEX.md') + '.',
    '2. Read the assigned domain charter and state.',
    '3. Read the task record under ' + code('docs/engineering/tasks/') + '.',
    '4. Load only the task working set and named references.',
    '5. Expand scope only when code evidence, a dependency, or failing verification requires it. Record why in a checkpoint.',
    '',
    'Do not re-audit the whole repository before beginning a bounded task. Generated maps are indexes, not proof that behavior is correct.',
    '',
    '## Working agreements',
    '',
    '- Preserve unrelated changes. The worktree may contain concurrent or unfinished work.',
    '- Treat Supabase migrations as the database source of truth. Do not use legacy bootstrap SQL for active environments.',
    '- Keep authorization checks server-side and verify organization, venue, artist, or user scope at the data boundary.',
    '- Prefer existing domain services, contracts, components, and verification commands.',
    '- Update the task record at meaningful checkpoints and before handoff.',
    '- Put durable domain knowledge in the owning agent state; keep turn logs in task records.',
    '- Record architecture decisions in the cross-domain or domain decision log.',
    '- Follow the verification tiers in ' + code('docs/DEVELOPMENT_WORKFLOW.md') + '.',
    '',
    '## Control-plane commands',
    '',
    fence + 'bash',
    'npm run agents:generate',
    'npm run agents:validate',
    'npm run agents:task:create -- --id TOUR-001 --title "Example" --agent artist --goal "Outcome"',
    'npm run agents:context -- --task TOUR-001',
    'npm run agents:checkpoint -- --task TOUR-001 --summary "What changed" --next "Next action"',
    fence,
    '',
    'Existing ' + code('docs/work-packets/') + ' and ' + code('.agents/') + ' records remain valid evidence. Link them from task records instead of copying or deleting them.',
    '',
    'A task is complete only when acceptance criteria are met, verification evidence is recorded, topology maps are refreshed when needed, and the task is moved to completed.',
  ])
}

function architecture() {
  return md([
    '# Tourify architecture',
    '',
    'Tourify is a Next.js 15 web platform with an Expo mobile application, Supabase-backed data and authentication, and music-industry domain surfaces.',
    '',
    '## Runtime shape',
    '',
    '- ' + code('app/') + ': App Router pages, layouts, actions, and API handlers.',
    '- ' + code('components/') + ', ' + code('hooks/') + ', ' + code('contexts/') + ': shared web UI and client behavior.',
    '- ' + code('lib/') + ': services, authorization, contracts, Supabase clients, and integrations.',
    '- ' + code('apps/mobile/') + ': Expo Router mobile client and adapters.',
    '- ' + code('supabase/migrations/') + ': authoritative schema, RLS, functions, triggers, and grants.',
    '- ' + code('packages/api-contracts/') + ': shared payload contracts.',
    '- ' + code('scripts/') + ': CI, workers, QA, migration, release, and agent utilities.',
    '',
    '## Request and data flow',
    '',
    fence + 'text',
    'Web or mobile client',
    '  -> middleware and route authentication',
    '  -> page, action, or API route',
    '  -> domain service',
    '  -> Supabase Auth, Postgres/RLS, Storage, or Realtime',
    '  -> optional external provider',
    fence,
    '',
    code('middleware.ts') + ' performs coarse session gating. Routes and services still enforce resource and tenant authorization. RLS is defense in depth and part of the application contract.',
    '',
    '## Sources of truth',
    '',
    '| Concern | Source |',
    '| --- | --- |',
    '| Database structure and RLS | ' + code('supabase/migrations/') + ' |',
    '| Generated database client types | ' + code('lib/database.types.ts') + ' |',
    '| Web routes and handlers | ' + code('app/') + ' |',
    '| Mobile routes | ' + code('apps/mobile/app/') + ' |',
    '| Runtime configuration | ' + code('package.json') + ', ' + code('next.config.ts') + ', ' + code('vercel.json') + ' |',
    '| Launch backlog | ' + code('docs/DEVELOPMENT_BACKLOG.md') + ' |',
    '| Task workflow | ' + code('docs/DEVELOPMENT_WORKFLOW.md') + ' |',
    '| Bounded engineering memory | ' + code('docs/engineering/INDEX.md') + ' |',
    '',
    'Generated maps are replaceable SHA-stamped indexes. Existing architecture and feature documents remain incorporated through the engineering index.',
  ])
}

function engineeringIndex() {
  return md([
    '# Tourify engineering index',
    '',
    'This directory is the control plane for bounded agent work. It points to existing Tourify documentation and records current task and domain state.',
    '',
    '## Required reading order',
    '',
    '1. This index.',
    '2. The assigned agent charter and state.',
    '3. The active or blocked task JSON.',
    '4. Only the task working set and named references.',
    '',
    'Use ' + code('npm run agents:context -- --task <id>') + ' to build a size-limited packet.',
    '',
    '## Core memory',
    '',
    '- [Project state](PROJECT_STATE.md)',
    '- [System map](SYSTEM_MAP.md)',
    '- [Dependency map](DEPENDENCY_MAP.md)',
    '- [Architecture](../../ARCHITECTURE.md)',
    '- [Cross-domain decisions](DECISIONS.md)',
    '- [Agent registry](agents/registry.yaml)',
    '- [Task workflow](tasks/README.md)',
    '- [Handoff workflow](handoffs/README.md)',
    '- [Execution plans](exec-plans/README.md)',
    '- [Generated maps](generated/README.md)',
    '',
    '## Existing Tourify documentation',
    '',
    '- ' + code('docs/DEVELOPMENT_WORKFLOW.md') + ': work packets and verification tiers.',
    '- ' + code('docs/DEVELOPMENT_BACKLOG.md') + ': launch and hardening backlog.',
    '- ' + code('docs/AUDIT_FINDINGS_2026-08-23.md') + ': backlog evidence.',
    '- ' + code('docs/api-security-map.md') + ': API and authentication inventory.',
    '- ' + code('docs/data-model-supabase-prisma.md') + ': data-model context.',
    '- ' + code('docs/mobile-architecture-decision-memo.md') + ': mobile decisions.',
    '- ' + code('docs/platform-interconnectivity-contract-matrix.md') + ': cross-surface contracts.',
    '- ' + code('docs/engineering/migration-validation/') + ': migration evidence.',
    '- ' + code('docs/work-packets/') + ': existing bounded work packets.',
    '- ' + code('.agents/') + ': existing specialist progress and inventories.',
    '',
    'When documents conflict, prefer executable code and migrations, then the newest verified decision or task evidence. Record the conflict.',
    '',
    'Refresh topology with ' + code('npm run agents:generate') + ' and validate before handoff with ' + code('npm run agents:validate') + '.',
  ])
}

function projectState() {
  return md([
    '# Project state',
    '',
    '## Bootstrap snapshot',
    '',
    '- Baseline Git SHA: ' + code('a7193116c5a677b1c2939aa4a66e9415dac6eed1'),
    '- Branch: ' + code('codex/admin-master-remediation'),
    '- Snapshot date: 2026-09-08',
    '- Working tree at bootstrap: dirty (225 modified, 161 untracked)',
    '- Confidence: repository topology verified locally; product completeness is not implied',
    '',
    'The pre-existing working set belongs to ongoing Tourify work. Preserve unrelated changes and use task manifests to avoid overlap.',
    '',
    '## Current known shape',
    '',
    '- Next.js App Router web application plus Expo mobile client.',
    '- Supabase Auth, Postgres, Storage, and Realtime with migrations as source of truth.',
    '- Existing workflow, backlog, audit evidence, work packets, and specialist records are active inputs.',
    '- Verification tiers already exist through ' + code('scripts/verify.mjs') + '.',
    '',
    '## Immediate bootstrap queue',
    '',
    '1. Generate maps and validate the control plane.',
    '2. Create task records only for current priority work; do not bulk-import stale plans.',
    '3. Assign one owner and explicit working set per task.',
    '4. Resolve dirty-worktree ownership before broad refactors or release work.',
  ])
}

function systemMap() {
  const rows = [
    ['Web shell and routing', 'app/, middleware.ts, next.config.ts', 'Next.js App Router; middleware is a coarse gate'],
    ['API surface', 'app/api/, lib/api/, packages/api-contracts/', 'Route-level auth and validation'],
    ['Domain services', 'lib/services/ and domain folders under lib/', 'Prefer services for cross-route behavior'],
    ['Shared UI', 'components/, hooks/, contexts/', 'Use domain manifests to bound callers'],
    ['Admin operations', 'app/admin/, components/admin/, lib/admin/', 'Audit and route-registry checks exist'],
    ['Artist', 'app/artist/, components/artist*/, lib/artist/', 'Artist account and profile surfaces'],
    ['Venue', 'app/venue/, app/venues/, components/venue*/, lib/venue/', 'Account and public profiles'],
    ['Organization and tours', 'app/organization/, app/orgs/, app/tours/', 'Tenant-scoped collaboration'],
    ['Work and hiring', 'app/work/, app/jobs/, app/staffing/, lib/hiring/', 'Jobs, roster, shifts, onboarding'],
    ['Music', 'app/music/, components/music/, music workers', 'Media, rights, royalties, outboxes'],
    ['Ticketing', 'app/tickets/, app/api/ticketing/, lib/ticketing/', 'Orders, wallet, transfers, door'],
    ['Social and discovery', 'news, discover, friends, groups, search', 'Feed, relationships, messaging'],
    ['Data platform', 'supabase/migrations/, lib/supabase/', 'Migrations and RLS are authoritative'],
    ['Mobile', 'apps/mobile/', 'Expo Router client against shared APIs'],
    ['Delivery', '.github/workflows/, vercel.json, docker/', 'CI, deploy, cron, observability'],
  ]
  return md([
    '# System map',
    '',
    'Use generated maps for exhaustive indexes. This file describes durable boundaries.',
    '',
    '| Area | Primary locations | Notes |',
    '| --- | --- | --- |',
    ...rows.map((row) => '| ' + row.join(' | ') + ' |'),
    '',
    '## Cross-cutting flows',
    '',
    '- Identity: Supabase session -> middleware -> route or service authorization -> RLS.',
    '- Tenant context: membership -> acting organization, venue, or artist -> scoped query or RPC.',
    '- Writes: validated input -> authorized boundary -> transaction or RPC -> audit, outbox, or notification.',
    '- Mobile: Expo route -> mobile API adapter -> shared server contract and data policy.',
    '',
    'Generated detail lives in ' + code('docs/engineering/generated/') + '.',
  ])
}

function dependencyMap() {
  return md([
    '# Dependency map',
    '',
    '## Runtime layers',
    '',
    fence + 'text',
    'Next.js / React web UI -> actions and API routes -> services -> Supabase and providers',
    'Expo mobile UI -> mobile API adapters -> Next.js API routes -> same services and policies',
    fence,
    '',
    '## Principal dependencies',
    '',
    '| Capability | Implementation | Boundary |',
    '| --- | --- | --- |',
    '| Web | Next.js 15, React 18 | ' + code('app/') + ' |',
    '| Mobile | Expo and Expo Router | ' + code('apps/mobile/') + ' |',
    '| Data and identity | Supabase clients | ' + code('lib/supabase/') + ' and migrations |',
    '| Contracts | Zod and shared API contracts | routes and ' + code('packages/api-contracts/') + ' |',
    '| Payments | Stripe | server routes and services |',
    '| Email | Resend | server services and workers |',
    '| Storage | Supabase Storage and AWS S3 | signed or server access |',
    '| Rate limiting | Upstash Redis | API boundary with documented fallback |',
    '| Observability | Sentry and OpenTelemetry | instrumentation and runtime configs |',
    '| AI | Vercel AI SDK and OpenAI adapter | server-controlled features |',
    '| Testing | Jest, Vitest, Playwright | unit, contract, RLS, and end-to-end |',
    '',
    'A migration can affect API routes, database types, RLS tests, seeds, and mobile contracts. API payload changes can affect web, mobile, tests, and webhooks. Auth changes can affect middleware, actions, API routes, service-role use, and RLS assumptions.',
  ])
}

function decisions() {
  return md([
    '# Cross-domain decisions',
    '',
    'Append decisions; do not rewrite history. Domain-only decisions belong in the owning agent directory.',
    '',
    '## CP-001 — Repository memory over agent memory',
    '',
    '- Date: 2026-09-08',
    '- Status: accepted',
    '- Decision: Store task progress, boundaries, evidence, and handoffs under ' + code('docs/engineering/') + '.',
    '- Reason: A replacement agent can resume without loading the full repository or conversation history.',
    '',
    '## CP-002 — Bounded startup protocol',
    '',
    '- Date: 2026-09-08',
    '- Status: accepted',
    '- Decision: Read the index, charter/state, and task first; expand only when evidence requires.',
    '- Reason: Broad audits are expensive and obscure ownership.',
    '',
    '## CP-003 — SHA-stamped generated maps',
    '',
    '- Date: 2026-09-08',
    '- Status: accepted',
    '- Decision: Generated topology records HEAD, branch, time, and dirty-state summary.',
    '- Reason: Consumers can identify stale or working-tree-dependent output.',
    '',
    '## CP-004 — Preserve existing workflow records',
    '',
    '- Date: 2026-09-08',
    '- Status: accepted',
    '- Decision: Keep existing work packets, specialist records, audits, and plans; link them from new tasks.',
    '- Reason: Existing evidence should not be silently duplicated or replaced.',
  ])
}

function taskSchema() {
  return {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    $id: 'https://tourify.local/schemas/engineering-task.v1.json',
    title: 'Tourify engineering task',
    type: 'object',
    additionalProperties: false,
    required: ['schema_version', 'id', 'title', 'status', 'priority', 'owner_agent', 'created_at', 'updated_at', 'base_sha', 'goal', 'scope', 'working_set', 'references', 'acceptance_criteria', 'verification', 'progress', 'handoffs'],
    properties: {
      schema_version: { const: '1.0' },
      id: { type: 'string', pattern: '^[A-Z][A-Z0-9-]{2,63}$' },
      title: { type: 'string', minLength: 3 },
      status: { enum: ['active', 'blocked', 'completed'] },
      priority: { enum: ['P0', 'P1', 'P2', 'P3'] },
      owner_agent: { type: 'string' },
      created_at: { type: 'string', format: 'date-time' },
      updated_at: { type: 'string', format: 'date-time' },
      base_sha: { type: 'string' },
      working_tree_status: { type: 'string' },
      goal: { type: 'string', minLength: 3 },
      scope: {
        type: 'object',
        additionalProperties: false,
        required: ['in', 'out'],
        properties: {
          in: { type: 'array', items: { type: 'string' } },
          out: { type: 'array', items: { type: 'string' } },
        },
      },
      working_set: { type: 'array', items: { type: 'string' } },
      references: { type: 'array', items: { type: 'string' } },
      acceptance_criteria: { type: 'array', items: { type: 'string' } },
      verification: {
        type: 'object',
        additionalProperties: false,
        required: ['tier', 'commands', 'evidence', 'last_run_sha', 'last_run_at', 'result'],
        properties: {
          tier: { enum: ['fast', 'feature', 'release'] },
          commands: { type: 'array', items: { type: 'string' } },
          evidence: { type: 'array', items: { type: 'string' } },
          last_run_sha: { type: ['string', 'null'] },
          last_run_at: { type: ['string', 'null'] },
          result: { enum: ['not-run', 'pass', 'fail'] },
        },
      },
      progress: {
        type: 'object',
        additionalProperties: false,
        required: ['summary', 'completed', 'next_steps', 'blockers', 'checkpoints'],
        properties: {
          summary: { type: 'string' },
          completed: { type: 'array', items: { type: 'string' } },
          next_steps: { type: 'array', items: { type: 'string' } },
          blockers: { type: 'array', items: { type: 'string' } },
          checkpoints: { type: 'array', items: { type: 'object' } },
        },
      },
      handoffs: { type: 'array', items: { type: 'string' } },
    },
  }
}

function handoffSchema() {
  return {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    $id: 'https://tourify.local/schemas/engineering-handoff.v1.json',
    title: 'Tourify engineering handoff',
    type: 'object',
    additionalProperties: false,
    required: ['schema_version', 'id', 'task_id', 'from_agent', 'to_agent', 'status', 'created_at', 'source_sha', 'summary', 'working_set', 'completed', 'next_steps', 'blockers', 'verification'],
    properties: {
      schema_version: { const: '1.0' },
      id: { type: 'string' },
      task_id: { type: 'string' },
      from_agent: { type: 'string' },
      to_agent: { type: 'string' },
      status: { enum: ['pending', 'completed'] },
      created_at: { type: 'string', format: 'date-time' },
      source_sha: { type: 'string' },
      summary: { type: 'string' },
      working_set: { type: 'array', items: { type: 'string' } },
      completed: { type: 'array', items: { type: 'string' } },
      next_steps: { type: 'array', items: { type: 'string' } },
      blockers: { type: 'array', items: { type: 'string' } },
      verification: { type: 'array', items: { type: 'string' } },
    },
  }
}

function agentRegistry() {
  const lines = [
    'schema_version: "1.0"',
    'updated_at: "2026-09-08"',
    'startup_protocol:',
    '  - docs/engineering/INDEX.md',
    '  - docs/engineering/agents/<agent>/CHARTER.md',
    '  - docs/engineering/agents/<agent>/STATE.md',
    '  - docs/engineering/tasks/<status>/<task-id>.json',
    'agents:',
  ]
  for (const [id, domain] of Object.entries(domains)) {
    lines.push('  - id: ' + id)
    lines.push('    purpose: ' + domain.mission)
  }
  return md(lines)
}

function agentCharter(id, domain) {
  return md([
    '# ' + titleFor(id) + ' agent charter',
    '',
    '## Mission',
    '',
    domain.mission,
    '',
    '## Startup protocol',
    '',
    'Read the engineering index, this charter and state, the assigned task JSON, then only its working set and references.',
    '',
    'Do not re-audit the repository. Expand scope only when a caller, dependency, failing check, or schema edge requires it. Add the path and reason to the task checkpoint.',
    '',
    '## Responsibilities',
    '',
    '- Deliver one bounded outcome and preserve unrelated changes.',
    '- Reuse existing contracts, services, UI patterns, and tests.',
    '- Coordinate cross-domain edits through an interface or handoff.',
    '- Record durable facts in state, decisions in the log, and execution detail in the task.',
    '',
    'Default paths are in ' + code('WORKING_SET.json') + '. They guide discovery but do not grant ownership over unrelated work.',
  ])
}

function agentState(id, domain) {
  return md([
    '# ' + titleFor(id) + ' state',
    '',
    '- Last reviewed SHA: ' + code('unverified'),
    '- Last reviewed at: not yet reviewed',
    '- Active task: none assigned',
    '- Confidence: bootstrap only',
    '',
    '## Durable facts',
    '',
    '- Mission: ' + domain.mission,
    '- Default working set is recorded in ' + code('WORKING_SET.json') + '.',
    '',
    '## Current focus',
    '',
    '- Create or assign a bounded task before auditing this domain.',
    '',
    '## Known risks',
    '',
    '- The repository was already heavily modified at bootstrap.',
    '- Generated maps describe topology, not behavioral correctness.',
    '',
    'Update this file only when a task establishes a durable fact future work needs.',
  ])
}

function agentArchitecture(id, domain) {
  return md([
    '# ' + titleFor(id) + ' architecture',
    '',
    '## Boundary',
    '',
    domain.mission,
    '',
    '## Primary working set',
    '',
    ...domain.paths.map((item) => '- ' + code(item)),
    '',
    'Use the generated route, API, component, database, permission, and integration maps to locate current implementation. Verify task-specific source before changing it.',
    '',
    'If work crosses auth, database, shared contract, design-system, integration, QA, or release boundaries, record the dependency and coordinate with the owning agent.',
  ])
}

function bootstrap() {
  let created = 0
  const add = (file, content) => {
    if (writeIfMissing(file, content)) created += 1
  }
  add('AGENTS.md', rootAgents())
  add('ARCHITECTURE.md', architecture())
  add('docs/engineering/INDEX.md', engineeringIndex())
  add('docs/engineering/PROJECT_STATE.md', projectState())
  add('docs/engineering/SYSTEM_MAP.md', systemMap())
  add('docs/engineering/DEPENDENCY_MAP.md', dependencyMap())
  add('docs/engineering/DECISIONS.md', decisions())
  add('docs/engineering/generated/README.md', md([
    '# Generated engineering maps',
    '',
    'Run ' + code('npm run agents:generate') + '. Generated files are SHA-stamped navigation aids. Verify behavior in code, migrations, tests, and runtime evidence.',
    '',
    'Do not hand-edit generated maps.',
  ]))
  add('scripts/agent-tools/README.md', md([
    '# Agent tools',
    '',
    'The control-plane utility bootstraps durable records, generates SHA-stamped maps, manages task state, builds bounded context packets, and validates agent state.',
    '',
    'Use the package commands documented in ' + code('AGENTS.md') + '. Individual map commands are available for project, routes and APIs, components, database objects, permissions, and integrations.',
    '',
    'The bootstrap command creates only missing human-maintained files. The generate command replaces only files under ' + code('docs/engineering/generated/') + '.',
  ]))
  add('docs/engineering/agents/README.md', md([
    '# Agent domains',
    '',
    code('registry.yaml') + ' is the routing index. Each domain has a charter, state, architecture, backlog, interfaces, decisions, verification guide, and working-set manifest.',
    '',
    'No agent owns the whole repository. The orchestrator routes tasks and resolves overlap; it does not re-audit every domain.',
  ]))
  add('docs/engineering/agents/registry.yaml', agentRegistry())
  add('docs/engineering/tasks/README.md', md([
    '# Task records',
    '',
    'Task records are JSON documents validated by ' + code('task.schema.json') + ' and indexed by ' + code('TASK_INDEX.json') + '.',
    '',
    '- ' + code('active/') + ': ready or in progress.',
    '- ' + code('blocked/') + ': waiting on a recorded dependency or decision.',
    '- ' + code('completed/') + ': acceptance and verification evidence are complete.',
    '',
    'Create with ' + code('npm run agents:task:create -- --id TOUR-001 --title "Title" --agent artist --goal "Outcome" --path app/artist') + '.',
    '',
    'Checkpoint with ' + code('npm run agents:checkpoint -- --task TOUR-001 --summary "Implemented X" --next "Run focused test"') + '.',
    '',
    'Existing ' + code('docs/work-packets/') + ' may be referenced; do not bulk-copy them.',
  ]))
  add('docs/engineering/tasks/task.schema.json', JSON.stringify(taskSchema(), null, 2) + '\n')
  add('docs/engineering/tasks/TASK_INDEX.json', JSON.stringify({ schema_version: '1.0', updated_at: new Date().toISOString(), tasks: [] }, null, 2) + '\n')
  add('docs/engineering/tasks/TEMPLATE.json', JSON.stringify(taskTemplate(), null, 2) + '\n')
  add('docs/engineering/handoffs/README.md', md([
    '# Handoffs',
    '',
    'Use a handoff when ownership moves or a task crosses a domain boundary. The task record remains progress truth.',
    '',
    '- ' + code('pending/') + ': receiver has not accepted context.',
    '- ' + code('completed/') + ': receiver accepted and ownership is recorded.',
    '',
    'A handoff identifies the working set, source SHA, dirty-state caveat, commands run, failures, and one next action.',
  ]))
  add('docs/engineering/handoffs/handoff.schema.json', JSON.stringify(handoffSchema(), null, 2) + '\n')
  add('docs/engineering/handoffs/TEMPLATE.md', md([
    '# Handoff: HANDOFF-ID',
    '',
    '- Task: TASK-ID',
    '- From: agent-id',
    '- To: agent-id',
    '- Status: pending',
    '- Source SHA: record current HEAD',
    '- Working tree: clean or dirty; describe overlap risk',
    '',
    '## Summary',
    '',
    'What changed and why.',
    '',
    '## Working set',
    '',
    '- path',
    '',
    '## Completed',
    '',
    '- Evidence-backed result.',
    '',
    '## Verification',
    '',
    '- command — result and evidence path.',
    '',
    '## Blockers',
    '',
    '- None.',
    '',
    '## Next action',
    '',
    'One concrete next step for the receiver.',
  ]))
  add('docs/engineering/exec-plans/README.md', md([
    '# Execution plans',
    '',
    'Use a plan for multi-step work spanning tasks, agents, or release gates.',
    '',
    '- ' + code('active/') + ': unfinished milestones.',
    '- ' + code('completed/') + ': exit criteria satisfied.',
    '',
    'Plans coordinate task IDs; they do not replace task records.',
  ]))
  add('docs/engineering/exec-plans/TEMPLATE.md', md([
    '# Execution plan: PLAN-ID — title',
    '',
    '- Owner: orchestrator',
    '- Base SHA: record current HEAD',
    '- Status: active',
    '- Related tasks: TASK-ID',
    '',
    '## Outcome',
    '',
    'Observable end state.',
    '',
    '## Scope and constraints',
    '',
    '- In:',
    '- Out:',
    '- Preserve:',
    '',
    '## Dependency order',
    '',
    '1. Task and owner.',
    '',
    '## Verification gates',
    '',
    '- Gate, command, and evidence.',
    '',
    '## Rollback or recovery',
    '',
    'How to recover from a partial rollout.',
  ]))
  for (const [id, domain] of Object.entries(domains)) {
    const base = 'docs/engineering/agents/' + id + '/'
    add(base + 'CHARTER.md', agentCharter(id, domain))
    add(base + 'STATE.md', agentState(id, domain))
    add(base + 'ARCHITECTURE.md', agentArchitecture(id, domain))
    add(base + 'BACKLOG.md', md([
      '# ' + titleFor(id) + ' backlog',
      '',
      'The canonical work item is a task JSON. Launch priorities remain in ' + code('docs/DEVELOPMENT_BACKLOG.md') + '.',
      '',
      '## Active',
      '',
      '- None assigned.',
      '',
      '## Candidate',
      '',
      '- Convert only current verified backlog items into bounded tasks.',
      '',
      '## Done',
      '',
      '- Control-plane bootstrap created.',
    ]))
    add(base + 'INTERFACES.md', md([
      '# ' + titleFor(id) + ' interfaces',
      '',
      '## Provides',
      '',
      '- Domain behavior and contracts within the working-set paths.',
      '',
      '## Consumes',
      '',
      '- Server-side identity and tenant context.',
      '- Database schema, RLS, RPCs, and generated types.',
      '- Shared UI and accessibility rules.',
      '- QA and release verification evidence.',
      '',
      'Record breaking payload, schema, route, permission, or event changes in the task and decision log. Find callers with targeted search and generated maps.',
    ]))
    add(base + 'DECISIONS.md', md([
      '# ' + titleFor(id) + ' decisions',
      '',
      'Append decisions using:',
      '',
      '## DOMAIN-NNN — title',
      '',
      '- Date:',
      '- Status: proposed | accepted | superseded',
      '- Task:',
      '- Decision:',
      '- Evidence:',
      '- Consequences:',
    ]))
    add(base + 'VERIFICATION.md', md([
      '# ' + titleFor(id) + ' verification',
      '',
      'Start with the task tier from ' + code('docs/DEVELOPMENT_WORKFLOW.md') + '.',
      '',
      '- Run targeted tests for touched behavior.',
      '- Lint touched source files.',
      '- Use ' + code('npm run verify:fast -- --changed') + ' during implementation.',
      '- Use feature verification when API, auth, database, shared contracts, or multiple surfaces change.',
      '- Record exact commands, SHA, result, and evidence in the task.',
      '',
      'Do not claim completion from an unrelated global check.',
    ]))
    add(base + 'WORKING_SET.json', JSON.stringify({
      schema_version: '1.0',
      agent: id,
      description: domain.mission,
      paths: domain.paths,
      exclusions: ['node_modules/**', '.next/**', 'docs/implementation/** unless explicitly referenced'],
      expansion_rule: 'Add paths only when task evidence requires them; record the reason in the task checkpoint.',
    }, null, 2) + '\n')
  }
  for (const directory of [
    'docs/engineering/tasks/active',
    'docs/engineering/tasks/blocked',
    'docs/engineering/tasks/completed',
    'docs/engineering/handoffs/pending',
    'docs/engineering/handoffs/completed',
    'docs/engineering/exec-plans/active',
    'docs/engineering/exec-plans/completed',
  ]) {
    fs.mkdirSync(inside(directory), { recursive: true })
    add(directory + '/.gitkeep', '')
  }
  console.log('bootstrapped control plane; created ' + created + ' files, preserved existing files')
}

function taskTemplate(overrides = {}) {
  const now = new Date().toISOString()
  return {
    schema_version: '1.0',
    id: overrides.id || 'TOUR-000',
    title: overrides.title || 'Replace with a bounded task title',
    status: overrides.status || 'active',
    priority: overrides.priority || 'P2',
    owner_agent: overrides.owner_agent || 'orchestrator',
    created_at: overrides.created_at || now,
    updated_at: overrides.updated_at || now,
    base_sha: overrides.base_sha || git(['rev-parse', 'HEAD']),
    working_tree_status: overrides.working_tree_status || 'recorded at creation',
    goal: overrides.goal || 'Describe one observable outcome.',
    scope: overrides.scope || { in: [], out: [] },
    working_set: overrides.working_set || [],
    references: overrides.references || ['docs/DEVELOPMENT_WORKFLOW.md'],
    acceptance_criteria: overrides.acceptance_criteria || [],
    verification: overrides.verification || {
      tier: 'fast',
      commands: [],
      evidence: [],
      last_run_sha: null,
      last_run_at: null,
      result: 'not-run',
    },
    progress: overrides.progress || {
      summary: 'Not started.',
      completed: [],
      next_steps: [],
      blockers: [],
      checkpoints: [],
    },
    handoffs: overrides.handoffs || [],
  }
}

function routeFromFile(file) {
  const parts = rel(file).split('/')
  const appIndex = parts.indexOf('app')
  return '/' + parts.slice(appIndex + 1, -1)
    .filter((part) => !part.startsWith('(') && !part.startsWith('@'))
    .join('/')
}

function generateProjectMap(state) {
  const rows = fs.readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules')
    .map((entry) => '| ' + code(entry.name + '/') + ' | ' + walk(entry.name).length + ' |')
  write('docs/engineering/generated/project-map.md', generatedHeader('Project map', 'control-plane.mjs generate', state) + md([
    '## Top-level directories',
    '',
    '| Directory | Files |',
    '| --- | ---: |',
    ...rows,
    '',
    '## Durable navigation',
    '',
    '- ' + code('ARCHITECTURE.md'),
    '- ' + code('docs/engineering/INDEX.md'),
    '- ' + code('docs/DEVELOPMENT_WORKFLOW.md'),
    '- ' + code('docs/DEVELOPMENT_BACKLOG.md'),
    '- ' + code('docs/work-packets/'),
    '- ' + code('.agents/'),
  ]))
}

function generateRoutes(state) {
  const pages = walk('app', (file) => /\/page\.(ts|tsx|js|jsx)$/.test(file))
    .map((file) => ({ route: routeFromFile(file), file: rel(file) }))
    .sort((a, b) => a.route.localeCompare(b.route))
  const api = walk('app/api', (file) => /\/route\.(ts|js)$/.test(file))
    .map((file) => {
      const text = fs.readFileSync(file, 'utf8')
      const methods = new Set()
      const patterns = [
        /export\s+(?:async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)\b/g,
        /export\s+const\s+(GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)\s*=/g,
      ]
      for (const pattern of patterns) {
        for (const match of text.matchAll(pattern)) methods.add(match[1])
      }
      return { route: routeFromFile(file), file: rel(file), methods: [...methods].sort().join(', ') || 'unknown' }
    })
    .sort((a, b) => a.route.localeCompare(b.route))
  const mobile = walk('apps/mobile/app', (file) => /\.(ts|tsx|js|jsx)$/.test(file) && !/_layout\./.test(file))
    .map((file) => {
      const route = '/' + rel(file).replace(/^apps\/mobile\/app\//, '').replace(/\.(ts|tsx|js|jsx)$/, '').replace(/\/index$/, '')
        .split('/').filter((part) => !part.startsWith('(')).join('/')
      return { route: route || '/', file: rel(file) }
    })
    .sort((a, b) => a.route.localeCompare(b.route))
  write('docs/engineering/generated/routes.md', generatedHeader('Route map', 'control-plane.mjs generate', state) + md([
    '## Web pages (' + pages.length + ')',
    '',
    '| Route | Source |',
    '| --- | --- |',
    ...pages.map((item) => '| ' + code(item.route) + ' | ' + code(item.file) + ' |'),
    '',
    '## Mobile screens (' + mobile.length + ')',
    '',
    '| Route | Source |',
    '| --- | --- |',
    ...mobile.map((item) => '| ' + code(item.route) + ' | ' + code(item.file) + ' |'),
  ]))
  write('docs/engineering/generated/api-routes.md', generatedHeader('API route map', 'control-plane.mjs generate', state) + md([
    '## Route handlers (' + api.length + ')',
    '',
    '| Route | Methods | Source |',
    '| --- | --- | --- |',
    ...api.map((item) => '| ' + code(item.route) + ' | ' + item.methods + ' | ' + code(item.file) + ' |'),
  ]))
  return { pages: pages.length, mobile: mobile.length, api: api.length }
}

function generateComponents(state) {
  const files = ['app', 'components', 'apps/mobile'].flatMap((directory) =>
    walk(directory, (file) => /\.(tsx|jsx)$/.test(file))
  )
  const rows = files.map((file) => {
    const text = fs.readFileSync(file, 'utf8')
    const names = new Set()
    for (const pattern of [
      /export\s+(?:default\s+)?function\s+([A-Z][A-Za-z0-9_]*)/g,
      /export\s+(?:const|class)\s+([A-Z][A-Za-z0-9_]*)/g,
    ]) {
      for (const match of text.matchAll(pattern)) names.add(match[1])
    }
    return { file: rel(file), names: [...names].slice(0, 8).join(', ') || 'default or inline' }
  })
  write('docs/engineering/generated/components.md', generatedHeader('Component map', 'control-plane.mjs generate', state) + md([
    '## TSX and JSX files (' + rows.length + ')',
    '',
    '| Source | Detected exported components |',
    '| --- | --- |',
    ...rows.map((item) => '| ' + code(item.file) + ' | ' + item.names.replaceAll('|', '\\|') + ' |'),
  ]))
  return rows.length
}

function generateDatabase(state) {
  const migrations = walk('supabase/migrations', (file) => file.endsWith('.sql'))
  const objects = new Map()
  const policies = new Map()
  function remember(type, name, file) {
    objects.set(type + ':' + name.toLowerCase(), { type, name, latest: rel(file) })
  }
  for (const file of migrations) {
    const text = fs.readFileSync(file, 'utf8')
    const patterns = [
      ['table', /\bcreate\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?["']?([a-zA-Z_][\w$]*)["']?/gi],
      ['view', /\bcreate\s+(?:or\s+replace\s+)?view\s+(?:public\.)?["']?([a-zA-Z_][\w$]*)["']?/gi],
      ['materialized view', /\bcreate\s+materialized\s+view\s+(?:if\s+not\s+exists\s+)?(?:public\.)?["']?([a-zA-Z_][\w$]*)["']?/gi],
      ['function', /\bcreate\s+(?:or\s+replace\s+)?function\s+(?:public\.)?["']?([a-zA-Z_][\w$]*)["']?/gi],
      ['type', /\bcreate\s+type\s+(?:public\.)?["']?([a-zA-Z_][\w$]*)["']?/gi],
    ]
    for (const [type, pattern] of patterns) {
      for (const match of text.matchAll(pattern)) remember(type, match[1], file)
    }
    for (const match of text.matchAll(/\bcreate\s+policy\s+["']?([^"'\n]+?)["']?\s+on\s+(?:public\.)?["']?([a-zA-Z_][\w$]*)["']?/gi)) {
      policies.set(match[2].toLowerCase() + ':' + match[1].toLowerCase(), {
        table: match[2],
        name: match[1].trim(),
        latest: rel(file),
      })
    }
  }
  const objectRows = [...objects.values()].sort((a, b) => a.type.localeCompare(b.type) || a.name.localeCompare(b.name))
  const policyRows = [...policies.values()].sort((a, b) => a.table.localeCompare(b.table) || a.name.localeCompare(b.name))
  const types = [...new Set(objectRows.map((item) => item.type))].sort()
  write('docs/engineering/generated/database-schema.md', generatedHeader('Database schema summary', 'control-plane.mjs generate', state) + md([
    '## Static source scan',
    '',
    '- Supabase migrations: ' + migrations.length,
    '- Distinct detected objects: ' + objectRows.length,
    '- Distinct detected policies: ' + policyRows.length,
    '',
    '| Type | Distinct names |',
    '| --- | ---: |',
    ...types.map((type) => '| ' + type + ' | ' + objectRows.filter((item) => item.type === type).length + ' |'),
    '',
    'This scans source migrations. Verify deployed database state separately.',
  ]))
  write('docs/engineering/generated/database-objects.md', generatedHeader('Database objects', 'control-plane.mjs generate', state) + md([
    '## Objects (' + objectRows.length + ')',
    '',
    '| Type | Name | Latest create evidence |',
    '| --- | --- | --- |',
    ...objectRows.map((item) => '| ' + item.type + ' | ' + code(item.name) + ' | ' + code(item.latest) + ' |'),
    '',
    '## RLS policies (' + policyRows.length + ')',
    '',
    '| Table | Policy | Latest create evidence |',
    '| --- | --- | --- |',
    ...policyRows.map((item) => '| ' + code(item.table) + ' | ' + item.name.replaceAll('|', '\\|') + ' | ' + code(item.latest) + ' |'),
  ]))
  return { migrations: migrations.length, objects: objectRows.length, policies: policyRows.length }
}

function generatePermissions(state) {
  const guards = [
    ['session/auth', /getUser|authenticate|requireAuth|requireUser|updateSession|auth\.getUser/i],
    ['admin', /requireAdmin|assertPlatformAdmin|userHasAdmin|adminContext|AdminCapability/i],
    ['organization', /requireOrg|organization.*(member|owner|admin)|resolveAuthorizedOrg|actingOrg/i],
    ['venue', /requireVenue|venue.*(access|permission|owner)|assertVenue/i],
    ['artist', /requireArtist|artist.*(access|permission|owner)|assertArtist/i],
    ['entity/RBAC', /hasEntityPermission|requirePermission|capabilit|\brbac\b/i],
    ['service role', /service.?role|createServiceRole/i],
    ['rate limit', /rateLimit|rateLimiter|enforceRate/i],
  ]
  const routes = walk('app/api', (file) => /\/route\.(ts|js)$/.test(file)).map((file) => {
    const text = fs.readFileSync(file, 'utf8')
    const found = guards.filter((entry) => entry[1].test(text)).map((entry) => entry[0])
    return { file: rel(file), found: found.join(', ') || 'manual review required' }
  })
  const authFiles = ['middleware.ts']
    .concat(walk('lib/auth', (file) => /\.(ts|tsx|js)$/.test(file)).map(rel))
    .concat(walk('lib/supabase', (file) => /\.(ts|tsx|js)$/.test(file)).map(rel))
  write('docs/engineering/generated/permissions.md', generatedHeader('Permissions map', 'control-plane.mjs generate', state) + md([
    'Static detection is a routing aid, not an authorization audit. Missing markers require review; detected markers do not prove correct scope.',
    '',
    '## Core files',
    '',
    ...authFiles.filter((file) => fs.existsSync(inside(file))).map((file) => '- ' + code(file)),
    '',
    '## API route indicators (' + routes.length + ')',
    '',
    '| Source | Detected indicators |',
    '| --- | --- |',
    ...routes.map((item) => '| ' + code(item.file) + ' | ' + item.found + ' |'),
  ]))
  return routes.length
}

function generateIntegrations(state) {
  const packageJson = JSON.parse(fs.readFileSync(inside('package.json'), 'utf8'))
  const dependencies = Object.assign({}, packageJson.dependencies || {}, packageJson.devDependencies || {})
  const files = ['app', 'lib', 'components', 'scripts', 'apps/mobile'].flatMap((directory) =>
    walk(directory, (file) => /\.(ts|tsx|js|jsx|mjs|cjs)$/.test(file))
  )
  const providers = [
    ['Supabase', ['@supabase/ssr', '@supabase/supabase-js'], /^SUPABASE_|^NEXT_PUBLIC_SUPABASE_/],
    ['Stripe', ['stripe'], /^STRIPE_/],
    ['Resend', ['resend'], /^RESEND_|^EMAIL_FROM$/],
    ['Sentry', ['@sentry/nextjs'], /^SENTRY_|^NEXT_PUBLIC_SENTRY_/],
    ['Upstash', ['@upstash/ratelimit', '@upstash/redis'], /^UPSTASH_/],
    ['AWS S3', ['@aws-sdk/client-s3'], /^AWS_|^S3_/],
    ['OpenAI / AI SDK', ['@ai-sdk/openai', 'ai'], /^OPENAI_/],
    ['Vercel', [], /^VERCEL_/],
    ['Twilio', [], /^TWILIO_/],
  ]
  const rows = []
  for (const [name, packages, envPattern] of providers) {
    const env = new Set()
    const evidence = []
    for (const file of files) {
      const text = fs.readFileSync(file, 'utf8')
      for (const match of text.matchAll(/process\.env\.([A-Z][A-Z0-9_]*)/g)) {
        if (envPattern.test(match[1])) {
          env.add(match[1])
          if (evidence.length < 8) evidence.push(rel(file))
        }
      }
    }
    rows.push({
      name,
      packages: packages.filter((name) => dependencies[name]).map((name) => name + '@' + dependencies[name]),
      env: [...env].sort(),
      evidence: [...new Set(evidence)],
    })
  }
  write('docs/engineering/generated/integrations.md', generatedHeader('Integrations map', 'control-plane.mjs generate', state) + md([
    'Only environment-variable names are recorded. Secret values and local env files are never read.',
    '',
    '| Provider | Installed packages | Environment names | Sample evidence |',
    '| --- | --- | --- | --- |',
    ...rows.map((item) =>
      '| ' + item.name +
      ' | ' + (item.packages.map(code).join(', ') || 'platform or HTTP') +
      ' | ' + (item.env.map(code).join(', ') || 'none detected') +
      ' | ' + item.evidence.map(code).join('<br>') + ' |'
    ),
  ]))
  return rows.length
}

function generate() {
  const state = snapshot()
  generateProjectMap(state)
  const routes = generateRoutes(state)
  const components = generateComponents(state)
  const database = generateDatabase(state)
  const permissions = generatePermissions(state)
  const integrations = generateIntegrations(state)
  console.log(JSON.stringify({ sha: state.sha, routes, components, database, permissions, integrations }, null, 2))
}

function generateOne(kind) {
  const state = snapshot()
  const generators = {
    project: generateProjectMap,
    routes: generateRoutes,
    components: generateComponents,
    database: generateDatabase,
    permissions: generatePermissions,
    integrations: generateIntegrations,
  }
  const result = generators[kind](state)
  console.log(JSON.stringify({ sha: state.sha, kind, result: result || 'generated' }, null, 2))
}

function taskFiles() {
  return ['active', 'blocked', 'completed'].flatMap((status) =>
    walk('docs/engineering/tasks/' + status, (file) => file.endsWith('.json'))
  )
}

function findTask(id) {
  const found = taskFiles().find((file) => path.basename(file, '.json') === id)
  return found ? rel(found) : null
}

function refreshIndex() {
  const tasks = taskFiles().map((file) => {
    const record = JSON.parse(fs.readFileSync(file, 'utf8'))
    return {
      id: record.id,
      title: record.title,
      status: record.status,
      priority: record.priority,
      owner_agent: record.owner_agent,
      updated_at: record.updated_at,
      path: rel(file),
      base_sha: record.base_sha,
    }
  }).sort((a, b) => a.id.localeCompare(b.id))
  write('docs/engineering/tasks/TASK_INDEX.json', JSON.stringify({
    schema_version: '1.0',
    updated_at: new Date().toISOString(),
    tasks,
  }, null, 2) + '\n')
  return tasks
}

function createTask() {
  const args = parseArgs()
  for (const name of ['--id', '--title', '--agent', '--goal']) {
    if (!args.one(name)) throw new Error('Missing ' + name)
  }
  const id = args.one('--id').toUpperCase()
  if (!/^[A-Z][A-Z0-9-]{2,63}$/.test(id)) throw new Error('Invalid task ID')
  if (findTask(id)) throw new Error('Task already exists: ' + id)
  const owner = args.one('--agent')
  if (!domains[owner]) throw new Error('Unknown agent: ' + owner)
  const status = git(['status', '--porcelain'], '')
  const record = taskTemplate({
    id,
    title: args.one('--title'),
    owner_agent: owner,
    priority: args.one('--priority', 'P2'),
    goal: args.one('--goal'),
    working_tree_status: status ? 'dirty (' + status.split('\n').filter(Boolean).length + ' entries)' : 'clean',
    scope: { in: args.many('--in'), out: args.many('--out') },
    working_set: args.many('--path'),
    references: [...new Set(['docs/DEVELOPMENT_WORKFLOW.md'].concat(args.many('--reference')))],
    acceptance_criteria: args.many('--accept'),
    verification: {
      tier: args.one('--tier', 'fast'),
      commands: args.many('--verify'),
      evidence: [],
      last_run_sha: null,
      last_run_at: null,
      result: 'not-run',
    },
    progress: {
      summary: 'Created; implementation not started.',
      completed: [],
      next_steps: args.many('--next'),
      blockers: [],
      checkpoints: [],
    },
  })
  if (args.has('--dry-run')) {
    console.log(JSON.stringify(record, null, 2))
    return
  }
  write('docs/engineering/tasks/active/' + id + '.json', JSON.stringify(record, null, 2) + '\n')
  refreshIndex()
  console.log('created task ' + id)
}

function buildContext() {
  const args = parseArgs()
  const id = args.one('--task')
  if (!id) throw new Error('Missing --task')
  const taskPath = findTask(id)
  if (!taskPath) throw new Error('Task not found: ' + id)
  const task = JSON.parse(fs.readFileSync(inside(taskPath), 'utf8'))
  const maxFiles = Math.max(1, Number(args.one('--max-files', '30')))
  const maxFileChars = Math.max(1000, Number(args.one('--max-file-chars', '10000')))
  const maxChars = Math.max(5000, Number(args.one('--max-chars', '60000')))
  const mandatory = [
    'AGENTS.md',
    'docs/engineering/INDEX.md',
    'docs/engineering/agents/' + task.owner_agent + '/CHARTER.md',
    'docs/engineering/agents/' + task.owner_agent + '/STATE.md',
    taskPath,
  ]
  const requested = [...new Set(mandatory.concat(task.references, task.working_set))]
  const candidates = []
  for (const candidate of requested) {
    const full = inside(candidate)
    if (fs.existsSync(full) && fs.statSync(full).isDirectory()) {
      candidates.push(...walk(candidate).map(rel))
    } else {
      candidates.push(candidate)
    }
  }
  const uniqueCandidates = [...new Set(candidates)]
  let total = 0
  let included = 0
  const sections = []
  for (const candidate of uniqueCandidates) {
    if (included >= maxFiles || total >= maxChars) break
    const full = inside(candidate)
    if (!fs.existsSync(full) || !fs.statSync(full).isFile()) {
      sections.push('## Missing reference\n\n- ' + code(candidate))
      continue
    }
    const raw = fs.readFileSync(full, 'utf8')
    const content = raw.slice(0, Math.min(maxFileChars, maxChars - total))
    sections.push('## ' + candidate + '\n\n' + content + (content.length < raw.length ? '\n\n[truncated by context limit]' : ''))
    total += content.length
    included += 1
  }
  const currentSha = git(['rev-parse', 'HEAD'])
  const output = md([
    '# Bounded context: ' + task.id + ' — ' + task.title,
    '',
    '- Owner: ' + code(task.owner_agent),
    '- Task base SHA: ' + code(task.base_sha),
    '- Current SHA: ' + code(currentSha),
    '- SHA drift: ' + (currentSha === task.base_sha ? 'none' : 'yes; reconcile overlapping files'),
    '- Included files: ' + included + '/' + uniqueCandidates.length,
    '- Character budget: ' + total + '/' + maxChars,
    '',
    sections.join('\n\n'),
  ])
  const truncationMarker = '\n\n[packet truncated]\n'
  const boundedOutput = output.length > maxChars
    ? output.slice(0, Math.max(0, maxChars - truncationMarker.length)) + truncationMarker
    : output
  const outputPath = args.one('--output')
  if (outputPath) {
    write(outputPath, boundedOutput)
    console.log('wrote ' + outputPath)
  } else {
    process.stdout.write(boundedOutput)
  }
}

function checkpoint() {
  const args = parseArgs()
  const id = args.one('--task')
  if (!id) throw new Error('Missing --task')
  const taskPath = findTask(id)
  if (!taskPath) throw new Error('Task not found: ' + id)
  const source = inside(taskPath)
  const task = JSON.parse(fs.readFileSync(source, 'utf8'))
  const now = new Date().toISOString()
  const nextStatus = args.one('--status', task.status)
  if (!['active', 'blocked', 'completed'].includes(nextStatus)) throw new Error('Invalid status')
  const summary = args.one('--summary', task.progress.summary)
  task.updated_at = now
  task.status = nextStatus
  task.progress.summary = summary
  task.progress.completed = [...new Set(task.progress.completed.concat(args.many('--complete')))]
  if (args.many('--next').length) task.progress.next_steps = args.many('--next')
  if (args.many('--blocker').length) task.progress.blockers = args.many('--blocker')
  task.progress.checkpoints.push({
    at: now,
    sha: git(['rev-parse', 'HEAD']),
    summary,
    completed: args.many('--complete'),
    next_steps: args.many('--next'),
    blockers: args.many('--blocker'),
  })
  if (args.one('--result')) {
    const result = args.one('--result')
    if (!['not-run', 'pass', 'fail'].includes(result)) throw new Error('Invalid verification result')
    task.verification.result = result
    task.verification.last_run_at = now
    task.verification.last_run_sha = git(['rev-parse', 'HEAD'])
    task.verification.commands = [...new Set(task.verification.commands.concat(args.many('--verify')))]
    task.verification.evidence = [...new Set(task.verification.evidence.concat(args.many('--evidence')))]
  }
  const destination = inside('docs/engineering/tasks/' + nextStatus + '/' + id + '.json')
  fs.mkdirSync(path.dirname(destination), { recursive: true })
  fs.writeFileSync(destination, JSON.stringify(task, null, 2) + '\n')
  if (destination !== source) fs.unlinkSync(source)
  refreshIndex()
  console.log('checkpointed ' + id + ' -> ' + nextStatus)
}

function validate() {
  const args = parseArgs()
  const errors = []
  const warnings = []
  const requiredFiles = ['CHARTER.md', 'STATE.md', 'ARCHITECTURE.md', 'BACKLOG.md', 'INTERFACES.md', 'DECISIONS.md', 'VERIFICATION.md', 'WORKING_SET.json']
  for (const id of Object.keys(domains)) {
    for (const file of requiredFiles) {
      const candidate = inside('docs/engineering/agents/' + id + '/' + file)
      if (!fs.existsSync(candidate)) errors.push('missing ' + rel(candidate))
    }
    const manifestPath = inside('docs/engineering/agents/' + id + '/WORKING_SET.json')
    if (fs.existsSync(manifestPath)) {
      try {
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
        if (manifest.agent !== id || !Array.isArray(manifest.paths)) errors.push('invalid working set for ' + id)
      } catch (error) {
        errors.push('invalid JSON ' + rel(manifestPath) + ': ' + error.message)
      }
    }
  }
  const records = []
  for (const file of taskFiles()) {
    try {
      const task = JSON.parse(fs.readFileSync(file, 'utf8'))
      records.push(task)
      if (!domains[task.owner_agent]) errors.push(task.id + ': unknown owner')
      if (!['active', 'blocked', 'completed'].includes(task.status)) errors.push(task.id + ': invalid status')
      if (!Array.isArray(task.working_set)) errors.push(task.id + ': invalid working set')
      if (task.status === 'completed' && task.verification.result !== 'pass') warnings.push(task.id + ': completed without passing verification')
    } catch (error) {
      errors.push('invalid task JSON ' + rel(file) + ': ' + error.message)
    }
  }
  try {
    const index = JSON.parse(fs.readFileSync(inside('docs/engineering/tasks/TASK_INDEX.json'), 'utf8'))
    const indexed = new Set(index.tasks.map((task) => task.id))
    for (const task of records) if (!indexed.has(task.id)) errors.push(task.id + ': missing from index')
    for (const id of indexed) if (!findTask(id)) errors.push(id + ': indexed task file missing')
  } catch (error) {
    errors.push('invalid task index: ' + error.message)
  }
  const currentSha = git(['rev-parse', 'HEAD'])
  for (const file of ['project-map.md', 'routes.md', 'api-routes.md', 'components.md', 'database-schema.md', 'database-objects.md', 'permissions.md', 'integrations.md']) {
    const candidate = inside('docs/engineering/generated/' + file)
    if (!fs.existsSync(candidate)) errors.push('missing generated map ' + file)
    else if (!fs.readFileSync(candidate, 'utf8').includes('Source SHA: ' + code(currentSha))) warnings.push(file + ': generated from a different SHA')
  }
  for (const warning of warnings) console.warn('WARN ' + warning)
  for (const error of errors) console.error('ERROR ' + error)
  console.log('validated ' + Object.keys(domains).length + ' agents, ' + records.length + ' tasks, ' + warnings.length + ' warnings, ' + errors.length + ' errors')
  if (errors.length || (args.has('--strict') && warnings.length)) process.exit(1)
}

function help() {
  console.log(md([
    'Tourify engineering control plane',
    '',
    'Commands:',
    '  bootstrap      create missing docs and domain state',
    '  generate       refresh SHA-stamped source maps',
    '  generate-*     refresh one map family: project, routes, components, database, permissions, integrations',
    '  create-task    create and index a task',
    '  context        print or write a bounded task packet',
    '  checkpoint     update and optionally move a task',
    '  validate       validate agent, task, and map state',
  ]))
}

const actions = {
  bootstrap,
  generate,
  'generate-project': () => generateOne('project'),
  'generate-routes': () => generateOne('routes'),
  'generate-components': () => generateOne('components'),
  'generate-database': () => generateOne('database'),
  'generate-permissions': () => generateOne('permissions'),
  'generate-integrations': () => generateOne('integrations'),
  'create-task': createTask,
  context: buildContext,
  checkpoint,
  validate,
  help,
}

if (!actions[command]) {
  console.error('Unknown command: ' + command)
  help()
  process.exit(1)
}

actions[command]()
