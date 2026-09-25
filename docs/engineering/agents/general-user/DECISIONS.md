# General User decisions

Append decisions using:

## DOMAIN-NNN — title

- Date:
- Status: proposed | accepted | superseded
- Task:
- Decision:
- Evidence:
- Consequences:

## DOMAIN-014 — `profiles.custom_url` is retired; `profiles.username` is the canonical public handle

- Date: 2026-09-25
- Status: accepted
- Task: USER-003 (Wave 35, objective 1)
- Decision: Every `profiles.custom_url` column use in the general-user grant is removed. `custom_url` remains only as a request/response alias of `username` on `/api/profile/update`, `/api/profile/update-optimized` and `/api/profile/current`, so `components/settings/enhanced-profile-settings.tsx` and `profile-settings-optimized.tsx` keep working. `app/api/settings/route.ts` is a consumer of neither: its `calculate_venue_profile_completion` RPC call is deleted outright and the route now scopes `profile_id` to the authenticated subject on both verbs.
- Evidence: Scoped tsc (`/tmp/tsconfig.user-wave35-obj1.json`, `app/api/profile/**`, `app/api/settings/**`, `lib/seo/**`, `lib/profile/**`) measured 36 primary diagnostics before and 21 after. The 15 removed are exactly: 10 `profiles.custom_url` errors in `lib/seo/public-preview-readers.ts`, 1 `calculate_venue_profile_completion` error in `app/api/settings/route.ts`, and 4 in `app/api/profile/[username]/route.ts` (two of which — the undeclared `baseSocialLinks` spread and the `profile_experience` reshape — were runtime `ReferenceError`/type failures, not diagnostics-only). The re-derivation contradicts the inventory: the inventory attributed `custom_url` to `lib/public-artist/get-public-artist-profile.ts` (no such reference at HEAD or in the worktree) and `calculate_venue_profile_completion` to two search routes (no such reference). `rg` for `calculate_venue_profile_completion` excluding `docs/` returns only `app/api/settings/route.ts` and the archived DDL `supabase/migrations_backup/20250120300000_enhance_venue_profiles_comprehensive.sql`, confirming the discover lane's independent measurement.
- Consequences: The inventory's `tscDiagnosticHits` are upper bounds and its `tscFiles` are file-level, not line-level; three lanes have now found this independently. The two remaining attribution gaps are routed by handoff. Cross-references: `HF-DISC-002-DRIFT-SEO-SETTINGS` (discover share closed, the seo-cluster and settings-route items now closed by this work), `HF-DB008-TYPECHECK-SEO`, `HF-DB008-TYPECHECK-SEARCH`.

## DOMAIN-015 — `profiles.show_phone` is the sole phone publication gate; `profiles.phone` is never read

- Date: 2026-09-25
- Status: accepted
- Task: USER-005 (Wave 35, objective 2)
- Decision: The canonical phone storage is `profiles.profile_data.phone` (with `profiles.metadata.phone` as the legacy mirror). The sole publication gate is the `profiles.show_phone` boolean column. Two repairs, deliberately asymmetric: `app/api/profile/custom-design/route.ts` repoints the self-preview to the canonical storage under the **unchanged** gate, because the value is the authenticated caller's own; `lib/profile/custom-profile-prompt.ts` is pinned to `phone: null`, because that snapshot is serialized into a third-party model prompt and repointing it would move a real phone number across a trust boundary.
- Evidence: `profiles.show_phone` is created by `supabase/migrations/20250819100000_profiles_expand_fields.sql:49-51` (`add column show_phone boolean default false`) and appears at `lib/database.types.ts:14272` (Row), `:14326` (Insert) and `:14380` (Update). A 52-column read of the `profiles` Row block in the generated contract confirms `show_phone`, `show_email`, `show_location` and **no** `phone`, `display_name` or `custom_url`. Gate inventory: `lib/profile/general-public-profile.ts:27` (public, unchanged), `lib/profile/custom-profile-prompt.ts:88` (self prompt, pinned), `app/api/profile/custom-design/route.ts:126,129` (self preview, repointed), `app/api/connect/sessions/route.ts:146` (outside every grant, handed off). Writer inventory: `app/api/settings/profile/route.ts:85` writes the column; `app/api/profile/update/route.ts` writes `metadata.show_phone` only and did not gain the column write.
- Consequences: The residual `metadata.show_phone` versus column divergence is a product decision with opposite privacy consequences in each direction and is escalated, not unified. See `HF-USER-035-PHONE-GATE-WRITERS`. No surface was made more permissive; the test that proves it is in `__tests__/profile/profile-contact-privacy.test.ts`.

## DOMAIN-016 — The general-user MFA surface is dead; retire it in the importer-first order

- Date: 2026-09-25
- Status: accepted
- Task: USER-005 (Wave 35, objective 4)
- Decision: Retire, do not adopt. `hooks/use-mfa.ts` is deleted. `lib/services/mfa.service.ts` and its two store modules are routed by handoff to integrations (test) then design-system (service), because the ordering constraint is strict: deleting a service whose importer is still alive trades 40 object diagnostics for a `TS2307` in a file this lane does not own.
- Evidence: The only two importers of `lib/services/mfa.service.ts` in the repository are `hooks/use-mfa.ts:3,8` and `__tests__/integrations/mfa.service.test.ts:92`; `lib/services/mfa.service.ts:5,9,10` import the SMS and store modules, and `mfa-verification-code-store.server.ts:18` imports the client store. Zero importers exist for the hook. The `user_mfa_*` relations the service reads are created by no SQL file under `supabase/`. Diagnostic value quoted from the design-system lane's preserved scoped run (`.agents/tmp/scope-results/pre-del-C1.raw.txt`): 40 in `mfa.service.ts`, 1 in `mfa-verification-code-store.server.ts`; this lane's own re-measurement did not complete in a 10-minute bound because the module triggers `TS2589` at six sites.
- Consequences: MFA remains a product requirement; this second-generation implementation is not. Step 3 of the unlock requires the venue lane because `lib/supabase/service-role-legacy-imports.json:193` lists `mfa-verification-code-store.server.ts`. See `HF-USER-035-MFA-DEAD-SURFACE-UNLOCK`.
