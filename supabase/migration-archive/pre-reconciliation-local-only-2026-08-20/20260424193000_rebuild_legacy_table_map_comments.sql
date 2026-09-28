set client_min_messages = warning;

-- Phase 1 (rebuild): document canonical tables for strangler migration — no new duplicate entities.
-- See docs/tourify-rebuild-phase-0-1-dependency-map.md

comment on table public.artist_jobs is 'Artist gig/opportunity board (public listings). Unified "jobs" facade merges with job_posting_templates in app layer.';
comment on table public.job_posting_templates is 'Venue/admin staffing job postings. Unified "jobs" facade merges with artist_jobs in app layer.';
comment on table public.events_v2 is 'Canonical event root for event HQ, bulletins, and logistics — do not introduce a parallel public.events table without migration.';
comment on table public.team_communications is 'Venue-scoped team announcements/messages; preferred venue staff feed over mock UI.';
