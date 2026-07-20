# Runbook — Licensing Conflicts and Overgrant Risk

## Triggers

- Disputed/expired authority rows
- Share conflicts across clearance legs
- Suspected overgrant (territory/use/term beyond mandate)
- AI terms bundled into ordinary sync/master quotes

## Steps

1. Open `music_license_conflicts` with severity; mark availability `conflicted` / `inquiry_only`.
2. Freeze quotes/delivery for affected request IDs (kill switches or request status `withdrawn`).
3. Require written mandate + counsel before any Tourify-mediated grant resumes.
4. Compensating corrections only — no silent overwrite of partner/legal docs.
5. If delivery already released incorrectly, revoke delivery row and notify parties.
