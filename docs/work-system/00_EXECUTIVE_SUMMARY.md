# Work System Executive Summary

Work Hub is the cross-assignment planning surface; Work Mode is the active-assignment operational surface. The launch foundation reuses `employment_assignments`, linked `staff_shifts`, `work_mode_publications`, existing job/application APIs, site maps, and notifications.

Live Demo audit on 2026-08-19 found the worker action tables already applied. It also found `work_mode_publications` has RLS enabled without policies and assignments still retain a legacy `events` FK while staff shifts and publications use `events_v2`. The P0 migration repairs access additively through the existing shift link.
