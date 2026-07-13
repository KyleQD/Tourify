# Tourify Onboarding Boundaries

This document locks the boundary between platform onboarding and staff hiring onboarding.

## Platform onboarding

Platform onboarding creates or enriches a human identity and optional personas.

Use platform onboarding for:

- Account creation
- General profile setup
- Artist persona creation
- Venue persona creation
- Organization setup
- Public profile basics
- Welcome flows after signup

Canonical route:

```txt
/onboarding
```

Platform onboarding should not create staff records, employment assignments, or Work Mode permissions unless the flow is explicitly connected to a hiring invitation.

## Staff hiring onboarding

Staff hiring onboarding turns an approved applicant or invited worker into an operational staff member.

Use staff hiring onboarding for:

- Application approval bridge
- Candidate creation
- Staff invitation token
- Compliance forms
- W-9 / tax / payment setup
- ID and certification uploads
- Waiver collection
- Roster creation
- Work Mode activation

Canonical route:

```txt
/onboarding/hire/[token]
```

Legacy routes should redirect into the canonical staff hiring route during migration:

```txt
/onboarding/[token] -> /onboarding/hire/[token]
/onboarding?token= -> /onboarding/hire/[token]
```

## Rule

Do not mix persona setup with staff compliance paperwork. A user can be an artist, a venue admin, and a hired worker, but each context must stay separate in data and permissions.
