-- Canonical achievements engine + scalable catalog
-- Aligns runtime service expectations with Supabase-managed schema.

create extension if not exists "pgcrypto";

create table if not exists achievements (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null,
  category text not null,
  subcategory text,
  icon text not null default 'trophy',
  color text default '#10b981',
  bg_color text default '#052e2b',
  border_color text default '#1b7f6b',
  requirements jsonb not null default '{}'::jsonb,
  metric_key text,
  target_value bigint,
  evaluation_mode text not null default 'increment',
  level integer not null default 1,
  group_key text,
  catalog_version integer not null default 1,
  points integer not null default 0,
  rarity text not null default 'common',
  is_active boolean not null default true,
  is_hidden boolean not null default false,
  display_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Existing deployments may already have an older achievements schema.
-- Backfill missing columns so index + seed statements remain idempotent.
alter table achievements
  add column if not exists subcategory text,
  add column if not exists icon text not null default 'trophy',
  add column if not exists color text default '#10b981',
  add column if not exists bg_color text default '#052e2b',
  add column if not exists border_color text default '#1b7f6b',
  add column if not exists requirements jsonb not null default '{}'::jsonb,
  add column if not exists metric_key text,
  add column if not exists target_value bigint,
  add column if not exists evaluation_mode text not null default 'increment',
  add column if not exists level integer not null default 1,
  add column if not exists group_key text,
  add column if not exists catalog_version integer not null default 1,
  add column if not exists points integer not null default 0,
  add column if not exists rarity text not null default 'common',
  add column if not exists is_active boolean not null default true,
  add column if not exists is_hidden boolean not null default false,
  add column if not exists display_order integer not null default 0,
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create unique index if not exists idx_achievements_name_unique on achievements(name);
create index if not exists idx_achievements_metric_active on achievements(metric_key, is_active);
create index if not exists idx_achievements_group_level on achievements(group_key, level);

create table if not exists user_achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  achievement_id uuid not null references achievements(id) on delete cascade,
  progress_percentage integer not null default 0,
  is_completed boolean not null default false,
  completed_at timestamptz,
  current_value bigint not null default 0,
  target_value bigint not null default 1,
  progress_data jsonb not null default '{}'::jsonb,
  related_project_id uuid,
  related_event_id uuid,
  related_collaboration_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, achievement_id)
);

create index if not exists idx_user_achievements_user on user_achievements(user_id);
create index if not exists idx_user_achievements_completed on user_achievements(user_id, is_completed);

create table if not exists badges (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null,
  category text not null,
  subcategory text,
  icon text not null default 'award',
  color text default '#8b5cf6',
  bg_color text default '#201036',
  border_color text default '#7c3aed',
  level integer not null default 1,
  rarity text not null default 'common',
  is_verification_badge boolean not null default false,
  is_auto_granted boolean not null default false,
  requirements jsonb not null default '{}'::jsonb,
  auto_grant_conditions jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  display_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_badges_name_unique on badges(name);

create table if not exists user_badges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  badge_id uuid not null references badges(id) on delete cascade,
  is_active boolean not null default true,
  granted_at timestamptz not null default now(),
  expires_at timestamptz,
  revoked_at timestamptz,
  granted_by uuid references auth.users(id) on delete set null,
  granted_reason text,
  revoked_by uuid references auth.users(id) on delete set null,
  revocation_reason text,
  related_project_id uuid,
  related_event_id uuid,
  related_collaboration_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, badge_id)
);

create table if not exists achievement_progress_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  achievement_id uuid references achievements(id) on delete cascade,
  metric_key text,
  metric_value bigint,
  event_type text not null,
  event_value bigint not null default 1,
  event_source text default 'application',
  event_data jsonb not null default '{}'::jsonb,
  related_project_id uuid,
  related_event_id uuid,
  related_collaboration_id uuid,
  created_at timestamptz not null default now()
);

alter table achievement_progress_events
  add column if not exists achievement_id uuid references achievements(id) on delete cascade,
  add column if not exists metric_key text,
  add column if not exists metric_value bigint,
  add column if not exists event_type text not null default 'unknown',
  add column if not exists event_value bigint not null default 1,
  add column if not exists event_source text default 'application',
  add column if not exists event_data jsonb not null default '{}'::jsonb,
  add column if not exists related_project_id uuid,
  add column if not exists related_event_id uuid,
  add column if not exists related_collaboration_id uuid,
  add column if not exists created_at timestamptz not null default now();

