# QA, Performance, and Release Plan

## 1. Test layers

### Unit

- template registry uniqueness and alias resolution;
- capability resolution by surface;
- token schema validation and unknown-key rejection;
- numeric/color/font/asset constraints;
- deterministic sanitizer/compiler output;
- version migration;
- snapshot hashing;
- entitlement decisions;
- default-profile conflict handling; and
- fallback reason selection.

### Component

- shared EPK controls in EPK and post modes;
- template gallery states;
- post semantic regions under every template;
- style boundary leakage checks;
- nested quote/repost roots;
- loading, error, retired, disabled, and standard fallback;
- keyboard and focus behavior;
- reduced motion and forced colors; and
- long/translated/right-to-left content where supported.

### Integration

- create/update/archive/default style profile;
- authorized and unauthorized acting accounts;
- draft save/restore;
- preview/publish parity;
- atomic post + appearance publication;
- published appearance edit and revision;
- cache invalidation;
- deleted/archived source profile;
- asset authorization;
- legacy post read/write; and
- moderation neutralization.

### End to end

Run for each posting account type:

1. select acting account;
2. create a saved style;
3. set default;
4. create a draft;
5. choose/override style;
6. preview feed/mobile/full post;
7. publish;
8. view as author;
9. view as another user in home feed;
10. view on public profile;
11. open permalink;
12. quote/repost;
13. edit appearance;
14. report/moderate if authorized; and
15. verify old posts remain unchanged after default update.

## 2. Template fixture matrix

Every active template must test:

- text only;
- short and very long text;
- single image, gallery, and video;
- link preview;
- event attachment;
- marketplace/listing attachment if supported;
- poll or other current rich post types;
- long author and account names;
- badges/sponsorship/edited labels;
- maximum reaction counts;
- zero and many comments;
- quote/repost with a different template;
- mobile narrow width;
- desktop wide container;
- light/dark surrounding app theme;
- reduced motion;
- browser zoom at 200%;
- high contrast/forced colors; and
- missing optional asset.

Use current post types from the audit rather than assuming the examples are exhaustive.

## 3. Visual regression

Capture:

- all current EPK templates before shared extraction;
- all legacy post variants before renderer changes;
- every template's post-feed, post-detail, and compact adapters;
- four or more mixed templates in one feed viewport;
- nested quote/repost combinations;
- error/fallback states; and
- desktop/mobile breakpoints.

Do not accept a broad snapshot update. Review diffs by component and document intentional changes.

## 4. CSS isolation tests

Automated test fixture:

- mount styled post A, styled post B, legacy post C, app navigation, and a comment composer;
- capture computed styles of sentinel elements before and after each styled post mounts;
- fail on changes outside the intended root;
- test portal menus/tooltips;
- test nested post roots;
- scan emitted CSS for forbidden selectors; and
- verify no position/z-index/overflow escape obscures adjacent controls.

## 5. Accessibility

Required:

- WCAG 2.2 AA for content and controls;
- automated axe or existing equivalent;
- manual keyboard-only pass;
- VoiceOver on macOS/iOS and one additional supported screen reader/browser pair;
- 200% zoom and text scaling;
- reduced-motion behavior;
- forced-colors/high-contrast behavior;
- no color-only state;
- logical heading/landmark order; and
- touch targets consistent with platform minimums.

Required authoring behavior:

- invalid contrast is identified before publish;
- focus moves to error summary then the failing control;
- preview tabs have correct semantics;
- template thumbnails have useful accessible names; and
- disabled controls explain why.

## 6. Security tests

- cross-user style-profile reference;
- cross-organization/venue reference;
- forged acting-account ID;
- role downgrade during open draft;
- archived profile publish;
- retired/disabled template selection;
- unknown schema/template versions;
- raw CSS and selector injection;
- `url()`, data URI, external font/image URL, SVG/script payload;
- oversized/deep JSON;
- NaN/infinite/out-of-range numeric values;
- stolen/private asset ID;
- expired/deleted asset;
- concurrent default updates;
- post-author/appearance-author mismatch;
- cache poisoning across privacy boundaries; and
- moderation neutralization audit.

## 7. Performance budgets

Measure against the repository's current audited baseline. Until the team has stricter platform budgets, use these launch guardrails:

- No more than 10% regression in p75 LCP on representative feed routes.
- No more than 10% regression in p75 INP.
- CLS remains at or below 0.10 and does not materially regress from baseline.
- Viewer JavaScript increase attributable to post styles: target ≤ 20 KB gzip; editor code excluded from viewer path.
- Appearance payload: target ≤ 4 KB compressed per unique post snapshot; measure deduplication/caching.
- No more than three additional font families loaded in one viewport; preferably fewer.
- No per-post network request for appearance.
- No hydration warnings in mixed-style fixtures.
- Smooth scroll/virtualization behavior on a 20+ post mixed-template feed using representative mobile throttling.

If existing platform budgets are tighter, use the tighter values. Any exceeded guardrail requires an approved performance decision and mitigation before rollout.

## 8. Compatibility

Test the currently supported browsers and:

- Safari/iOS;
- Chrome/Android;
- desktop Chrome;
- desktop Safari; and
- any browser in the existing Tourify support matrix.

Verify server/client rendering in authenticated, public, cached, and freshly invalidated states.

## 9. Test data

Create deterministic fixtures, clearly marked as test data:

- at least four authors using different account types;
- one default and two saved styles per author;
- at least one post per template;
- mixed legacy and styled feed;
- different quote/repost style combinations;
- active, retired, disabled, invalid, and missing template snapshots;
- private and public post visibility;
- authorized and unauthorized account members; and
- valid, missing, and rejected assets.

Do not rely on production user data.

## 10. Rollout monitoring

Dashboard by app version, surface, template ID/version, and device class:

- appearance render count;
- standard fallback count/rate/reason;
- renderer exception rate;
- post query duration and payload;
- LCP/INP/CLS;
- editor opened, template selected, previewed, published;
- publish validation failure;
- asset/font failure;
- report rate for styled versus standard posts; and
- moderation neutralization count.

Avoid raw content, raw tokens, account names, and private URLs.

## 11. Rollback runbook

1. Disable `post_styles_write` and editor selection.
2. Disable `post_styles_read` so canonical posts render through the current standard renderer.
3. Keep style records and snapshots intact.
4. Purge/invalidate affected post caches if required.
5. Confirm legacy post creation/viewing remains healthy.
6. Inspect fallback/error/authorization metrics.
7. Patch behind internal flags.
8. Re-enable read for internal accounts, then resume staged rollout.

Do not drop tables or rewrite snapshots during incident response.

## 12. Release sign-off

Required approvals/evidence:

- product acceptance criteria;
- design mixed-feed and template-adapter review;
- EPK visual-regression evidence;
- backend/RLS matrix;
- security test evidence;
- accessibility review;
- performance comparison;
- surface inventory completion;
- dashboard/alert links;
- rollback rehearsal; and
- zero unresolved critical/high issues.
