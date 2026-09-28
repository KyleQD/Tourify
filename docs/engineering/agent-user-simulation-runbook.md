# Agent user simulation runbook

## Purpose

Run a continuing, goal-driven simulation in isolated staging. Synthetic app users act as workers, artists, venue managers, organization managers, customers, door/event staff, and Tourify platform admins. They use the product through the UI, record what succeeds or blocks them, and route findings into bounded engineering tasks. Cover every shipped core web, iOS, and Android role journey, including a single event and a multi-stop tour from creation through completion.

This campaign is exploratory product testing. It does not replace QA-003 launch certification.

## Hard rules

- Use isolated staging only. Record the staging URL and deployed commit before a run starts.
- Prove deployment, Supabase project, credentials, and payment provider isolation from production before any live mutation. `demo.tourify.live` must not be assumed safe from its hostname; RELEASE-007 records that it shared a production deployment at the last audit.
- Use campaign-owned synthetic accounts only. Store credentials in protected secrets, not in reports.
- Do not reset, delete, truncate, or destructively clean any database.
- Do not run production payments. Use payment provider test mode only.
- Apply required schema changes only through the repository's manual additive migration process.
- Do not reuse seed scripts until their behavior is checked. The current West Coast cast seed updates passwords and metadata for matching users, so it needs a campaign-safe guard or replacement before live use.
- Treat engineering service identities as attribution and automation identities only where routes explicitly support them. Product journeys use synthetic app logins.
- Do not grant platform admin access because an engineering agent is named `admin`. Platform admin and organization or venue manager are separate actors.
- Label every API or fixture bypass. A seeded final state does not count as a passed UI journey.
- Keep each campaign's records as evidence. Never reset, truncate, delete, or reuse an untagged actor. Cancellation, refund, and other state changes may affect campaign-owned records through supported product flows in test mode only.
- For mobile, use iOS and Android preview builds bound to the same recorded staging release. A web-only action exposed in mobile must have a working, clearly explained path; otherwise file a finding.

## Campaign header

Fill this table before each run.

| Field | Value |
| --- | --- |
| Campaign ID | `SIM-YYYYMMDD-##` |
| Environment | Isolated staging |
| Base URL | Pending |
| Deployed commit | Pending |
| Staging deployment ID and Supabase project ref | Pending; verify both differ from production |
| Schema/migration evidence | Pending; DB-008 and DB-002 probes required |
| Payment mode | Test mode only |
| iOS / Android preview build IDs and API target | Pending for mobile runs |
| Fixture mode | Additive, campaign-owned records only |
| Credential store | Protected secrets; never commit credentials |
| Evidence folder | `docs/audits/flow-notes/` |
| Summary file | `docs/audits/flow-notes/agent-user-simulation-campaign.md` |
| Owning task | `docs/engineering/tasks/active/QA-004.json` |

## Actor roster

Create or verify these campaign-owned accounts. Prefix emails and seeded record names with the campaign ID when possible.

| Actor key | Product role | Required app capability | Notes |
| --- | --- | --- | --- |
| `sim-worker-01` | Worker | General user plus work profile, skills, availability, applications, onboarding, shifts | Must be able to act without employer privileges. |
| `sim-worker-02` | Worker | Alternative availability and failed/cancelled application paths | Use for retry and edge scenarios. |
| `sim-artist-01` | Artist owner | Artist profile, EPK, music, posts, tickets, merch, bookings | Starts the pilot chain by publishing a real discoverable surface. |
| `sim-artist-02` | Artist collaborator | Artist or collaborator account | Tests band/collaborator boundaries. |
| `sim-venue-manager-01` | Venue manager | Venue profile, kit, availability, booking operations, staff needs | Distinct from platform admin. |
| `sim-org-manager-01` | Organization manager | Tour/event creation, booking, jobs, hiring, shifts, onboarding | Distinct from platform admin. |
| `sim-platform-admin-01` | Tourify platform admin | Oversight, moderation, support, audit workflows | QA-005 creates an unprivileged candidate; grant this role only through the supported separately verified admin workflow. |
| `sim-customer-01` | Customer/general user | Discovery, follows, messages, test ticket or merch purchase, orders, settings | Must not receive creator or admin capabilities. |
| `sim-customer-02` | Customer/general user | Empty, cancellation, refund, or failed payment paths where supported | Use for alternative commerce paths. |
| `sim-door-staff-01` | Door/event staff | Ticket scan, guest list, event-day operations | Scoped to campaign event; no platform admin privilege. |
| `sim-foreign-org-manager-01` | Other-tenant manager | Cross-tenant denial probes | Owns a separate campaign organization. |
| `sim-foreign-venue-manager-01` | Other-venue manager | Booking and venue-scope denial probes | Owns a separate campaign venue. |

