# Testing, Pilot, and Rollout

## Test layers

### Unit

- claim normalization;
- territory/date overlap;
- exact share arithmetic;
- state transitions;
- manifest canonicalization;
- version chaining;
- public-field filtering;
- credential status;
- signature invalidation;
- derivative recipe hashing.

### Route

- owner access;
- invited contributor access;
- admin capability;
- invalid claims;
- idempotency;
- stale version conflict;
- evidence privacy;
- public verification redaction.

### Database/RLS

Test every principal:

- owner;
- team member with/without capability;
- invitee;
- unrelated authenticated user;
- anon;
- reviewer;
- worker.

### Integration

- catalog import to matched track;
- track to work/recording graph;
- invite to confirmation;
- claims to agreement;
- signature to passport;
- passport to credential;
- derivative to C2PA;
- passport to testnet anchor;
- dispute to suspension and supersession.

### Security

- IDOR/BOLA;
- signed-URL leakage;
- invitation replay;
- file polyglots;
- oversized uploads;
- malformed audio;
- signature replay;
- webhook spoofing;
- reviewer privilege escalation;
- public enumeration;
- log leakage.

### Regression

- upload;
- preview generation;
- marketplace listing;
- sharing;
- Jukebox playback;
- library;
- downloads;
- artist profile;
- feed;
- EPK;
- mobile stream semantics;
- admin music moderation.

## Pilot cohort

Recommended:

- 10–20 artists;
- 50–100 recordings;
- new and legacy music;
- solo writer/master owner;
- co-written work;
- publisher-administered work;
- label-owned master;
- cover;
- remix;
- sample;
- leased beat;
- producer points;
- minor contributor;
- AI-assisted production disclosure;
- genuine dispute.

## Rollout flags

- rights workspace;
- contributor invitations;
- agreements;
- human-origin review;
- passport issuance;
- public verification;
- C2PA derivatives;
- watermark beta;
- testnet anchoring;
- catalog import.

Roll out internally, pilot artists, opt-in beta, then broader plans.

## Metrics

- rights-project completion;
- invitation response;
- claim conflict rate;
- agreement completion;
- certification turnaround;
- needs-information rate;
- appeal/reversal rate;
- passport issuance;
- C2PA success;
- anchor confirmation;
- support burden;
- evidence storage cost;
- security incidents;
- user understanding.

## Go/no-go

No public launch with:

- critical RLS issue;
- private evidence leak;
- unreproducible signed agreement;
- misleading public claim;
- unresolved key-management gap;
- broken legacy playback;
- inability to suspend or supersede a passport.
