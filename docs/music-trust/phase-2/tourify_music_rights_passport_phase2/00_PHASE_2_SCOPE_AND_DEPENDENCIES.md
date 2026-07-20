# Phase 2 Scope and Dependencies

## Purpose

Phase 2 converts the safe upload and optional certification foundation from Phase 1 into a complete rights-documentation and provenance system.

The canonical music record remains `artist_music`. Phase 2 adds linked rights-domain entities; it does not replace or duplicate the track row.

## Required Phase 1 capabilities

Codex must verify each dependency rather than assume it exists:

- public uploads require a current rights declaration;
- the artist provides an explicit AI-use disclosure;
- original audio remains in private `artist-music` storage;
- source files have stable storage paths and immutable versions;
- source SHA-256 and acoustic fingerprints can be produced asynchronously;
- origin records and declaration versions are append-only or supersedable;
- certification cases and evidence are owner scoped;
- public trust labels do not expose private evidence;
- admin review uses capability checks;
- all playback remains `/api/music/stream` → `resolveMusicAccess` → signed URL;
- all web player surfaces use `JukeboxProvider`;
- feature flags can disable new behavior without breaking upload or playback.

If any dependency is missing, Phase 2 must add a compatibility task and keep the dependent Phase 2 feature disabled.

## In scope

### Rights graph

- musical works/compositions;
- sound recordings linked to `artist_music`;
- releases and release tracks where needed to represent existing distribution;
- people, organizations, stage names, identifiers, affiliations, and authority;
- credits and contributions;
- ownership, administration, collection, license, approval, and income-participation claims;
- territories, dates, exclusivity, deductions, and evidence;
- agreement templates, document versions, signature requests, and signature events.

### Human-Origin certification

- versioned certification standards;
- source-evidence requirements;
- AI-assistance disclosure classification;
- technical and manual review;
- approval, needs-information, rejection, suspension, appeal, and revocation;
- no irreversible decision based only on an AI detector.

### Rights Passport and provenance

- deterministic private and public manifests;
- Tourify issuer signatures;
- W3C Verifiable Credential-compatible envelope;
- credential suspension and revocation;
- C2PA manifests for supported protected derivatives;
- public verification pages with limited claims;
- optional testnet blockchain anchoring.

### Protection

- protected-public-derivative separation from archival masters;
- forensic watermark adapter interface;
- machine-readable AI-training reservation;
- bot and bulk-access telemetry on Tourify-hosted assets;
- evidence package generation for disputes.

## Explicitly out of scope

- replacing distributors;
- editing live DSP metadata automatically without a partner or explicit authority;
- collecting or paying royalties;
- pricing a catalog;
- selling ownership;
- financial tokens;
- automatic government copyright registration;
- production “Nightshade for music” claims;
- declaring legal ownership conclusively.

## Architecture principle

> Legal agreements and external registrations establish and evidence rights. Tourify records claims, approvals, evidence, provenance, and status. A blockchain anchor can prove that a commitment existed at a time; it does not create or adjudicate copyright.
