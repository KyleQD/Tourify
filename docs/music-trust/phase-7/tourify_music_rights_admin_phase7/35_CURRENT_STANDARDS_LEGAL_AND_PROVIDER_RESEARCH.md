# Current Standards, Legal, and Provider Research — July 2026

## Purpose

Record the current research baseline that Codex and reviewers must verify again before production integrations.

## Phase boundary

- Preserve `artist_music` as the canonical upload/catalog row and preserve the existing private `artist-music` bucket, stream route, `resolveMusicAccess`, Jukebox, mobile player, feed, profile, EPK, marketplace and analytics paths.
- Never reset or destructively rewrite the database. Use additive migrations, explicit backfills, versioned records, feature flags, audit events and compensating actions.
- A Rights Passport is evidence. It is not an administration mandate, collection authority, litigation authorization or platform-claim entitlement.
- Separate composition, sound recording, performer/neighbouring, name/likeness/voice, lyrics, artwork, trademark, union/reuse and privacy rights.
- External registries, CMOs, administrators, platforms and courts remain authoritative for their own records. Tourify stores reconciled, versioned mirrors and submission evidence.
- Default to manual review when authority, identity, shares, territory, term, exclusivity, claim policy, registration status or evidence is incomplete, disputed or expired.
- No automated takedown, monetization claim, ownership assertion or legal threat may be sent solely from fingerprint similarity, metadata matching or AI confidence.
- Every external submission, correction, claim, notice, dispute, recovery and status update must be idempotent, signed where applicable, versioned and auditable.

## Required outcomes

- Current DDEX/CISAC data standards.
- Current MLC and SoundExchange workflows.
- DMCA/CCB/recordation/termination controls.
- Platform claim and collective-management limitations.

## Architecture and source-of-truth rules

- Primary official sources take priority.
- Provider UI and schemas can change.
- The document is research, not legal advice.

## Primary workflows

### Standards verification

1. Confirm current version and implementation licence.
2. Map required fields and acknowledgments.
3. Record provider-specific deviations.

### Legal verification

1. Counsel confirms service-provider, administration, collection and enforcement roles.
2. Update deadlines and jurisdiction modules.

## Data and state requirements

- Source URL, retrieved date, topic, current version/status and implementation impact.

## Controls and stop conditions

- Do not hard-code provider UI assumptions.
- Do not treat a community or platform policy as statutory law.

## Existing-system integration

- Update adapters and ADRs before live launch.

## Testing requirements

- Contract tests against current sandbox/file validation.

## Exit criteria

- All launch-critical assumptions have a dated official source or counsel decision.

## Codex evidence requirement

Codex may mark this area complete only after it records audited repository paths, deployed database objects, migrations, RLS tests, route tests, provider or registry contract assumptions, feature flags, monitoring, rollback instructions and task-level evidence in `phase-7-execution-plan.json`.

## Current official-source baseline

### DDEX and CISAC

- DDEX Musical Works Data and Rights standards support right-share notifications, licensing communications and Letters of Direction. MWN 1.3 is the current right-share notification version published in 2025.
- DDEX Recording Data and Rights standards support recording, contributor, rights-claim and revenue data exchanges.
- DDEX notes that CISAC CWR 2.2 remains the current operational CWR format while MWN 1.3 adds richer registration and conflict-resolution capabilities.
- CISAC identifies CWR as a common work-registration format and uses identifiers and systems including ISWC, IPI, ISNI and CIS-Net.
- CISAC launched AVR+ in June 2026 for modernized audiovisual cue and recording-data exchange.

Official references:

- https://ddex.net/standards/musical-works-data-and-rights-communication/
- https://ddex.net/standards/recording-data-and-rights/
- https://kb.ddex.net/implementing-each-standard/musical-work-data-and-rights-communication-%28mwdr%29/musical-work-right-share-notification-standard-%28mwn%29/mwn-explained/mwn-and-the-common-works-registration-%28cwr%29/
- https://www.cisac.org/formats
- https://www.cisac.org/services/information-services
- https://www.cisac.org/Newsroom/news-releases/cisac-launches-first-global-format-modernise-audiovisual-music-data-and

