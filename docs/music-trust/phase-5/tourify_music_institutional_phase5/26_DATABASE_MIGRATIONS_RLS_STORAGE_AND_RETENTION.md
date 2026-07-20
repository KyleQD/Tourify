# Database Migrations, RLS, Storage, and Retention

## Non-destructive architecture

- preserve all Phase 1–4 tables and APIs;
- use additive tables and columns;
- stable Tourify IDs remain primary domain keys;
- partner IDs live in mapping tables;
- finalized financial, rights, bid, disclosure, NAV, and transaction records are append-only or compensating-entry based;
- migrations are created with the installed Supabase CLI after auditing current types and commands;
- never reset the database.

## Suggested domains

- institutional organizations, members, roles, and assertions;
- catalog mandates, eligibility snapshots, and transaction classifications;
- data rooms, disclosure sets, documents, requests, and findings;
- underwriting, IC cases, votes, and model snapshots;
- deal rooms, IOIs, bids, auction rounds, and term versions;
- direct transaction closings and asset-transfer instructions;
- fund vehicles, classes, commitments, calls, NAV, waterfalls, and reports;
- institutional risk and benchmark snapshots;
- partner connections, events, reconciliations, and incidents.

## RLS

Every exposed table requires RLS and explicit grants. Policies must combine authenticated role targeting with ownership, membership, role, deal, and document-scope predicates. UPDATE policies require `USING` and `WITH CHECK`. Do not authorize from user-editable JWT metadata.

## Storage

Use new private buckets or audited restricted prefixes for institutional documents. Apply short-lived signed URLs, content validation, malware scanning, encryption, download controls, and access logging.

## Retention

Define retention by document type, transaction, legal hold, provider contract, regulatory requirement, privacy request, and jurisdiction. Deletion must preserve required audit evidence and official-record references.
