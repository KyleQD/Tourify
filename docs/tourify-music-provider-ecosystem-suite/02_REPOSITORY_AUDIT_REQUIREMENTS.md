# 02 — Repository Audit Requirements

## Purpose

The implementation plan deliberately avoids asserting exact file paths before inspecting the current repository. The build agent must produce a factual architecture map and replace candidate targets with confirmed targets.

## Audit checklist

### Application structure

- Next.js version, App Router conventions, server/client boundaries, route groups, middleware/proxy, deployment runtime, package manager, and environment handling.
- Existing feature flag strategy.
- Existing error, logging, request ID, rate limit, cache, and observability utilities.

### Player architecture

- Global player mount point and layout ownership.
- Audio element or playback library.
- Store/context/reducer hooks and persisted state.
- Queue schema, previous/next, repeat, shuffle, seek, volume, mute, keyboard controls, mobile player, Media Session, and route persistence.
- Autoplay restrictions and user gesture handling.
- Concurrent player prevention.

### Music domain

- Track, song, audio, release, album, playlist, artist, attachment, media, merchandise, and analytics types.
- Native upload path, storage buckets, signed URLs, transcoding, artwork, and ownership.
- Public profile and artist dashboard surfaces.
- EPK music blocks and template data.
- Feed attachment types and post composer.
- Event and marketplace relations.

### Data and Supabase

- All music-related migrations and tables.
- RLS helpers and account membership rules.
- Generated database types.
- Existing integration/provider/account-token tables.
- Analytics event storage and retention.
- Cron/queue/job patterns.

### APIs

- Route handlers, server actions, GraphQL/Genql, Supabase functions, and client fetch wrappers used by music.
- Existing idempotency, pagination, auth, and account-context patterns.

### Quality baseline

Run repository-standard versions of:

```bash
install or dependency verification
lint
typecheck
unit tests
integration tests
production build
existing E2E or smoke tests
```

Record pre-existing failures verbatim and do not “fix” unrelated failures without explicit scope.

## Required audit outputs

- Exact file inventory and dependency graph.
- Current canonical data ownership decision.
- Native player compatibility strategy.
- Candidate migrations with collision review.
- Existing components to reuse.
- Risks created by current architecture.
- Confirmed commands used for validation.
- Provider-specific feasibility decision table.

## Candidate file target categories

The agent should search for, then confirm repository equivalents of:

```text
app/**/layout.tsx
app/**/music/**
app/**/profile/**
app/**/feed/**
app/**/epk/**
app/api/**/music/**
components/**/player/**
components/**/music/**
lib/**/music/**
lib/**/providers/**
stores/**/player*
hooks/**/player*
types/**/music*
supabase/migrations/**
supabase/functions/**
tests/**/music/**
```

## Audit acceptance criteria

- Every modification in later phases maps to a confirmed file or a justified new file.
- Existing native behavior is documented in testable terms.
- Provider constraints are distinguished from Tourify requirements.
- The agent has identified where acting-account authorization must be applied.
- The agent has a rollback path that does not require reversing a destructive migration.

## Cross-cutting implementation guardrails

- **Audit first:** all file targets in this suite are candidates until confirmed against the live Tourify repository.
- **Additive only:** do not reset Supabase; do not drop, rename, truncate, or repurpose production columns or tables.
- **Preserve native playback:** Tourify-hosted audio remains a first-class provider and the fallback path.
- **Normalize at the boundary:** provider payloads are mapped into Tourify domain contracts before entering UI, queue, analytics, or persistence layers.
- **Resolve playback just in time:** expiring or provider-controlled playback URLs are never stored in Supabase, local storage, analytics, logs, or durable queues.
- **Feature-flag every provider:** discovery, connection, import, display, playback, sync, and commerce can be disabled independently.
- **Provider terms override product preference:** the common Tourify UX must adapt to each provider's permitted playback and attribution model.
- **No scraping:** do not scrape Bandcamp or SoundCloud pages, extract hidden stream URLs, bypass embeds, or reverse engineer provider controls.
- **Acting-account authorization:** all mutations must use Tourify's existing account/organization/artist authorization helpers.
- **Idempotency:** imports, links, syncs, analytics milestones, and webhook processing must be safe to retry.
- **Observability without leakage:** log request IDs, provider, operation, latency, and normalized error code; redact tokens, personal data, and playback URLs.
- **Rollback without data loss:** disable flags and detach provider execution paths; retain additive data for later recovery unless a user requests deletion.
