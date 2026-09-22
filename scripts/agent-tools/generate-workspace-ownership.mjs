#!/usr/bin/env node

import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const OUTPUT = path.join(ROOT, 'docs/engineering/workspace-ownership/manifest.json')
const MAX_SCAN_BYTES = 1_000_000

function git(args) {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim()
}

const taskIndex = JSON.parse(readFileSync(path.join(ROOT, 'docs/engineering/tasks/TASK_INDEX.json'), 'utf8'))
const taskById = new Map(taskIndex.tasks.map((task) => [task.id, task]))
const tasksByOwner = new Map()
for (const task of taskIndex.tasks) {
  if (task.status === 'completed') continue
  const tasks = tasksByOwner.get(task.owner_agent) ?? []
  tasks.push(task.id)
  tasksByOwner.set(task.owner_agent, tasks)
}

const ownerRules = [
  ['release', /^(?:\.github\/|docker\/|vercel\.json$|next\.config\.|middleware\.ts$|package(?:-lock)?\.json$|\.nvmrc$|instrumentation\.|sentry\.|lib\/config\/|lib\/routing\/(?:production-blocked-routes\.ts|__tests__\/production-blocked-routes\.test\.ts)$|app\/(?:layout\.tsx|robots\.ts|sitemap\.ts|api\/health\/)|apps\/mobile\/lib\/observability\/|__tests__\/(?:config\/|api\/health|ci\/)|scripts\/(?:ci|deploy)|scripts\/(?:check-production-debug-artifacts|verify)\.|docs\/(?:DEPLOYMENT|LOCAL_DEPLOYMENT|PRODUCTION))/],
  ['database', /^(?:supabase\/|lib\/(?:database\.types\.ts$|supabase\/)|types\/supabase\.ts$|__tests__\/helpers\/migration-|scripts\/run-migrations\.sh$|docs\/engineering\/migration-validation\/|app\/api\/(?:analytics\/route\.ts$|calendar\/me\/route\.ts$|community\/stats\/route\.ts$)|lib\/services\/dashboard\.service\.ts$)/],
  ['admin', /^(?:\.agents\/admin-|app\/(?:api\/)?admin\/|components\/admin\/|lib\/(?:admin\/|testing\/admin)|lib\/services\/admin-workforce-people\.service\.ts$|__tests__\/admin\/|scripts\/audit\/|tsconfig\.admin|docs\/(?:admin-|admin\/))/],
  ['artist', /^(?:app\/(?:api\/)?artist\/|components\/(?:artist|epk|public-artist)\/|lib\/artist\/|__tests__\/artist\/)/],
  ['venue', /^(?:\.agents\/venue-pages-builder\/|app\/(?:api\/)?venue(?:s)?\/|components\/(?:venue|venue-kit)\/|lib\/venue\/|hooks\/venue\/|__tests__\/venue\/)/],
  ['organization', /^(?:app\/(?:api\/)?(?:org(?:anization|s)?|tours)\/|components\/organization\/|lib\/organizations?\/|__tests__\/organization\/|docs\/organization-personas\.md$)/],
  ['ticketing', /^(?:app\/(?:api\/)?ticket(?:ing|s)?\/|components\/ticketing\/|lib\/ticketing\/|lib\/services\/ticketing\.service\.ts$|__tests__\/ticketing\/)/],
  ['ticketing', /^(?:\.agents\/organization-ticketing\/|docs\/implementation\/organization-ticketing\/|app\/api\/events\/\[id\]\/guestlist\/)/],
  ['marketplace', /^(?:app\/(?:api\/)?marketplace\/|components\/marketplace\/|lib\/marketplace\/|__tests__\/marketplace\/|docs\/marketplace-)/],
  ['music', /^(?:\.g1-evidence\/world-music-|app\/(?:api\/)?music(?:-|\/)|components\/music\/|lib\/(?:music|playback)\/|scripts\/music-|__tests__\/music|docs\/music-)/],
  ['work', /^(?:app\/(?:api\/)?(?:work(?:-mode)?|hiring|jobs|staffing|job-applications)\/|app\/api\/events\/\[id\]\/(?:jobs|staff)\/|components\/(?:work|hiring|jobs|staffing)-?|components\/(?:account\/work-mode|job-posting)\/|lib\/(?:work|hiring|job|staffing)-?|lib\/(?:api\/hiring|rebuild\/shift-assignment|services\/(?:hiring|staffing)|services\/(?:staff-shift-assignment-sync|worker-ops))|types\/(?:hiring|job-posting|staff-operations)|__tests__\/(?:work(?:-mode)?|hiring|jobs)\/)/],
  ['discover', /^(?:\.activation-evidence\/|app\/(?:api\/)?(?:discover|search|news|world)\/|components\/(?:discover|search|news|world)\/|lib\/(?:discover|search|news|world)\/|lib\/events\/providers\/|__tests__\/(?:search|events\/providers)\/)/],
  ['social', /^(?:app\/(?:api\/)?(?:feed|groups|messages|notifications|social|polls)\/|apps\/mobile\/(?:app\/(?:\(tabs\)\/messages\.tsx$|group-chats\/)|lib\/notifications\/)|components\/(?:feed|groups|messages|notifications|social)\/|lib\/(?:feed|groups|messaging|notifications|social)\/|__tests__\/(?:feed|messaging|social|polls)\/)/],
  ['general-user', /^(?:app\/(?:api\/)?(?:account|accounts|auth|login|onboarding|profile|settings|dashboard)\/|app\/(?:forgot-password\/|api\/upload-profile-image\/)|components\/(?:account|achievements|auth|onboarding|profile|settings)\/|contexts\/auth-context\.tsx$|lib\/(?:auth|onboarding|privacy|profile)\/|lib\/services\/(?:account-management|auth)\.service\.ts$|__tests__\/(?:auth|onboarding|profile|settings)\/)/],
  ['integrations', /^(?:app\/api\/(?:webhooks|cron)\/|app\/api\/(?:institutional|licensing|rights-admin)\/partners\/webhooks\/|app\/api\/(?:photos\/purchase|subscriptions)\/webhook\/|lib\/(?:integrations|services\/mfa|utils\/rate-limit)|scripts\/[^/]*worker\.|__tests__\/integrations\/)/],
  ['qa', /^(?:e2e\/|tests\/e2e\/|playwright(?:\.|\/)|jest\.config\.|scripts\/qa\/|__tests__\/qa\/)/],
  ['design-system', /^(?:components\/ui\/|hooks\/use-|styles\/|app\/globals\.css$|tailwind\.config\.|__tests__\/design-system\/|docs\/implementation\/ui-ux-completion\/)/],
  ['orchestrator', /^(?:docs\/engineering\/|docs\/(?:AUDIT_FINDINGS|DEVELOPMENT_BACKLOG|DEVELOPMENT_WORKFLOW)|docs\/work-packets\/|scripts\/agent-tools\/|scripts\/(?:context-task|task-next|task-status)\.|\.opencode\/|AGENTS\.md$|ARCHITECTURE\.md$|RECONCILIATION_STATUS\.md$)/],
]

