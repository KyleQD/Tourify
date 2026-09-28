set client_min_messages = warning;

alter table public.site_map_zones
  add column if not exists lead_user_id uuid references public.profiles(id) on delete set null;

alter table public.site_map_zones
  add column if not exists assigned_department text;

create index if not exists idx_site_map_zones_lead_user_id
  on public.site_map_zones(lead_user_id);

create index if not exists idx_site_map_zones_assigned_department
  on public.site_map_zones(assigned_department);
