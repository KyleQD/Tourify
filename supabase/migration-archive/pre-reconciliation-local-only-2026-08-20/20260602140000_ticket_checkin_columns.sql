set client_min_messages = warning;

-- Add check-in tracking columns to ticket_sales
alter table ticket_sales
  add column if not exists checked_in_by uuid references auth.users(id) on delete set null,
  add column if not exists qr_code      uuid default gen_random_uuid();

-- Create unique index on qr_code for fast lookups
create unique index if not exists idx_ticket_sales_qr_code_unique on ticket_sales(qr_code)
  where qr_code is not null;