// Exact cross-domain adjudications require stronger evidence than a path-family
// match. Keep the supporting task/decision visible so future regenerations do
// not turn a one-off judgment into an unexplained ownership rule.
const pathEvidence = new Map([
  ['__tests__/logistics/logistics-route-contract.test.ts', {
    owner: 'admin',
    taskIds: ['ADMIN-003'],
    basis: 'ADMIN-003 changes and verifies the canonical admin logistics guards asserted by this contract.',
  }],
  ['__tests__/logistics/site-map-ops-upgrade.test.ts', {
    owner: 'work',
    taskIds: ['WORK-003'],
    basis: 'WORK-003 names this test as its goal and working verification for the event-zone bridge.',
  }],
  ['__tests__/logistics/site-map-versions.test.ts', {
    owner: 'admin',
    taskIds: ['ADMIN-003'],
    basis: 'The contract targets admin site-map version and collaborator routes and is repeatedly verified by ADMIN-003.',
  }],
  ['app/api/events/me/attending/route.ts', {
    owner: 'ticketing',
    taskIds: ['TICKET-005'],
    basis: 'The route delegates its read model to the canonical ticketing guest-list service; TICKET-005 owns guest-list lifecycle certification.',
  }],
  ['app/providers.tsx', {
    owner: 'design-system',
    taskIds: ['DESIGN-030'],
    basis: 'DESIGN-030 records the provider composition audit and per-file zero-importer deletion evidence.',
    deletionExplanation: 'DESIGN-030 Phase 3 records app/providers.tsx as a zero-importer dead provider deleted after negative module-path and Providers-symbol checks.',
  }],
  ['app/admin/dashboard/components/theme-provider.tsx', {
    owner: 'design-system',
    taskIds: ['DESIGN-030'],
    basis: 'DESIGN-030 records the provider composition audit and per-file zero-importer deletion evidence.',
    deletionExplanation: 'DESIGN-030 Phase 3 records this provider as a zero-importer duplicate retired after negative module-path, symbol, and barrel checks.',
  }],
  ['app/venue/components/theme-provider.tsx', {
    owner: 'design-system',
    taskIds: ['DESIGN-030'],
    basis: 'DESIGN-030 records the provider composition audit and per-file zero-importer deletion evidence.',
    deletionExplanation: 'DESIGN-030 Phase 3 records this provider as a zero-importer duplicate retired after negative module-path, symbol, and barrel checks.',
  }],
  ['components/venue/theme-provider.tsx', {
    owner: 'design-system',
    taskIds: ['DESIGN-030'],
    basis: 'DESIGN-030 records the provider composition audit and per-file zero-importer deletion evidence.',
    deletionExplanation: 'DESIGN-030 Phase 3 records this provider as a zero-importer duplicate retired after negative module-path, symbol, and barrel checks.',
  }],
  ['app/admin/dashboard/components/styles/globals.css', {
    owner: 'design-system',
    taskIds: ['DESIGN-030'],
    basis: 'DESIGN-030 Phase 5 records the exact dead CSS root, replacement/provenance checks, and executed removal.',
    deletionExplanation: 'DESIGN-030 Phase 5 records this unloaded CSS root as retired after zero-importer checks, live replacement verification for its classes/tokens, and provenance preservation.',
  }],
  ['app/venue/globals.css', {
    owner: 'design-system',
    taskIds: ['DESIGN-030'],
    basis: 'DESIGN-030 Phase 5 records the exact dead CSS root, replacement/provenance checks, and executed removal.',
    deletionExplanation: 'DESIGN-030 Phase 5 records this unloaded CSS root as retired after zero-importer checks, live replacement verification for its classes/tokens, and provenance preservation.',
  }],
  ['styles/globals.css', {
    owner: 'design-system',
    taskIds: ['DESIGN-030'],
    basis: 'DESIGN-030 Phase 5 records the exact dead CSS root, replacement/provenance checks, and executed removal.',
    deletionExplanation: 'DESIGN-030 Phase 5 records this unloaded CSS root as retired after zero-importer checks, live replacement verification for its classes/tokens, and provenance preservation.',
  }],
  ['styles/venue/globals.css', {
    owner: 'design-system',
    taskIds: ['DESIGN-030'],
    basis: 'DESIGN-030 Phase 5 records the exact dead CSS root, replacement/provenance checks, and executed removal.',
    deletionExplanation: 'DESIGN-030 Phase 5 records this unloaded CSS root as retired after zero-importer checks, live replacement verification for its classes/tokens, and provenance preservation.',
  }],
  ['components/ui/use-mobile.tsx', {
    owner: 'design-system',
    taskIds: ['DESIGN-002'],
    basis: 'DESIGN-002 explicitly records the shared hook consolidation, canonical replacement, and verified removal of this duplicate.',
    deletionExplanation: 'DESIGN-002 records this duplicate as retired after static import verification; hooks/use-mobile.ts remains the canonical object-returning replacement.',
  }],
  ['hooks/use-mobile.tsx', {
    owner: 'design-system',
    taskIds: ['DESIGN-002'],
    basis: 'DESIGN-002 explicitly records the shared hook consolidation, canonical replacement, and verified removal of this duplicate.',
    deletionExplanation: 'DESIGN-002 records this duplicate as retired after static import verification; hooks/use-mobile.ts remains the canonical object-returning replacement.',
  }],
  ['components/venue/ui/alert-dialog.tsx', {
    owner: 'design-system',
    taskIds: ['DESIGN-029'],
    basis: 'DESIGN-029 explicitly records per-twin parity review, zero-consumer verification, CP-037 authorization, and retirement.',
    deletionExplanation: 'DESIGN-029 records this venue UI compatibility twin as retired under CP-037 after parity review plus per-file and aggregate zero-consumer checks.',
  }],
  ['components/venue/ui/alert.tsx', {
    owner: 'design-system',
    taskIds: ['DESIGN-029'],
    basis: 'DESIGN-029 explicitly records per-twin parity review, zero-consumer verification, CP-037 authorization, and retirement.',
    deletionExplanation: 'DESIGN-029 records this venue UI compatibility twin as retired under CP-037 after parity review plus per-file and aggregate zero-consumer checks.',
  }],
  ['components/venue/ui/aspect-ratio.tsx', {
    owner: 'design-system',
    taskIds: ['DESIGN-029'],
    basis: 'DESIGN-029 explicitly records per-twin parity review, zero-consumer verification, CP-037 authorization, and retirement.',
    deletionExplanation: 'DESIGN-029 records this venue UI compatibility twin as retired under CP-037 after parity review plus per-file and aggregate zero-consumer checks.',
  }],
  ['components/venue/ui/avatar.tsx', {
    owner: 'design-system',
    taskIds: ['DESIGN-029'],
    basis: 'DESIGN-029 explicitly records this divergent twin, per-file zero-consumer verification, CP-037 authorization, and retirement.',
    deletionExplanation: 'DESIGN-029 records this divergent venue UI twin as retired under CP-037 after its data-slot difference was documented and per-file zero-consumer checks passed.',
  }],
  ['components/venue/ui/carousel.tsx', {
    owner: 'design-system',
    taskIds: ['DESIGN-029'],
    basis: 'DESIGN-029 explicitly records per-twin parity review, zero-consumer verification, CP-037 authorization, and retirement.',
    deletionExplanation: 'DESIGN-029 records this venue UI compatibility twin as retired under CP-037 after parity review plus per-file and aggregate zero-consumer checks.',
  }],
  ['components/venue/ui/context-menu.tsx', {
    owner: 'design-system',
    taskIds: ['DESIGN-029'],
    basis: 'DESIGN-029 explicitly records per-twin parity review, zero-consumer verification, CP-037 authorization, and retirement.',
    deletionExplanation: 'DESIGN-029 records this venue UI compatibility twin as retired under CP-037 after parity review plus per-file and aggregate zero-consumer checks.',
  }],
  ['components/venue/ui/drawer.tsx', {
    owner: 'design-system',
    taskIds: ['DESIGN-029'],
    basis: 'DESIGN-029 explicitly records per-twin parity review, zero-consumer verification, CP-037 authorization, and retirement.',
    deletionExplanation: 'DESIGN-029 records this venue UI compatibility twin as retired under CP-037 after parity review plus per-file and aggregate zero-consumer checks.',
  }],
  ['components/venue/ui/dropdown-menu.tsx', {
    owner: 'design-system',
    taskIds: ['DESIGN-029'],
    basis: 'DESIGN-029 explicitly records per-twin parity review, zero-consumer verification, CP-037 authorization, and retirement.',
    deletionExplanation: 'DESIGN-029 records this venue UI compatibility twin as retired under CP-037 after its recorded parity disposition plus per-file, aggregate, and barrel zero-consumer checks.',
  }],
  ['components/venue/ui/form.tsx', {
    owner: 'design-system',
    taskIds: ['DESIGN-029'],
    basis: 'DESIGN-029 explicitly records per-twin parity review, zero-consumer verification, CP-037 authorization, and retirement.',
    deletionExplanation: 'DESIGN-029 records this venue UI compatibility twin as retired under CP-037 after its recorded parity disposition plus per-file, aggregate, and barrel zero-consumer checks.',
  }],
  ['components/venue/ui/hover-card.tsx', {
    owner: 'design-system',
    taskIds: ['DESIGN-029'],
    basis: 'DESIGN-029 explicitly records per-twin parity review, zero-consumer verification, CP-037 authorization, and retirement.',
    deletionExplanation: 'DESIGN-029 records this venue UI compatibility twin as retired under CP-037 after its recorded parity disposition plus per-file, aggregate, and barrel zero-consumer checks.',
  }],
  ['components/venue/ui/input-otp.tsx', {
    owner: 'design-system',
    taskIds: ['DESIGN-029'],
    basis: 'DESIGN-029 explicitly records per-twin parity review, zero-consumer verification, CP-037 authorization, and retirement.',
    deletionExplanation: 'DESIGN-029 records this venue UI compatibility twin as retired under CP-037 after its recorded parity disposition plus per-file, aggregate, and barrel zero-consumer checks.',
  }],
  ['components/venue/ui/menubar.tsx', {
    owner: 'design-system',
    taskIds: ['DESIGN-029'],
    basis: 'DESIGN-029 explicitly records per-twin parity review, zero-consumer verification, CP-037 authorization, and retirement.',
    deletionExplanation: 'DESIGN-029 records this venue UI compatibility twin as retired under CP-037 after its recorded parity disposition plus per-file, aggregate, and barrel zero-consumer checks.',
  }],
  ['components/venue/ui/navigation-menu.tsx', {
    owner: 'design-system',
    taskIds: ['DESIGN-029'],
    basis: 'DESIGN-029 explicitly records per-twin parity review, zero-consumer verification, CP-037 authorization, and retirement.',
    deletionExplanation: 'DESIGN-029 records this venue UI compatibility twin as retired under CP-037 after its recorded parity disposition plus per-file, aggregate, and barrel zero-consumer checks.',
  }],
  ['components/venue/ui/pagination.tsx', {
    owner: 'design-system',
    taskIds: ['DESIGN-029'],
    basis: 'DESIGN-029 explicitly records per-twin parity review, zero-consumer verification, CP-037 authorization, and retirement.',
    deletionExplanation: 'DESIGN-029 records this venue UI compatibility twin as retired under CP-037 after its recorded parity disposition plus per-file, aggregate, and barrel zero-consumer checks.',
  }],
  ['components/venue/ui/resizable.tsx', {
    owner: 'design-system',
    taskIds: ['DESIGN-029'],
    basis: 'DESIGN-029 explicitly records per-twin parity review, zero-consumer verification, CP-037 authorization, and retirement.',
    deletionExplanation: 'DESIGN-029 records this venue UI compatibility twin as retired under CP-037 after its recorded parity disposition plus per-file, aggregate, and barrel zero-consumer checks.',
  }],
  ['components/venue/ui/select.tsx', {
    owner: 'design-system',
    taskIds: ['DESIGN-029'],
    basis: 'DESIGN-029 explicitly records per-twin parity review, zero-consumer verification, CP-037 authorization, and retirement.',
    deletionExplanation: 'DESIGN-029 records this venue UI compatibility twin as retired under CP-037 after its recorded parity disposition plus per-file, aggregate, and barrel zero-consumer checks.',
  }],
  ['components/venue/ui/separator.tsx', {
    owner: 'design-system',
    taskIds: ['DESIGN-029'],
    basis: 'DESIGN-029 explicitly records this divergent twin, per-file zero-consumer verification, CP-037 authorization, register correction, and retirement.',
    deletionExplanation: 'DESIGN-029 records this divergent venue UI twin as retired under CP-037 after documenting its missing canonical data-slot attribute and passing per-file, aggregate, and barrel zero-consumer checks.',
  }],
  ['components/venue/ui/sidebar.tsx', {
    owner: 'design-system',
    taskIds: ['DESIGN-029'],
    basis: 'DESIGN-029 explicitly records per-twin parity review, zero-consumer verification, CP-037 authorization, and retirement.',
    deletionExplanation: 'DESIGN-029 records this venue UI compatibility twin as retired under CP-037 after its recorded parity disposition plus per-file, aggregate, and barrel zero-consumer checks.',
  }],
  ['components/venue/ui/sonner.tsx', {
    owner: 'design-system',
    taskIds: ['DESIGN-029'],
    basis: 'DESIGN-029 explicitly records per-twin parity review, zero-consumer verification, CP-037 authorization, and retirement.',
    deletionExplanation: 'DESIGN-029 records this venue UI compatibility twin as retired under CP-037 after its recorded parity disposition plus per-file, aggregate, and barrel zero-consumer checks.',
  }],
  ['components/venue/ui/table.tsx', {
    owner: 'design-system',
    taskIds: ['DESIGN-029'],
    basis: 'DESIGN-029 explicitly records per-twin parity review, zero-consumer verification, CP-037 authorization, and retirement.',
    deletionExplanation: 'DESIGN-029 records this venue UI compatibility twin as retired under CP-037 after its recorded parity disposition plus per-file, aggregate, and barrel zero-consumer checks.',
  }],
  ['components/venue/ui/toggle-group.tsx', {
    owner: 'design-system',
    taskIds: ['DESIGN-029'],
    basis: 'DESIGN-029 explicitly records per-twin parity review, zero-consumer verification, CP-037 authorization, and retirement.',
    deletionExplanation: 'DESIGN-029 records this venue UI compatibility twin as retired under CP-037 after its recorded parity disposition plus per-file, aggregate, and barrel zero-consumer checks.',
  }],
  ['components/venue/ui/toggle.tsx', {
    owner: 'design-system',
    taskIds: ['DESIGN-029'],
    basis: 'DESIGN-029 explicitly records per-twin parity review, zero-consumer verification, CP-037 authorization, and retirement.',
    deletionExplanation: 'DESIGN-029 records this venue UI compatibility twin as retired under CP-037 after its recorded parity disposition plus per-file, aggregate, and barrel zero-consumer checks.',
  }],
  ['components/venue/ui/use-mobile.tsx', {
    owner: 'design-system',
    taskIds: ['DESIGN-029'],
    basis: 'DESIGN-029 explicitly records this stale-target contract divergence, per-file zero-consumer verification, CP-037 authorization, and retirement.',
    deletionExplanation: 'DESIGN-029 records this boolean-only venue UI twin as retired under CP-037 after preserving its stale-target contract divergence and passing per-file, aggregate, and barrel zero-consumer checks.',
  }],
  ['components/venue/ui/use-toast.ts', {
    owner: 'design-system',
    taskIds: ['DESIGN-004', 'DESIGN-029'],
    basis: 'DESIGN-004 records the canonical hooks/use-toast.ts target and byte-identical comparison; DESIGN-029 records zero-consumer verification, CP-037 authorization, register retirement, and deletion.',
    deletionExplanation: 'DESIGN-029 records this byte-identical venue UI duplicate as retired under CP-037 after matching hooks/use-toast.ts by SHA-256 and cmp, then passing per-file, aggregate, and barrel zero-consumer checks.',
  }],
  ['lib/site-map/access.ts', {
    owner: 'admin',
    taskIds: ['ADMIN-003'],
    basis: 'All current production callers are admin logistics site-map routes, and ADMIN-003 verifies the acting-organization access contract.',
  }],
  ['types/database.types.ts', {
    owner: 'database',
    taskIds: [],
    basis: 'Database decision records explicitly classify this path as the hand-authored application view-model contract, distinct from generated lib/database.types.ts.',
  }],
  ['app/api/analytics/errors/route.ts', {
    owner: 'release',
    taskIds: ['RELEASE-003'],
    basis: 'The release charter owns production observability, and RELEASE-003 owns web error monitoring, elevated-error alerts, release metadata, and staging-soak evidence.',
  }],
  ['app/artist/music/marketplace/layout.tsx', {
    owner: 'release',
    taskIds: ['RELEASE-008'],
    confirmed: true,
    basis: 'RELEASE-008 explicitly owns direct-page enforcement for the launch-disabled music finance offerings capability.',
  }],
  ['app/artist/music/intelligence/layout.tsx', {
    owner: 'release',
    taskIds: ['RELEASE-008'],
    confirmed: true,
    basis: 'RELEASE-008 explicitly owns direct-page enforcement for the launch-disabled music rights intelligence capability.',
  }],
  ['app/rights-intelligence/layout.tsx', {
    owner: 'release',
    taskIds: ['RELEASE-008'],
    confirmed: true,
    basis: 'RELEASE-008 explicitly owns direct-page enforcement for the launch-disabled music rights intelligence capability.',
  }],
  ['app/creator-commons/layout.tsx', {
    owner: 'release',
    taskIds: ['RELEASE-008'],
    confirmed: true,
    basis: 'RELEASE-008 explicitly owns direct-page enforcement for the launch-disabled creator digital commons capability.',
  }],
  ['app/federation/layout.tsx', {
    owner: 'release',
    taskIds: ['RELEASE-008'],
    confirmed: true,
    basis: 'RELEASE-008 explicitly owns direct-page enforcement for the launch-disabled creator federation capability.',
  }],
  ['app/cooperative/layout.tsx', {
    owner: 'release',
    taskIds: ['RELEASE-008'],
    confirmed: true,
    basis: 'RELEASE-008 explicitly owns direct-page enforcement for the launch-disabled creator cooperative capability.',
  }],
  ['app/interop-convention/layout.tsx', {
    owner: 'release',
    taskIds: ['RELEASE-008'],
    confirmed: true,
    basis: 'RELEASE-008 explicitly owns direct-page enforcement for the launch-disabled creator interoperability convention capability.',
  }],
  ['app/public-infrastructure/layout.tsx', {
    owner: 'release',
    taskIds: ['RELEASE-008'],
    confirmed: true,
    basis: 'RELEASE-008 explicitly owns direct-page enforcement for the launch-disabled creator public infrastructure capability.',
  }],
  ['app/treaty-operations/layout.tsx', {
    owner: 'release',
    taskIds: ['RELEASE-008'],
    confirmed: true,
    basis: 'RELEASE-008 explicitly owns direct-page enforcement for the launch-disabled creator multilateral treaty operations capability.',
  }],
  ['app/interop-institution/layout.tsx', {
    owner: 'release',
    taskIds: ['RELEASE-008'],
    confirmed: true,
    basis: 'RELEASE-008 explicitly owns direct-page enforcement for the launch-disabled creator interoperability institution capability.',
  }],
  ['app/interop-organization/layout.tsx', {
    owner: 'release',
    taskIds: ['RELEASE-008'],
    confirmed: true,
    basis: 'RELEASE-008 explicitly owns direct-page enforcement for the launch-disabled creator interoperability organization capability.',
  }],
  ['app/protocol-constitution/layout.tsx', {
    owner: 'release',
    taskIds: ['RELEASE-008'],
    confirmed: true,
    basis: 'RELEASE-008 explicitly owns direct-page enforcement for the launch-disabled creator protocol constitution capability.',
  }],
  ['app/treaty-legacy/layout.tsx', {
    owner: 'release',
    taskIds: ['RELEASE-008'],
    confirmed: true,
    basis: 'RELEASE-008 explicitly owns direct-page enforcement for the launch-disabled creator treaty system legacy capability.',
  }],
  ['app/treaty-renewal/layout.tsx', {
    owner: 'release',
    taskIds: ['RELEASE-008'],
    confirmed: true,
    basis: 'RELEASE-008 explicitly owns direct-page enforcement for the launch-disabled creator treaty system renewal capability.',
  }],
  ['app/api/events/_lib/event-reference.ts', {
    owner: 'database',
    taskIds: ['DB-009'],
    confirmed: true,
    basis: 'DB-009 explicitly owns the shared artist_events/events/events_v2 identity, lookup, projection, and access compatibility contract without expanding DB-006.',
  }],
  ['__tests__/events/event-reference-contract.test.ts', {
    owner: 'database',
    taskIds: ['DB-009'],
    confirmed: true,
    basis: 'DB-009 explicitly requires the exact importer matrix and fail-closed identity/access contract verification implemented by this focused test.',
  }],
  ['__tests__/events/event-actions-authorization.test.ts', {
    owner: 'organization',
    taskIds: ['ORG-006'],
    confirmed: true,
    basis: 'ORG-006 explicitly requires per-export lifecycle disposition and cross-tenant authorization verification for the organization-scoped event actions covered by this test.',
  }],
  ['__tests__/uploads/private-docs-signed-url.test.ts', {
    owner: 'general-user',
    taskIds: ['USER-006'],
    confirmed: true,
    basis: 'USER-006 explicitly requires authentication, cross-user prefix, traversal, expiry, limiter, bucket, and credential-leakage verification for the retained private-docs signer.',
  }],
  ['app/api/upload/signed-url/route.ts', {
    owner: 'general-user',
    taskIds: ['USER-006'],
    confirmed: true,
    basis: 'USER-006 explicitly owns the zero-caller private-docs signer adoption-or-authorized-retirement decision and its user privacy boundary.',
  }],
  ['app/events/_actions/event-actions.ts', {
    owner: 'organization',
    taskIds: ['ORG-006'],
    confirmed: true,
    basis: 'ORG-006 explicitly owns the organization-scoped event, calendar, status, and hold action disposition while preserving object-level authorization.',
  }],
  ['lib/services/organization-social-integrations.service.ts', {
    owner: 'admin',
    taskIds: ['INTG-007'],
    confirmed: true,
    basis: 'INTG-007 records the completed admin handoff: this shared Content Hub service now selects encrypted envelope fields without legacy plaintext token columns.',
  }],
  ['app/lib/actions/contracts.actions.ts', {
    owner: 'artist',
    taskIds: ['ARTIST-003'],
    confirmed: true,
    basis: 'ARTIST-003 reverified the artist contract-signing UI and corrected this shared contract action so metadata conforms to the generated Supabase Json type used by the signing flow.',
  }],
  ['components/layout/app-chrome.tsx', {
    owner: 'design-system',
    taskIds: ['DESIGN-035'],
    confirmed: true,
    basis: 'DESIGN-035 owns the shared mobile chrome; its checkpoint-verified scope adds compact phone header, five-action bottom navigation, and matching content/player spacing exactly as this diff implements with showMobileAppNav padding and root-route main handling.',
  }],
  ['components/marketing/landing-hero-auth.tsx', {
    owner: 'design-system',
    taskIds: ['DESIGN-035'],
    confirmed: true,
    basis: 'DESIGN-035 names this file in its working set and owns presentation-only responsive options for the embedded auth card at phone widths.',
  }],
  ['components/marketing/tourify-landing-page.tsx', {
    owner: 'design-system',
    taskIds: ['DESIGN-035'],
    confirmed: true,
    basis: 'DESIGN-035 names this file in its working set and owns the public root landing hierarchy, compact layout, and CTA cleanup.',
  }],
  ['components/nav.tsx', {
    owner: 'design-system',
    taskIds: ['DESIGN-035'],
    confirmed: true,
    basis: 'DESIGN-035 owns the shared authenticated mobile chrome; its checkpoint-verified scope adds a compact phone header and five-action bottom navigation matching the mobileItemClass and bottom-nav changes in this diff.',
  }],
])

