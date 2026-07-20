# UI/UX and Existing Surface Integration

Licensing should feel native to Tourify and reuse existing music, artist, organization, event, EPK and admin surfaces.

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

## Artist navigation

Add `/artist/music/licensing` with Overview, Availability, Requests, Quotes, Approvals, Agreements, Deliveries, Usage, Earnings and Settings. Track pages gain a Licensing tab referencing the canonical track.

## Buyer navigation

Add controlled `/licensing` discovery and `/licensing/projects/[id]` workspaces for verified buyers. Use cards, filters, shortlists and project views without exposing raw storage URLs or private rights shares.

## Track status

Show precise labels: Not configured, Inquiry only, Pre-cleared for defined uses, Approval required, Conflict, Temporarily unavailable. Never show “fully cleared” without scope.

## Upsells

Certification, Rights Passport completion and managed-clearance services can be offered when missing evidence blocks licensing. Upsells do not change legal status until completed.

## Existing surfaces

EPKs can display approved licensing contacts and availability; public artist pages can show inquiry links; News/feed can share licensing announcements without investment language; events can link setlist/licence tasks. Playback always uses Jukebox.

## Accessibility and states

Provide complete keyboard/screen-reader support, mobile-responsive workspaces, loading, empty, partial, expired, conflict and error states. Complex legal terms include plain-language summaries with links to executed documents.

## Completion evidence

This area is not complete until:

1. The implementation is mapped to audited repository paths, deployed database objects, current provider contracts, and approved legal/operations decisions.
2. RLS and API authorization tests prove that artists, representatives, buyers, reviewers, administrators, and background workers receive only the access required for their role.
3. Every state transition is idempotent, versioned, auditable, and recoverable through a documented compensating action.
4. Existing upload, playback, entitlement, marketplace, feed, profile, EPK, analytics, and mobile regression tests remain green.
5. Feature flags, stop conditions, operational ownership, monitoring, and rollback instructions are documented.
