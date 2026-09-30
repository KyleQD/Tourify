# Live Event Workforce Role Catalog

## Purpose

Tourify now has a platform-level catalog for the 74 live-event and festival workforce roles identified in the supplied reference. The catalog is designed to be used by both **Jobs/Hiring** and **Workforce Management**, so the same role definition follows a worker from job creation through onboarding, assignment, scheduling, execution, handoff, and closeout.

The global catalog is version-controlled in:

- `lib/staff/live-event-role-catalog-a.ts`
- `lib/staff/live-event-role-catalog-b.ts`
- `lib/staff/live-event-role-catalog.ts`

Entity-owned overrides remain supported through `role_templates`.

## Structured role definition

Every role contains:

- **Job definition** — `job_summary`
- **Duties** — `duties[]`
- **Qualifications** — `qualifications[]`
- **Credentials** — `required_credentials[]`
- **Operational essentials** — `essentials[]`
- **Workflow integration** — `workflow_requirements`
- **Department** and **role category**
- **Default employment type**
- **Tags**
- **Derived Work Mode permissions**

Credentials are defaults for workflow and screening. A credential marked as jurisdiction-dependent must be confirmed against the actual event location, employer policy, venue rules, insurance requirements, and applicable law before a posting is published or a worker is cleared.

## Job workflow

When an authorized employer opens the universal job-posting builder:

1. Tourify loads global roles plus the employer's entity-owned role overrides.
2. Selecting a workforce role pre-fills:
   - title/position context;
   - department;
   - employment type;
   - role key;
   - description;
   - responsibilities;
   - requirements;
   - structured credentials;
   - human-readable required certifications;
   - role essentials;
   - management-workflow requirements.
3. The employer can edit the posting-specific copy without changing the platform role definition.
4. When saved, Tourify stores both the posting fields and a `role_definition_snapshot`.
5. The snapshot prevents later catalog edits from silently changing the requirements of an already-created job.

## Hire -> workforce workflow

On approval:

1. Tourify resolves the job's selected role.
2. `employment_assignments` receives:
   - `role_template_id` when the selected role is database-backed;
   - `role_key`;
   - `role_category`;
   - derived Work Mode permissions;
   - `role_definition_snapshot`.
3. The assignment is scoped to the correct employer/event/tour.
4. Workforce APIs expose the role key/category/definition with the roster member.
5. Management surfaces can use `workflow_requirements.management_surfaces` to decide which operational modules are relevant to that person or role.

Typical surfaces include:

- workforce / roster;
- onboarding;
- scheduling and timekeeping;
- credentials and access control;
- communications;
- tasks;
- advancing / run of show;
- transportation / dispatch;
- vendors / permits;
- inventory / equipment;
- ticketing;
- finance / payroll;
- incident reporting / incident command;
- weather;
- media library / content calendar;
- analytics / reporting;
- site operations.

## Role inventory

The catalog contains these 74 roles:

1. ADA Accessibility Team
2. Artist Hospitality
3. Artist Relations Manager
4. Audio Engineer
5. Backstage Coordinator
6. Bartender
7. Booking Agent
8. Box Office Staff
9. Brand Activations Team
10. Camping Operations
11. Catering Team
12. Cleaning Crew
13. Content Creators
14. Creative Director
15. Crowd Control Staff
16. Credentialing Staff
17. Data + Analytics Team
18. Drone Operator
19. Emergency Response Team
20. Entertainment Lawyer
21. Fence + Barricade Crew
22. Festival Founder
23. Finance + Payroll Team
24. Food Vendor
25. Generator + Power Crew
26. Golf Cart Driver
27. Graphic Designer
28. Grounds Crew
29. Hair + Makeup
30. Hospitality Manager
31. Influencer + Creator Relations
32. Internet + WiFi Team
33. ID Check Staff
34. LED Visual Operator
35. Lighting Designer
36. Livestream Team
37. Logistics Coordinator
38. Lost + Found Staff
39. Marketing Director
40. Medic Team
41. Merch Team
42. Mobile App Team
43. Paid Ads Team
44. Parking Staff
45. Partnerships + Sponsors Team
46. Permits Coordinator
47. Photographer
48. Production Manager
49. Public Relations Team
50. Pyro Technician
51. Rigging Crew
52. Runner Team
53. Security Director
54. Security Guard
55. Set Designer
56. Shuttle Driver
57. Site Operations Manager
58. Social Media Team
59. Stage Manager
60. Stagehand
61. Sustainability Team
62. Talent Buyer
63. Ticketing Manager
64. Traffic Control Team
65. Tour Manager
66. Transportation Coordinator
67. Trash + Recycling Team
68. Vendor Coordinator
69. Videographer
70. VIP Experience Team
71. Volunteer Coordinator
72. Water Station Staff
73. Weather Monitoring Team
74. Wristband + Credential Printing

## API surfaces

- `GET /api/hiring/role-templates`
  - authorized employer-aware list used by the universal job builder;
  - merges platform catalog + entity-owned overrides.
- `GET /api/admin/workforce/roles`
  - admin workforce catalog.
- `GET /api/admin/workforce/people`
  - roster members now include role key/template/category and the role-definition snapshot when available.
- `GET /api/venue/roles`
  - venue role manager now receives the full platform catalog plus venue-owned overrides.

## Database changes

Migration: `20260930152000_workforce_role_definition_fields.sql`

The migration is additive and drift-tolerant. It:

- bootstraps `role_templates` if an environment does not yet have it;
- adds structured definition fields to role templates;
- expands legacy six-role job constraints to stable role slugs;
- supports `intern` employment type and `any` experience level;
- adds role snapshots/workflow data to `job_posting_templates`;
- adds role key/template/category/snapshot support to `employment_assignments`;
- preserves existing data;
- enables and scopes RLS for entity-owned role templates.

## Source-of-truth rule

- **Platform default role definition:** version-controlled live-event role catalog.
- **Venue/organization override:** `role_templates`.
- **Specific published job requirements:** the job-posting record.
- **Historical hiring truth:** `role_definition_snapshot` on the job and employment assignment.

This separation lets Tourify improve the global catalog over time without rewriting historical jobs or workforce assignments.