create index if not exists idx_achievement_progress_events_user on achievement_progress_events(user_id, created_at desc);
create index if not exists idx_achievement_progress_events_metric on achievement_progress_events(metric_key, created_at desc);

create table if not exists endorsements (
  id uuid primary key default gen_random_uuid(),
  endorser_id uuid not null references auth.users(id) on delete cascade,
  endorsee_id uuid not null references auth.users(id) on delete cascade,
  skill text not null,
  category text,
  level integer default 3,
  comment text,
  project_id uuid,
  collaboration_id uuid,
  event_id uuid,
  job_id uuid,
  is_verified boolean not null default false,
  verified_by uuid references auth.users(id) on delete set null,
  verified_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(endorser_id, endorsee_id, skill)
);

do $$
begin
  if to_regclass('public.skill_endorsements') is not null then
    insert into endorsements (endorser_id, endorsee_id, skill, level, is_active, created_at, updated_at)
    select se.endorser_id, se.endorsed_id, se.skill, 3, true, se.created_at, se.created_at
    from skill_endorsements se
    on conflict (endorser_id, endorsee_id, skill) do nothing;
  end if;
end $$;

-- Extensive catalog seed (tiered and metric-based)
insert into achievements (
  name, description, category, icon, requirements, metric_key, target_value, evaluation_mode, level, group_key, catalog_version, points, rarity, display_order
) values
  ('Booked & Busy', 'Get your first accepted booking request.', 'business', 'calendar-check', '{"metric_key":"bookings_accepted_total","target":1,"mode":"increment"}', 'bookings_accepted_total', 1, 'increment', 1, 'bookings_accepted_total', 1, 100, 'common', 10),
  ('Calendar Starter I', 'Reach 3 accepted bookings.', 'business', 'calendar', '{"metric_key":"bookings_accepted_total","target":3,"mode":"increment"}', 'bookings_accepted_total', 3, 'increment', 2, 'bookings_accepted_total', 1, 180, 'uncommon', 11),
  ('Calendar Starter II', 'Reach 10 accepted bookings.', 'business', 'calendar', '{"metric_key":"bookings_accepted_total","target":10,"mode":"increment"}', 'bookings_accepted_total', 10, 'increment', 3, 'bookings_accepted_total', 1, 300, 'rare', 12),
  ('Calendar Starter III', 'Reach 25 accepted bookings.', 'business', 'calendar', '{"metric_key":"bookings_accepted_total","target":25,"mode":"increment"}', 'bookings_accepted_total', 25, 'increment', 4, 'bookings_accepted_total', 1, 450, 'epic', 13),
  ('Hot Commodity I', 'Receive 5 incoming booking requests.', 'business', 'mail', '{"metric_key":"booking_requests_total","target":5,"mode":"increment"}', 'booking_requests_total', 5, 'increment', 1, 'booking_requests_total', 1, 120, 'common', 20),
  ('Hot Commodity II', 'Receive 20 incoming booking requests.', 'business', 'mail', '{"metric_key":"booking_requests_total","target":20,"mode":"increment"}', 'booking_requests_total', 20, 'increment', 2, 'booking_requests_total', 1, 260, 'rare', 21),
  ('Debut Night', 'Complete your first live event.', 'performance', 'stage', '{"metric_key":"events_completed_total","target":1,"mode":"increment"}', 'events_completed_total', 1, 'increment', 1, 'events_completed_total', 1, 110, 'common', 30),
  ('Stage Runner I', 'Complete 5 events.', 'performance', 'stage', '{"metric_key":"events_completed_total","target":5,"mode":"increment"}', 'events_completed_total', 5, 'increment', 2, 'events_completed_total', 1, 200, 'uncommon', 31),
  ('Stage Runner II', 'Complete 25 events.', 'performance', 'stage', '{"metric_key":"events_completed_total","target":25,"mode":"increment"}', 'events_completed_total', 25, 'increment', 3, 'events_completed_total', 1, 350, 'rare', 32),
  ('Stage Runner III', 'Complete 75 events.', 'performance', 'stage', '{"metric_key":"events_completed_total","target":75,"mode":"increment"}', 'events_completed_total', 75, 'increment', 4, 'events_completed_total', 1, 500, 'epic', 33),
  ('First 10 Fans', 'Reach 10 followers.', 'community', 'users', '{"metric_key":"followers_total","target":10,"mode":"absolute"}', 'followers_total', 10, 'absolute', 1, 'followers_total', 1, 90, 'common', 40),
  ('Rising Artist I', 'Reach 100 followers.', 'community', 'users', '{"metric_key":"followers_total","target":100,"mode":"absolute"}', 'followers_total', 100, 'absolute', 2, 'followers_total', 1, 170, 'uncommon', 41),
  ('Rising Artist II', 'Reach 1,000 followers.', 'community', 'users', '{"metric_key":"followers_total","target":1000,"mode":"absolute"}', 'followers_total', 1000, 'absolute', 3, 'followers_total', 1, 320, 'rare', 42),
  ('Rising Artist III', 'Reach 10,000 followers.', 'community', 'users', '{"metric_key":"followers_total","target":10000,"mode":"absolute"}', 'followers_total', 10000, 'absolute', 4, 'followers_total', 1, 550, 'epic', 43),
  ('First Drop', 'Publish your first public track.', 'music', 'music', '{"metric_key":"tracks_public_total","target":1,"mode":"increment"}', 'tracks_public_total', 1, 'increment', 1, 'tracks_public_total', 1, 100, 'common', 50),
  ('Catalog Builder I', 'Publish 5 public tracks.', 'music', 'music', '{"metric_key":"tracks_public_total","target":5,"mode":"increment"}', 'tracks_public_total', 5, 'increment', 2, 'tracks_public_total', 1, 190, 'uncommon', 51),
  ('Catalog Builder II', 'Publish 20 public tracks.', 'music', 'music', '{"metric_key":"tracks_public_total","target":20,"mode":"increment"}', 'tracks_public_total', 20, 'increment', 3, 'tracks_public_total', 1, 340, 'rare', 52),
  ('Catalog Builder III', 'Publish 50 public tracks.', 'music', 'music', '{"metric_key":"tracks_public_total","target":50,"mode":"increment"}', 'tracks_public_total', 50, 'increment', 4, 'tracks_public_total', 1, 520, 'epic', 53),
  ('First 1K Plays', 'Reach 1,000 total track plays.', 'music', 'play', '{"metric_key":"track_plays_total","target":1000,"mode":"absolute"}', 'track_plays_total', 1000, 'absolute', 1, 'track_plays_total', 1, 120, 'common', 60),
  ('Streaming Climber I', 'Reach 10,000 total track plays.', 'music', 'play', '{"metric_key":"track_plays_total","target":10000,"mode":"absolute"}', 'track_plays_total', 10000, 'absolute', 2, 'track_plays_total', 1, 230, 'uncommon', 61),
  ('Streaming Climber II', 'Reach 100,000 total track plays.', 'music', 'play', '{"metric_key":"track_plays_total","target":100000,"mode":"absolute"}', 'track_plays_total', 100000, 'absolute', 3, 'track_plays_total', 1, 380, 'rare', 62),
  ('Streaming Climber III', 'Reach 1,000,000 total track plays.', 'music', 'play', '{"metric_key":"track_plays_total","target":1000000,"mode":"absolute"}', 'track_plays_total', 1000000, 'absolute', 4, 'track_plays_total', 1, 650, 'legendary', 63),
  ('Hitmaker', 'Get a track to 100,000 plays.', 'music', 'sparkles', '{"metric_key":"max_track_plays","target":100000,"mode":"absolute"}', 'max_track_plays', 100000, 'absolute', 1, 'max_track_plays', 1, 420, 'epic', 70),
  ('First Post Live', 'Publish your first public post.', 'community', 'message-circle', '{"metric_key":"posts_public_total","target":1,"mode":"increment"}', 'posts_public_total', 1, 'increment', 1, 'posts_public_total', 1, 80, 'common', 80),
  ('Creator Mode I', 'Publish 25 public posts.', 'community', 'message-circle', '{"metric_key":"posts_public_total","target":25,"mode":"increment"}', 'posts_public_total', 25, 'increment', 2, 'posts_public_total', 1, 180, 'uncommon', 81),
  ('Creator Mode II', 'Publish 100 public posts.', 'community', 'message-circle', '{"metric_key":"posts_public_total","target":100,"mode":"increment"}', 'posts_public_total', 100, 'increment', 3, 'posts_public_total', 1, 320, 'rare', 82),
  ('Engagement Spark', 'Reach 100 interactions across posts.', 'community', 'flame', '{"metric_key":"post_interactions_total","target":100,"mode":"absolute"}', 'post_interactions_total', 100, 'absolute', 1, 'post_interactions_total', 1, 140, 'common', 90),
  ('All Eyes on You', 'Reach 1,000 interactions across posts.', 'community', 'flame', '{"metric_key":"post_interactions_total","target":1000,"mode":"absolute"}', 'post_interactions_total', 1000, 'absolute', 2, 'post_interactions_total', 1, 330, 'rare', 91),
  ('Open to Collab', 'Complete your first collaboration.', 'collaboration', 'handshake', '{"metric_key":"collaborations_completed_total","target":1,"mode":"increment"}', 'collaborations_completed_total', 1, 'increment', 1, 'collaborations_completed_total', 1, 110, 'common', 100),
  ('Synergy I', 'Complete 3 collaborations.', 'collaboration', 'handshake', '{"metric_key":"collaborations_completed_total","target":3,"mode":"increment"}', 'collaborations_completed_total', 3, 'increment', 2, 'collaborations_completed_total', 1, 220, 'uncommon', 101),
  ('Synergy II', 'Complete 10 collaborations.', 'collaboration', 'handshake', '{"metric_key":"collaborations_completed_total","target":10,"mode":"increment"}', 'collaborations_completed_total', 10, 'increment', 3, 'collaborations_completed_total', 1, 360, 'rare', 102),
  ('Business Builder I', 'Reach $1,000 total revenue.', 'business', 'banknote', '{"metric_key":"revenue_total","target":1000,"mode":"absolute"}', 'revenue_total', 1000, 'absolute', 1, 'revenue_total', 1, 180, 'uncommon', 110),
  ('Business Builder II', 'Reach $10,000 total revenue.', 'business', 'banknote', '{"metric_key":"revenue_total","target":10000,"mode":"absolute"}', 'revenue_total', 10000, 'absolute', 2, 'revenue_total', 1, 380, 'rare', 111),
  ('Business Builder III', 'Reach $100,000 total revenue.', 'business', 'banknote', '{"metric_key":"revenue_total","target":100000,"mode":"absolute"}', 'revenue_total', 100000, 'absolute', 3, 'revenue_total', 1, 700, 'legendary', 112),
  ('Profile Complete', 'Complete your profile setup.', 'milestone', 'user-check', '{"metric_key":"profile_completion_score","target":100,"mode":"absolute"}', 'profile_completion_score', 100, 'absolute', 1, 'profile_completion_score', 1, 140, 'common', 120),
  ('On Time Pro', 'Reach a 95% response rate.', 'business', 'timer', '{"metric_key":"response_rate","target":95,"mode":"absolute"}', 'response_rate', 95, 'absolute', 1, 'response_rate', 1, 260, 'rare', 121),
  ('Daily Pulse', 'Maintain 7 active days.', 'milestone', 'zap', '{"metric_key":"activity_streak_days","target":7,"mode":"absolute"}', 'activity_streak_days', 7, 'absolute', 1, 'activity_streak_days', 1, 160, 'uncommon', 130),
  ('Relentless I', 'Maintain 30 active days.', 'milestone', 'zap', '{"metric_key":"activity_streak_days","target":30,"mode":"absolute"}', 'activity_streak_days', 30, 'absolute', 2, 'activity_streak_days', 1, 320, 'rare', 131),
  ('Relentless II', 'Maintain 90 active days.', 'milestone', 'zap', '{"metric_key":"activity_streak_days","target":90,"mode":"absolute"}', 'activity_streak_days', 90, 'absolute', 3, 'activity_streak_days', 1, 550, 'epic', 132)
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
