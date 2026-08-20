# Work System Reuse Matrix

This operational copy is maintained with [04_REUSE_MATRIX.md](./04_REUSE_MATRIX.md). It exists at the required stable name for implementation and release reviews.

| Capability | Existing implementation | Backend | Quality | Can reuse? | Strategy |
| --- | --- | --- | --- | --- | --- |
| Job cards/search | Unified jobs facade | artist jobs + staffing postings | Production path | Yes | Present filtered results in Work Hub. |
| Application state | Current-user applications API | artist/staffing application tables | Production path | Yes | Preserve source mutations. |
| Assignment cards | Work Mode read model | `employment_assignments` | Partial | Yes | Extend with shift context. |
| Scheduling | Staff shift system | `staff_shifts` | Partial | Yes | Link by `staff_shift_id`. |
| Packets/updates | Work publications | `work_mode_publications` | Partial | Yes | Add RLS/version metadata. |
| Maps | Worker site-map viewer | assignment-scoped map API | Production path | Yes | Keep publication link contract. |
| Attendance | Worker action route | append-only worker action tables | Partial | Yes | Add action uniqueness and shift windows. |
| Notifications | Existing notification system | notification tables/services | Production path | Yes | Use for delivery; do not duplicate broadcasts. |
