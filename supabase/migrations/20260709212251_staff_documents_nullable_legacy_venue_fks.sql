-- Polymorphic hiring (organization/artist) uploads documents before a venue_team_members
-- row exists. Legacy staff_documents required venue_id + staff_member_id (FK to
-- venue_team_members), which blocks token onboarding for non-venue employers.
-- Keep the FKs when values are present; allow NULL for candidate-scoped uploads.

alter table public.staff_documents
  alter column staff_member_id drop not null;

alter table public.staff_documents
  alter column venue_id drop not null;;