### The MLC

- The MLC Member Hub supports individual and bulk work registration, share claiming, sound-recording matching and overclaim resolution.
- A recording match helps royalty processing but does not itself establish ownership.
- Each self-administered rightsholder should register or claim only the share they control.

Official references:

- https://www.themlc.com/tools
- https://help.themlc.com/en/support/how-to-register-works-in-the-mlc-portal
- https://help.themlc.com/en/support/what-is-the-claiming-tool
- https://help.themlc.com/en/support/what-is-the-matching-tool
- https://help.themlc.com/en/support/what-is-an-overclaim-and-how-do-i-resolve-one-using-the-overclaims-tool

### SoundExchange and neighboring rights

- SoundExchange administers the U.S. Section 114 statutory sound-recording license and offers repertoire search/claim and international collection through mandates and reciprocal partners.
- SoundExchange announced new IFPI-linked ISRC auto-assignment capabilities in June 2026; adapters must verify exact eligibility and API/service availability before implementation.
- Featured artist, nonfeatured performer and sound-recording owner roles must remain distinct.

Official references:

- https://www.soundexchange.com/what-we-do/
- https://www.soundexchange.com/international-partners/
- https://www.soundexchange.com/news/soundexchange-ifpi-announce-new-isrc-auto-assignment-capabilities/

### Platform rights management

- YouTube Content ID matches uploaded content against eligible references and can monetize, track or block by territory. Eligibility requires sufficient exclusive rights, and erroneous or abusive claims can cause penalties or termination.
- Content ID claims and legal takedown notices are separate processes. Platform disputes do not decide ownership.

Official references:

- https://support.google.com/youtube/answer/2797370
- https://support.google.com/youtube/answer/1311402
- https://support.google.com/youtube/answer/7002106
- https://support.google.com/youtube/answer/9142671

### DMCA service-provider operations

- A qualifying service provider must designate and publicly identify a DMCA agent, keep the information current, renew the designation at least every three years, implement notice/counter-notice processes and maintain a repeat-infringer policy.
- After a compliant counter-notice, access is generally restored no fewer than 10 and no more than 14 business days later unless the original claimant provides notice of a filed court action.

Official references:

- https://www.copyright.gov/512/
- https://www.copyright.gov/dmca-directory/faq.html
- https://www.copyright.gov/title37/201/37cfr201-38.html

### Copyright Claims Board

- The CCB is a voluntary Copyright Office tribunal for eligible claims up to $30,000. Tourify may prepare evidence exports and referrals but must not give legal advice or represent users without approved counsel arrangements.

Official reference:

- https://www.copyright.gov/about/small-claims/

### Transfers, recordation and termination

- Copyright transfers generally require a signed writing. Recordation under section 205 is voluntary but can provide legal advantages. The Copyright Office electronic Recordation System is publicly available for supported documents.
- Statutory termination under sections 203 and 304 is deadline-sensitive, fact-specific and subject to exceptions. Notices must be served and recorded according to applicable rules.

Official references:

- https://www.copyright.gov/recordation/
- https://www.copyright.gov/recordation/documents/
- https://www.copyright.gov/recordation/termination.html

### Collective management

- WIPO describes collective management as one method through which rights holders administer copyright and related rights through CMOs. Tourify must not represent itself as a CMO or rights society without a separate legal and governance structure.

Official reference:

- https://www.wipo.int/en/web/copyright/collective-management

## Mandatory pre-launch refresh

Before any production adapter or enforcement workflow goes live, Codex and the responsible owner must re-check provider documentation, standards versions, partner contracts, statutory deadlines, Copyright Office rules, territory-specific notice procedures and counsel-approved templates.
