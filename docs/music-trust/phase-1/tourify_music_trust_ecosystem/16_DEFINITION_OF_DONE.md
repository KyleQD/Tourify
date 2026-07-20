# Definition of Done

The initial ecosystem foundation is complete only when:

1. Existing upload, preview, commerce, sharing, and Jukebox playback continue working.
2. Public uploads require current rights and AI declarations.
3. AI categories use a versioned policy and are not inferred from missing data.
4. Materially generated or unknown submissions cannot enter human-only public surfaces.
5. Private tracks can remain incomplete without being mislabeled.
6. Every accepted declaration is versioned and reproducible.
7. Original audio remains private and immutable in practice.
8. Source hash and processing status are recorded asynchronously.
9. Acoustic fingerprints are treated as review signals, not legal judgments.
10. Public catalog labels distinguish submitted, recorded, pending, certified, suspended, and revoked states.
11. Certification is an upsell and non-paying artists are not labeled suspicious.
12. Artists can create, submit, view, and withdraw their own certification cases.
13. Artists cannot access another artist's cases or evidence.
14. Review access uses existing audited admin capabilities.
15. Certificate issuance stores a standard version, manifest commitment, status, and public ID.
16. Suspended/revoked certificates lose the badge without deleting track or history.
17. Public verification exposes no private evidence or storage paths.
18. Every material event is auditable.
19. Legacy tracks are migrated through an explicit declaration workflow, not automatically certified.
20. All new tables have reviewed RLS and access grants.
21. Feature flags can disable new entry points and writes without breaking existing music.
22. Unit, route, RLS, integration, and E2E tests pass or baseline failures are clearly isolated.
23. Production migration and rollback procedures are recorded.
24. Human Music Policy, certification claims, appeals, and moderation operations are approved before public launch.
25. The data model can link to future Rights Passport entities without redesigning `artist_music`.
