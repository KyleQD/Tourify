# Glossary, State Machines and Source-of-Truth Matrix

## Core terms

- **Federation:** A separately governed association or network of sovereign creator organizations.
- **Member organization:** A legal entity admitted to the federation through its own approval process.
- **Creator member:** A person or entity whose membership is governed by a local member organization, not the federation.
- **Reserved power:** A decision that cannot be delegated to the federation.
- **Delegated service:** A specifically authorized activity with scope, term and revocation rules.
- **Mandate:** A versioned legal/operational authority record; it is not created by credential possession alone.
- **Credential:** A cryptographically verifiable statement issued under a defined trust framework.
- **Trust registry:** A versioned registry of recognized issuers, verifier profiles, keys and service endpoints.
- **Ratification:** Local approval required before a federation decision applies to a member organization.
- **Federation partition:** A condition in which organizations cannot reliably communicate or agree on current state.

## Membership state machine

`draft → submitted → diligence → local_approved → federation_review → active → suspended → withdrawn | expelled | rejected`

No transition deletes prior versions. Reinstatement creates a new approval record.

## Credential state machine

`offered → issued → active → suspended → active | revoked | expired | replaced`

A replaced credential remains auditable and cannot become active again.

## Mandate state machine

`draft → principal_approved → delegate_accepted → active → suspended → active | revoked | expired | superseded`

## Proposal state machine

`draft → review → voting → provisional_result → local_ratification → effective | rejected | withdrawn | expired`

## Data-transfer state machine

`draft → classified → privacy_review → jurisdiction_review → approved → in_progress → completed | suspended | failed | revoked`

## Source-of-truth matrix

| Domain | Authoritative source | Phase 10 role |
|---|---|---|
| Music upload/catalog | `artist_music` | Reference only |
| Audio access | `resolveMusicAccess` and stream route | No change |
| Creator membership | Local organization official register | Versioned verified reference |
| Federation membership | Federation membership ledger | Primary Phase 10 record |
| Rights ownership | Rights Passport plus official external sources | Evidence reference only |
| Licence | Executed Phase 6 licence and controllers | No rewrite |
| Rights administration | Phase 7 case plus official registry/provider | No rewrite |
| Data contribution | Phase 9 contribution licence | Validate before federation use |
| Federation delegation | Phase 10 mandate record | Primary for federation service authorization |
| Credential status | Approved issuer/source record and status list | Verifiable mirror and status service |
| Local governance decision | Member organization record | Cannot be overridden |
| Federation governance decision | Federation proposal/ballot record | Applies only within delegated scope and ratification rules |
| Cross-border transfer | Approved transfer manifest and legal mechanism | Primary operational record |
| Regulator/registry decision | External authority | Reconciled versioned mirror |