## Execution phases

1. Prepare environment: verify RELEASE-007 isolation, exact deployed SHA, DB-008 ledger, DB-002 denial probes, Stripe test mode, protected credentials, and no pending destructive maintenance. Stop live mutation if any proof is missing.
2. Inventory the shipped UI: inspect navigation and feature flags on web and both preview builds. Classify every candidate row in `docs/audits/flow-notes/agent-user-simulation-coverage.csv` as shipped, disabled, or unavailable with evidence. A route file by itself does not prove a feature is shipped.
3. Provision actors additively with the campaign-safe provisioner (QA-005): create only campaign-owned identities and records, refuse ambiguous existing users, and record actor IDs and non-secret metadata.
4. Pilot the dependent artist → customer → organizer/venue → worker → manager → door staff chain through the UI. Verify both sides of each handoff.
   The eight-step web-first pilot and its preflight evidence checklist are in [QA-004 thin pilot](qa004-thin-pilot.md).
5. Run one complete single-event production, then a multi-stop tour. Exercise the first, middle, and final stops end to end; inspect schedule, booking, staffing, ticketing, and completion for every stop. Include one date/venue revision and one cancelled or failed action without corrupting later stops.
6. Expand every shipped core coverage row across success, empty, validation, cancellation/retry, notification, persistence, accessibility, responsive/native, and unauthorized scenarios where applicable.
7. Triage findings and route bounded tasks. Domain agents implement them under their own task records and verification tiers; QA-004 remains the simulation and evidence owner.
8. Rerun originating and receiving actors on the new staging SHA after each fix. Retain old evidence and update the learning ledger; reopen regressions.

## Failure loop

Every simulation agent uses this loop for each actor goal.

1. Attempt the goal through the UI.
2. If the goal is blocked, record the exact failing step and evidence.
3. Define the optimal user outcome in plain product terms.
4. Classify the issue as defect, missing capability, design gap, harness gap, or environment blocker.
5. Propose the smallest fix plan with owner domain, affected surface, acceptance criteria, and verification.
6. Link to an existing task or add a recommended task entry in the campaign report.
7. Mark the scenario as blocked, bypassed, unavailable, ready for rerun, or verified.
8. Rerun after the fix and retain both old and new evidence.

An agent must never stop at "blocked." A blocked result requires a fix packet that explains where the roadblock happened, what the actor was trying to achieve, what should have happened, what prevented it, what fix is necessary, and what rerun proves the fix.

## Agent workflow

Every simulation agent starts by reading:

- `docs/engineering/agent-user-simulation-runbook.md`
- `docs/audits/flow-notes/agent-user-simulation-campaign.md`
- `docs/engineering/tasks/active/QA-004.json`
- The assigned domain charter and state under `docs/engineering/agents/`

Assign one bounded journey per agent:

| Journey | Primary owner | Output required |
| --- | --- | --- |
| Worker | `work` | Journey result plus fix packets for profile, search, apply, onboarding, schedule, shift, and history failures. |
| Artist | `artist` | Journey result plus fix packets for brand, EPK, collaborator, music, merch, ticket, booking, press, and analytics failures. |
| Venue manager | `venue` | Journey result plus fix packets for profile, kit, availability, booking, staff, schedule, and visibility failures. |
| Organization manager | `organization` | Journey result plus fix packets for tour/event, discovery, booking, job, applicant, hire, onboarding, and shift failures. |
| Platform admin | `admin` | Journey result plus fix packets for oversight, moderation, support, audit, and capability-boundary failures. |
| Customer/general user | `general-user` | Journey result plus fix packets for discovery, follow, message, purchase, ticket/order, and settings failures. |
| Marketplace/ticketing | `marketplace` / `ticketing` | Journey result plus fix packets for checkout, order, ticket, wallet, transfer, door, refund, settlement, and payout failures. |
| Music/social/content | `music` / `social` | Journey result plus fix packets for music publishing/playback, posts, messages, follows, notifications, and outsider-denial failures. |
| Auth/database boundary | `database` / `qa` | Journey result plus fix packets for RLS, migration, identity, fixture, and cross-account denial failures. |

