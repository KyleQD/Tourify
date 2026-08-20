# Rollout and Rollback

Apply P0 migration to a production-like branch, run RLS and lifecycle tests, enable worker actions for a controlled event cohort, and monitor authorization denials and mutation failures. Roll back by disabling the feature flag or routing to the read-only surface; never remove assignments, publications, or attendance evidence.

## Controlled cohort sequence

1. Validate the applied migration list, policies, indexes, and `supabase_realtime` publication in a production-like project.
2. Run the two-worker RLS persona matrix and the lifecycle cases in the test matrix with seeded, non-test worker records.
3. Enable worker actions for one organization/event cohort; observe assignment loads, action completions, acknowledgement persistence, check-in success/failure, and authorization denials.
4. If applicable, enable Realtime for that same cohort only after its migration checks pass.
5. Expand cohorts only after operator sign-off and no unresolved authorization, duplicate-action, or timezone defects.

## Rollback

Disable `FEATURE_WORK_MODE_WORKER_ACTIONS` to stop attendance/acknowledgement mutations. Disable `NEXT_PUBLIC_FEATURE_WORK_MODE_REALTIME` to stop subscriptions. Route the cohort back to the prior read-only Work Mode if required. These controls are additive: do not delete attendance events, acknowledgements, assignments, schedules, or status history as part of rollback.

## Reliability rollout

The locally cached Work Mode snapshot is read-only and remains available without a feature flag. It is scoped to the signed-in worker's browser session and never queues attendance writes.

Enable `NEXT_PUBLIC_FEATURE_WORK_MODE_REALTIME=true` only after both of these migrations have been applied and verified in a production-like environment:

1. `20260819010000_work_system_p0_security_and_attendance.sql` — worker RLS and assignment-scoped visibility.
2. `20260819020000_work_system_realtime_publication.sql` — adds only the three event-day tables to `supabase_realtime`.

The subscription is deliberately narrow: the current worker's assignments, the active assignment's linked shift, and publications for its active event. If Realtime is disconnected, backgrounded, or not configured, the app refetches on focus and retains the manual Refresh control. Disable the public flag to stop subscriptions immediately; the read model and append-only attendance history remain unchanged.
