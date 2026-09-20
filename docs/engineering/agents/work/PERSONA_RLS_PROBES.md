# Staffing persona/RLS probe contract

This is the Database/QA handoff for the staffing persona matrix in
[`docs/organization-personas.md`](../../../organization-personas.md). It prepares
the probes; it does not apply migrations, seed identities, or change rows.

## Run gate

Run against an isolated Supabase target only after the target migration
manifest has been reconciled and the relevant migrations are present:

- `20260823072000_shift_rls_hardening.sql` — legacy venue shift scoping and assigned-worker update boundary.
- `20260823073000_workforce_permission_granularity.sql` — workforce role and permission edges.
- `20260823210000_harden_hiring_onboarding_pii.sql` — hiring RLS and the `can_view_hiring_pii` owner/admin boundary.

The PII migration is staging-validated, but the shift-hardening and workforce
permission manifests remain planned. A probe run must record the target,
applied migration versions, and fixture IDs before interpreting a failure.

## Fixture contract

Use existing isolated fixtures or a database/QA-owned disposable fixture set.
Do not create fixtures in this task. Every fixture must provide:

| ID | Required relationship | Used by |
|---|---|---|
| `ORG_A` | organization with owner/admin, operations manager, workforce manager, and finance manager | org-scoped hiring, roster, scheduling, finance, and PII probes |
| `ORG_B` | unrelated organization with no membership for the `ORG_A` users | cross-organization denial probes |
| `VENUE_A` | venue with one workforce-managed shift and one assigned worker | shift read/write probes |
| `WORKER_A` | active or confirmed assignment to the `VENUE_A` shift | own-assignment probe |
| `WORKER_B` | authenticated user unrelated to `VENUE_A` | unrelated-user denial probe |
| `REVOKED_A` | former member/assignment with ended or inactive status | revoked-member denial probe |
| `CANDIDATE_A` | candidate/application owned by `ORG_A`, with a sensitive-vault row if the gated migration exists | hiring PII probes |

Keep IDs and response bodies out of committed artifacts. Do not log sensitive
column values; existence, row counts, policy errors, and last-four metadata are
the maximum evidence needed.

## Probe matrix

Each probe is executed through a client/session for the named persona, using
the entity and fixture IDs above. Read probes must assert both the returned
row set and the absence of rows from the other organization. Mutation probes
must run only against disposable fixtures and must be rolled back or otherwise
prove zero persisted row changes.

| Probe | Session | Operation | Expected result | Boundary under test |
|---|---|---|---|---|
| `P01` | unauthenticated | select `venue_shifts` for `VENUE_A` | zero rows; no public operational data | anonymous RLS/route boundary |
| `P02` | `WORKER_B` | select `venue_shifts` and `venue_shift_assignments` for `VENUE_A` | zero rows | unrelated authenticated isolation |
| `P03` | `WORKER_A` | select assigned shift and assignment | own assigned rows only | `legacy_assignment_belongs_to_caller` |
| `P04` | `WORKER_A` | update own assignment response/status without changing `staff_member_id` | allowed only for own assignment; no other assignment changes | worker update policy |
| `P05` | `WORKER_A` | attempt reassignment of own row to another staff member | denied; persisted row unchanged | worker cannot reassign |
| `P06` | `WORKER_A` | attempt delete of own assignment | denied; persisted row unchanged | worker has no delete authority |
| `P07` | workforce manager for `VENUE_A` | select/manage venue shifts and assignments | allowed for `VENUE_A`; no `ORG_B`/other-venue rows | `legacy_venue_workforce_manager` and entity scope |
| `P08` | operations manager | select/manage only the granted operational surface | scheduling/roster allowed when granted; hiring PII denied | separation of operational and sensitive authority |
| `P09` | workforce manager | select `staff_onboarding_sensitive_vault` for `CANDIDATE_A` | zero rows/denied unless owner/admin grant is separately present | `can_view_hiring_pii` is narrower than hiring management |
| `P10` | finance manager | select finance-authorized rows for `VENUE_A` | allowed only for granted finance surface; roster/hiring/PII denied | finance role does not imply staffing authority |
| `P11` | owner/admin for `ORG_A` | select `CANDIDATE_A` PII through approved path | allowed for `ORG_A`; `ORG_B` denied | owner/admin PII boundary |
| `P12` | `REVOKED_A` | select or mutate former entity rows | zero rows/denied | active membership/assignment status predicates |
| `P13` | cross-organization member | repeat P03/P07/P11 with `ORG_B` while retaining `ORG_A` access | only currently authorized entity succeeds | entity ID is part of every RLS/RPC decision |
| `P14` | candidate user | select own application/onboarding response | own row only; employer-owned rows remain scoped | applicant self-read preservation |

For `P05` and `P06`, capture the client-visible denial and a before/after
readback of row identity and assignment target. A successful no-op caused by an
empty result is not sufficient evidence; the probe must distinguish denied
access from a missing fixture.

## Read-only SQL shape checks

These checks can be run before persona sessions and do not read business data:

```sql
select to_regclass('public.venue_shifts') as venue_shifts,
       to_regclass('public.venue_shift_assignments') as venue_shift_assignments,
       to_regclass('public.staff_onboarding_sensitive_vault') as pii_vault;

select proname, oid::regprocedure
from pg_proc
where proname in (
  'legacy_assignment_belongs_to_caller',
  'legacy_venue_workforce_manager',
  'can_view_hiring_pii'
)
order by proname, oid::regprocedure::text;

select schemaname, tablename, policyname, cmd, roles
from pg_policies
where tablename in (
  'venue_shifts',
  'venue_shift_assignments',
  'staff_onboarding_sensitive_vault',
  'job_applications',
  'onboarding_responses'
)
order by tablename, policyname;
```

The policy evidence must show no authenticated-wide staffing read policy, a
worker-own assignment update policy, and a vault policy using
`can_view_hiring_pii`. Do not treat the presence of a policy name as proof of
behavior; the session probes above are required.

## Evidence record

Database/QA should append the following to the owning release/task evidence,
not this preparation document:

```text
target: <isolated Supabase target>
run_at: <UTC timestamp>
applied_migrations: <versions>
fixture_manifest: <opaque fixture reference>
probes: P01=pass/fail ... P14=pass/fail
read_only_policy_checks: pass/fail
persisted_row_delta: 0
pii_values_logged: no
blockers: <none or exact migration/fixture gap>
```

Any failure involving an absent relation, function, policy, or fixture is a
blocked verification result, not evidence to relax the canonical persona
registry or server-side authorization boundary.
