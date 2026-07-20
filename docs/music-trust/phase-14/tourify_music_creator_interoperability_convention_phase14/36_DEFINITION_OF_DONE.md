# Definition of Done (derived)

Sandbox readiness may be marked `complete_with_blockers` when:

1. Control artifacts exist under `docs/music-trust/phase-14/`
2. Additive migrations create `future_phase14_approval_packages` + `creator_interop_*` with RLS
3. Domain gates block treaty / universal representation / state-IO without packages
4. APIs use `app/api/creator-interoperability-convention/**` with flags default off
5. Admin kill switches and outbox worker exist
6. `/interop-convention` surfaces readiness only
7. Tests cover activation, recognition, approval package, hard flags, Phase 13 isolation
8. Residual blockers are recorded honestly (no fake production DoD)

Production convention launch is **out of scope** until multi-compact evidence years, executed approval packages, and independent reviews exist.