const unresolvedHandoffs = new Map([])

function classifyOwner(file) {
  const agentDoc = file.match(/^docs\/engineering\/agents\/([^/]+)\//)
  if (agentDoc) return agentDoc[1]
  for (const [owner, pattern] of ownerRules) if (pattern.test(file)) return owner
  return null
}

function exactTaskIds(file) {
  const ids = []
  for (const id of taskById.keys()) {
    if (file.includes(`/${id}.json`) || file.includes(`/${id}.md`)) ids.push(id)
  }
  return ids
}

function parseStatus() {
  const raw = execFileSync(
    'git',
    ['status', '--porcelain=v1', '-z', '--untracked-files=all'],
    { cwd: ROOT, encoding: 'utf8' },
  )
  const tokens = raw.split('\0').filter(Boolean)
  const rows = []
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index]
    const status = token.slice(0, 2)
    const file = token.slice(3)
    const row = { status, path: file }
    if (status.includes('R') || status.includes('C')) row.original_path = tokens[++index]
    rows.push(row)
  }
  return rows.sort((left, right) => left.path.localeCompare(right.path))
}

const scanExclusions = [
  ['generated-evidence', /^(?:\.activation-evidence|\.g1-evidence|audit-artifacts|test-results)\//],
  ['dependency-or-vcs', /^(?:node_modules|\.git)\//],
  ['generated-binary', /\.(?:xlsx|png|jpe?g|gif|webp|pdf|zip|gz|mp4|mov|mp3|woff2?)$/i],
  ['lockfile', /(?:^|\/)(?:package-lock\.json|pnpm-lock\.yaml|yarn\.lock)$/],
]

const sensitiveRules = [
  ['private-key', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ['aws-access-key', /\bAKIA[0-9A-Z]{16}\b/],
  ['stripe-live-secret', /\b(?:sk|rk)_live_[A-Za-z0-9]{16,}\b/],
  ['github-token', /\b(?:ghp|gho|ghu|ghs|github_pat)_[A-Za-z0-9_]{20,}\b/],
  ['openai-secret', /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/],
  ['jwt-like-token', /\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\b/],
]

function scanFile(file) {
  const absolute = path.join(ROOT, file)
  for (const [reason, pattern] of scanExclusions) if (pattern.test(file)) return { excluded: reason }
  let stats
  try {
    stats = statSync(absolute)
  } catch {
    return { excluded: 'missing-or-deleted' }
  }
  if (!stats.isFile()) return { excluded: 'not-a-file' }
  if (stats.size > MAX_SCAN_BYTES) return { excluded: 'over-size-limit' }
  const buffer = readFileSync(absolute)
  if (buffer.includes(0)) return { excluded: 'binary-content' }
  const source = buffer.toString('utf8')
  const categories = sensitiveRules.filter(([, pattern]) => pattern.test(source)).map(([name]) => name)
  return { categories }
}

const rows = parseStatus()
const findings = []
const exclusionCounts = {}
const entries = rows.map((row) => {
  const evidence = pathEvidence.get(row.path)
  const activeTaskMove = row.path.match(/^docs\/engineering\/tasks\/active\/([^/]+)\.json$/)
  const movedTask = activeTaskMove ? taskById.get(activeTaskMove[1]) : undefined
  const completedTaskMove = row.status.includes('D') && movedTask?.status === 'completed'
  const pendingHandoffMove = row.path.match(/^docs\/engineering\/handoffs\/pending\/([^/]+)\.json$/)
  const completedHandoffPath = pendingHandoffMove
    ? path.join(ROOT, 'docs/engineering/handoffs/completed', `${pendingHandoffMove[1]}.json`)
    : null
  const movedHandoff = row.status.includes('D') && completedHandoffPath && existsSync(completedHandoffPath)
    ? JSON.parse(readFileSync(completedHandoffPath, 'utf8'))
    : undefined
  const completedHandoffMove = movedHandoff?.id === pendingHandoffMove?.[1]
    && movedHandoff?.status === 'completed'
    && taskById.has(movedHandoff?.task_id)
  const owner = evidence?.owner ?? (completedTaskMove ? movedTask.owner_agent : classifyOwner(row.path))
  const exact = exactTaskIds(row.path)
  const candidates = exact.length
    ? exact
    : evidence
      ? evidence.taskIds
      : completedHandoffMove
        ? [movedHandoff.task_id]
      : owner
        ? (tasksByOwner.get(owner) ?? [])
        : []
  const deleted = row.status.includes('D')
  const scan = deleted ? { excluded: 'missing-or-deleted' } : scanFile(row.path)
  if (scan.excluded) exclusionCounts[scan.excluded] = (exclusionCounts[scan.excluded] ?? 0) + 1
  if (scan.categories?.length) findings.push({ path: row.path, categories: scan.categories })
  return {
    ...row,
    owner_agent: owner,
    candidate_task_ids: candidates,
    // A clear path-domain match remains useful candidate routing evidence even
    // when that domain currently has no non-completed task. Empty task IDs are
    // not confirmation; the owning domain must still accept the path.
    ownership_status: exact.length || evidence?.confirmed || completedHandoffMove ? 'task-record' : owner ? 'candidate' : 'unresolved',
    ownership_basis: evidence?.basis ?? (completedTaskMove
      ? `${movedTask.id} completed with acceptance and verification evidence; the active-path deletion is paired with its completed task record.`
      : completedHandoffMove
        ? `${movedHandoff.id} moved from pending to completed with a resolved handoff record for ${movedHandoff.task_id}.`
      : undefined),
    unresolved_handoff: owner ? undefined : unresolvedHandoffs.get(row.path),
    deletion_explanation: deleted
      ? (evidence?.deletionExplanation ?? (completedTaskMove
          ? `${movedTask.id} moved from active to completed after its recorded acceptance criteria and verification passed.`
          : completedHandoffMove
            ? `${movedHandoff.id} moved from pending to completed after its recorded resolution and verification; the completed handoff preserves the record.`
          : null))
      : undefined,
  }
})

const countBy = (values) => Object.fromEntries(
  [...values.reduce((counts, value) => counts.set(value, (counts.get(value) ?? 0) + 1), new Map())]
    .sort(([left], [right]) => String(left).localeCompare(String(right))),
)

const manifest = {
  schema_version: '1.0',
  generated_at: new Date().toISOString(),
  base_sha: git(['rev-parse', 'HEAD']),
  source: 'git status --porcelain=v1 -z --untracked-files=all',
  policy: {
    authority: 'candidate routing evidence only; task owners must confirm before curation',
    no_cleanup_authorized: true,
    secret_scan_reports_values: false,
    max_scanned_file_bytes: MAX_SCAN_BYTES,
  },
  summary: {
    total_entries: entries.length,
    by_status: countBy(entries.map((entry) => entry.status)),
    by_owner: countBy(entries.map((entry) => entry.owner_agent ?? 'unresolved')),
    by_ownership_status: countBy(entries.map((entry) => entry.ownership_status)),
    deleted_without_explanation: entries.filter((entry) => entry.status.includes('D') && !entry.deletion_explanation).length,
  },
  secret_scan: {
    finding_count: findings.length,
    findings,
    exclusion_counts: exclusionCounts,
  },
  entries,
}

mkdirSync(path.dirname(OUTPUT), { recursive: true })
writeFileSync(OUTPUT, `${JSON.stringify(manifest, null, 2)}\n`)
console.log(JSON.stringify({ output: path.relative(ROOT, OUTPUT), ...manifest.summary, secret_scan: manifest.secret_scan }, null, 2))
