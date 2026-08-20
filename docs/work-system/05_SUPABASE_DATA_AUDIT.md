# Supabase Data Audit

The active Demo project was inspected read-only on 2026-08-19. `employment_assignments`, `staff_shifts`, `work_mode_publications`, `work_mode_check_in_events`, and `work_mode_publication_acknowledgements` exist with RLS enabled.

P0 findings: assignment event IDs reference `events`, while linked shift and publication event IDs reference `events_v2`. The formerly policy-less `work_mode_publications` table and authenticated-wide `staff_shifts` read policy were remediated by the manually applied P0 SQL on 2026-08-19. Hosted verification confirmed the new worker/manager policies, check-in window columns, publication-version columns, worker publication index, and unique `(assignment_id, action)` check-in constraint.

P2 read-only check: hosted verification confirms `employment_assignments`, `staff_shifts`, and `work_mode_publications` are now present in the `supabase_realtime` publication. The browser implementation remains inactive until `NEXT_PUBLIC_FEATURE_WORK_MODE_REALTIME=true` is set in the deployment environment for a controlled cohort.
