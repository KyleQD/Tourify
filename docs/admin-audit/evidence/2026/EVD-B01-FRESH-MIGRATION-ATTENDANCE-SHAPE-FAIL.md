# ADM-B01 fresh migration rehearsal — attendance shape failure

After the ticketing foundation and financial constraint fixes, the correct Tourify workspace advanced through `20260821000000_reconcile_ticketing_foundation.sql` and stopped in `20260821025543_unified_guest_list_admissions.sql`.

The dependent migration attempted to constrain and upsert `public.event_attendance.event_table`, but the active legacy table only had `event_id`, `user_id`, and `status`; PostgreSQL returned `SQLSTATE 42703` (`column "event_table" does not exist`). A new additive compatibility migration now adds the column with the legacy `events` default and replaces the uniqueness key before the dependent migration runs.
