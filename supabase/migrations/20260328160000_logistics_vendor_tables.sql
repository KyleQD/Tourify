-- Logistics: vendor workflows, equipment catalog/inventory, and location tracking
create extension if not exists pgcrypto;

-- Equipment catalog (template items a vendor offers)
create table if not exists equipment_catalog (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  category text not null,
  description text,
  rental_rate numeric default 0,
  weight_kg numeric,
  dimensions text,
  power_requirements text,
  image_url text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Equipment instances (physical items tracked)
create table if not exists equipment_instances (
  id uuid primary key default gen_random_uuid(),
  catalog_id uuid not null references equipment_catalog(id) on delete cascade,
  instance_name text,
  serial_number text,
  asset_tag text,
  status text not null default 'available' check (status in ('available','in_use','maintenance','retired','in_transit')),
  rental_rate numeric,
  assigned_to_user_id uuid references auth.users(id) on delete set null,
  maintenance_notes text,
  last_maintenance_at timestamptz,
  next_maintenance_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Equipment locations (real-time location tracking)
create table if not exists equipment_locations (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references auth.users(id) on delete cascade,
  equipment_id uuid references equipment_instances(id) on delete set null,
  location_name text not null,
  address text,
  latitude numeric,
  longitude numeric,
  location_type text default 'warehouse' check (location_type in ('warehouse','venue','in_transit','on_site','maintenance_shop')),
  notes text,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- Setup workflows (tied to site maps)
create table if not exists equipment_setup_workflows (
  id uuid primary key default gen_random_uuid(),
  site_map_id uuid,
  name text not null,
  description text,
  status text not null default 'draft' check (status in ('draft','active','in_progress','completed','cancelled')),
  estimated_duration_minutes integer,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Setup tasks (steps within a workflow)
create table if not exists equipment_setup_tasks (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references equipment_setup_workflows(id) on delete cascade,
  title text not null,
  description text,
  ordinal integer not null default 0,
  status text not null default 'pending' check (status in ('pending','in_progress','completed','skipped')),
  assigned_to uuid references auth.users(id) on delete set null,
  estimated_minutes integer,
  actual_minutes integer,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

-- Workflow templates (reusable setup sequences)
create table if not exists workflow_templates (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  steps jsonb not null default '[]',
  category text,
  estimated_duration_minutes integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Workflow executions (instances of templates tied to events)
create table if not exists workflow_executions (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid references equipment_setup_workflows(id) on delete set null,
  template_id uuid references workflow_templates(id) on delete set null,
  event_id uuid references events_v2(id) on delete set null,
  status text not null default 'pending' check (status in ('pending','in_progress','completed','failed','cancelled')),
  started_at timestamptz,
  completed_at timestamptz,
  executed_by uuid references auth.users(id) on delete set null,
  notes text,
  created_at timestamptz not null default now()
);

-- Indexes
create index if not exists idx_equip_catalog_vendor on equipment_catalog(vendor_id);
create index if not exists idx_equip_instances_catalog on equipment_instances(catalog_id);
create index if not exists idx_equip_instances_status on equipment_instances(status);
create index if not exists idx_equip_locations_vendor on equipment_locations(vendor_id);
create index if not exists idx_equip_locations_equipment on equipment_locations(equipment_id);
create index if not exists idx_setup_workflows_site on equipment_setup_workflows(site_map_id);
create index if not exists idx_setup_tasks_workflow on equipment_setup_tasks(workflow_id);
create index if not exists idx_wf_templates_vendor on workflow_templates(vendor_id);
create index if not exists idx_wf_executions_event on workflow_executions(event_id);

-- RLS
alter table equipment_catalog enable row level security;
alter table equipment_instances enable row level security;
alter table equipment_locations enable row level security;
alter table equipment_setup_workflows enable row level security;
alter table equipment_setup_tasks enable row level security;
alter table workflow_templates enable row level security;
alter table workflow_executions enable row level security;

do $$ begin
  drop policy if exists equip_catalog_all on equipment_catalog;
  create policy equip_catalog_all on equipment_catalog for all
    using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

  drop policy if exists equip_instances_all on equipment_instances;
  create policy equip_instances_all on equipment_instances for all
    using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

  drop policy if exists equip_locations_all on equipment_locations;
  create policy equip_locations_all on equipment_locations for all
    using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

  drop policy if exists setup_workflows_all on equipment_setup_workflows;
  create policy setup_workflows_all on equipment_setup_workflows for all
    using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

  drop policy if exists setup_tasks_all on equipment_setup_tasks;
  create policy setup_tasks_all on equipment_setup_tasks for all
    using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

  drop policy if exists wf_templates_all on workflow_templates;
  create policy wf_templates_all on workflow_templates for all
    using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

  drop policy if exists wf_executions_all on workflow_executions;
  create policy wf_executions_all on workflow_executions for all
    using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
end $$;
