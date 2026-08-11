# 10 — Testing Strategy

## Test layers

### Static checks

- TypeScript strict checks.
- Lint.
- Formatting.
- Supabase generated types current.
- Migration lint or project-standard SQL validation.

### Unit tests

- Provider response schemas.
- Audius-to-Tourify mappers.
- Provider registry selection.
- Error normalization.
- Playback state reducer/store.
- Queue, repeat, shuffle, and stale-response protection.
- Analytics event deduplication.

### Integration tests

- Search endpoint with mocked provider.
- Import idempotency.
- Authorization and cross-account denial.
- Playback resolution.
- Database transaction behavior.
- RLS policies.
- Feature flag disabled behavior.

### Component tests

- Audius search modal states.
- Track cards and attribution.
- Global player resolving/loading/error transitions.
- Retry and skip controls.
- Keyboard and screen-reader behavior.

### End-to-end tests

Critical flows:

1. Authorized artist manager searches Audius and imports a track.
2. Imported track appears on public artist profile.
3. Anonymous or authenticated listener starts playback.
4. Playback continues across navigation.
5. User pauses, seeks, resumes, skips, and advances queue.
6. Feed attachment starts the same canonical track.
7. Provider timeout shows retry and does not break native playback.
8. Disabling the flag removes Audius actions while native tracks still work.

### Browser matrix

- Current Chrome desktop.
- Current Safari desktop.
- Current Firefox desktop.
- iOS Safari.
- Android Chrome.

Use the project’s supported browser policy if narrower.

## Fixtures and network behavior

- Use sanitized provider fixtures for unit and CI tests.
- Do not rely on live Audius for deterministic CI.
- Add a limited scheduled smoke test against live provider endpoints if operationally appropriate.
- Never commit secrets or temporary URLs.

## Performance tests

- Search API p95 under expected load.
- Playback resolution p95.
- Click-to-audio start time.
- Global player rerender frequency.
- Queue size behavior.
- Database query plans for provider lookup.

## Migration tests

- Apply migrations to an empty development database.
- Apply to a production-like schema snapshot.
- Verify repeated/idempotent behavior where supported.
- Confirm no existing row becomes invalid.
- Run RLS and duplicate tests.

## Regression focus

- Native uploads.
- Existing track pages.
- Existing playlists.
- Feed audio attachments.
- Player persistence.
- Analytics.
- Mobile controls.
- Authentication and acting-account context.

## Exit criteria

- All critical-path E2E tests pass.
- No P0/P1 regression.
- No unresolved destructive migration warning.
- Provider failure paths tested.
- Browser matrix sign-off recorded.
