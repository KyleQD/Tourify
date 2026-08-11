# Product Requirements

## 1. Product statement

Tourify Post Styles lets every author give their posts a recognizable visual identity using the templates and editing tools already available in the Artist EPK experience. Viewers see the author's selected design on that specific post while the rest of their feed remains unchanged.

This is a post-presentation feature, not a feed-theme feature.

## 2. Goals

- Give every user a distinct, repeatable visual language for posts.
- Reuse the quality and familiarity of the EPK editor.
- Make the chosen style consistent anywhere the post appears.
- Keep feeds readable, fast, accessible, and visually stable when many styles appear together.
- Preserve one maintainable source of truth for templates, tokens, assets, and validation.
- Keep existing posts and existing EPK output fully compatible.

## 3. Non-goals

- Restyling a viewer's entire home feed.
- Restyling navigation, comments, composer chrome, account dashboards, or unrelated cards.
- Allowing arbitrary CSS, HTML, scripts, third-party fonts, or unmoderated remote assets.
- Rebuilding the EPK page editor inside a post card.
- Applying an author's style to posts written by someone else.
- Changing post ranking, audience, moderation, ownership, or visibility rules.
- Automatically changing already-published posts when an author edits their default style.
- Replacing the existing post content model.

## 4. Users and permissions

The base feature is available to:

- General accounts;
- Artist accounts;
- Venue accounts;
- Organization accounts; and
- Any other account type currently authorized to create a post.

The author must own or be authorized to act as the account publishing the post. Account switching and delegated posting must use Tourify's resolved acting-account context; a client-provided author ID is never sufficient authorization.

The architecture may support future free/premium entitlements at the template registry level. The initial implementation must not scatter account-plan checks across renderers or APIs.

## 5. Core behavior

### 5.1 Style ownership

- A user/account may create reusable post-style profiles.
- A user/account may designate one profile as its default.
- A post may use:
  - the author's default style;
  - another style profile owned by that author/account;
  - a one-post customization derived from an owned style; or
  - the current standard Tourify post style.
- When published, the resolved, sanitized appearance is snapshotted onto the post.

### 5.2 Rendering boundary

The appearance may control only approved presentation tokens within the post root:

- background color/design/texture;
- color palette;
- typography choices from the approved catalog;
- border, radius, shadow, and divider treatment;
- spacing/density within safe limits;
- media framing and aspect treatment;
- header/byline treatment;
- reaction/action-bar treatment;
- approved decorative elements;
- approved animations with reduced-motion alternatives.

It may not control:

- the page or feed background;
- widths outside the assigned post container;
- fixed or sticky positioning;
- z-index outside the post stacking context;
- arbitrary URLs or executable content;
- comment, report, block, safety, or moderation controls;
- semantic order or accessibility labels;
- visibility of required author, timestamp, sponsorship, edited, or moderation indicators.

### 5.3 Template reuse

The current EPK template registry is the canonical template source. Implementation must:

1. inventory all active template IDs, aliases, editor controls, assets, and token defaults;
2. separate shared visual tokens from EPK page-layout concerns;
3. provide a `post` adapter/variant for each compatible template;
4. preserve template identity and versioning;
5. document unsupported controls or templates in a parity matrix; and
6. prevent EPK and post template definitions from drifting.

Template names must be loaded from the registry rather than duplicated in a new hardcoded list.

### 5.4 Where styles appear

Required:

- home/following feed;
- author's own feed;
- public profile post list;
- post detail/permalink;
- repost/quote-post original-post preview; and
- composer preview.

Audit-dependent:

- search/discovery results;
- notifications/activity cards;
- group feeds;
- event/tour/community feeds;
- embeds;
- link unfurls/Open Graph images; and
- administrative moderation views.

Audit-dependent surfaces must be classified as:

- full styled rendering;
- compact approved variant;
- neutral preview that links to the styled permalink; or
- intentionally unstyled operational view.

The same post must not receive contradictory full styles across two equivalent viewer surfaces.

## 6. Functional requirements

### PR-01 — Template selection

The composer provides a Style control with template thumbnails generated from the shared registry. The author can select a template before publishing.

### PR-02 — Shared editing controls

The composer exposes the same approved editing controls as the current EPK editor through reused components or a shared schema-driven control layer. Controls irrelevant or unsafe for posts are disabled with an explanation, not silently ignored.

### PR-03 — Live preview

The author can preview the post in:

- feed card;
- profile feed;
- full post; and
- mobile width.

