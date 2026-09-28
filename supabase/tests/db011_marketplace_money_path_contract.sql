-- ============================================================================
-- db011_marketplace_money_path_contract.sql
--
-- Zero-drift postflight for 20260926140100_marketplace_money_path_tables.sql
-- (DB-011, the money-path half of HF-DB-011-MARKETPLACE-CHAIN-SURFACE-AUTHORED).
--
-- Returns ONLY violation rows plus exactly one summary row
-- `marketplace_money_path_ready`, and only when no violation exists, so an
-- unapplied target cannot pass vacuously.
--
-- The behavioural half lives in supabase/tests/db011_marketplace_money_path.harness.sh,
-- which needs a role switch and a JWT claim rather than a single SELECT.
-- ============================================================================

-- `column` is a PostgreSQL reserved word (col_name_keyword) and cannot be used as
-- a bare CTE column alias, so the column is named `col`.
with expected_columns(relation, col) as (
  values
    -- marketplace_payment_events, archive 20260728000011:47-59
    ('marketplace_payment_events', 'id'),
    ('marketplace_payment_events', 'provider_event_id'),
    ('marketplace_payment_events', 'event_type'),
    ('marketplace_payment_events', 'processing_status'),
    ('marketplace_payment_events', 'attempts'),
    ('marketplace_payment_events', 'last_error'),
    ('marketplace_payment_events', 'raw_payload'),
    ('marketplace_payment_events', 'received_at'),
    ('marketplace_payment_events', 'processed_at'),
    -- the exact columns lib/marketplace/webhook-processor.ts:57-63,93-105 writes
    ('marketplace_payment_events', 'provider_event_id'),
    ('marketplace_payment_events', 'event_type'),
    ('marketplace_payment_events', 'processing_status'),
    ('marketplace_payment_events', 'attempts'),
    ('marketplace_payment_events', 'last_error'),
    ('marketplace_payment_events', 'processed_at'),
    -- marketplace_fee_rules, archive 20260728000010:7-25
    ('marketplace_fee_rules', 'id'),
    ('marketplace_fee_rules', 'version'),
    ('marketplace_fee_rules', 'description'),
    ('marketplace_fee_rules', 'percentage_fee'),
    ('marketplace_fee_rules', 'fixed_fee_cents'),
    ('marketplace_fee_rules', 'minimum_fee_cents'),
    ('marketplace_fee_rules', 'maximum_fee_cents'),
    ('marketplace_fee_rules', 'scope'),
    ('marketplace_fee_rules', 'listing_kind_scope'),
    ('marketplace_fee_rules', 'effective_from'),
    ('marketplace_fee_rules', 'effective_until'),
    ('marketplace_fee_rules', 'is_active'),
    ('marketplace_fee_rules', 'created_by'),
    ('marketplace_fee_rules', 'created_at'),
    ('marketplace_fee_rules', 'updated_at')
),
violations as (
  -- 1. Both tables exist with RLS enabled.
  select 'rls_disabled'::text as check_name, t as detail
  from unnest(array['marketplace_payment_events', 'marketplace_fee_rules']) as t
  where not exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = t and c.relrowsecurity
  )

  union all
  -- 2. Every column the archive and the consumers rely on is present. A missing
  --    column is a runtime failure in the money path, not a type nit.
  select 'missing_column', e.relation || '.' || e.col
  from (select distinct relation, col from expected_columns) e
  where not exists (
    select 1
    from pg_attribute a
    join pg_class c on c.oid = a.attrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = e.relation
      and a.attname = e.col
      and a.attnum > 0
      and not a.attisdropped
  )

  union all
  -- 3. marketplace_payment_events must carry NO policy. Its authorization design
  --    is "RLS enabled, no policy, service role only"; a read policy would be a
  --    regression and its presence must be a failure, not a pass.
  select 'payment_events_has_policy', p.polname
  from pg_policy p
  join pg_class c on c.oid = p.polrelid
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relname = 'marketplace_payment_events'

  union all
  -- 4. The fee-rule admin policy must exist under its final name and be FOR ALL,
  --    so an admin can write and a non-admin cannot.
  select 'fee_rules_policy_missing', 'marketplace_fee_rules_admin_manage'
  where not exists (
    select 1
    from pg_policy p
    join pg_class c on c.oid = p.polrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'marketplace_fee_rules'
      and p.polname = 'marketplace_fee_rules_admin_manage'
      and p.polcmd = '*'
  )

  union all
  -- 5. The fee-rule admin policy must actually reference public.profiles, not a
  --    local shadow. A policy that degraded to `auth.uid() is not null` would
  --    hand every signed-in user the whole fee schedule.
  select 'fee_rules_policy_not_admin_gated', pg_get_expr(p.polqual, p.polrelid)
  from pg_policy p
  join pg_class c on c.oid = p.polrelid
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname = 'marketplace_fee_rules'
    and p.polname = 'marketplace_fee_rules_admin_manage'
    and pg_get_expr(p.polqual, p.polrelid) !~* 'profiles'

  union all
  -- 6. Webhook idempotency: a UNIQUE index on provider_event_id is the property
  --    that stops a retried Stripe event fulfilling an order twice.
  select 'payment_events_no_unique_provider_index', 'provider_event_id'
  where not exists (
    select 1
    from pg_index i
    join pg_class c on c.oid = i.indrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'marketplace_payment_events'
      and i.indisunique
      and pg_get_indexdef(i.indexrelid) ~* 'provider_event_id'
  )

  union all
  -- 7. The processing_status CHECK must keep its five states; loosening it would
  --    let a webhook claim a status the processor never handles.
  select 'payment_events_status_check_missing', 'processing_status'
  where not exists (
    select 1
    from pg_constraint c
    join pg_class r on r.oid = c.conrelid
    join pg_namespace n on n.oid = r.relnamespace
    where n.nspname = 'public'
      and r.relname = 'marketplace_payment_events'
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) ~* 'processing_status'
  )

  union all
  -- 8. The seeded default fee rule must exist and must be INACTIVE. Applying this
  --    migration must not start charging a fee.
  -- `having` is load-bearing here: an aggregate with no GROUP BY always returns
  -- exactly one row, so without it this check reports a violation of "0" every
  -- time the table is CORRECT and the postflight can never go green.
  select 'default_fee_rule_missing_or_active', count(*)::text
  from public.marketplace_fee_rules
  where description = 'Default platform fee (10%)' and is_active
  having count(*) > 0

  union all
  -- 9. Exactly one default rule. The table has no natural unique key, so a second
  --    apply inserts a second row; that is recorded rather than hidden and the
  --    duplication is caught here.
  select 'duplicate_default_fee_rule', count(*)::text
  from public.marketplace_fee_rules
  where description = 'Default platform fee (10%)'
  having count(*) > 1

  union all
  -- 10. The updated_at trigger must be attached, or fee-rule edits stop stamping.
  select 'fee_rules_updated_at_trigger_missing', 'marketplace_fee_rules_touch_updated_at'
  where not exists (
    select 1
    from pg_trigger tg
    join pg_class c on c.oid = tg.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'marketplace_fee_rules'
      and tg.tgname = 'marketplace_fee_rules_touch_updated_at'
      and not tg.tgisinternal
  )
)
select * from violations
union all
select 'marketplace_money_path_ready'::text, 'all checks passed'::text
where not exists (select 1 from violations);
