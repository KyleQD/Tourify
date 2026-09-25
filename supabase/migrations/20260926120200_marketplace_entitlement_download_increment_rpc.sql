-- ============================================================================
-- 20260926120200_marketplace_entitlement_download_increment_rpc.sql
--
-- DB-011 / MKT-008. Replaces the privileged compare-and-swap in
-- app/api/marketplace/delivery/[orderItemId]/route.ts:89-120 with a
-- single-statement, buyer-scoped server-side increment.
--
-- WHY
--   The existing route reads the entitlement, builds a new signed URL through
--   the storage API, then issues a service-role UPDATE that re-asserts every
--   field it read:
--       .eq('id', ...).eq('buyer_user_id', user.id).eq('status', 'active')
--       .eq('download_count', entitlement.download_count)
--   That cannot double-count or lose a count, which the marketplace lane
--   confirmed, but it needs the service role to write a row the buyer is
--   entitled to write, and two simultaneous legitimate downloads make one buyer
--   receive 409 instead of their file. The CAS is recorded as reviewed debt
--   under the SEC-109 `replace_with_rpc` exception.
--
-- WHY THIS IS SAFE
--   The increment happens inside one UPDATE whose WHERE clause carries the
--   invariants, so there is no read-modify-write window at all:
--     * buyer scope       buyer_user_id = auth.uid()      -> never the service role
--     * lifecycle         status = 'active'
--     * quota             download_count < max_downloads
--     * single statement   one row, one statement, no lost update
--   SECURITY DEFINER is required because the caller's own RLS has no UPDATE
--   policy on this table (only marketplace_entitlements_buyer_read and
--   marketplace_entitlements_seller_manage exist). The function is therefore
--   the authorization boundary, so the same predicate set is enforced inside it
--   and the caller's JWT is the only thing that can select a row.
--
--   This is the DB-002 pattern applied correctly: search_path is pinned to
--   public, and PUBLIC/anon EXECUTE is revoked. EXECUTE is granted to
--   `authenticated` only, and the function raises unless auth.uid() is not null,
--   so an unauthenticated caller has neither the privilege nor the identity.
--
-- FORWARD-ONLY AND ADDITIVE
--   One new function. No table, column, policy, grant or trigger is altered.
--   The existing service-role CAS in the route keeps working until the
--   marketplace lane switches it over, so this migration can be applied without
--   a coordinated deploy. CP-051: authored only, not applied by this task.
-- ============================================================================

set client_min_messages = warning;

create or replace function public.record_marketplace_entitlement_download(
  p_order_item_id uuid,
  p_signed_url text default null,
  p_signed_url_expires_at timestamptz default null
)
returns public.marketplace_entitlements
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_row public.marketplace_entitlements;
begin
  if v_actor is null then
    raise exception 'record_marketplace_entitlement_download requires an authenticated buyer'
      using errcode = '42501';
  end if;

  if p_order_item_id is null then
    raise exception 'p_order_item_id is required' using errcode = '22023';
  end if;

  -- Single statement. The three predicates are the whole authorization and
  -- concurrency contract, and they are evaluated against the row as it is
  -- locked, so two concurrent callers cannot both succeed past the quota.
  update public.marketplace_entitlements e
     set download_count         = e.download_count + 1,
         last_downloaded_at     = now(),
         signed_url             = coalesce(p_signed_url, e.signed_url),
         signed_url_expires_at  = coalesce(p_signed_url_expires_at, e.signed_url_expires_at),
         updated_at             = now()
   where e.order_item_id = p_order_item_id
     and e.buyer_user_id = v_actor
     and e.status = 'active'
     and e.download_count < e.max_downloads
  returning e.* into v_row;

  if v_row.id is null then
    -- One message for all four causes so the endpoint cannot be used as an
    -- oracle for "does this order exist" / "is it someone else's" / "is the
    -- quota spent".
    raise exception 'No active entitlement with remaining downloads for this order item'
      using errcode = 'P0001';
  end if;

  return v_row;
end;
$$;

comment on function public.record_marketplace_entitlement_download(uuid, text, timestamptz) is
  'Buyer-scoped, single-statement download increment for a marketplace entitlement. Enforces auth.uid() ownership, status = active and download_count < max_downloads inside the UPDATE. Replaces the service-role compare-and-swap in app/api/marketplace/delivery/[orderItemId]/route.ts.';

-- Execute is not public. Without this the function is a SECURITY DEFINER
-- callable by anon, which is exactly the DB-002 finding.
revoke execute on function public.record_marketplace_entitlement_download(uuid, text, timestamptz) from public;
revoke execute on function public.record_marketplace_entitlement_download(uuid, text, timestamptz) from anon;
grant execute on function public.record_marketplace_entitlement_download(uuid, text, timestamptz) to authenticated;
