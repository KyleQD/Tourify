-- REFERENCE ONLY. Audit deployed types, schemas, RLS, capabilities, and migration order.
-- Create production migrations with the installed Supabase CLI. Never reset the database.

create table if not exists public.institutional_organizations (
  id uuid primary key default gen_random_uuid(),
  legal_name text not null,
  organization_type text not null,
  jurisdiction text,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.institutional_transaction_cases (
  id uuid primary key default gen_random_uuid(),
  seller_organization_id uuid references public.institutional_organizations(id),
  artist_user_id uuid not null,
  status text not null default 'draft',
  classification_status text not null default 'review_required',
  approved_path text,
  current_snapshot_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.institutional_data_rooms (
  id uuid primary key default gen_random_uuid(),
  transaction_case_id uuid not null references public.institutional_transaction_cases(id),
  status text not null default 'draft',
  created_at timestamptz not null default now()
);

create table if not exists public.institutional_data_room_documents (
  id uuid primary key default gen_random_uuid(),
  data_room_id uuid not null references public.institutional_data_rooms(id),
  document_version integer not null,
  storage_bucket text not null,
  storage_path text not null,
  sha256 text not null,
  classification text not null,
  created_at timestamptz not null default now(),
  unique (data_room_id, storage_path, document_version)
);

-- Enable RLS and add repository-specific membership/deal/capability policies after audit.
