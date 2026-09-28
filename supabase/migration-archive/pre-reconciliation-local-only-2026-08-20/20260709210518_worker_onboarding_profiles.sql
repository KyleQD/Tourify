-- Private, user-scoped worker onboarding profile for cross-job reuse.
-- Non-sensitive answers live in profile_data; sensitive values are AES-encrypted
-- in sensitive_envelope. Employers have no SELECT policy on this table.

begin;

create table if not exists public.worker_onboarding_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  profile_data jsonb not null default '{}'::jsonb,
  sensitive_envelope jsonb,
  document_refs jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

comment on table public.worker_onboarding_profiles is
  'Private worker onboarding reuse store. Owner-only RLS; sensitive fields encrypted at app layer.';

comment on column public.worker_onboarding_profiles.profile_data is
  'Non-sensitive reusable field map keyed by onboarding field.name';

comment on column public.worker_onboarding_profiles.sensitive_envelope is
  'AES-256-GCM SecureEnvelope containing sensitive field values (ssn/bank/tax).';

comment on column public.worker_onboarding_profiles.document_refs is
  'Reusable document metadata refs keyed by field.name (no public storage paths required).';

create index if not exists idx_worker_onboarding_profiles_updated_at
  on public.worker_onboarding_profiles (updated_at desc);

alter table public.worker_onboarding_profiles enable row level security;

drop policy if exists worker_onboarding_profiles_owner on public.worker_onboarding_profiles;

create policy worker_onboarding_profiles_owner
  on public.worker_onboarding_profiles
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Explicitly revoke broad grants; owner policy + service role cover access.
revoke all on public.worker_onboarding_profiles from anon;
grant select, insert, update, delete on public.worker_onboarding_profiles to authenticated;
grant all on public.worker_onboarding_profiles to service_role;

commit;
