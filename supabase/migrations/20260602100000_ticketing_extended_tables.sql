set client_min_messages = warning;

-- Extended ticketing tables (moved from migrations_backup, updated to reference events_v2)
-- Also adds atomic quantity_sold RPC and missing ticket_sales columns

-- ─── Atomic increment function ───────────────────────────────────────────────
create or replace function increment_ticket_quantity_sold(
  p_ticket_type_id uuid,
  p_quantity       integer
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update ticket_types
  set    quantity_sold = quantity_sold + p_quantity,
         updated_at    = now()
  where  id = p_ticket_type_id;
end;
$$;

-- ─── Missing columns on ticket_sales ────────────────────────────────────────
alter table ticket_sales
  add column if not exists checked_in_by uuid references auth.users(id) on delete set null,
  add column if not exists qr_code       uuid default gen_random_uuid();

-- ─── ticket_campaigns ────────────────────────────────────────────────────────
create table if not exists ticket_campaigns (
  id            uuid primary key default gen_random_uuid(),
  event_id      uuid references events_v2(id) on delete cascade,
  name          text not null,
  description   text,
  campaign_type text not null default 'general'
                  check (campaign_type in ('early_bird','flash_sale','group_discount','loyalty',
                                           'referral','social_media','email','influencer','general')),
  discount_type  text not null default 'percentage'
                   check (discount_type in ('percentage','fixed','buy_one_get_one','free_upgrade')),
  discount_value numeric not null default 0,
  start_date     timestamptz,
  end_date       timestamptz,
  max_uses       integer,
  current_uses   integer not null default 0,
  applicable_ticket_types uuid[] default '{}',
  is_active      boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- ─── promo_codes ─────────────────────────────────────────────────────────────
create table if not exists promo_codes (
  id              uuid primary key default gen_random_uuid(),
  campaign_id     uuid references ticket_campaigns(id) on delete set null,
  event_id        uuid references events_v2(id) on delete cascade,
  code            text not null unique,
  description     text,
  discount_type   text not null default 'percentage'
                    check (discount_type in ('percentage','fixed')),
  discount_value  numeric not null default 0,
  min_purchase    numeric not null default 0,
  max_discount    numeric,
  max_uses        integer,
  current_uses    integer not null default 0,
  expires_at      timestamptz,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ─── ticket_shares ───────────────────────────────────────────────────────────
create table if not exists ticket_shares (
  id               uuid primary key default gen_random_uuid(),
  event_id         uuid references events_v2(id) on delete cascade,
  ticket_type_id   uuid references ticket_types(id) on delete set null,
  user_id          uuid references auth.users(id) on delete set null,
  platform         text not null
                     check (platform in ('facebook','twitter','instagram','linkedin',
                                        'email','sms','whatsapp','feed','message','other')),
  share_url        text,
  click_count      integer not null default 0,
  conversion_count integer not null default 0,
  revenue_generated numeric not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ─── ticket_referrals ────────────────────────────────────────────────────────
create table if not exists ticket_referrals (
  id             uuid primary key default gen_random_uuid(),
  event_id       uuid references events_v2(id) on delete cascade,
  referrer_id    uuid references auth.users(id) on delete set null,
  referred_email text not null,
  referral_code  text not null unique,
  discount_amount numeric not null default 0,
  is_used        boolean not null default false,
  used_at        timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- ─── ticket_analytics ────────────────────────────────────────────────────────
create table if not exists ticket_analytics (
  id            uuid primary key default gen_random_uuid(),
  event_id      uuid references events_v2(id) on delete cascade,
  date          date not null,
  views         integer not null default 0,
  clicks        integer not null default 0,
  conversions   integer not null default 0,
  revenue       numeric not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique(event_id, date)
);

-- ─── social_media_performance ────────────────────────────────────────────────
create table if not exists social_media_performance (
  id               uuid primary key default gen_random_uuid(),
  event_id         uuid references events_v2(id) on delete cascade,
  platform         text not null,
  post_id          text,
  post_url         text,
  shares_count     integer not null default 0,
  clicks_count     integer not null default 0,
  conversions_count integer not null default 0,
  revenue_generated numeric not null default 0,
  engagement_rate  numeric not null default 0,
  post_date        timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ─── RLS ─────────────────────────────────────────────────────────────────────
alter table ticket_campaigns     enable row level security;
alter table promo_codes          enable row level security;
alter table ticket_shares        enable row level security;
alter table ticket_referrals     enable row level security;
alter table ticket_analytics     enable row level security;
alter table social_media_performance enable row level security;

-- Org members can read; org admins can write (using existing helper functions)
create policy if not exists "ticket_campaigns_select" on ticket_campaigns
  for select using (
    event_id in (select id from events_v2 where org_id in (
      select org_id from org_members where user_id = auth.uid()
    ))
  );

create policy if not exists "ticket_campaigns_write" on ticket_campaigns
  for all using (
    event_id in (select id from events_v2 where org_id in (
      select org_id from org_members where user_id = auth.uid()
    ))
  );

create policy if not exists "promo_codes_select" on promo_codes
  for select using (true);

create policy if not exists "promo_codes_write" on promo_codes
  for all using (
    event_id is null or event_id in (select id from events_v2 where org_id in (
      select org_id from org_members where user_id = auth.uid()
    ))
  );

create policy if not exists "ticket_shares_all" on ticket_shares
  for all using (user_id = auth.uid() or auth.uid() in (
    select user_id from org_members where org_id in (
      select org_id from events_v2 where id = event_id
    )
  ));

create policy if not exists "ticket_referrals_all" on ticket_referrals
  for all using (referrer_id = auth.uid() or auth.uid() in (
    select user_id from org_members where org_id in (
      select org_id from events_v2 where id = event_id
    )
  ));

create policy if not exists "ticket_analytics_select" on ticket_analytics
  for select using (
    event_id in (select id from events_v2 where org_id in (
      select org_id from org_members where user_id = auth.uid()
    ))
  );

create policy if not exists "social_media_performance_select" on social_media_performance
  for select using (
    event_id in (select id from events_v2 where org_id in (
      select org_id from org_members where user_id = auth.uid()
    ))
  );

-- ─── Indexes ─────────────────────────────────────────────────────────────────
create index if not exists idx_ticket_campaigns_event on ticket_campaigns(event_id);
create index if not exists idx_promo_codes_event on promo_codes(event_id);
create index if not exists idx_ticket_shares_event on ticket_shares(event_id);
create index if not exists idx_ticket_analytics_event_date on ticket_analytics(event_id, date desc);
create index if not exists idx_social_media_event on social_media_performance(event_id);
create index if not exists idx_ticket_sales_qr_code on ticket_sales(qr_code);
