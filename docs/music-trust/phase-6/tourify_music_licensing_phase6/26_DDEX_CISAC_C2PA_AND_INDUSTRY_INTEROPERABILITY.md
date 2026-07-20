# DDEX, CISAC, C2PA, and Industry Interoperability

Tourify should use standards as exchange boundaries while retaining an internal normalized model.

## Non-negotiable controls

- Preserve `artist_music` as the canonical upload/catalog row and keep the existing private `artist-music` storage, `/api/music/stream`, `resolveMusicAccess`, Jukebox, mobile player, marketplace, feed, profile, EPK, and analytics paths intact.
- Never reset the database. Use additive migrations, reversible feature flags, explicit backfills, RLS, restricted storage, audit events, and compensating records.
- A Rights Passport claim is evidence, not automatic licensing authority. The exact right, asset, territory, media, term, use, exclusivity, approval requirement, and contractual mandate must be verified before Tourify can show a work as licensable.
- Default to `inquiry_only`, `manual_clearance`, or `unavailable` when authority is incomplete, disputed, expired, territory-limited, approval-dependent, or controlled by a third party.
- Tourify must not grant a license on behalf of a publisher, label, CMO, performer, union, estate, administrator, or other controller unless an active written mandate authorizes Tourify to do so.
- Composition, sound recording, performer/neighbouring rights, name/likeness, lyrics, artwork, trademark, union/reuse, and privacy rights remain separate clearance objects.
- No buyer-facing price, availability, or approval status may be inferred from valuation, popularity, streams, or AI recommendations alone.
- AI-training and synthetic-output licensing is a separate, explicit opt-in product. It may never be bundled into ordinary hosting, promotion, distribution, sync, or certification terms.
- Confidential buyer briefs, unreleased media, stems, contracts, tax forms, and identities must remain in restricted storage with short-lived access and audit logging.
- All external partner records, signatures, payment confirmations, CMO results, and legal documents are versioned and reconciled; no silent overwrite is allowed.

## DDEX

Map ERN for release/deal metadata, MWN for musical-work claims, MWL for U.S. mechanical licence requests/grants, LoD for changes in direction, RDR for recording/performer rights and conflicts, DSR UGC/audiovisual/royalty profiles for usage and revenue, RIN for creation metadata, BWARM for work-recording links and Catalogue Transfer where applicable. Obtain the free DDEX Implementation Licence and DPID before production exchanges.

## CISAC

Support CWR for work registration, CAF for rights-flow/mandates, CRD for royalty distributions, society codes, ISWC/IPI identifiers and the Global Cue Sheet Standard 2.0. Track AVR+ as the current machine-readable cue-sheet implementation format announced in June 2026.

## C2PA

C2PA provenance can identify approved derivatives and delivery history. It does not grant a licence or replace the contract. Preserve manifest versions and verification results.

## Identifiers

Use stable Tourify IDs plus ISRC, ISWC, IPI/CAE, IPN, ISNI, UPC/EAN/GRid, ISAN/EIDR where relevant, DPID and partner identifiers. External identifiers are never primary keys.

## Validation

Implement schema/version registries, official validators where available, conformance fixtures and round-trip tests. Do not hard-code one standards version into the core domain.

## Partner access

CIS-Net and society databases have access and use restrictions. Tourify must use authorized partnerships or user-provided evidence rather than scraping or representing private network data as public.

## Completion evidence

This area is not complete until:

1. The implementation is mapped to audited repository paths, deployed database objects, current provider contracts, and approved legal/operations decisions.
2. RLS and API authorization tests prove that artists, representatives, buyers, reviewers, administrators, and background workers receive only the access required for their role.
3. Every state transition is idempotent, versioned, auditable, and recoverable through a documented compensating action.
4. Existing upload, playback, entitlement, marketplace, feed, profile, EPK, analytics, and mobile regression tests remain green.
5. Feature flags, stop conditions, operational ownership, monitoring, and rollback instructions are documented.
