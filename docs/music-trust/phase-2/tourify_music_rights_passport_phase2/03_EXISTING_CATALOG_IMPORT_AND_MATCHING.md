# Existing Catalog Import and Matching

## Objective

Allow artists to attach Rights Passports to already distributed music without replacing the distributor or corrupting the existing Tourify catalog.

## Inputs

Support controlled import from:

- Spotify, Apple Music, YouTube Music, SoundCloud, Bandcamp, or other public URLs;
- ISRC list;
- UPC/EAN;
- distributor CSV or statement;
- label catalog export;
- DDEX-compatible payload in a later adapter;
- manual entry.

External service URLs remain outbound links. Phase 2 does not scrape or rebroadcast third-party audio.

## Import pipeline

1. Create an import job.
2. Normalize artist, release, track, identifier, date, duration, and label metadata.
3. Search existing `artist_music` by owner, ISRC, public URLs, title, and fingerprints.
4. Present candidate matches.
5. Require the artist to confirm or create a canonical Tourify track.
6. Store external catalog references separately.
7. Preserve the original release date and source.
8. Request the authoritative master.
9. Compare the uploaded master to the known public recording.
10. Create discrepancy tasks.

## Matching confidence

Use explainable signals:

- exact ISRC;
- same UPC and track position;
- exact duration within tolerance;
- normalized artist/title/version;
- acoustic similarity;
- source-file relationship;
- distributor statement;
- label confirmation.

The system should output `confirmed`, `probable`, `ambiguous`, `conflict`, or `unmatched`, with the signals recorded.

## Conflict examples

- same ISRC, materially different audio;
- different ISRCs, near-identical recording;
- clean and explicit versions sharing an ISRC;
- one track linked to conflicting writer sets;
- live, remix, remaster, or edit incorrectly treated as the same recording;
- artist controls the profile but not the master;
- artist's release date conflicts with distributor records.

A conflict creates a review item; it does not auto-accuse another party.

## Retrospective Human-Origin certification

Evidence may include:

- original masters and stems;
- dated project exports;
- demos and drafts;
- collaborator confirmations;
- studio invoices or session records;
- release predating relevant generative tools;
- archived communications.

The public result must distinguish:

- original release date;
- Tourify import date;
- evidence review date;
- certification issuance date.

## Discrepancy report

Generate artist-facing actions:

- add missing work;
- request contributor;
- resolve share;
- upload agreement;
- verify identifier;
- contact distributor;
- register or correct with an external rights organization;
- request manual review.

Tourify should not automatically submit ownership changes to outside organizations without explicit authority and a partner workflow.
