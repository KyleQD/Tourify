set client_min_messages = warning;

-- Organization/artist employers do not have a venue_id; only venue-scoped rows need it.
alter table public.job_applications
  alter column venue_id drop not null;
