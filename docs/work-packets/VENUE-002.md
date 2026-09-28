# Work packet: `VENUE-002`

## Goal

- Goal: Consolidate venue-domain components from the legacy tree into the canonical `app/venue/components/` tree while preserving legacy import paths.
- Out of scope: bulk deletion, the `components/venue/ui/**` primitive tree, admin components, design-system primitives, release/QA work, and migrations.
- Owner/status: `venue` / `active`

## Context

- Affected subsystem: venue operations shell and mobile navigation.
- Routes/components/services: `app/venue/components/operations/venue-operations-shell.tsx`, `app/venue/components/mobile-venue-nav.tsx`, `components/venue/mobile-venue-nav.tsx`.
- References to read first: `docs/DEVELOPMENT_WORKFLOW.md`, `docs/engineering/agents/venue/CHARTER.md`, `docs/engineering/agents/venue/STATE.md`, `docs/engineering/agents/venue/QUESTIONS.md`, `docs/engineering/DECISIONS.md`, `docs/engineering/tasks/active/VENUE-002.json`.
- Known constraints: The worktree is heavily dirty. Preserve unrelated changes. The canonical venue tree is `app/venue/components/`; the old shared path remains as a compatibility boundary during staged consolidation.

## Checklist

- [x] Reproduce or confirm the current behavior
- [x] Implement the smallest scoped change
- [x] Add or update focused checks (no new test needed for a path-preserving re-export)
- [x] Run the selected verification tier
- [x] Record failures and remaining blockers
- [x] State the next task

## Acceptance criteria

- [x] The mobile venue nav has one canonical implementation under `app/venue/components/`.
- [x] The site-map viewer has one canonical implementation under `app/venue/components/`.
- [x] The event delete dialog has one canonical implementation under `app/venue/components/event-details/`.
- [x] The staff scheduler shell has one canonical implementation under `app/venue/components/staff/`.
- [x] The shift templates component has one canonical implementation under `app/venue/components/staff/`.
- [x] The shift requests component has one canonical implementation under `app/venue/components/staff/`.
- [x] The staff shifts panel has one canonical implementation under `app/venue/components/staff/`.
- [x] The role management component has one canonical implementation under `app/venue/components/staff/`.
- [x] The user role assignment component has one canonical implementation under `app/venue/components/staff/`.
- [x] Existing imports from the moved legacy paths remain compatible.

## Verification

- Tier: `fast`
- Commands: focused ESLint for the moved mobile-nav and site-map files; `npm run verify:fast -- --changed`; `NODE_OPTIONS=--max-old-space-size=8192 ./node_modules/.bin/tsc --noEmit --pretty false`.
- Evidence: focused ESLint passed. The fast wrapper exited 2 on the pre-existing missing `components/ui/use-mobile.tsx`. The larger-heap type check produced no diagnostics before exceeding the bounded verification window and was interrupted.

## Handoff

- Changed areas: canonical mobile venue nav, site-map viewer, event delete dialog, staff scheduler shell, shift templates, shift requests, staff shifts panel, role management, and user role assignment implementations; canonical route/page imports; legacy compatibility exports; and this packet.
- Failures and pre-existing failures: focused lint passed; fast wrapper failure is pre-existing dirty-tree input; typecheck was resource/time-limited without diagnostics.
- Blockers: Full dual-tree deletion is intentionally deferred because this bounded task prohibits bulk deletion.
- Next action: verify the canonical import and update the task record/state.
