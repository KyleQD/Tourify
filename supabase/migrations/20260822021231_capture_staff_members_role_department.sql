set client_min_messages = warning;

-- Baseline capture: staff_members.role and staff_members.department existed
-- on the live reference databases (referenced by the streamlined tour
-- builder RPC and connected worker work hub) but were never captured by a
-- tracked migration. Guarded, additive.

alter table public.staff_members
  add column if not exists role text,
  add column if not exists department text;
