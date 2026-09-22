# QA-004 thin pilot: one event, one paid item, one worker shift

Status: prepared, **not run**. This script is for one isolated staging deployment and one campaign. It precedes the 718-row coverage campaign and does not certify ticketing, mobile, or the full event and tour lifecycle.

## Entry gate: record evidence before any hosted mutation

1. **RELEASE-007 / QA-003:** Record full 40-character source SHA, staging URL, Vercel-generated deployment ID, release headers observed at the deployment URL and `demo.tourify.live`, separate production deployment ID, distinct staging and production Supabase project origins, scoped secret inventory, and the matching staging deployment evidence artifact. A hostname or local HEAD is insufficient. The deployed SHA must contain the pilot product repairs.
2. **DB-008 / DB-002:** Record the exact staging migration-history reconciliation and schema/type evidence, then the critical anonymous and wrong-tenant denial probes on that staging project. Keep migration applications manual and additive. Record the DB-010 worker-action migration checksum, hosted application, catalog postflight, and distinct-worker, manager, and foreign-tenant denial probes before enabling WORK-006.
3. **Payments:** Record the staging health header showing Stripe `test` mode and protected `sk_test_` configuration. Use a test card only. Confirm the same deployment hosts the checkout return and webhook.
4. **QA-005 actors:** After gates 1–3 pass, provision a fresh `SIM-YYYYMMDD-##` campaign with `npm run qa:simulation:provision -- --campaign-id <id> --manifest <protected absolute path>`. Retain the non-secret manifest, collision-preflight result, and protected login references. The provisioner creates Auth identities only. Establish artist, organizer, worker, and customer app roles and organization membership through supported UI flows; record each step. Do not grant the admin candidate a privilege for this pilot.
5. **QA-006:** Record iOS and Android preview build IDs, their exact staging API target, and the mobile gate output before the first pilot login. The first thin pilot executes web rows only; no mobile row passes without device observations.

Stop before actor login if any entry gate is missing or contradictory. If a required action is unavailable after login, record a blocked finding and stop the dependent chain. Never create a final state through an API or fixture and call the UI step passed.

## Actor key translation

The runbook's display aliases map to QA-005 manifest keys as follows: `sim-artist-01` → `artist-owner`; `sim-customer-01` → `customer-01`; `sim-org-manager-01` → `organization-manager`; `sim-worker-01` → `worker-01`; `sim-venue-manager-01` → `venue-manager`; `sim-foreign-org-manager-01` → `second-tenant-manager`. Use the manifest IDs as authority. The alias is only a report label.

## Web pilot sequence

Use one campaign-tagged artist profile, merchandise item, event, job, application, hire, shift, and order. Navigate from visible UI entry points on the recorded SHA. Route paths below are hints to locate the action; capture the actual route and navigation in evidence. At every handoff, log out or isolate the browser session, sign in as the receiver, and verify the persisted state after reload.

| # | Actor and UI action | Receiving-side proof | Coverage / linked task |
| --- | --- | --- | --- |
| 1 | `artist-owner`: complete artist profile, publish discoverable music/post and one test-priced merch item from the artist workspace. | `customer-01` finds the exact campaign artist and item in discovery; record artist/item IDs. | `ART-04`; QA-004 |
| 2 | `customer-01`: follow the artist from the profile, reload, retry follow once, then buy the merch item through Stripe test checkout. | Artist sees one new follower and one order; customer sees paid confirmation and purchase history after return/reload. Capture before/after counts and one notification if exposed. Wrong buyer cannot open the order. | `GEN-04`, `GEN-07`; `SOCIAL-005`, `MKT-005` |
| 3 | `organization-manager`: create and publish one campaign event through organizer UI, associating the artist and venue where the product supports it. | Artist/venue see the associated request or event, and customer can find the published event. Record event ID and publication state. | `ORG-06`; QA-004 |
| 4 | `organization-manager` or scoped `venue-manager`: publish one campaign job for that event. | `worker-01` finds the job on the job board; record job ID, manager tenant, and event association. | `ORG-07`; `WORK-005` |
| 5 | `worker-01`: apply to the job, then complete the supported onboarding steps after the manager advances the application. | Manager sees the application and completed onboarding under the same worker and job IDs; record any invitation token only in protected evidence. | `WRK-02`, `WRK-03`; `WORK-005` |
| 6 | Manager: hire the applicant and schedule one event shift through the UI. | Worker sees the same canonical staff membership, shift ID, time, event, and assignment after reload. | `ORG-08`; `WORK-005` |
| 7 | `worker-01`: confirm the assignment, acknowledge the packet if exposed, check in, and check out through Work Mode. | Manager attendance view shows the same ordered events and completed shift; worker history persists after reload. A foreign-tenant manager and another worker cannot read or act on it. | `WRK-05`; `DB-010`, `WORK-006` |
| 8 | Manager: verify attendance and complete the event through the supported UI. | Artist, venue, and worker views show the final event/shift state after reload; record any finance/settlement view as observation only unless a real test-mode transaction created it. | `ORG-10`; QA-004 |

