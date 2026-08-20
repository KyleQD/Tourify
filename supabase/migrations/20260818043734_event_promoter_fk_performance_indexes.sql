-- Phase 10 forward-fix: cover promoter foreign keys surfaced by the Supabase
-- Performance Advisor. These are additive indexes only; existing pilot indexes
-- remain in place until production traffic establishes whether they are useful.

set client_min_messages = warning;

create index if not exists promoter_touchpoints_buyer_user_idx
  on public.promoter_attribution_touchpoints(buyer_user_id)
  where buyer_user_id is not null;
create index if not exists promoter_touchpoints_event_idx
  on public.promoter_attribution_touchpoints(event_id);
create index if not exists promoter_touchpoints_program_idx
  on public.promoter_attribution_touchpoints(program_id);

create index if not exists promoter_shadow_attribution_buyer_user_idx
  on public.promoter_checkout_shadow_attributions(buyer_user_id)
  where buyer_user_id is not null;
create index if not exists promoter_shadow_attribution_program_idx
  on public.promoter_checkout_shadow_attributions(program_id)
  where program_id is not null;
create index if not exists promoter_shadow_attribution_ticket_type_idx
  on public.promoter_checkout_shadow_attributions(ticket_type_id);
create index if not exists promoter_shadow_attribution_touchpoint_idx
  on public.promoter_checkout_shadow_attributions(touchpoint_id)
  where touchpoint_id is not null;

create index if not exists promoter_hold_events_actor_idx
  on public.promoter_commission_hold_events(actor_id);
create index if not exists promoter_payout_batch_events_actor_idx
  on public.promoter_payout_batch_events(actor_id)
  where actor_id is not null;
create index if not exists promoter_payout_batches_created_by_idx
  on public.promoter_payout_batches(created_by);
create index if not exists promoter_payout_batches_submitted_by_idx
  on public.promoter_payout_batches(submitted_by)
  where submitted_by is not null;
create index if not exists promoter_payout_batches_paid_by_idx
  on public.promoter_payout_batches(paid_by)
  where paid_by is not null;

create index if not exists promoter_risk_flag_events_actor_idx
  on public.promoter_risk_flag_events(actor_id)
  where actor_id is not null;
create index if not exists promoter_risk_flags_attribution_idx
  on public.promoter_risk_flags(attribution_id)
  where attribution_id is not null;
create index if not exists promoter_risk_flags_membership_idx
  on public.promoter_risk_flags(membership_id)
  where membership_id is not null;
create index if not exists promoter_risk_flags_reviewed_by_idx
  on public.promoter_risk_flags(reviewed_by)
  where reviewed_by is not null;
create index if not exists promoter_risk_flags_user_idx
  on public.promoter_risk_flags(user_id)
  where user_id is not null;

create index if not exists ticket_sale_attributions_event_idx
  on public.ticket_sale_attributions(event_id);
create index if not exists ticket_sale_attributions_membership_idx
  on public.ticket_sale_attributions(membership_id);
create index if not exists ticket_sale_attributions_program_idx
  on public.ticket_sale_attributions(program_id);
create index if not exists ticket_sale_attributions_program_version_idx
  on public.ticket_sale_attributions(program_version_id);
create index if not exists ticket_sale_attributions_ticket_type_idx
  on public.ticket_sale_attributions(ticket_type_id)
  where ticket_type_id is not null;
create index if not exists ticket_sale_attributions_touchpoint_idx
  on public.ticket_sale_attributions(touchpoint_id)
  where touchpoint_id is not null;

-- Rollback: indexes are non-destructive to feature data. Keep them through the
-- pilot; any later removal must be based on observed production index usage.
