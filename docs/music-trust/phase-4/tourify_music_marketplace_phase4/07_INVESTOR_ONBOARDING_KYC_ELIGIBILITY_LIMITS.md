# Investor Onboarding, KYC, Eligibility, and Limits

Tourify should not recreate regulated onboarding when a partner already owns it. Store only the minimum synchronized statuses and references needed for the experience and compliance controls.

## Onboarding states

- account_unlinked;
- partner_account_pending;
- identity_review;
- sanctions_review;
- tax_profile_pending;
- eligibility_pending;
- approved_with_scope;
- restricted;
- rejected;
- expired_reverification_required.

## Eligibility dimensions

Eligibility may depend on offering pathway, accreditation, income/net-worth investment limits, sophistication, investor type, jurisdiction, age, sanctions status, tax residence, entity authority, concentration limits, partner risk rating, and offering-specific restrictions.

## Data minimization

Tourify should generally store partner IDs, status, scope, timestamps, expiry, reason codes safe for display, and evidence hashes. Do not store raw identity documents, full tax forms, bank credentials, accreditation documents, or sanctions-screen details unless contractually necessary and specifically secured.

## Reverification and holds

Block new subscriptions and transfers when partner eligibility expires, investor data changes, sanctions or fraud alerts arise, tax forms lapse, or a partner account is suspended. Existing positions remain visible with the correct hold reason.
