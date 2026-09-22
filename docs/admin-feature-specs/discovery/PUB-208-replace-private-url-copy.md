# PUB-208 — Replace private URL copy

**Date:** 2026-07-20  
**Spec:** `04_Publication_Sharing_and_Work_Mode.md`

## Acceptance criteria

Tour, event, advance, map, and day-sheet sharing invoke the scoped share/publication service with no misleading Admin URL action.

## Surfaces

| Surface | Share mechanism | Public path |
|---|---|---|
| Tour | `PublicationShareLinkDialog` → publication share tokens | `/p/[token]` |
| Event | Same dialog (replaced Admin URL copy dialog) | `/p/[token]` |
| Day sheet | Secure share action → publication share (`day_sheet`) | `/p/[token]` |
| Advance | Existing advance share token | `/advance/[token]` |
| Site map | Existing public-link API | `/site-maps/shared/[token]` |

## Guardrails

- `isMisleadingAdminShareUrl` / `assertScopedShareUrl` reject `/admin/**` and `/api/admin/**` as share targets  
- Advance “mark sent” notifications no longer fall back to `/admin/dashboard/events/.../advancing`  
- Share-link create API refuses if generated URL were somehow an Admin path  

## Inventory

`lib/admin/publication-share-surface-inventory.ts`
