-- DB-005 (sub-migration db005b) zero-drift contract checks for the
-- distributed purchase idempotency index on ticket_sales.
-- Run after the additive migration
--   20260921120000_ticketing_purchase_idempotency.sql
-- in a target database. Every query should return zero rows; the final query
-- should return one row with purchase_idempotency_index_ready = true.

-- The unique index must exist on public.ticket_sales.
select 'idx_ticket_sales_purchase_idempotency missing' as violation
where not exists (
  select 1
  from pg_index i
  join pg_class c on c.oid = i.indexrelid
  join pg_class t on t.oid = i.indrelid
  join pg_namespace n on n.oid = t.relnamespace
  where n.nspname = 'public'
    and t.relname = 'ticket_sales'
    and c.relname = 'idx_ticket_sales_purchase_idempotency'
);

-- The index must be UNIQUE (it is the distributed idempotency boundary).
select 'idx_ticket_sales_purchase_idempotency is not unique' as violation
from pg_index i
join pg_class c on c.oid = i.indexrelid
join pg_class t on t.oid = i.indrelid
join pg_namespace n on n.oid = t.relnamespace
where n.nspname = 'public'
  and t.relname = 'ticket_sales'
  and c.relname = 'idx_ticket_sales_purchase_idempotency'
  and not i.indisunique;

-- The index expression must extract the app-written metadata idempotency key
-- and the partial predicate must exclude key-less rows.
select 'idx_ticket_sales_purchase_idempotency lacks the metadata->>''idempotency_key'' expression or partial predicate' as violation
where not exists (
  select 1
  from pg_index i
  join pg_class c on c.oid = i.indexrelid
  join pg_class t on t.oid = i.indrelid
  join pg_namespace n on n.oid = t.relnamespace
  where n.nspname = 'public'
    and t.relname = 'ticket_sales'
    and c.relname = 'idx_ticket_sales_purchase_idempotency'
    and pg_get_indexdef(i.indexrelid) ilike '%metadata ->> ''idempotency_key''%'
    and pg_get_indexdef(i.indexrelid) ilike '%is not null%'
);

-- The leading base columns must be buyer_user_id and event_id (the same
-- buyer/event scope used by findIdempotentPurchase).
select 'idx_ticket_sales_purchase_idempotency missing buyer_user_id or event_id column' as violation
where not exists (
  select 1
  from pg_index i
  join pg_class c on c.oid = i.indexrelid
  join pg_class t on t.oid = i.indrelid
  join pg_namespace n on n.oid = t.relnamespace
  where n.nspname = 'public'
    and t.relname = 'ticket_sales'
    and c.relname = 'idx_ticket_sales_purchase_idempotency'
    and array(
      select a.attname
      from unnest(i.indkey::int2[]) with ordinality as k(attnum, ord)
      join pg_attribute a on a.attrelid = t.oid and a.attnum = k.attnum
      order by k.ord
    ) @> array['buyer_user_id', 'event_id']
);

-- Precondition: ticket_sales.metadata must be jsonb for the immutable
-- ->> text extraction used by the index expression.
select 'ticket_sales.metadata is not jsonb' as violation
where not exists (
  select 1
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'ticket_sales'
    and column_name = 'metadata'
    and data_type = 'jsonb'
);

-- Precondition: the buyer and event columns referenced by the index exist.
select 'ticket_sales missing buyer_user_id or event_id column' as violation
where not exists (
  select 1
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'ticket_sales'
    and column_name in ('buyer_user_id', 'event_id')
  having count(distinct column_name) = 2
);

select 'DB-005 purchase idempotency contract' as contract,
       exists (
         select 1
         from pg_index i
         join pg_class c on c.oid = i.indexrelid
         join pg_class t on t.oid = i.indrelid
         join pg_namespace n on n.oid = t.relnamespace
         where n.nspname = 'public'
           and t.relname = 'ticket_sales'
           and c.relname = 'idx_ticket_sales_purchase_idempotency'
           and i.indisunique
       ) as purchase_idempotency_index_ready;