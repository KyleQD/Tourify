# Phase 2 Rights Passport Extension

Phase 1 must create clean extension points without requiring the complete rights system.

## Future linked entities

- musical works/compositions
- sound recordings
- releases and release tracks
- parties and identifiers
- contributions/credits
- ownership and administration claims
- territories and validity periods
- agreements and signatures
- disputes and amendments
- verifiable credentials
- blockchain attestations

## Required Phase 1 compatibility

- every track has a stable Tourify ID
- declarations are versioned
- source files and fingerprints are versioned
- origin records can be superseded
- certification standard version is stored
- events are append-only
- public IDs are separate from database IDs
- no certification claim says Tourify legally adjudicated ownership

## Existing distributed music

Later catalog import must:

- accept external DSP/release links and identifiers
- match recordings without treating ISRC as ownership proof
- preserve original release date separately from Tourify record date
- allow lower-confidence retrospective origin certification
- leave existing distribution intact

## Excluded from Phase 1

- royalty-bearing tokens
- valuation
- automated royalty payouts
- securities/investment offerings
- secondary markets
- custodial wallets
- experimental Nightshade/HarmonyCloak-style processing in production
