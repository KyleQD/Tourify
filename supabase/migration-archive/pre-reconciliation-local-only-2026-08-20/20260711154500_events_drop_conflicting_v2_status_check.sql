-- Artist/legacy events use draft|published|cancelled.
-- Remove misplaced events_v2 status check that blocked all inserts.
alter table public.events drop constraint if exists events_v2_status_check;
