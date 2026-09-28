# Technical Architecture

## 1. Architectural objective

Create a shared design system that both EPKs and posts consume while allowing each surface to keep its own semantic layout. The reusable layer is templates, tokens, assets, editing schema, versioning, validation, and compilation—not the complete EPK page component.

## 2. Audit before implementation

The repository audit must locate and document:

- EPK template registry and every active/legacy template ID;
- EPK editor state shape, defaults, validation, migrations, and persistence;
- editor control components and asset pickers;
- fonts, backgrounds, textures, theme assets, and storage rules;
- EPK renderer entry points and template-specific components;
- post create/edit actions and API routes;
- canonical post type and database tables;
- every post renderer and feed query;
- acting-account resolution and entitlement logic;
- moderation/reporting components;
- analytics events;
- feature-flag system;
- caching, SSR/RSC/client boundaries, and virtualization; and
- existing tests, Storybook stories, screenshots, and visual baselines.

Deliver `docs/post-styles/EPK_POST_STYLE_AUDIT.md` and `EPK_POST_PARITY_MATRIX.md` before shared-code extraction.

## 3. Target layers

### Layer A — Shared appearance domain

Recommended module boundary, adapted to the repository:

```text
lib/appearance/
  contracts.ts
  schema.ts
  template-registry.ts
  aliases.ts
  capabilities.ts
  token-defaults.ts
  sanitize.ts
  migrate.ts
  compile.ts
  asset-policy.ts
  entitlements.ts
  telemetry.ts
```

Responsibilities:

- typed template and token contracts;
- canonical template IDs and alias resolution;
- registry metadata and surface capabilities;
- JSON schema/runtime validation;
- template-version migrations;
- asset allowlisting;
- token sanitization and bounded values;
- entitlement decisions;
- deterministic compilation to scoped CSS variables/class variants; and
- fallback reason codes.

This layer must be presentation-framework-light and testable without mounting the full EPK or post UI.

### Layer B — Shared editor controls

Recommended boundary:

```text
components/appearance-editor/
  appearance-editor.tsx
  template-gallery.tsx
  control-renderer.tsx
  preview-switcher.tsx
  controls/
```

The editor reads a schema/capability map:

```ts
type AppearanceSurface = "epk" | "post-feed" | "post-detail" | "post-compact";

type ControlCapability =
  | { status: "supported" }
  | { status: "bounded"; constraints: Record<string, unknown> }
  | { status: "adapted"; adapter: string }
  | { status: "unsupported"; reason: string };
```

The same controls render for EPK and post surfaces with appropriate capabilities. Do not copy JSX into a new post editor.

### Layer C — Surface adapters

EPK and posts keep separate semantic renderers:

```text
components/epk/appearance/...
components/posts/appearance/
  styled-post-root.tsx
  post-template-adapter.tsx
  post-regions.tsx
  post-style-boundary.tsx
  standard-post-fallback.tsx
```

Each template declares surface adapters:

```ts
interface AppearanceTemplateDefinition {
  id: string;
  version: number;
  label: string;
  aliases?: string[];
  tokens: AppearanceTokenDefaults;
  capabilities: Record<AppearanceSurface, TemplateSurfaceCapability>;
  adapters: {
    epk: EpkTemplateAdapter;
    postFeed?: PostTemplateAdapter;
    postDetail?: PostTemplateAdapter;
    postCompact?: PostTemplateAdapter;
  };
  entitlement?: TemplateEntitlement;
  lifecycle: "active" | "retired" | "disabled";
}
```

Template metadata remains centralized. Page-layout components may remain EPK-specific.

## 4. Rendering boundary

Every styled post mounts one isolated root:

```tsx
<article
  data-post-id={post.id}
  data-post-appearance
  data-template={resolved.templateId}
  data-template-version={resolved.templateVersion}
  className={compiled.rootClassName}
  style={compiled.cssVariables}
>
  <PostSemanticRegions post={post} variants={compiled.variants} />
</article>
```

Rules:

- CSS selectors begin at `[data-post-appearance]`.
- Prefer inline CSS custom properties and locally generated classes.
- Never generate a global `body`, `html`, `:root`, tag-only, or unscoped selector from user data.
- Root uses `isolation: isolate`, bounded overflow behavior, and a local stacking context.
- Avoid Shadow DOM unless the existing stack proves CSS isolation cannot be guaranteed; it complicates accessibility, portals, and Tailwind styling.
- Portaled menus/tooltips render using platform UI tokens, not post tokens.
- Comment composers and destructive/moderation dialogs remain platform-styled.

## 5. Token contract

Use the existing EPK contract where possible. If it is untyped or page-specific, create a versioned shared contract:

```ts
interface AppearanceSnapshotV1 {
  schemaVersion: 1;
  templateId: string;
  templateVersion: number;
  tokens: {
    color: AppearanceColorTokens;
    typography: AppearanceTypographyTokens;
    surface: AppearanceSurfaceTokens;
    spacing: AppearanceSpacingTokens;
    media: AppearanceMediaTokens;
    decoration: AppearanceDecorationTokens;
    motion: AppearanceMotionTokens;
  };
  approvedAssets: ApprovedAppearanceAssetRef[];
  compiledAt: string;
}
```

