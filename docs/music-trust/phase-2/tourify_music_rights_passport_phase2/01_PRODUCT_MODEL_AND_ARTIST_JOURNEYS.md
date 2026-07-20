# Product Model and Artist Journeys

## Product levels

### Artist Submitted

The track exists in `artist_music`, passed publication gates, and carries the artist's rights and AI declarations.

### Origin Recorded

Tourify has frozen an integrity record containing the source file hash, technical metadata, acoustic fingerprint reference, submitter, declaration version, and record date.

### Human-Created Certified

Tourify has evaluated the track under a named certification-standard version. The exact evidence and review scope are documented. The badge never promises absolute proof that no AI was used.

### Rights Passport

The sound recording, underlying work, contributors, claims, agreements, identifiers, approvals, and verification state are assembled into a versioned passport.

### Protected Release

A derivative has provenance credentials, rights-reservation metadata, and optional forensic watermarking. The clean archival master remains untouched.

## Journey A — New unreleased artist

1. Upload through the existing `EnhancedMusicUploader`.
2. Complete baseline declarations.
3. Create or link the musical work.
4. Add writers, performers, producers, publishers, label, and administrators.
5. Upload source evidence over time.
6. Invite contributors.
7. Resolve shares and sign agreements.
8. Apply for Human-Origin certification.
9. Issue the Rights Passport.
10. Create a protected distribution package.
11. Continue distribution through the artist's chosen distributor.

## Journey B — Previously distributed catalog

1. Select **Import Existing Catalog**.
2. Provide DSP URLs, ISRCs, UPC/EAN, distributor reports, or metadata files.
3. Match public releases to existing or newly created `artist_music` records.
4. Upload the authoritative master where available.
5. preserve original release date separately from Tourify import and certification dates;
6. reconstruct work/recording relationships and claims;
7. invite old collaborators and rights administrators;
8. issue lower-confidence retrospective origin certification when evidence is limited;
9. produce a discrepancy and correction report;
10. leave current distribution intact.

## Journey C — Solo artist with complete ownership

The UI should provide a streamlined path, but still separate composition and master claims. The artist may be the only writer, performer, producer, and master owner, yet each role and right must remain separately represented.

## Journey D — Collaborative release

The project remains pending until required contributors accept or dispute their role and affected claims. One contributor's delay should not hide the artist's entire catalog; instead, the relevant verification level remains incomplete.

## Journey E — Label- or organization-controlled master

The artist can claim performer and writer roles while an authorized label representative claims the master. Organization authority must be documented separately from identity.

## Journey F — Cover, remix, sample, leased beat, or adaptation

Conditional questionnaires create the correct source-work and license relationships. Such tracks cannot receive the highest status while required permissions remain unknown or disputed.

## Conversion and upsell

Phase 2 should preserve the low-friction upload funnel:

- show what is already protected automatically;
- explain missing evidence;
- offer certification after successful upload;
- offer Rights Passport completion when the project has multiple parties or commercial use;
- offer Shield features only after an origin record exists;
- never describe a non-paying artist as suspicious.

## Public language

Preferred:

- “Artist submitted”
- “Origin recorded by Tourify”
- “Human-Created Certified under Standard 1.0”
- “Contributor-confirmed”
- “Document-backed”
- “Registry-linked”
- “Tourify review completed”

Avoid:

- “Tourify copyright”
- “Guaranteed owner”
- “100% AI-free”
- “Impossible to train on”
- “Blockchain registered copyright”
