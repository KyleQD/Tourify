# World Incident Response & Kill-Switch Runbook — v1.0 (P24-T10)

## Kill switches (single-move, per surface)

| Switch | Effect | Where |
|---|---|---|
| `WORLD_MUSIC_SEED_PREVIEW_ENABLED=false/absent` | Every public World surface 404s: globe, viewport, place APIs, console | all routes gate on this flag |
| `WORLD_INGEST_KILLED=true` | All provider collection stops at runner entry | runner + `providerEnabled()` |
| `WORLD_INGEST_<PROVIDER>_ENABLED=false` | Per-provider collection stops | same |
| Feature rollout flags (`WORLD_PLAYBACK_*`) | Playback kinds disable; resolver fails closed to 403 | `lib/playback/flags.ts` |

## Incident playbook

### 1. Location leakage suspected
1. Flip `WORLD_MUSIC_SEED_PREVIEW_ENABLED` off (public surface dark).
2. Audit recent writes: `world_playback_events` (coarse only), passport entries are owner-scoped by RLS — verify no policy drift with the RLS sweep query (see `raw/rls_sweep.txt`).
3. If a table exposed data publicly, revoke its read policy via emergency migration; never widen RLS to "fix" tests.
4. Post-mortem appended to DECISION_LOG before re-enabling.

### 2. Provider rights problem
1. Set the provider's ingest flag false (collection stops).
2. Console → Radio: set affected stations `rights_status=retired` (forces playback ineligible — rights ceiling is enforced in `applyRadioRightsUpdate`).
3. Verify no raw stream URLs exist in payloads (structural check: playlist/telemetry validators reject URLs).

### 3. Bad canonical publication
1. Console → Inbox/Radio: retire or revert-by-supersede (published rows are never edited; corrections supersede).
2. Every step lands in the hash-chained audit log; Quality page recomputes chain integrity — a broken chain indicates tampering and freezes trust.
3. Appeals queue (`world_ranking_appeals`) triaged after containment.

### 4. Editorial tampering detected
Quality page shows `TAMPERING DETECTED at <hash>`. Freeze mutations by revoking `world.knowledge.review` for affected accounts (platform RBAC, separate from org roles), preserve DB snapshots, escalate per security policy.

## Standing guarantees (verified)
- RLS enabled on every World table; staging tables intentionally carry ZERO policies = deny-by-default (trusted server path only). Sweep evidence: `raw/rls_sweep.txt`.
- Advisor lint (error level): 0 findings in World scope; 11 inherited non-World findings tracked by owning workstreams (`raw/lint_classification.txt`).
- No public API exposes raw listener IP/exact coordinates/private locations/protected stream URLs/unpublished claims — structural scrubbers unit-tested (telemetry, search analytics, playlists, atlas demos).
- Privileged logic uses session-scoped `has_global_permission` RPC (SECURITY INVOKER); service-role confined to server-side trusted clients.
