# NEWS M3 — Publisher intake, story suggestions and editorial governance

Status: **Draft — code building blocks only. No scheduled worker, no production migration, no public release.**

Dependency: M1 PR #18 → M2 PR #19 → M3 (this branch).

## Implementation map

| Component | Path | Behavior |
| --- | --- | --- |
| Source registry allowlist | `lib/news/ingestion/source-policy.ts` | Approved exact registry entry, HTTPS host validation, publisher-host verification |
| Parsed RSS ingestion boundary | `lib/news/ingestion/parsed-batch.ts` | Cap batch, normalize, deduplicate, honor link-only rights, leave private and pending |
| Scheduled polling policy | `lib/news/ingestion/poll-policy.ts` | Priority cadence, bounded backoff, deterministic jitter and retry-after |
| Cluster recommendations | `lib/news/clustering/suggest-related.ts` | Headline-term similarity within recent window; action always editorial review |
| Editorial state machine | `lib/news/editorial/workflow.ts` | Role restrictions, ownership, conflict-of-interest defense, decision rationale and immutable event intent |
| SQL review amendments | `docs/news/sql/NEWS_CORE_V1_REVIEW.sql` | Append-only editorial decision history and per-column public grants |

No unrestricted URL input, network fetching, SQL writing or publication is performed by these helpers. The existing `/api/feed/rss-news` endpoint remains untouched and must **not** be treated as an approved ingestion service. Its current regular-expression RSS/Atom parsing and fallback proxy need replacement before source processing is entrusted to it.

## Required scheduled worker design

Recommended deployment, following Supabase's documented approach:
- Supabase Cron / pg_cron triggers a **restricted Edge Function** using pg_net and credentials in Supabase Vault.
- Run only on explicit source registry records that were approved by a user with newsroom permissions.
- Do not accept arbitrary URLs in a public API body. Feed URL changes revert source to pending and require reapproval.
- Separate `news_sources` (private configuration) and `news_ingestion_runs` (private logs) from `news_items` (public-safe approved projection).
- A worker acquires a DB lease for each source (to prevent duplicate concurrent polls), applies ETag / Last-Modified, and respects 304, 429 and Retry-After.
- Publisher fetches must use an HTTP transport with **DNS resolution checks and IP pinning**, private/reserved address blocking, redirect restrictions, HTTPS-only enforcement, hostname and port validation, strict connection timeout, maximum redirect count (prefer zero), and egress restrictions. The pure URL checks here are **not an SSRF boundary on their own**. Do not enable network fetching without this layer.
- Limit compressed/decompressed feed size, entries, XML nesting depth, parser runtime and total CPU/memory. Use a pinned, audited XML parser rather than regex.
- A database upsert must be idempotent on `(origin_type, dedupe_key)`. Record source polling status, failed attempts, error class, fetch latency and next eligible poll.
- News ingestion failures cannot break the public News API. Existing indexed records remain available when an external RSS source is down.
- Respect publisher terms, rights metadata, no unauthorized full-text reposting or image mirroring. Rights state `link_only` stores only headline/source/link, not republished description, image or full body.
- Source identity verified by editors is **not equivalent** to factual correctness. RSS items remain pending until an appropriate publication policy assesses content; do not represent them as fact-checked.
- Avoid auto-merging related stories based solely on title similarity; suggested clusters may contradict one another. Human decisions must be logged.

Official reference: https://supabase.com/docs/guides/functions/schedule-functions

## Community newsroom

A general Tourify account can submit a private story tip or original article for review. Never expose the submission body or reporter identity publicly before publication permissions are granted.

- `pending → in_review`: authorized reviewer claims work.
- `in_review → approved/rejected`: editor only, documented rationale.
- `pending/in_review → withdrawn`: actual submitter (or authorized editor) only.
- `rejected → in_review`: editor may reopen with rationale.
- No same-user editor approval of their own report.
- Approval moves a submission **only to eligibility for publication review**, not `news_items.publication_state = published`.
- A separate editorial service must validate ownership, user identity, evidence, publication rights, safeguarding, restrictions, moderation, and corrections before creating a public News item.
- Remove sensitive allegations, personal information and identifying source details from the public projection; editors may embargo or decline publication.
- Store audit events in `news_editorial_decisions`, kept private; the review-only schema is not deployed.

## Acceptance tests before enabling

1. Approved source can normalize a capped batch without publishing automatically.
2. Unapproved source returns zero accepted items; foreign-domain links are rejected.
3. Duplicate URLs with different tracking query parameters map to one key.
4. Link-only items contain no unauthorized snippets or copied imagery.
5. Poll retry/backoff deterministic and bounded.
6. Two independent publications can suggest a shared event, but no `story_id` mutation occurs automatically.
7. Conflicting coverage is surfaced for manual review.
8. Reviewer cannot approve, original author cannot approve, and only an owner/editor can withdraw.
9. Anon/authenticated sessions cannot SELECT private source, submission or editorial-decision tables.
10. A hostile source response cannot trigger internal network requests (requires future worker integration tests).
11. Source retention, corrections, deletion and copyright notices invalidate any published projections and feed snapshots.
12. CI/build is green using Node 24 and a reconciled date-fns dependency tree; existing known blockers are separate.

## Further milestones

M4: approved-source editor UI, restricted scheduled Edge Function, RLS tests and staged migrations.
M5: indexed ingestion materialization, topic/entity classification and editor-approved story clustering.
M6: NewsRank v2, feed snapshots, full guest-safe SSR article pages and independent editorial operations UI.

**Do not enable public News or switch `/news` to the index until its RLS, legal rights, moderation, ingestion and regression tests all pass.**
