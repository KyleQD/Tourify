-- Performance indexes for hot query paths

-- events_v2: org + status + start_at (dashboard stats, analytics)
create index if not exists idx_events_v2_org_status_start
  on events_v2(org_id, status, start_at desc);

-- financial_transactions: org + created_at (analytics date range)
create index if not exists idx_financial_tx_org_created
  on financial_transactions(org_id, created_at desc);

-- financial_transactions: category for payout filter
create index if not exists idx_financial_tx_category
  on financial_transactions(category);

-- ticket_sales: event_id + payment_status
create index if not exists idx_ticket_sales_event_status
  on ticket_sales(ticket_type_id, payment_status);

-- notifications: user_id + read_at for unread counts
create index if not exists idx_notifications_user_read
  on notifications(user_id, read_at)
  where read_at is null;

-- follows: following_id for follower counts
create index if not exists idx_follows_following_id
  on follows(following_id);

-- group_messages: thread_id + created_at + sender_id for unread counts
create index if not exists idx_group_messages_thread_created
  on group_messages(thread_id, created_at desc, sender_id);

-- messages: conversation_id + sender_id + read_at for DM unread counts
create index if not exists idx_messages_conv_sender_read
  on messages(conversation_id, sender_id, read_at)
  where read_at is null;

-- advancing_documents: share_token for public share page lookups
create index if not exists idx_advancing_docs_share_token
  on advancing_documents(share_token)
  where share_token is not null;

-- logistics_vendors: name for search
create index if not exists idx_logistics_vendors_name_text
  on logistics_vendors using gin(to_tsvector('english', name));

-- ─────────────────────────────────────────────────────────────
-- Convenience view: v_staff_roster
-- Joins staff_members → profiles for a unified roster display
-- ─────────────────────────────────────────────────────────────
create or replace view v_staff_roster as
select
  sm.id,
  sm.event_id,
  sm.role,
  sm.status,
  sm.created_at,
  p.id         as user_id,
  p.full_name,
  p.email,
  p.avatar_url,
  p.account_type
from staff_members sm
left join profiles p on p.id = sm.user_id;