Preview must use the production renderer and sanitized configuration.

### PR-04 — Saved style profiles

The author can save, name, duplicate, edit, archive, and select reusable post-style profiles. Deleting a profile must not break published posts because each post contains a snapshot.

### PR-05 — Default style

The author can set one default. New drafts inherit it. Changing the default affects future drafts only unless the author explicitly applies it to an unpublished draft.

### PR-06 — Per-post override

The author may change style settings for one post without modifying the reusable profile. The UI clearly labels this as a custom version.

### PR-07 — Edit published post

If current authorization rules allow content editing, the author may also change its appearance. Saving creates a new appearance revision, updates `edited_at` according to product policy, and retains audit history.

### PR-08 — Draft recovery

Draft content and style configuration are saved together. If a template is retired while a draft is open, the author receives a safe fallback and a non-blocking explanation.

### PR-09 — Viewer rendering

Every viewer receives the sanitized published snapshot. Viewer identity must not change author style, except for platform accessibility overrides such as reduced motion, forced colors, or unavailable font fallback.

### PR-10 — Legacy fallback

Posts without an appearance snapshot render through the current post component with no layout or visual regression.

### PR-11 — Template retirement

A retired template remains renderable for historical posts while being unavailable for new selection. A disabled/unsafe template may map to a documented safe fallback.

### PR-12 — Asset handling

Authors may use only assets already authorized by the EPK asset picker or a shared approved asset service. Private storage paths and signed URLs must never be stored in public snapshots.

### PR-13 — Reporting and moderation

Styled posts retain all existing report, block, hide, delete, copyright, sponsorship, and moderation controls. Moderators have an option to view a neutral style when readability or deceptive presentation is a concern.

### PR-14 — Analytics

Track:

- style panel opened;
- template selected;
- style profile saved/set as default;
- styled post published;
- renderer fallback reason;
- impressions and engagement by template/version;
- render duration;
- texture/font load failure; and
- style disabled by accessibility or safety policy.

Never include raw user content or private asset URLs in analytics events.

## 7. Business and product rules

- Style never alters reach or ranking by itself.
- Sponsored, affiliate, external checkout, and moderation labels remain platform-controlled.
- Reposts preserve the original author's appearance inside the original-post boundary. The reposter's caption uses the reposter's chosen appearance outside that nested boundary.
- A quote post may therefore contain two isolated appearance roots, never merged tokens.
- Deleted or archived style profiles do not mutate existing post snapshots.
- The platform may impose size, contrast, animation, font, and texture limits for usability.
- Template/version migration must be deterministic and reversible.

## 8. Acceptance criteria

1. Two adjacent posts from different authors render with different templates and neither alters the other or the feed shell.
2. The same post appears with the same approved style in home feed, profile feed, and permalink.
3. A user changes their default style; an old post remains unchanged and a new draft inherits the new default.
4. A user creates a per-post override without changing the saved profile.
5. An unauthorized user cannot select, modify, or publish with another user's style profile.
6. Malformed or out-of-range tokens are rejected server-side and render using a safe fallback.
7. Every active EPK template has a parity-matrix status and a verified post preview.
8. Existing EPK visual snapshots pass after shared-code extraction.
9. Legacy posts pass existing visual and interaction tests.
10. Nested quote/repost styles remain isolated.
11. Required metadata and moderation controls remain readable and operable in every template.
12. Accessibility and performance budgets pass on a feed containing at least 20 mixed-style posts.

## 9. Success measures

Initial 30-day indicators:

- percentage of active authors who preview a style;
- percentage who publish at least one styled post;
- repeat usage of a saved style profile;
- styled-post publish completion versus unstyled composer baseline;
- engagement segmented by placement and template, without implying causation;
- fallback/error rate;
- feed Core Web Vitals and scroll stability; and
- accessibility issue and report rates.

## 10. Open decisions with recommended defaults

| Decision | Recommended default |
| --- | --- |
| Do old posts update when a default changes? | No; immutable published snapshot |
| Can an author update a published post's style? | Yes, if they can edit the post; retain revision history |
| Can a post have no custom style? | Yes; current Tourify default |
| Can users save multiple styles? | Yes; one default, multiple reusable profiles |
| Can template access become premium later? | Yes; entitlement metadata in registry |
| Should compact surfaces show full styling? | Use a compact adapter or neutral preview based on audit |
| Are custom CSS/HTML allowed? | No |
| Are all current EPK controls automatically valid? | Same editor source, but post capability rules may constrain unsafe/inapplicable values |
