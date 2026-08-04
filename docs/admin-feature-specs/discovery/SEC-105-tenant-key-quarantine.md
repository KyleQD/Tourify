# SEC-105 — Tenant key backfill and quarantine

## Acceptance criteria

Finance, logistics, staffing, site-map, ticketing, and child tables receive validated `org_id`; unresolvable rows move to a quarantine table/view and are inaccessible to normal users.

## Migration

`supabase/migrations/20260720074945_admin_tenant_key_quarantine.sql`

### Expand-only columns

Nullable `org_id` added (when missing) on:

- Logistics: `logistics_tasks`, `flight_coordination`, `lodging_bookings`, `ground_transportation_coordination`, `travel_groups`, `logistics_acknowledgements`
- Staffing: `staff_members`, `staff_shifts`, `staff_zones`
- Site maps: `site_maps`, `site_map_zones`
- Ticketing: `ticket_types`, `ticket_sales`, `tickets`, `event_ticketing_config`, `ticket_campaigns`

Finance (`financial_transactions`, `budgets`) already ships with non-null `org_id`; orphans (missing organization row) are quarantined if found.

### Backfill rules

Deterministic only:

1. Parent `tours.org_id`
2. Parent `events_v2.org_id`
3. Staff `entity_type = 'org'` → `entity_id` when that org exists
4. Child inherit from parent (`site_map_zones` ← `site_maps`, staff member ← shift)

**Never guess** org from creator, venue name, or heuristics.

### Quarantine

- Table: `admin_tenant_key_quarantine` (deny-all for `authenticated`; revoked from anon/authenticated)
- View: `admin_tenant_key_quarantine_v` (open queue; same grants)
- Reason codes: `unresolvable_org_id_after_parent_backfill`, `org_id_missing_organization_row`

### Inaccessibility

RESTRICTIVE policy `sec105_require_org_id` on each keyed table:

`USING (org_id IS NOT NULL) WITH CHECK (org_id IS NOT NULL)` for `authenticated`

Null-org (quarantined) rows remain in place for operator repair via service role / SQL, but are invisible/unwritable to normal clients. SEC-106–108 replace permissive domain RLS next.

## Postflight

```sql
select table_name, count(*) from admin_tenant_key_quarantine
where resolved_at is null group by 1 order by 2 desc;

select count(*) from logistics_tasks where org_id is null;
select count(*) from ticket_types where org_id is null;
select count(*) from site_maps where org_id is null;
```

## Operator resolve path

```sql
-- After manually confirming the correct org:
update logistics_tasks set org_id = '<org>' where id = '<id>';
update admin_tenant_key_quarantine
set resolved_at = now(), resolved_org_id = '<org>'
where table_name = 'logistics_tasks' and record_id = '<id>';
```