Never persist compiled arbitrary CSS. Persist validated semantic tokens and compile them in trusted application code.

Server and client validation must share the same source. Server validation is authoritative.

## 6. Snapshot resolution

At draft creation:

1. resolve acting account;
2. load the account default style profile;
3. copy its editable configuration into draft style state; and
4. record source profile/template versions for conflict messaging.

At publish:

1. authorize post creation for the acting account;
2. load any referenced style profile by owner and ID;
3. merge permitted one-post overrides;
4. resolve aliases and template version;
5. validate tokens and assets;
6. enforce capabilities and entitlements;
7. compile a preview-equivalent resolved appearance;
8. store semantic immutable snapshot plus source metadata atomically with the post; and
9. emit safe analytics.

At render:

1. parse snapshot by schema version;
2. migrate deterministically if necessary;
3. resolve historical template renderer;
4. sanitize defensively;
5. compile tokens;
6. render the appropriate surface adapter; or
7. record a reason code and use standard-post fallback.

## 7. Server/client strategy

- Resolve appearance data with the post query to avoid per-card requests.
- Validate and prepare snapshot server-side.
- SSR/render initial styles as variables to avoid a flash of the standard theme.
- Keep the read renderer mostly server-compatible.
- Load interactive editor controls only when the Style panel opens.
- Use the same renderer for editor preview and production; preview accepts only sanitized draft output.
- Do not execute template logic fetched from the database.

## 8. Feed query and type changes

Extend the canonical post DTO once:

```ts
type PostAppearanceDTO =
  | {
      mode: "styled";
      templateId: string;
      templateVersion: number;
      schemaVersion: number;
      snapshot: AppearanceSnapshot;
    }
  | {
      mode: "standard";
      fallbackReason?: PostAppearanceFallbackReason;
    };
```

All feed surfaces should consume the same canonical transformer. Avoid separately decoding JSON in multiple pages/components.

Select only the fields required to render. If snapshots are large, split approved asset metadata from the token payload and measure before adding another network request.

## 9. Asset and font strategy

- Reuse the approved EPK asset catalog and storage authorization.
- Store stable asset IDs/paths, never expiring signed URLs.
- Convert stable IDs to public or signed delivery URLs at render time according to privacy.
- Limit texture dimensions and bytes.
- Pre-generate responsive image variants.
- Load optional textures lazily.
- Use a finite, locally declared or platform-hosted font catalog.
- Subset fonts when permitted and preconnect/preload only likely above-the-fold assets.
- Prevent a feed with 20 styles from loading 20 font families; define a per-viewport font budget and fallback strategy.

## 10. Performance controls

- Cache compiled output by `(snapshot hash, surface, renderer version)`.
- Calculate a stable snapshot hash server-side.
- Memoize style compilation and template adapter lookup.
- Avoid runtime CSS-in-JS rule insertion per post when CSS variables suffice.
- Ensure style selection does not change card dimensions after hydration.
- Reserve media dimensions.
- Cap animation count and disable offscreen animation.
- Defer editor code from viewer bundles.
- Add a mixed-template feed performance fixture.

## 11. Error isolation

An invalid appearance must never make the post unreadable or crash the feed:

- validate each snapshot independently;
- wrap template adapter failures at post level;
- report a structured fallback reason;
- render current standard post;
- retain content/actions; and
- do not retry repeatedly in the browser.

Recommended reason codes:

```text
missing_snapshot
invalid_schema
unknown_template
disabled_template
unsupported_surface
invalid_asset
token_constraint_failed
renderer_error
entitlement_mismatch
```

Do not expose sensitive diagnostic detail to viewers.

## 12. Versioning

Version three separate concerns:

- `schemaVersion`: serialized token contract;
- `templateVersion`: visual defaults/adapter behavior; and
- `rendererVersion`: application compiler/render logic.

Historical posts should render through retained compatible adapters. Destructive migrations require:

- idempotent migration function;
- dry run and counts;
- before/after snapshot fixtures;
- reversible database migration where feasible; and
- explicit rollout gate.

## 13. Observability

Add structured logs and metrics for:

- appearance validation failure by reason;
- fallback rate by template/version/surface;
- renderer exceptions;
- server compile duration;
- client hydration mismatch;
- asset/font failures;
- styled feed LCP/INP/CLS;
- editor open-to-publish funnel; and
- post engagement dimensions using template IDs, never raw tokens.

Create alerts for a fallback spike or measurable feed performance regression.

## 14. Architecture decision records

Implementation should add ADRs for:

1. shared tokens and registry versus duplicated EPK/post templates;
2. semantic snapshot versus live style-profile reference;
3. scoped CSS variables versus Shadow DOM;
4. template lifecycle/versioning;
5. asset/font budget; and
6. compact surface behavior.