Each agent returns two outputs:

- Journey result: passed, blocked, bypassed, unavailable, or not run.
- Fix packet: one packet for every blocked or failed step.

The orchestrator consolidates agent outputs into campaign findings, the follow-up task table, the actor matrix status, the learning ledger, and the next-run priority list.

## Dependency chain

Run scenarios in this order so one actor creates real inputs for the next actor.

| Step | Origin actor | Expected receiving actor or surface |
| --- | --- | --- |
| Artist creates brand, EPK, music, posts, tickets, and merch | Artist | Customer discovery, organization booking, venue booking |
| Customer follows, messages, and buys test-mode ticket or merch | Customer | Artist analytics/orders/ticketing |
| Organization creates event or tour and discovers artist or venue | Organization manager | Artist or venue booking request |
| Venue manager handles availability, booking, and staff needs | Venue manager | Organization manager and worker job board |
| Organization or venue publishes work | Organization or venue manager | Worker job discovery |
| Worker applies and completes onboarding | Worker | Hiring manager applicant and onboarding views |
| Manager hires, schedules, and manages shifts | Organization or venue manager | Worker schedule and work history |
| Worker confirms, checks in/out, and completes shift | Worker | Manager operations and worker history |
| Platform admin reviews legitimate oversight workflows | Platform admin | Audit/support/moderation records |

## Event and tour production scripts

Run both scripts with campaign-owned records created through the current UI. Follow the product's actual navigation; record the route and any missing action instead of inventing a shortcut.

| Stage | Acting personas | Required receiving-side proof |
| --- | --- | --- |
| Identity and discovery | Customer, artist owner/collaborator, venue, organizer | Profiles, EPK/kit, search, follow, and messages appear to the intended other actor. |
| Plan | Organizer, artist, venue | Event/tour, stops, dates, holds, booking requests, collaborators, budget, logistics, and revisions persist and are scoped correctly. |
| Publish and sell | Organizer, artist, customer | Public pages and promotions appear; test-mode tickets/merch create buyer receipts, seller orders, inventory changes, and notifications. |
| Staff and prepare | Venue/org manager, worker | Job, application, hire, onboarding, canonical staff row, shift, schedule, and communications agree across accounts. |
| Execute | Manager, worker, door staff, customer | Event HQ, check-in/out, wallet, guest list, scan/admission, and incident or change status agree across accounts. |
| Close | Organizer, venue, artist, worker, customer | Completion, work history, supported cancellation/refund, reconciliation/settlement views, reporting, and retained records agree. |

For the multi-stop tour, use at least three stops. Execute the first, middle, and final stops fully and inspect the state of every stop. Record the campaign IDs of all events, stops, bookings, jobs, shifts, orders, tickets, and incidents used in handoffs. A fixture-created intermediate state is a bypass, not a completed UI journey.

## Coverage ledger contract

`docs/audits/flow-notes/agent-user-simulation-coverage.csv` is the durable row-level inventory. Each row represents one persona × goal × platform × scenario. The initial rows are candidates based on existing UI route evidence, not a claim that the action is enabled or works. Before execution, QA records the visible entry point and changes `shipping_state` to `shipped`, `disabled`, or `unavailable` with evidence. Add rows when navigation or feature inspection reveals another shipped action; never delete old run evidence.

