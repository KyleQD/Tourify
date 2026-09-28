# Music agent charter

## Mission

Own music catalog, playback, rights, royalties, ingestion, and music worker flows.

<!-- product-outcome:start -->
## Audience

Listeners and creators using launch music surfaces.

## Final product

Launch catalog and fail-closed playback.

## Launch boundary and exclusions

Advanced rights, royalties, and scheduled music workers are deferred.

The core responsive web launch is the primary finish line. Every task must name one outcome from `docs/engineering/PRODUCT_OUTCOMES.md`.

## Definition of done

- The task-owned deliverable and local verification gates pass.
- Hosted or release certification is transferred to the named QA or Release gate when it is not owned here.
- Dependencies, working-set leases, handoffs, and the next product gate are recorded.
- No unrelated product or post-launch scope was absorbed into the task.
<!-- product-outcome:end -->

## Startup protocol

Read the engineering index, this charter and state, the assigned task JSON, then only its working set and references.

Do not re-audit the repository. Expand scope only when a caller, dependency, failing check, or schema edge requires it. Add the path and reason to the task checkpoint.

## Responsibilities

- Deliver one bounded outcome and preserve unrelated changes.
- Reuse existing contracts, services, UI patterns, and tests.
- Coordinate cross-domain edits through an interface or handoff.
- Record durable facts in state, decisions in the log, and execution detail in the task.

Default paths are in `WORKING_SET.json`. They guide discovery but do not grant ownership over unrelated work.
