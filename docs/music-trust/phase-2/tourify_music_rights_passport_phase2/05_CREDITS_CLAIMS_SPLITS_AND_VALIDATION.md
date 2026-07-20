# Credits, Claims, Splits, and Validation

## Credits

Credits represent what a person did. Examples:

- songwriter;
- lyricist;
- composer;
- arranger;
- producer;
- featured artist;
- non-featured performer;
- vocalist;
- instrumentalist;
- engineer;
- mixer;
- mastering engineer.

Credits can be public, private, or pending confirmation.

## Claims

A claim must identify:

```text
subject_type
subject_id
claimant_party_id
claim_type
rights_category
share_numerator
share_denominator
share_unknown
original_share_text
original_share_scale
territory_set
valid_from
valid_until
perpetual
exclusive
agreement_version_id
status
supersedes_claim_id
```

## Claim types

- ownership;
- administration;
- collection;
- exclusive license;
- nonexclusive license;
- income participation;
- approval right;
- recoupment or deduction interest;
- security interest disclosure;
- unknown/pending claim.

## Validation rules

1. Credits do not create ownership.
2. Composition claims cannot be applied to master rights.
3. Master claims cannot be applied to the composition.
4. Ownership and administration totals are validated separately.
5. Claims cannot exceed the permitted total within the same subject, right, territory, and time window.
6. Unknown is not zero.
7. Overlapping claims require explicit conflict status.
8. A disputed claim prevents the highest verification level for the affected scope.
9. Producer points default to income participation, not master ownership.
10. Claims derived from a superseded agreement must be superseded.
11. Material claim changes invalidate affected signatures and passport versions.
12. A rights controller can administer less than, equal to, or in some contexts more than a normalized ownership view only when the underlying agreement and standard permit it; the system must not infer this.

## Conditional workflows

### Cover

Create a new sound recording and link it to the existing work. Do not permit the submitting artist to claim composition ownership without evidence.

### Remix

Link source recording and work, capture master-use and derivative authorization, and determine whether the remix is a new sound recording.

### Sample/interpolation

Capture source recording/work, owners, clearance status, shares/fees, term, territory, and restrictions.

### Leased beat

Capture license tier, usage limits, sales/stream caps, exclusivity, composition share, master rights, content-ID restrictions, and upgrade rights.

### Producer points

Capture basis, deductions, recoupment priority, revenue scope, term, audit rights, and payment obligation.

## Conflict resolution

The API should return structured validation errors with affected claim IDs and scopes. It must not silently normalize or discard conflicting claims.
