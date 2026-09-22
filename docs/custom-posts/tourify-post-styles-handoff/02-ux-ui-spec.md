# UX/UI Specification

## 1. Experience principle

The feature should feel like choosing an album sleeve for a post, not opening a separate website builder. The composer remains familiar. Styling is discoverable, visual, and deep when wanted, but it never blocks a quick post.

## 2. Information architecture

### Composer

Add a `Style` control alongside existing post options such as media, audience, or scheduling. Opening it reveals a responsive style workspace:

- template gallery;
- customization controls;
- saved styles;
- preview modes; and
- reset/use-standard-style action.

### Account settings

Add `Post styles` under profile/content appearance settings:

- default style;
- saved styles;
- create;
- duplicate;
- rename;
- edit;
- set default; and
- archive/delete.

Do not place this under global feed preferences because it does not change how the user views other authors.

## 3. Author flows

### Flow A — Quick publish with default

1. Author opens the composer.
2. Draft inherits the acting account's default style.
3. A compact Style chip shows the template/profile name and thumbnail.
4. Author writes the post and publishes.
5. Server resolves and snapshots the style with the post.
6. Published confirmation opens the real styled post.

If no default exists, the standard Tourify post design is used and the Style chip reads `Standard`.

### Flow B — Choose a template for one post

1. Author opens `Style`.
2. Template gallery displays live thumbnails from the EPK registry.
3. Author selects a template.
4. Preview updates through the production post renderer.
5. Author may customize approved controls.
6. UI labels the result `Custom for this post`.
7. Author publishes or selects `Save as reusable style`.

### Flow C — Create a reusable style

1. Author opens `Post styles` or chooses `Save as reusable style` in the composer.
2. Author selects an EPK template.
3. Author edits using shared EPK controls.
4. Author names the style.
5. Author previews feed, profile, full post, and mobile modes.
6. Author saves and optionally sets it as default.

### Flow D — Change default

1. Author selects a saved style.
2. Author chooses `Set as default`.
3. Confirmation says: `New drafts will use this style. Published posts will not change.`
4. New drafts inherit the profile; existing drafts keep their saved draft state.

### Flow E — Edit a published post's appearance

1. Authorized author opens post actions and chooses `Edit post`.
2. Content and Style are both available.
3. Style preview shows the current published snapshot.
4. Saving runs the same validation as publishing.
5. The new appearance revision becomes canonical on every viewer surface.

### Flow F — Viewer sees mixed styles

1. Viewer scrolls a normal Tourify feed.
2. Each styled post renders within its own boundary.
3. Adjacent posts may use different visual identities.
4. Navigation, feed spacing, comments, and system actions remain consistent.
5. Opening the post retains the same identity in the expanded format.

## 4. Composer layout

### Desktop

- Left/main column: editable post preview.
- Right panel: Template, Colors, Type, Background, Texture, Shape, Media, Motion, and Saved Style controls generated from the shared editor schema.
- Top preview bar: `Feed`, `Profile`, `Full post`, `Mobile`.
- Bottom actions: `Reset`, `Save as style`, `Apply to post`.

### Mobile

- Composer remains the primary screen.
- Style opens as a full-height sheet.
- Template carousel appears first.
- Controls use collapsible sections.
- Preview is sticky at the top or accessible through a `Preview` tab.
- Primary action remains reachable above the safe area.

## 5. Template gallery

Each template tile includes:

- registry-provided display name;
- post-specific thumbnail;
- active, premium, retired, or unavailable state;
- current selection indicator; and
- `Preview` action where hover is unavailable.

Do not use generic placeholder icons. Thumbnails should be rendered from deterministic sample post data through the same post template adapter.

Templates must be grouped by registry metadata, not duplicated arrays. Legacy aliases should resolve to the canonical template and not appear twice.

## 6. Editing controls

Use the same control components and defaults as the EPK editor. Introduce a capability map so the UI can accurately show whether a control is:

