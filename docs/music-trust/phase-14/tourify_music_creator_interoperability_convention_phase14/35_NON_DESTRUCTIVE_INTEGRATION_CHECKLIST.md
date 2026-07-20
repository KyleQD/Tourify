# Non-destructive integration checklist

- [x] No DB reset
- [x] Additive migrations only
- [x] Preserve `artist_music`, stream, `resolveMusicAccess`, Jukebox
- [x] Separate Phase 14 flags (not Phase 13)
- [x] Handoff durable table `future_phase14_approval_packages`
- [x] Phase 13 constitutions referenced as inputs only
- [x] Hard-disabled: treaty, universal representation, state/IO, collective, irreversible transfer, emergency
- [x] Public projections separate from confidential operational tables
- [x] Append-only audit + outbox
- [ ] Remote migration apply / advisors (ops approval required)
- [ ] Limited production (separate approval)
