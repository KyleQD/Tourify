set client_min_messages = warning;

-- Work achievements, rewards wallet, and resume highlight system

create table if not exists user_reward_wallets (
  user_id uuid primary key references auth.users(id) on delete cascade,
  total_points bigint not null default 0,
  tier text not null default 'bronze' check (tier in ('bronze', 'silver', 'gold', 'platinum')),
  updated_at timestamptz not null default now()
);

create table if not exists reward_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  points_delta bigint not null,
  source_type text not null check (source_type in ('achievement_unlock', 'badge_grant', 'manual_adjustment')),
  source_id uuid not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, source_type, source_id)
);

create table if not exists resume_achievement_highlights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  achievement_id uuid references achievements(id) on delete set null,
  badge_id uuid references badges(id) on delete set null,
  endorsement_id uuid references endorsements(id) on delete set null,
  title text not null,
  summary text not null,
  impact_score integer not null default 0,
  is_featured boolean not null default true,
  source_type text not null default 'achievement' check (source_type in ('achievement', 'badge', 'endorsement', 'manual')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_reward_transactions_user_created
  on reward_transactions(user_id, created_at desc);

create index if not exists idx_resume_highlights_user_featured
  on resume_achievement_highlights(user_id, is_featured, impact_score desc, created_at desc);

create unique index if not exists idx_resume_highlights_user_achievement_unique
  on resume_achievement_highlights(user_id, achievement_id);

alter table user_reward_wallets enable row level security;
alter table reward_transactions enable row level security;
alter table resume_achievement_highlights enable row level security;

drop policy if exists user_reward_wallets_select_own on user_reward_wallets;
create policy user_reward_wallets_select_own on user_reward_wallets
for select using (auth.uid() = user_id);

drop policy if exists user_reward_wallets_write_own on user_reward_wallets;
create policy user_reward_wallets_write_own on user_reward_wallets
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists reward_transactions_select_own on reward_transactions;
create policy reward_transactions_select_own on reward_transactions
for select using (auth.uid() = user_id);

drop policy if exists reward_transactions_write_own on reward_transactions;
create policy reward_transactions_write_own on reward_transactions
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists resume_highlights_select_own on resume_achievement_highlights;
create policy resume_highlights_select_own on resume_achievement_highlights
for select using (auth.uid() = user_id);

drop policy if exists resume_highlights_write_own on resume_achievement_highlights;
create policy resume_highlights_write_own on resume_achievement_highlights
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

insert into achievements (
  name,
  description,
  category,
  icon,
  requirements,
  metric_key,
  target_value,
  evaluation_mode,
  level,
  group_key,
  catalog_version,
  points,
  rarity,
  display_order
) values
  ('Opportunity Explorer', 'Submit your first opportunity application.', 'business', 'briefcase', '{"metric_key":"jobs_applied_total","target":1,"mode":"increment"}', 'jobs_applied_total', 1, 'increment', 1, 'jobs_applied_total', 2, 120, 'common', 300),
  ('Active Applicant I', 'Submit 10 opportunity applications.', 'business', 'send', '{"metric_key":"jobs_applied_total","target":10,"mode":"increment"}', 'jobs_applied_total', 10, 'increment', 2, 'jobs_applied_total', 2, 260, 'uncommon', 301),
  ('Hiring Ready', 'Get your first accepted application.', 'business', 'check-circle', '{"metric_key":"accepted_applications_total","target":1,"mode":"increment"}', 'accepted_applications_total', 1, 'increment', 1, 'accepted_applications_total', 2, 180, 'uncommon', 302),
  ('Trusted Crew Candidate', 'Get 5 accepted applications.', 'business', 'shield-check', '{"metric_key":"accepted_applications_total","target":5,"mode":"increment"}', 'accepted_applications_total', 5, 'increment', 2, 'accepted_applications_total', 2, 380, 'rare', 303),
  ('Task Finisher I', 'Complete 10 workflow tasks.', 'performance', 'check-square', '{"metric_key":"tasks_completed_total","target":10,"mode":"increment"}', 'tasks_completed_total', 10, 'increment', 1, 'tasks_completed_total', 2, 220, 'uncommon', 304),
  ('Task Finisher II', 'Complete 50 workflow tasks.', 'performance', 'check-square', '{"metric_key":"tasks_completed_total","target":50,"mode":"increment"}', 'tasks_completed_total', 50, 'increment', 2, 'tasks_completed_total', 2, 460, 'rare', 305),
  ('Workflow Communicator', 'Send 25 workflow thread messages.', 'community', 'message-circle', '{"metric_key":"workflow_messages_sent_total","target":25,"mode":"increment"}', 'workflow_messages_sent_total', 25, 'increment', 1, 'workflow_messages_sent_total', 2, 210, 'uncommon', 306),
  ('Credential Builder', 'Upload 3 work credentials to your secure profile.', 'technical', 'badge-check', '{"metric_key":"uploaded_documents_total","target":3,"mode":"increment"}', 'uploaded_documents_total', 3, 'increment', 1, 'uploaded_documents_total', 2, 240, 'uncommon', 307)
on conflict (name) do update set
  description = excluded.description,
  category = excluded.category,
  icon = excluded.icon,
  requirements = excluded.requirements,
  metric_key = excluded.metric_key,
  target_value = excluded.target_value,
  evaluation_mode = excluded.evaluation_mode,
  level = excluded.level,
  group_key = excluded.group_key,
  catalog_version = excluded.catalog_version,
  points = excluded.points,
  rarity = excluded.rarity,
  display_order = excluded.display_order,
  updated_at = now();