- fully supported in post cards;
- supported with bounded values;
- supported only on full-post view;
- represented by a post-specific equivalent; or
- unavailable because it is page-layout-specific or unsafe.

Example:

| EPK control | Post treatment |
| --- | --- |
| Palette | Same control and token values |
| Typography | Same approved font catalog; bounded sizes |
| Background | Same colors/designs/textures; scoped to post |
| Card radius/border/shadow | Same control; bounded values |
| Media treatment | Same asset/framing control where applicable |
| Section layout/order | Mapped to post regions, not EPK sections |
| Page navigation | Not applicable |
| Custom domain/page metadata | Not applicable |
| Motion | Same approved presets with reduced-motion fallback |
| Raw CSS/HTML, if present | Never supported |

When a control is not applicable, show a short reason. Never let a user edit a value that will disappear at publish time.

## 7. Post anatomy and styling limits

The shared post component should retain stable semantic regions:

1. author identity;
2. audience/sponsorship/edited metadata;
3. post text;
4. attached media/link/event/item;
5. quote/repost content;
6. reactions and actions; and
7. optional inline comment preview.

Templates apply approved variants and tokens to these regions. Required identity and safety information cannot be removed, visually hidden, or reordered in a misleading way.

## 8. Nested posts

For quote posts and repost previews:

- the outer author style wraps only the outer content;
- the original post renders inside its own isolated style root;
- nesting depth is capped by the current product rule;
- both roots use a local stacking context;
- the original author and source remain unambiguous; and
- interaction controls are not duplicated confusingly.

## 9. UI states

### Loading

- Render feed card geometry immediately.
- Use a neutral token skeleton; do not flash the wrong author style.
- Load optional texture/font assets without changing card dimensions.

### Empty

`No saved styles yet. Start with an EPK template and make it yours.`

### Validation warning

`This color combination is hard to read. Choose an accessible option before publishing.`

### Retired template

`This template still works on published posts, but it is no longer available for new posts. Choose a current template to continue editing.`

### Fallback

Viewer-facing fallback is silent and uses the standard Tourify post appearance. Author/editor-facing surfaces show:

`We couldn't load this post style, so the standard design is being shown.`

### Offline/draft recovery

Preserve the last locally valid style state and clearly distinguish unsynced changes.

## 10. Recommended interface copy

| Element | Copy |
| --- | --- |
| Composer control | `Style` |
| Standard state | `Standard` |
| Default indicator | `Your default` |
| One-post override | `Custom for this post` |
| Save action | `Save as reusable style` |
| Reset action | `Use standard style` |
| Default confirmation | `Use for new posts` |
| Existing-post notice | `Published posts keep their current style.` |
| Preview modes | `Feed`, `Profile`, `Full post`, `Mobile` |

## 11. Responsive and accessibility behavior

- Minimum body-text contrast: WCAG AA.
- Never encode post metadata or interactive state using color alone.
- Decorative textures receive no screen-reader output.
- Typography scale uses bounded `clamp()` values and cannot reduce body copy below the platform minimum.
- Respect `prefers-reduced-motion`.
- Preserve logical DOM order even if a template changes visual placement.
- All Style controls are keyboard reachable and have persistent labels.
- Screen-reader announcements describe template selection and validation state, not every visual token.
- Forced-colors mode may neutralize decorative styling while preserving content and actions.
- Viewer text-size and zoom settings must not cause clipping or hidden actions.

## 12. Design deliverables required before implementation sign-off

- EPK-to-post control parity matrix.
- Post adapter thumbnail for every active template.
- Desktop and mobile composer flows.
- Feed, profile, and permalink mockups with at least four adjacent mixed styles.
- Quote-post nested-style example.
- Standard, loading, fallback, retired-template, and validation-error states.
- Keyboard order and screen-reader annotations.
- Token-limit specification for typography, spacing, motion, texture, and contrast.
