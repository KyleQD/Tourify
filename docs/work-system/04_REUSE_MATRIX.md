# Work System Reuse Matrix

| Capability | Existing implementation | Strategy |
| --- | --- | --- |
| Jobs | `/api/jobs` facade | Reuse; filter already-applied/test records in presentation. |
| Applications | `/api/me/applications` | Reuse; preserve source-specific mutations. |
| Assignments | `employment_assignments` | Reuse as the worker authority. |
| Schedule | `staff_shifts` | Extend through `staff_shift_id`; no duplicate schedule. |
| Packets/updates | `work_mode_publications` | Extend with RLS, versions, acknowledgements. |
| Maps | worker site-map API/viewer | Reuse. |
| Notifications | existing notification ecosystem | Reuse for delivery; Work Mode renders publication updates. |
| Attendance | `work_mode_check_in_events` | Extend with state validation and unique action constraint. |
