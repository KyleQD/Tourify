-- REFERENCE ONLY.
create table if not exists public.license_deliveries (
  id uuid primary key default gen_random_uuid(), agreement_id uuid not null references public.license_agreements(id),
  recipient_user_id uuid, storage_bucket text not null, storage_path text not null, watermark_id text,
  purpose text not null, expires_at timestamptz, released_at timestamptz, created_at timestamptz not null default now()
);
create table if not exists public.cue_sheets (
  id uuid primary key default gen_random_uuid(), agreement_id uuid references public.license_agreements(id),
  project_id uuid not null references public.licensing_projects(id), version integer not null, status text not null default 'draft',
  production_metadata jsonb not null, created_at timestamptz not null default now(), unique(project_id,version)
);
create table if not exists public.cue_sheet_cues (
  id uuid primary key default gen_random_uuid(), cue_sheet_id uuid not null references public.cue_sheets(id),
  position integer not null, work_id uuid, recording_id uuid, duration_seconds integer not null,
  use_type text not null, metadata jsonb not null default '{}'
);
create table if not exists public.license_usage_reports (
  id uuid primary key default gen_random_uuid(), agreement_id uuid not null references public.license_agreements(id),
  period_start date, period_end date, source text not null, payload jsonb not null, status text not null default 'received', created_at timestamptz not null default now()
);
create table if not exists public.license_invoices (
  id uuid primary key default gen_random_uuid(), agreement_id uuid not null references public.license_agreements(id),
  provider_invoice_id text, currency text not null, amount_minor bigint not null, status text not null default 'draft', due_at timestamptz, created_at timestamptz not null default now()
);
