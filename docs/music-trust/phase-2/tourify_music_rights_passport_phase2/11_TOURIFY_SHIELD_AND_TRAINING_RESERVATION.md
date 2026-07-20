# Tourify Shield and AI-Training Reservation

## Phase 2 Shield scope

Tourify Shield is a layered protection service. It cannot guarantee that publicly accessible audio will never be copied or used for training.

## Layer 1 — private clean master

- never public;
- immutable version;
- least-privilege access;
- download logging;
- short-lived URLs;
- no model-training use by Tourify or vendors without separate opt-in.

## Layer 2 — controlled delivery

- server-signed playback URLs;
- segmented or derived playback where compatible with the existing stack;
- rate limits;
- abnormal request detection;
- session and channel logging;
- download permission checks;
- bot filtering;
- revocable links for promotional delivery.

Do not weaken `resolveMusicAccess`.

## Layer 3 — rights reservation

Publish:

- clear contractual “no AI training without written license” language;
- asset-level training permission state;
- machine-readable policy endpoint;
- `robots.txt` and crawler rules as supplemental signals;
- `/.well-known/tdmrep.json` or current standards-compatible reservation after legal and technical review;
- licensing/contact endpoint.

These signals express rights and preferences; they are not technical enforcement against a noncompliant scraper.

## Layer 4 — forensic watermarking

Create a vendor-neutral adapter interface:

- embed asset ID or opaque watermark payload;
- detect;
- report confidence;
- record algorithm/version;
- test codec robustness;
- never store personal customer data directly in the watermark;
- support channel-specific or licensee-specific payloads only with privacy review.

Watermarking supports provenance and leak tracing; it does not prevent training.

## Layer 5 — monitoring

- fingerprint crawler or licensed monitoring provider;
- external-match ingestion;
- review queue;
- evidence report;
- DMCA/takedown workflow link;
- model-training dataset notice intake where identifiable;
- no automatic public accusation.

## Experimental unlearnable audio

A HarmonyCloak/Nightshade-like processor remains research-only in Phase 2.

Requirements before any beta:

- counsel review;
- researcher/vendor rights;
- blind listening tests;
- mastering-engineer review;
- multiple genre/vocal tests;
- codec and resampling robustness;
- DSP acceptance tests;
- model-family evaluation;
- opt-in consent;
- untouched archival master;
- no guarantee language.

Production publication is prohibited until a separate go/no-go ADR and safety review.
