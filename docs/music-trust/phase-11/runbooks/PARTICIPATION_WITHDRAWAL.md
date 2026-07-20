# Runbook: Participation Withdrawal

1. Participant DELETE `/api/creator-public-infrastructure/participation?id=...`.
2. Status becomes `withdrawn`; outbox event `participation.withdrawn` queued.
3. Deactivate linked sandbox identifiers.
4. Withdrawal does not alter Tourify account, Phase 8–10 memberships, or Rights Passport.
