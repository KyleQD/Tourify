# TOUR-209 — Tags, owners, and organization saved views

## Acceptance criteria

Views store validated filters/columns, respect changing permissions, and cannot expose counts/names for unauthorized tours. Add tags, owners, and organization saved views.

## Shipped

1. **Schema** — `supabase/migrations/20260720193241_tour_tags_owners_saved_views_tour209.sql`
   - `tours.owner_user_id`, `tours.lead_user_id`
   - `org_tour_tags`, `tour_tag_links`, `tour_saved_views` + RLS

2. **Portfolio query** — tag / owner / lead filters in `tour-portfolio-query.ts`

3. **Visibility** — `tour-portfolio-visibility.ts` drops unauthorized tours before filter/count; managers see org-wide; others see owned/led/team/granted only

4. **Saved views** — validated filters/columns (`tour-saved-view.ts`); CRUD service + APIs; invalid persisted views skipped on list

5. **Tags** — org catalog + tour link replace APIs; create/update tour accepts `owner_user_id`, `lead_user_id`, `tag_ids`

6. **UI** — portfolio saved-view picker, tag/owner filters; Total Tours uses server `page.totalCount` (visible only)

## APIs

- `GET/POST /api/admin/tours/tags`
- `PUT /api/admin/tours/[id]/tags`
- `GET/POST /api/admin/tours/saved-views`
- `PATCH/DELETE /api/admin/tours/saved-views/[id]`

## Verify

```bash
npx vitest run __tests__/admin/tour-saved-view.test.ts __tests__/admin/tour-portfolio-visibility.test.ts __tests__/admin/tour-portfolio-query.test.ts
```

## Follow-ups

- TOUR-210
- Optional: column-projected list response when `columns=` query param is present
