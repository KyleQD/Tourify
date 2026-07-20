# Evidence Review and Decisioning

## Evidence categories

- archival master;
- stems;
- raw takes;
- DAW export or project summary;
- MIDI files;
- lyrics and draft history;
- demos and voice memos;
- studio records;
- collaborator attestations;
- contracts;
- distribution reports;
- external registrations;
- creation photos/videos;
- prior public release evidence;
- sample/beat licenses;
- AI-tool disclosures.

## Storage

Evidence belongs in a dedicated private bucket or an isolated private prefix after audit. It must never use public cover-art storage.

Each evidence item stores:

- owner;
- case;
- evidence category;
- original filename;
- MIME and size;
- storage path;
- SHA-256;
- upload timestamp;
- submitter;
- visibility scope;
- review status;
- retention class;
- supersession link.

## Review workflow

```text
draft
→ submitted
→ automated_checks
→ triage
→ in_review
→ needs_information | approved | rejected
→ appealed
→ appeal_review
→ final
```

Certification can later transition to `suspended`, `revoked`, or `superseded`.

## Automated checks

- file allowlist;
- malware scanning;
- exact duplicate;
- technical metadata;
- hash and fingerprint;
- timestamp consistency;
- source-to-master relationship;
- known generator metadata;
- cross-account duplicate alerts;
- incomplete contributor set;
- claim conflicts.

Detector scores remain private and are only one input.

## Structured reviewer decision

Require:

- decision;
- standard version;
- evidence reviewed;
- unresolved limitations;
- reason codes;
- reviewer capability;
- review timestamp;
- required follow-up;
- public summary;
- private notes;
- audit event.

## Service levels

Use plan-based priority, not decision quality. Paying more may provide faster review or more evidence assistance, but not a weaker standard.

## Re-review triggers

- material track update;
- new master;
- changed AI disclosure;
- new contributor dispute;
- claim amendment;
- changed source evidence;
- external infringement notice;
- certification-standard change requiring revalidation.

## Reviewer safeguards

- separation of reviewer and appellant reviewer when practical;
- conflict-of-interest declaration;
- least-privilege evidence access;
- no downloading highly restricted evidence unless required;
- audited access;
- standardized reason codes;
- escalation to counsel for legal disputes.
