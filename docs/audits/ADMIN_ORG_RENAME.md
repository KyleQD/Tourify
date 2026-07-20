# Phase-later: `/admin` → `/org/{slug}/dashboard` (AUD-0114)

**Decision (Wave 5 / PR7):** Document and defer the full rename. Org ops remain under `/admin/*` as the canonical UI today.

## Target IA

| Today (canonical) | Future |
|-------------------|--------|
| `/admin/dashboard` | `/org/{slug}/dashboard` |
| `/admin/*` | `/org/{slug}/*` (phased) |

Source of truth in product architecture: `docs/architecture/multi-account-system.md` §2.4 / route table (`/admin/dashboard` → future `/org/{slug}/dashboard`).

## Why not a full rename now

- Deep links, middleware account gates, admin API prefixes (`/api/admin/*`), and bookmarks all assume `/admin`.
- Organization slug resolution + ownership checks are not wired as a route layer yet.
- A big-bang move risks auth/account-context regressions across Event HQ, hiring, and calendar.

## Low-risk alias (shipped)

`next.config.ts` adds a **forward-only** alias so future URLs can land on today’s dashboard:

| Source | Destination | Permanent |
|--------|-------------|-----------|
| `/org/:slug/dashboard` | `/admin/dashboard` | `false` |

Notes:

- `:slug` is accepted but **not** validated yet — alias only, no org-context switch.
- `/admin/*` is **not** removed or redirected away.
- No rewrite of `/api/admin/*`.

## Later phase checklist

1. Resolve `slug` → organization account; enforce membership in middleware / RSC.
2. Introduce `/org/[slug]/dashboard` as a real page (not only redirect).
3. Dual-write nav links (`admin` + `org`) for one release.
4. Redirect `/admin/dashboard` → `/org/{slug}/dashboard` once slug resolution is reliable.
5. Rename API namespaces only if clients are versioned; otherwise keep `/api/admin` as an alias.

## Remediation status

AUD-0114 is closed for this wave as **documented Phase-later + alias redirect**. Full rename remains explicitly deferred in `docs/audits/REMEDIATION_STATUS.md`.
