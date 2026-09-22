-- events table uses draft|published|cancelled; remove misplaced events_v2 status check
alter table public.events drop constraint if exists events_v2_status_check;;
