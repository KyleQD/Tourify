# Current State Audit

| Area | State | Decision |
| --- | --- | --- |
| Worker assignment | Reuse | `employment_assignments` is worker authority. |
| Schedule | Extend | `staff_shifts` is the schedule authority through `staff_shift_id`. |
| Packets and updates | Extend | `work_mode_publications` needs worker RLS and version metadata. |
| Attendance | Extend | Existing append-only event table gains transition constraints and shift windows. |
| Applications/jobs | Reuse | Existing artist and staffing APIs remain authoritative. |
| Maps | Reuse | Published site-map route remains assignment-scoped. |

Never create parallel worker job, schedule, packet, or attendance records.