Do not infer ticket purchase, QR scan, refund, settlement, or tour success from this merch-and-shift pilot. They remain separately required by `TICKET-005` and the full QA-004 run.

## First-run coverage subset

The 25 exact web rows, in execution order, are recorded in [the pilot row sheet](../audits/flow-notes/agent-user-simulation-pilot-rows.csv). The 718-row master coverage CSV remains authoritative; all 25 selected rows and all other rows are `not_run` and `needs_ui_confirmation`. Classify a row as shipped only after the actual deployed UI entry point is observed. Do not convert a gate hold into a row-level `blocked` attempt without a campaign ID, exact deployed SHA, actor ID, before/after states, and observation evidence.

| Phase | Row IDs | Receiving-side check |
| --- | --- | --- |
| Artist publish | `ART-01-WEB-SUCCESS`, `ART-04-WEB-SUCCESS`, `ART-06-WEB-SUCCESS` | Customer sees the exact campaign artist, music/post, and merch item. |
| Customer follow and test purchase | `GEN-03-WEB-SUCCESS`, `GEN-04-WEB-SUCCESS`, `GEN-04-WEB-CANCEL_OR_RETRY`, `GEN-04-WEB-PERSISTENCE`, `GEN-07-WEB-SUCCESS`, `GEN-07-WEB-PERSISTENCE`, `GEN-07-WEB-UNAUTHORIZED` | Artist sees one follower and one order; buyer sees the paid order after reload; wrong buyer is denied. |
| Event and job | `ORG-01-WEB-SUCCESS`, `ORG-06-WEB-SUCCESS`, `ORG-07-WEB-SUCCESS` | Artist/customer see published event; worker sees its job. |
| Worker application and onboarding | `WRK-01-WEB-SUCCESS`, `WRK-02-WEB-SUCCESS`, `WRK-03-WEB-SUCCESS` | Manager sees the same worker, application, and completed onboarding. |
| Hire and schedule | `ORG-08-WEB-SUCCESS`, `WRK-04-WEB-SUCCESS` | Worker sees the assigned shift after reload. |
| Attendance | `WRK-05-WEB-SUCCESS`, `WRK-05-WEB-PERSISTENCE`, `WRK-05-WEB-UNAUTHORIZED`, `FOREIGN-01-WEB-UNAUTHORIZED`, `WRK-06-WEB-SUCCESS` | Manager sees ordered check-in/out events; worker sees history; unrelated actors are denied. |
| Verify and close | `ORG-10-WEB-SUCCESS`, `ORG-10-WEB-PERSISTENCE` | Manager verifies attendance and closes event; worker and artist see final state after reload. |

### Required evidence packet

Before the first login, attach the RELEASE-007 staging deployment artifact and independent production comparison; QA-003 exact-SHA health probe; DB-008 hosted migration/schema ledger; DB-002 anonymous and wrong-tenant denial results; DB-010 hosted checksum, postflight, worker-action denial results, and WORK-006 flag state; protected Stripe test-mode confirmation; QA-005 collision preflight, protected actor references, and non-secret manifest; and QA-006 iOS/Android build IDs, API target, and gate output. The thin web run does not mark mobile rows passed, but the campaign's mobile gate must be recorded before expansion.

For every attempted row, retain a timestamped UI screenshot or trace showing the actual route and action, campaign object IDs, before state and reloaded after state, originating and receiving actor IDs, receiver-side screenshot or trace, and relevant request/order/Stripe test references. Store secrets, invite tokens, payment details, and raw protected traces outside committed reports. Record the artifact paths, deployed SHA, and finding ID in the master coverage CSV. A fixture or API bypass remains labeled `bypassed` and earns no pass.

## Evidence record for each step

Store protected screenshots/traces and redacted request IDs outside committed reports. In the campaign ledger, record: campaign ID; staging URL; full deployed SHA and deployment ID; timestamp; manifest actor key and opaque user ID; actual UI route and action; campaign object IDs; before state; after state after reload; receiver actor and independent receiver evidence; Stripe test session/order reference when applicable; negative-scope result; and `passed`, `blocked`, or `bypassed`. Link each artifact path and finding ID. Never store credentials, full payment details, invite tokens, or personal data in the report. A bypass stays `bypassed` even if later steps appear to work.

## Stop and rerun

For a failure, use stable `SIM-YYYYMMDD-<DOMAIN>-###` IDs, first reusing the existing `SIM-20260922-*` finding when it describes the same failure. Record the exact failure point, expected outcome, observed result, owner task, smallest repair, and the originating and receiving actor rerun. Keep earlier evidence. After a fix, deploy one new exact SHA, recheck all entry gates, and rerun from the earliest affected handoff. Run `npm run qa:simulation:coverage` after ledger edits. The full `qa:simulation:gate` is expected to remain red until every shipped row has evidence.
