# QA-004 mobile simulation gate

This is a **local evidence validator**, not an automatic UI test or a substitute for device observation. The route-derived catalog lists candidate journeys; source files alone do not prove a feature is enabled in a deployed build. First classify every candidate separately for the exact iOS and Android preview builds. Run each `shipped` journey against isolated staging and record one result per applicable check. A result is `pass`, `fail`, `blocked`, `bypassed`, or `unavailable`; only `pass` closes a shipped check. Use an `unavailable` observation with a linked finding if a journey declared shipped cannot run. Do not call a seeded or API-created final state a UI pass.

Run `npm run simulation:gate -- --manifest /absolute/path/manifest.json --results /absolute/path/results.json --evidence-dir /absolute/path/evidence`. The command reads local files only, writes no files, and prints missing or failed checks. Keep evidence in an access controlled folder. Commit only redacted summaries, never credentials, tokens, receipt details, or screenshots containing personal data.

The manifest must have `campaignId` (`SIM-YYYYMMDD-##`), `staging` (`apiUrl`, `supabaseUrl`, `productionApiUrl`, `productionSupabaseUrl`, distinct Vercel-generated `deploymentId` and `productionDeploymentId`, `deployedSha`, `schemaEvidence`, `stripeMode: "test"`, `stripeEvidence`, `isolationEvidence`), `builds.ios` and `.android` (`profile: "preview"`, `buildId`, `sourceSha`, `apiUrl`, `buildEvidence`), `journeyScope`, and `actors`. URLs must be HTTPS, distinct from production, and all three SHAs and API URLs must match. Evidence fields are paths to local files under `evidence-dir`; a statement alone is not proof. No secrets are accepted in the manifest.

`journeyScope` contains one entry for **every** catalog journey on **each** platform. Each entry has `journeyId`, `platform`, `status` (`shipped`, `disabled`, or `unavailable`), and `scopeEvidence` showing what the exact preview build exposes. A `disabled` or `unavailable` entry also needs `reason`, the responsible product/domain owner's `approvedBy`, a durable `decisionRef`, and `approvalEvidence` proving that decision. A `disabled` entry is an approved, visible exclusion for an intentionally unshipped capability. An `unavailable` entry remains a blocker even with a decision record; resolve it or formally classify an intentionally unshipped capability as disabled. Missing or duplicate entries fail. Disabled exclusions print in gate output; observations for excluded journeys cannot be credited. The gate requires at least one shipped journey per platform. Only actors used by shipped journeys or their receiving side need manifest entries with unique campaign-owned opaque `id`, matching `campaignId`, and `provisionEvidence`.

QA-005 actor keys map to this gate as follows:

| QA-005 actor | Gate actor |
| --- | --- |
| `customer-01` | `customer` |
| `artist-owner` | `artist` |
| `organization-manager` | `organization` |
| `venue-manager` | `venue` |
| `second-venue-manager` | `foreignVenue` |
| `customer-02` | `customer2` |

Use the same campaign-owned opaque user IDs in both manifests. Never copy credentials into either one.

The results file has `campaignId`, `deployedSha`, `observations`, and `findings`. Each observation has `journeyId`, `platform` (`ios` or `android`), `check`, `status`, `actorId`, `observedAt`, `evidence` (relative file paths under `evidence-dir`), `startingState`, `steps`, `expected`, `actual`, and `endingState`. `fail`, `blocked`, `bypassed`, and `unavailable` also require `findingId` and `linkedTask` matching a `findings` entry. For cross-actor success and authorization checks, include `receiverActorId` and describe the receiving or denied state in `endingState`. Evidence files should include device screenshots or traces and backend or receiving-actor proof where relevant. The gate checks existence and metadata, not whether the screenshot is truthful.

All checks named for each **shipped** catalog journey are required on its declared platform. If a check genuinely cannot apply to a shipped journey, record `unavailable` with a finding and linked task; the gate remains red until scope is resolved in the campaign ledger. A nonblocking P2/P3 improvement can be recorded as a finding alongside a passed journey when the required user outcome actually succeeds. Expand the catalog when new mobile actions ship. Staffing, event and tour management, and platform admin have no dedicated mobile UI in this app today; do not credit their web results as mobile passes. The release gate also requires a separate exact-SHA QA-003 web certificate; this command does not infer one.
