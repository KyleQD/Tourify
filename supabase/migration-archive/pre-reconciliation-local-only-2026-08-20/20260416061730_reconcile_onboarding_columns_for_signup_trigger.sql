set client_min_messages = warning;

-- Ensure public.onboarding matches columns used by public.handle_new_user() in
-- 20260415210006_signup_profile_and_email_confirmation.sql. Missing columns cause
-- the onboarding insert to fail inside the exception handler (silent in prod except warnings).

alter table public.onboarding add column if not exists general_profile_completed boolean default false;
alter table public.onboarding add column if not exists artist_profile_completed boolean default false;
alter table public.onboarding add column if not exists venue_profile_completed boolean default false;
alter table public.onboarding add column if not exists active_profile_type text default 'general';
alter table public.onboarding add column if not exists steps jsonb default '{}'::jsonb;
alter table public.onboarding add column if not exists role text;
alter table public.onboarding add column if not exists purpose text;
alter table public.onboarding add column if not exists on_tour boolean;
alter table public.onboarding add column if not exists completed boolean default false;
