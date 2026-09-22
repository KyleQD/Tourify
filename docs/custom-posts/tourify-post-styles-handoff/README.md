# Tourify Custom Post Styles

Development plan and engineering handoff  
Version: 1.0  
Prepared: July 27, 2026

## Outcome

Every Tourify user can publish posts using the same approved templates and visual editing controls already available in the Artist EPK editor. A post keeps the author's chosen appearance wherever that post is rendered, including:

- the author's own feed;
- another user's home or following feed;
- the author's public profile feed;
- the post permalink/detail view; and
- supported discovery, repost, and shared-post surfaces.

The style applies only inside that post's visual boundary. It must never restyle the surrounding feed, adjacent posts, navigation, page background, comments, or another author's content.

## Product decisions

1. **One shared style system:** extract or reuse the EPK template registry, design-token schema, asset catalog, validation, and editor controls. Do not fork them into a separate post-only implementation.
2. **Post-safe rendering:** post styling uses the same controls and templates through a constrained post renderer. EPK page structure is not copied into a feed card.
3. **Author default plus per-post choice:** a user may set a default post style and may override it while composing an individual post.
4. **Immutable publication snapshots:** publishing stores a sanitized appearance snapshot on the post. Later changes to a user's default do not silently redesign old posts.
5. **Legacy-safe rollout:** posts without an appearance record continue to use the current standard renderer.
6. **Universal access:** the base capability is available to all user/account types. Entitlement controls may later restrict premium templates, but must not be hardcoded into the renderer.
7. **No arbitrary code:** do not accept raw CSS, HTML, JavaScript, remote font URLs, or unapproved asset URLs from users.

## Package contents

| File | Purpose |
| --- | --- |
| `01-product-requirements.md` | Scope, rules, requirements, acceptance criteria, and success measures |
| `02-ux-ui-spec.md` | Author and viewer flows, editor states, responsive behavior, and interface copy |
| `03-technical-architecture.md` | Shared style engine, rendering boundaries, component design, performance, and observability |
| `04-data-api-security.md` | Proposed schema, API contracts, RLS, validation, migration, and rollback |
| `05-implementation-plan.md` | Phases, detailed task breakdown, dependencies, gates, and definition of done |
| `06-qa-release.md` | Test matrix, accessibility/performance budgets, rollout, monitoring, and rollback |
| `07-codex-implementation-prompt.md` | Ready-to-use repository implementation prompt |
| `tourify-post-styles-plan.json` | Machine-readable execution plan and completion gates |

## Required implementation order

1. Audit the live EPK implementation and current post render paths.
2. Publish an audit report and parity matrix before changing shared components.
3. Extract a shared, typed style contract without changing existing EPK output.
4. Add additive database/API support and legacy fallbacks.
5. Build the post-safe renderer and composer controls.
6. integrate every supported post surface.
7. Verify security, accessibility, performance, and visual parity.
8. Release behind feature flags with a controlled rollout.

## Non-negotiable completion gates

- Existing EPKs render identically before and after extraction.
- A styled post never leaks styles outside its root element.
- Each supported EPK template can render through the post-safe adapter or is explicitly marked unsupported with a documented reason.
- A post has one canonical appearance across all supported render surfaces.
- Unstyled and legacy posts are unchanged.
- Authorization is enforced server-side; clients cannot assign another user's style profile or assets.
- Invalid tokens and retired templates fail safely to the current default post design.
- Mobile, keyboard, screen-reader, reduced-motion, and high-contrast checks pass.
- Feed performance stays inside the budgets in `06-qa-release.md`.

## Assumptions to verify during the repository audit

- “Artist EPK” is the editor and template system referenced by the request.
- The EPK template registry currently includes core templates and legacy aliases; code is the authority, not the names remembered in planning.
- Tourify posts have a canonical record used by the home feed, profile feed, and detail view.
- The current stack remains Next.js App Router, React, TypeScript, Supabase, and Tailwind/shadcn.

If any assumption is false, update the audit, architecture decision record, and JSON plan before implementation. Do not silently change the product behavior.
