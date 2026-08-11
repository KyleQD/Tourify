# Admin Feature Spec Builder — Design System

Preserve consistency with the existing admin dashboard. Do not invent a parallel visual language.

## Chrome (required for new/updated pages)

```
AdminPageHeader
→ optional AdminStatCard / filter bar
→ content
Loading: AdminPageSkeleton
Error: AdminErrorCard
Empty: AdminEmptyState (CTA when an action exists)
```

Reference pages: `app/admin/dashboard/events/page.tsx`, `tours/page.tsx`, `store/page.tsx`.

## Tokens (from `.agents/plans/README.md`)

- Card style: `bg-slate-900/60 border border-slate-700/50 backdrop-blur-sm rounded-sm`
- Gradient accent: `bg-gradient-to-br from-purple-600/20 to-blue-600/20`
- Sidebar: dark `slate-950/95`
- Helpers: `formatSafeDate`, `formatSafeCurrency`, `formatSafeNumber`, `statusBadgeClass`

## UX rules from the feature specs

- Persistent acting-organization and tour/event identity; never rely on ambiguous breadcrumb-only context.
- Distinguish empty, loading, denied, unavailable, stale, and error — a zero must never mean a failed request.
- Destructive/large commands show impact preview and confirmation.
- Capability-aware controls hide or disable unauthorized actions without leaking protected data.
- Prefer deep links into existing command-center / logistics / hiring / ticketing surfaces over duplicate UIs.

## Integration expectations

Reuse patterns from [admin-dashboard-builder integration map](../../admin-dashboard-builder/references/integration-map.md):

- Tours ↔ events ↔ calendar ↔ logistics ↔ roster ↔ advancing/day-sheet
- Finance/ticketing tabs require domain capability, not tour access alone
- Publication/share flows use scoped tokens — never “copy private Admin URL” as the share action
