# Global Territories, CMOs, Subpublishing, and Mandates

Global licensing requires territory-aware rights chains rather than a single worldwide owner field.

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

## Territory model

Use ISO country/region codes, worldwide-with-exclusions, effective dates and conflict priority. Rights, availability, licences, taxes, societies and restrictions all reference territory sets.

## Representation chains

Model original publisher, administrator, subpublisher, CMO, reciprocal society, label, neighbouring-right representative and collection agent by right and territory. Preserve source agreements and term.

## Multi-territory online rights

Where a CMO or licensing hub grants multi-territorial online rights, Tourify routes requests and data according to the documented mandate. It does not bypass collective-management rules or promise global coverage from a local affiliation.

## Identifiers and formats

Store ISWC, IPI/CAE, ISRC, IPN, ISNI, society codes and DPID. Support CWR/CAF/CRD, CIS-Net-related validation through authorized access, and DDEX MWN/MWL/RDR exchanges where partners permit.

## Local-law modules

Territory modules can define compulsory pathways, moral rights, equitable remuneration, union/reuse, tax, language, currency, data retention and required notices. Modules are counsel-reviewed and versioned.

## Fallback

If territory authority is unavailable, the request can remain inquiry-only or be divided into cleared and uncleared territories. The system cannot convert a partial licence into worldwide rights.

## Completion evidence

This area is not complete until:

1. The implementation is mapped to audited repository paths, deployed database objects, current provider contracts, and approved legal/operations decisions.
2. RLS and API authorization tests prove that artists, representatives, buyers, reviewers, administrators, and background workers receive only the access required for their role.
3. Every state transition is idempotent, versioned, auditable, and recoverable through a documented compensating action.
4. Existing upload, playback, entitlement, marketplace, feed, profile, EPK, analytics, and mobile regression tests remain green.
5. Feature flags, stop conditions, operational ownership, monitoring, and rollback instructions are documented.
