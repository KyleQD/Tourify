# UI/UX and Existing Surface Integration

## Artist navigation

Extend the existing artist music area:

```text
Music
├── Catalog
├── Upload
├── Rights & Credits
├── Certifications
├── Agreements
├── Protected Files
└── Claims & Disputes
```

Do not move playback to a separate player stack.

## Track workspace

Tabs:

- Overview
- Audio & Versions
- Composition
- Master Rights
- Credits
- Claims & Splits
- Agreements
- Evidence
- Certification
- Rights Passport
- Protection
- History

## Progressive completion

Show:

```text
✓ Track uploaded
✓ Rights declaration current
✓ Source integrity recorded
✓ Sound recording created
! Underlying composition incomplete
! Two contributors pending
○ Agreement not signed
○ Human-Origin review not submitted
○ Rights Passport not issued
```

## Status language

Separate badges:

- upload status;
- origin status;
- human-origin status;
- contributor-confirmation status;
- document status;
- registry status;
- dispute status;
- protection status.

Never compress all meaning into one green check.

## Contributor portal

A contributor sees:

- project summary;
- proposed role;
- relevant credits and claims;
- full agreement when signing;
- response controls;
- evidence they personally supplied;
- dispute/appeal actions.

They do not see unrelated contracts, identity files, internal notes, or tax data.

## Existing music surfaces

Feed, discover, profiles, public artist pages, EPK, library, and mobile can display narrow trust metadata. Play actions continue to map to `JukeboxTrack` and existing mobile APIs.

## Public verification page

Show:

- track/artist;
- current passport status;
- public credits;
- identifiers;
- certification scope;
- version and dates;
- C2PA/anchor validation;
- superseded history;
- disclaimer.

Do not expose private percentages unless all affected parties explicitly authorize publication.

## Empty/error states

Design:

- collaborator has not responded;
- claim conflict;
- identifier not found;
- evidence processing;
- signature expired;
- C2PA unsupported;
- anchor pending;
- passport suspended;
- rights review unavailable.

## Accessibility

- keyboard-complete wizards;
- semantic field grouping;
- plain-language legal summaries;
- no badge meaning conveyed by color alone;
- downloadable agreements;
- screen-reader status announcements for asynchronous jobs.