Use `not_run`, `passed`, `blocked`, `bypassed`, or `not_applicable` for `status`. `not_applicable` and a disabled capability require evidence, `scope_decision_task`, and `scope_approver`; `bypassed` can never satisfy a completion gate. An unavailable capability remains unresolved. Populate `campaign_id`, `deployed_sha`, `actor_ids`, `before_state`, `after_state`, `evidence`, and `finding_id` after an attempt. A cross-actor pass also needs `receiver_evidence`. Record web mobile-width checks separately from iOS and Android native preview runs. QA-006 owns the mobile preview contract; QA-003 remains the separate exact-SHA web launch certification.

Run `npm run qa:simulation:coverage` after ledger edits. Run `npm run qa:simulation:gate` only to evaluate the final row-level completion gate; it is expected to fail while shipped journeys are unrun. The mobile evidence gate is `npm run simulation:gate` from `apps/mobile` with a protected manifest, results file, and evidence directory.

Use a new campaign ID and new records for a new full run. For fix reruns, append evidence to the prior finding and update its row, retaining the earlier evidence in the per-run note. Do not replace a failed observation with an unexplained pass.

## Journey matrix

| Actor | Goals to attempt |
| --- | --- |
| Worker | Create and edit profile, skills, availability; find and filter jobs; apply and track status; message employer; accept hiring and onboarding; view, confirm, change, and complete shifts; check in/out; inspect schedule and work history. |
| Artist | Build public identity and brand; manage band and collaborators; create EPK and press material; upload and publish music; promote posts and appearances; manage bookings, events, tickets, merchandise, storefront, orders, and available analytics. |
| Venue manager | Complete venue profile and kit; manage availability, inquiries, bookings, event operations, staff needs, scheduling, and venue visibility. |
| Organization manager | Create a tour or event; discover and book artists or venues; publish jobs; review applicants; hire workers; handle onboarding; assign shifts; manage event completion. |
| Platform admin | Use only legitimate oversight, moderation, support, and audit workflows; verify capability boundaries and separation from organization management. |
| Customer/general user | Discover artists and events; follow, message, buy test-mode tickets or merchandise, inspect orders and tickets, and use account settings. |

## Scenario checklist

For each journey row, record whether each scenario is passed, blocked, unavailable, or bypassed.

| Scenario type | Required evidence |
| --- | --- |
| Success path | Intended result is visible to the originating actor and receiving actor where relevant. |
| Empty state | The UI explains what can happen next without fabricated data. |
| Validation failure | Form or action rejects invalid input with recoverable guidance. |
| Cancellation or retry | Actor can back out, retry, or recover without corrupting state. |
| Notification | In-app or configured notification appears where product supports it. |
| Mobile viewport | Journey is usable on mobile width without clipped or overlapping content. |
| Accessibility | Keyboard path, labels, focus, and obvious screen reader affordances are checked where feasible. |
| Unauthorized actor | Wrong actor cannot view or mutate another actor's private data. |
| Persistence | Result remains after reload and appears at the data boundary where verification is available. |

## Finding format

Use stable IDs: `SIM-YYYYMMDD-###`. Add one entry per confirmed defect, missing capability, or design idea.

Required fields:

- Finding ID
- Type: confirmed defect, missing capability, design idea, or test harness gap
- Severity: P0, P1, P2, or P3
- Actor and goal
- Environment and commit
- Starting state
- Exact steps
- Expected result
- Actual result
- Screenshot, trace, log, or data evidence
- Affected route or API
- User impact
- Suspected cause
- Improvement suggestion
- Owner domain
- Linked existing or new task

Fix packet fields:

- Failure point
- Expected optimal outcome
- Necessary fix
- Primary owner
- Secondary collaborators
- Acceptance criteria
- Rerun scenario
- Status: new, routed, fixing, ready for rerun, verified, duplicate, or deferred

Severity guide:

| Severity | Meaning |
| --- | --- |
| P0 | Blocks a core goal, exposes unauthorized data, corrupts money/state, or prevents campaign continuation. |
| P1 | Severe friction, missing required action, or journey requires an API/fixture bypass. |
| P2 | Confusing flow, weak feedback, non-blocking persistence issue, or avoidable support load. |
| P3 | Polish, copy, minor layout, or lower-priority product idea. |

## Evidence files

- Campaign summary: `docs/audits/flow-notes/agent-user-simulation-campaign.md`
- Per-run notes: `docs/audits/flow-notes/agent-user-simulation-{campaign-id}.md`
- Existing starting evidence: `docs/audits/flow-notes/SUMMARY.md`
- Existing West Coast flow instructions: `.agents/flows/west-coast-tour/`

Keep screenshots and traces in the repo's existing audit artifact convention when available. Do not commit credentials, raw tokens, payment secrets, or private customer data.

## Task routing

Before creating a task for a finding, search existing active, blocked, and completed records for the same issue. Link duplicates instead of creating another task.

Routing rules:

- P0 and P1 confirmed defects must link to an active task or receive a recommended new task entry.
- Harness gaps stay under `qa` or `release` until they block a specific product domain.
- Cross-domain failures must name one primary owner and any secondary collaborators.
- Duplicate findings link to the original finding instead of creating another task.
- A finding is not verified until the originating actor and receiving actor can both see the intended result where relevant.
- Implementation belongs in later bounded tasks. QA-004 agents document, route, and define the rerun proof.
- The orchestrator orders prerequisites and names one primary domain owner per finding. Domain fixes must have their own task record, checkpoint, focused tests, and a staging rerun before QA marks a finding verified.
- Prioritize unauthorized access, money or state corruption, and blocked core journeys. Keep environment and fixture blockers visible as tasks; they do not turn a product row into a pass.
- Tie existing launch work to RELEASE-007, DB-008, DB-002, ADMIN-003, MKT-004, TICKET-005, QA-003, and RELEASE-005 rather than creating duplicates.

Suggested owners:

| Finding area | Owner agent |
| --- | --- |
| Platform admin gates, moderation, support, audit | `admin` |
| Artist profile, EPK, collaborators, artist dashboard | `artist` |
| Venue profile, bookings, venue operations | `venue` |
| Organization, tours, membership, tenant context | `organization` |
| Jobs, hiring, onboarding, scheduling, shifts | `work` |
| Customer accounts, settings, onboarding | `general-user` |
| Search, discovery, recommendations | `discover` |
| Music catalog, publishing, playback, royalties | `music` |
| Merch, marketplace checkout, orders | `marketplace` |
| Tickets, guest list, transfers, door operations | `ticketing` |
| Messaging, feed, posts, follows, notifications | `social` |
| Schema, RLS, migrations, data integrity | `database` |
| Accessibility, shared UI, layout | `design-system` |
| External providers and webhooks | `integrations` |
| Release, staging identity, observability | `release` |
| Harnesses, fixtures, evidence quality | `qa` |

## Run report

End each run with:

- Goal completion by actor
- Blocked steps
- Bypasses and what they prevented testing
- Defect counts by severity and type
- Suggested improvements
- Follow-up task links
- Scenarios to explore next
- Rerun targets after fixes

## Completion gate

The campaign remains active until every inventoried shipped core web, iOS, and Android journey has a passing row for each applicable scenario, both event and tour scripts pass from creation through close, and both sides of each handoff show the same persisted result. All P0/P1 findings must be verified closed; P2/P3 improvements must have an owner and bounded backlog task. No bypass counts as a pass. Attach exact-SHA evidence to QA-003 for web and QA-006 for mobile; RELEASE-005 still governs production promotion. A disabled or unavailable candidate is excluded only after a recorded product scope decision, never because the agent could not reach it.

## Initial known risks

- The existing West Coast flow has useful seven-account coverage, but it does not cover the full simulation matrix.
- Existing notes record partial `staff_shifts` persistence; scheduling needs new observed evidence.
- QA state records shallow end-to-end money-flow coverage; ticketing and merchandise require fresh test-mode evidence.
- Hosted staging values, synthetic credentials, and exact deployed commit are not available in this workspace yet.
- The worker-actions SQL referenced by the old runbook is archived as `local_only_unapplied`; WORK-006 must reconcile the hosted ledger and review event/tour/audience RLS before its feature flag can be enabled.
- Public demo and production health probes on 2026-09-22 showed no release SHA and the same advertised Supabase connection origin. Treat staging as unverified until RELEASE-007 supplies separate project and deployment evidence.
