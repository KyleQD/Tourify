# Tourify Universal Onboarding Rebuild Plan

## Purpose

This document defines a phased execution plan to rebuild Tourify’s onboarding system into one clean, real-data hiring and onboarding module that can be used by Venue, Organization, and Artist accounts.

The goal is to replace fragmented, venue-only onboarding logic with a universal system powered by `HiringEntity`, Supabase, real templates, secure document handling, and Work Mode activation.

No production component should rely on mock data, fake candidates, fake AI insights, local-only stats, or hardcoded activity feeds.

---

## Product Goal

Build one onboarding system that supports Venue hiring, Organization hiring, and Artist hiring for real live-event operations.

### Employer side

- Venue hiring staff.
- Organization hiring staff for its own team or for a third-party venue.
- Artist hiring tour crew, managers, photographers, merch sellers, FOH, lighting, production, and support roles.

### Worker side

- One clean onboarding link.
- Mobile-first form experience.
- Real document upload.
- Real progress tracking.
- Real completion into `staff_members`.
- Real Work Mode access through `employment_assignments`.

### Canonical flow

```txt
Employer creates job
→ Applicant applies
→ Employer reviews
→ Approval creates candidate + invite token
→ Worker completes onboarding
→ System creates staff member + employment assignment
→ Worker can operate in Work Mode
```

---

## Current System Diagnosis

### What is worth keeping

The current repo already has useful presentational components that can be retained as smaller UI building blocks:

```txt
application-applicant-summary.tsx
application-job-summary.tsx
application-rating.tsx
application-responses-list.tsx
application-review-actions.tsx
application-status-badge.tsx
application-insights-badges.tsx
hiring-state-card.tsx
```

These components should mostly be kept, cleaned up if needed, and reused inside the new `components/hiring` module.

### What needs to be rebuilt

Several existing onboarding components are currently venue-only. The old pattern is:

```ts
venueId: string
```

The new architecture must use:

```ts
export interface HiringEntity {
  entityType: "venue" | "organization" | "artist"
  entityId: string
  displayName: string
  scope?: {
    eventId?: string
    tourId?: string
    venueId?: string
  }
}
```

Every hiring mutation, dashboard query, onboarding route, template lookup, and roster write must resolve and validate a `HiringEntity` before touching data.

### What should be removed or deferred

`neural-staff-command.tsx` should not ship in production until it is backed by real analytics and real staffing data. It currently uses local fake AI insights and local fake activity.

`onboarding-management.tsx` should be replaced because it contains placeholder behavior and incomplete service integration.

`onboarding-form-fields.tsx` has valuable field ideas, but it should be rebuilt as a safer `DynamicOnboardingForm` with real validation, Supabase Storage uploads, and credentials vault routing for sensitive data.

---

# Phase 0 — Stabilize Rules, Types, and Source of Truth

## Objective

Make the repo safe to rebuild without breaking the existing venue flow.

## Tasks

### 0.1 Fix immediate TypeScript blockers

Fix the profile role/type typo:

```ts
export type ProfileCategory = "Person" | "Place" | "Thing";n
```

Change to:

```ts
export type ProfileCategory = "Person" | "Place" | "Thing";
```

### 0.2 Create canonical hiring types

Create:

```txt
types/hiring-entity.ts
```

Add:

```ts
export interface HiringEntity {
  entityType: "venue" | "organization" | "artist"
  entityId: string
  displayName: string
  scope?: {
    eventId?: string
    tourId?: string
    venueId?: string
  }
}

export interface HiringActor {
  userId: string
  employer: HiringEntity
}

export interface ResolveHiringEntityArgs {
  userId: string
  entityType?: "venue" | "organization" | "artist"
  entityId?: string
  venueId?: string
  eventId?: string
  tourId?: string
}
```

### 0.3 Extend admin onboarding types

Update:

```txt
types/admin-onboarding.ts
```

Add these fields to all hiring/onboarding-facing models:

```ts
employer_entity_type: "venue" | "organization" | "artist"
employer_entity_id: string
```

Apply to:

```txt
JobPostingTemplate
JobApplication
StaffOnboardingCandidate
StaffInvitation
StaffOnboardingTemplate
OnboardingWorkflow
HiringAuditEvent
HiringEligibilitySnapshot
StaffMember
EmploymentAssignment
```

### 0.4 Define onboarding boundaries

Lock this rule into docs and comments:

```txt
Platform onboarding = creating identity/persona
Staff hiring onboarding = turning an approved applicant into staff + Work Mode
```

Staff onboarding should not create duplicate accounts or duplicate personas unless explicitly part of an invite/signup path.

### 0.5 Add hard no-mock-data rule

Add to `.cursor/rules/admin_onboarding.md`:

```md
No production component may ship with hardcoded fake staff, fake AI insights, fake activity, fake candidates, fake templates, or local-only dashboard data. Empty states must represent real empty Supabase query results.
```

---

# Phase 1 — Database Migration and RBAC Foundation

## Objective

Make the database support all hiring profiles without destroying existing venue data.

## Tasks

### 1.1 Create additive migration

Create:

```txt
supabase/migrations/20260625000000_polymorphic_hiring_entity.sql
```

Add these columns to all core hiring tables:

```sql
employer_entity_type text check (
  employer_entity_type in ('venue', 'organization', 'artist')
),
employer_entity_id uuid
```

Apply to:

```txt
job_posting_templates
job_applications
staff_onboarding_candidates
staff_invitations
staff_onboarding_templates
onboarding_workflows
hiring_audit_events
hiring_eligibility_snapshots
employment_assignments
staff_members
```

Keep existing `venue_id` columns during the migration for backward compatibility.

### 1.2 Backfill existing venue data

For each table with `venue_id`, backfill using:

```sql
update job_posting_templates
set employer_entity_type = 'venue',
    employer_entity_id = venue_id
where employer_entity_type is null
  and venue_id is not null;
```

Repeat for:

```txt
job_applications
staff_onboarding_candidates
staff_invitations
staff_onboarding_templates
onboarding_workflows
hiring_audit_events
hiring_eligibility_snapshots
employment_assignments
staff_members
```

### 1.3 Add indexes

```sql
create index if not exists idx_job_posting_templates_employer
on job_posting_templates (employer_entity_type, employer_entity_id);

create index if not exists idx_job_applications_employer_status
on job_applications (employer_entity_type, employer_entity_id, status);

create index if not exists idx_staff_candidates_employer_status
on staff_onboarding_candidates (employer_entity_type, employer_entity_id, status);

create index if not exists idx_staff_invitations_token
on staff_invitations (token);

create index if not exists idx_staff_members_employer
on staff_members (employer_entity_type, employer_entity_id);

create index if not exists idx_employment_assignments_employer
on employment_assignments (employer_entity_type, employer_entity_id);
```

### 1.4 Add RLS RPC

Create:

```sql
can_manage_hiring(user_id uuid, entity_type text, entity_id uuid)
```

Rules:

```txt
Venue → user has venue hiring/staff permission
Organization → user has org staff.manage permission
Artist → user owns/manages artist or has can_hire permission
```

### 1.5 Update RLS policies

Every core hiring table should enforce:

```txt
Applicants see only their own applications and onboarding rows.
Employers see only rows for employer_entity_type + employer_entity_id they can manage.
Token onboarding can read only by valid invitation token.
Service role usage is limited and audited.
```

---

# Phase 2 — Auth, Acting Context, and Service Facade

## Objective

Stop allowing UI components and API routes to directly guess scope.

## Tasks

### 2.1 Extend acting context

Update:

```txt
lib/auth/acting-context.ts
```

Add:

```ts
export async function resolveHiringEntity(args: ResolveHiringEntityArgs): Promise<HiringEntity>
```

It should resolve active hiring account from:

```txt
explicit entity_type + entity_id
current acting context
legacy venue_id
route context
```

### 2.2 Create hiring permissions service

Create or rewrite:

```txt
lib/auth/hiring-permissions.ts
```

Export:

```ts
canManageHiring()
canReviewApplications()
canManageOnboardingTemplates()
canInviteStaff()
canAssignWorkMode()
```

Each function should use RORO arguments:

```ts
interface CanManageHiringArgs {
  userId: string
  employer: HiringEntity
}
```

### 2.3 Create service facade

Create:

```txt
lib/services/hiring-onboarding.service.ts
```

This becomes the only service the new UI and API use.

Required methods:

```ts
createJobPosting()
listJobPostings()
submitApplication()
listApplications()
approveApplication()
rejectApplication()
waitlistApplication()
createCandidateFromApplication()
generateOnboardingInvite()
resolveOnboardingTemplate()
getTokenOnboardingPayload()
submitTokenOnboarding()
completeOnboarding()
getDashboardStats()
listRoster()
assignShiftZone()
```

### 2.4 Consolidate approval logic

Move all approval side effects into:

```ts
HiringOnboardingService.approveApplication()
```

It must handle:

```txt
1. Validate actor permission
2. Validate application belongs to employer
3. Run eligibility gate
4. Update job_applications.status
5. Create staff_onboarding_candidates
6. Create staff_invitations token
7. Stamp token on candidate
8. Bootstrap onboarding_workflows
9. Create employment_assignments
10. Insert hiring_audit_events
11. Send notification
```

Expected errors should be modeled as return values, not thrown blindly.

---

# Phase 3 — Template System Rebuild

## Objective

Make application forms, onboarding forms, workflows, and role permissions separate but composable.

## Template layers

Keep these four systems separate:

```txt
Application form template
Staff onboarding form template
Workflow template
Role / Work Mode template
```

## Tasks

### 3.1 Build template resolver

Create:

```txt
lib/services/onboarding-template-resolver.service.ts
```

Export:

```ts
resolveOnboardingTemplate({
  employer,
  position,
  department,
  templateId,
  flowType,
})
```

Priority:

```txt
1. Explicit templateId
2. Employer-scoped template matching position + department
3. Employer default template
4. Global role fallback
5. Safe minimal default
```

### 3.2 Fix token template bug

Update:

```txt
app/api/onboarding/[token]/route.ts
```

The token route must not load a global default template blindly.

It should resolve:

```txt
token
→ staff_invitations
→ candidate
→ employer_entity_type + employer_entity_id
→ job/application/template metadata
→ entity-scoped onboarding template
```

### 3.3 Seed real default templates

Create real `staff_onboarding_templates` for:

```txt
General Staff
Security Guard
Bartender
Street Team
Production Crew
FOH Engineer
Lighting Tech
Tour Manager
Merch Seller
Photographer/Videographer
Volunteer
```

### 3.4 Migrate existing templates

Backfill old venue templates:

```txt
venue_id → employer_entity_type: "venue"
venue_id → employer_entity_id
```

Do not delete old templates until the new resolver proves parity.

---

# Phase 4 — API Route Cleanup

## Objective

Make every API route use the service facade and real employer scope.

## Tasks

### 4.1 Create new canonical APIs

Create:

```txt
GET  /api/hiring/dashboard?entity_type=&entity_id=
POST /api/hiring/invite
GET  /api/hiring/applications?entity_type=&entity_id=
PATCH /api/hiring/applications/[id]
GET  /api/hiring/roster?entity_type=&entity_id=
POST /api/hiring/job-postings
```

### 4.2 Update legacy admin APIs

Rewrite these to delegate to `HiringOnboardingService`:

```txt
app/api/admin/applications/route.ts
app/api/admin/applications/[id]/route.ts
app/api/admin/job-postings/route.ts
app/api/admin/onboarding/dashboard/route.ts
app/api/admin/onboarding/candidates/route.ts
app/api/admin/onboarding/templates/route.ts
app/api/admin/onboarding/workflows/route.ts
```

They should accept:

```txt
entity_type + entity_id
```

and legacy:

```txt
venue_id
```

for migration compatibility.

### 4.3 Update applicant APIs

Update:

```txt
POST /api/job-applications
GET /api/job-applications
```

When a user applies, copy employer scope from the posting:

```txt
job_posting_templates.employer_entity_type
job_posting_templates.employer_entity_id
```

Do not trust client-submitted employer scope.

### 4.4 Update token APIs

Update:

```txt
GET  /api/onboarding/[token]
POST /api/onboarding/[token]
```

GET returns:

```ts
{
  invitation,
  candidate,
  employer,
  position,
  template,
  existingResponses,
  progress
}
```

POST must:

```txt
validate token
validate responses against template
upload/store documents correctly
encrypt sensitive fields
save onboarding_responses
mark invitation completed
mark candidate completed
create/update staff_members
create/update employment_assignments
audit completion
notify employer and worker
```

---

# Phase 5 — Worker Onboarding UI Rebuild

## Objective

Create one clean, mobile-first onboarding experience for the person being hired.

## New files

```txt
components/hiring/onboarding-module/onboarding-wizard-shell.tsx
components/hiring/onboarding-module/dynamic-onboarding-form.tsx
components/hiring/onboarding-module/token-onboarding-flow.tsx
components/hiring/onboarding-module/onboarding-stepper.tsx
components/hiring/onboarding-module/onboarding-upload-field.tsx
components/hiring/onboarding-module/onboarding-review-submit.tsx
```

## Tasks

### 5.1 Replace old worker wizard

Rewrite:

```txt
app/onboarding/[token]/page.tsx
```

Use:

```tsx
<TokenOnboardingFlow token={params.token} />
```

### 5.2 Build server wrapper

The page should fetch real onboarding payload server-side when possible:

```txt
token
→ get token onboarding payload
→ render wizard with real template
```

Only the form itself should be client-side.

### 5.3 Build `DynamicOnboardingForm`

Support field types:

```txt
text
email
phone
date
select
multiselect
textarea
number
checkbox
file
address
emergency_contact
bank_info
tax_info
id_document
```

The new form must:

```txt
use typed field definitions
validate with Zod
upload files to Supabase Storage
never save raw File objects in final responses
route SSN/bank/tax data through credentials vault
support autosave drafts
show real completion progress
support mobile screens cleanly
```

### 5.4 Build step gating

Fields should be grouped into sections:

```txt
Identity
Contact
Emergency Contact
Work Eligibility
Certifications
Tax / Payment
Documents
Waiver
Review
```

A user cannot submit until required blocking fields are valid.

### 5.5 Build end-user UX

The onboarded worker should see:

```txt
Who is hiring them
Position
Expected start date
Required documents
Progress bar
Save and continue
Submit for review / Complete onboarding
Confirmation screen
```

No admin language should appear in the worker flow.

---

# Phase 6 — Employer Dashboard Rebuild

## Objective

Replace scattered onboarding components with one dashboard module that works for Venue, Organization, and Artist.

## New files

```txt
components/hiring/hiring-dashboard.tsx
components/hiring/job-posting-builder.tsx
components/hiring/application-review-panel.tsx
components/hiring/onboarding-kanban.tsx
components/hiring/team-roster-panel.tsx
components/hiring/template-manager.tsx
components/hiring/hiring-dashboard-shell.tsx
hooks/use-hiring-entity.tsx
```

## Dashboard tabs

```txt
Overview
Jobs
Applications
Onboarding
Roster
Templates
Audit
```

## Tasks

### 6.1 Build `HiringDashboard`

Props:

```ts
interface HiringDashboardProps {
  employer: HiringEntity
  initialTab?: "overview" | "jobs" | "applications" | "onboarding" | "roster" | "templates" | "audit"
}
```

### 6.2 Replace venue-only dashboard

Replace old venue-only onboarding dashboards with:

```tsx
<HiringDashboard employer={employer} initialTab="overview" />
```

### 6.3 Replace venue-only workflow visualizer

Fold old workflow visualizer functionality into:

```txt
components/hiring/onboarding-kanban.tsx
components/hiring/workflow-timeline.tsx
```

### 6.4 Mount dashboard in all account areas

Mount the same dashboard module here:

```txt
app/venue/staff/page.tsx
app/venue/dashboard/onboarding/page.tsx
app/admin/dashboard/staff/page.tsx
app/admin/dashboard/onboarding/page.tsx
app/artist/team/page.tsx
app/artist/business/hiring/page.tsx
```

Each route resolves a different `HiringEntity`.

### 6.5 Use real stats only

Dashboard stats come from:

```txt
GET /api/hiring/dashboard?entity_type=&entity_id=
```

No local fake arrays. No “AI System” filler activity. No hardcoded candidates.

---

# Phase 7 — Job Posting Builder Rebuild

## Objective

Make job creation work for all employer types while preserving the useful existing form-builder logic.

## Tasks

### 7.1 Rename and move

Move from:

```txt
components/admin/job-posting-form.tsx
```

To:

```txt
components/hiring/job-posting-builder.tsx
```

### 7.2 Add employer prop

```ts
interface JobPostingBuilderProps {
  employer: HiringEntity
  initialData?: JobPostingFormData
  mode: "create" | "edit"
}
```

### 7.3 Remove `any`

Replace `z.array(z.any())` application fields with:

```ts
const applicationFieldSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  label: z.string().min(1),
  type: z.enum([
    "text",
    "textarea",
    "email",
    "phone",
    "date",
    "select",
    "multiselect",
    "file",
    "checkbox",
    "number"
  ]),
  required: z.boolean().default(false),
  placeholder: z.string().optional(),
  helpText: z.string().optional(),
  options: z.array(z.string()).optional(),
  validation: z.record(z.unknown()).optional(),
  order: z.number()
})
```

### 7.4 Submit through server action

Create:

```txt
app/actions/hiring/create-job-posting.ts
```

Use `next-safe-action`, Zod, and:

```ts
HiringOnboardingService.createJobPosting()
```

### 7.5 Save real Supabase row

Insert into `job_posting_templates` with:

```txt
employer_entity_type
employer_entity_id
title
description
department
position
role_type
required_certifications
application_form_template
onboarding_template_id
status
published_at
```

---

# Phase 8 — Application Review Rebuild

## Objective

Turn existing application UI pieces into a real admin review workflow.

## New file

```txt
components/hiring/application-review-panel.tsx
```

## Salvage these

```txt
ApplicationApplicantSummary
ApplicationJobSummary
ApplicationResponsesList
ApplicationReviewActions
ApplicationStatusBadge
ApplicationInsightsBadges
ApplicationRating
```

## Tasks

### 8.1 Real data query

Fetch from:

```txt
GET /api/hiring/applications?entity_type=&entity_id=&status=&job_id=
```

Return joined data:

```txt
application
applicant profile
job posting
candidate if exists
eligibility snapshot
contract status
onboarding stage
```

### 8.2 Approve action

Approve calls:

```txt
PATCH /api/hiring/applications/[id]
```

Payload:

```json
{
  "action": "approve",
  "employer_entity_type": "venue",
  "employer_entity_id": "..."
}
```

Backend handles all bridge side effects.

### 8.3 Reject and waitlist

Reject must require a reason.

Waitlist must store status and optional note.

### 8.4 Bulk actions

Support:

```txt
bulk approve
bulk reject
bulk waitlist
bulk message
bulk export CSV
```

Only after Phase 2 service is stable.

---

# Phase 9 — Candidate Onboarding, Kanban, and Workflow

## Objective

Create a clean admin view of everyone in onboarding.

## New files

```txt
components/hiring/onboarding-kanban.tsx
components/hiring/candidate-detail-drawer.tsx
components/hiring/workflow-timeline.tsx
components/hiring/candidate-document-review.tsx
```

## Tasks

### 9.1 Replace old kanban

Rebuild around real `staff_onboarding_candidates` rows scoped by `HiringEntity`.

### 9.2 Status columns

Use:

```txt
Invitation Sent
Started
Needs Documents
Submitted
In Review
Completed
Rejected
```

Do not mix `approved` application status with onboarding completion status.

### 9.3 Candidate detail drawer

Show:

```txt
candidate identity
application source
job
template
progress
missing required fields
documents
credential review
audit history
invitation token status
onboarding URL
employment assignment status
```

### 9.4 Workflow timeline

Use workflow stages:

```txt
job_posted
application_received
screening
invitation_sent
onboarding_started
onboarding_completed
review_pending
approved
team_assigned
```

---

# Phase 10 — Roster and Work Mode Completion

## Objective

Make onboarding actually produce usable staff access.

## New file

```txt
components/hiring/team-roster-panel.tsx
```

## Tasks

### 10.1 Create roster rows on completion

When worker submits onboarding:

```txt
upsert staff_members
```

Required fields:

```txt
user_id
employer_entity_type
employer_entity_id
position
department
employment_type
status
onboarding_candidate_id
started_at
compliance_status
```

### 10.2 Create employment assignment

On approval or completion, depending on permission strategy:

```txt
upsert employment_assignments
```

Include:

```txt
user_id
employer_entity_type
employer_entity_id
role_template_id
position
department
permissions
status
source: "hiring_onboarding"
```

### 10.3 Role template mapping

Map position to permissions:

```txt
security guard → limited run sheet, check in/out, security docs
bartender → shift schedule, check in/out, bar SOP docs
FOH engineer → production docs, limited run sheet
tour manager → manage team, run sheet, communications
merch seller → merch settlement docs, shift schedule
```

### 10.4 Team actions

Roster should support:

```txt
assign shift
assign zone
message worker
review docs
replace worker
mark inactive
export roster
```

---

# Phase 11 — File Uploads, PII, and Compliance

## Objective

Make the onboarding system safe enough for real worker data.

## Tasks

### 11.1 Supabase Storage buckets

Create buckets:

```txt
staff-documents
staff-certifications
staff-id-documents
staff-waivers
```

### 11.2 Upload API

Create:

```txt
POST /api/hiring/onboarding/upload
```

It should:

```txt
validate token or session
validate file type
validate file size
generate storage path
upload to Supabase Storage
create staff_documents row
return signed URL or document id
```

### 11.3 Sensitive data routing

For fields:

```txt
ssn
bank_info
tax_info
id_document
```

Do not store raw values in normal JSON responses.

Route through:

```txt
lib/security/employee-credentials-vault.ts
```

Store only summaries in candidate/staff notes.

### 11.4 Compliance blockers

A template field can include:

```ts
blocking: boolean
requiresAdminReview: boolean
credentialType?: string
```

If a required blocking field is missing, onboarding cannot be completed.

---

# Phase 12 — Persona Onboarding Separation

## Objective

Keep platform signup/persona setup separate from staff hiring onboarding.

## Tasks

### 12.1 Route rules

Use:

```txt
/onboarding
```

for platform identity/persona onboarding.

Use:

```txt
/onboarding/hire/[token]
```

for staff hiring onboarding.

Redirect legacy:

```txt
/onboarding/[token] → /onboarding/hire/[token]
/onboarding?token= → /onboarding/hire/[token]
/onboarding/enhanced-onboarding-flow → /onboarding
/onboarding/complete → appropriate completion page
```

### 12.2 Salvage persona fields

Merge artist/venue persona fields into:

```txt
components/hiring/onboarding-module/persona-onboarding-flow.tsx
```

But do not mix those with hiring paperwork.

---

# Phase 13 — Testing with Real Data

## Objective

Prove the system works on actual Supabase rows.

## Required scenarios

### 13.1 Venue hires security guards

```txt
Venue creates security job
Applicant submits guard card field
Admin approves
Candidate + token created
Worker uploads ID and guard card
Completion creates staff_members + employment_assignments
```

### 13.2 Venue hires bartenders

```txt
Venue creates bartender job
Template requires age verification and alcohol server permit
Worker uploads permit
Missing permit blocks completion
```

### 13.3 Artist hires tour crew

```txt
Artist creates FOH engineer job
Applicant applies
Artist manager approves
Worker completes onboarding
Employment assignment is scoped to artist
```

### 13.4 Organization staffs third-party venue

```txt
Organization creates staffing job with scope.venueId
Worker completes onboarding
Staff record belongs to organization
Shift assignment references third-party venue context
```

### 13.5 Direct invite

```txt
Employer invites worker without application
Candidate created
Token generated
Worker completes onboarding
Roster row created
```

### 13.6 Eligibility gate enforce mode

```txt
FEATURE_HIRING_ELIGIBILITY_GATE=enforce
Applicant missing required credential
Approve returns 409
Audit event saved
No candidate/token created
```

---

# Component Action Map

## Keep mostly as-is

```txt
components/hiring/application-applicant-summary.tsx
components/hiring/application-job-summary.tsx
components/hiring/application-rating.tsx
components/hiring/application-responses-list.tsx
components/hiring/application-review-actions.tsx
components/hiring/application-status-badge.tsx
components/hiring/application-insights-badges.tsx
components/hiring/hiring-state-card.tsx
```

## Rewrite

```txt
components/admin/job-posting-form.tsx
→ components/hiring/job-posting-builder.tsx

components/admin/onboarding-dashboard.tsx
→ components/hiring/hiring-dashboard.tsx

components/admin/onboarding-kanban-board.tsx
→ components/hiring/onboarding-kanban.tsx

components/admin/onboarding-workflow-visualizer.tsx
→ components/hiring/workflow-timeline.tsx

components/admin/onboarding-form-fields.tsx
→ components/hiring/onboarding-module/dynamic-onboarding-form.tsx
```

## Remove from production until real data exists

```txt
components/admin/neural-staff-command.tsx
```

Reason: it currently uses local fake AI insights and fake live activity.

## Retire after redirects are in place

```txt
components/onboarding/staff-onboarding.tsx
components/onboarding/invitation-onboarding.tsx
app/onboarding/enhanced-onboarding-flow/page.tsx
app/onboarding/complete/page.tsx
```

---

# Finished Product Definition

The rebuild is complete only when all of this is true:

```txt
Venue can post job → approve applicant → worker completes onboarding → staff member created.
Organization can do the same.
Artist can do the same.
All hiring writes use HiringEntity.
No dashboard depends only on venueId.
No production component uses mock data.
Token onboarding loads entity-scoped template.
Files upload to Supabase Storage.
Sensitive fields use credentials vault.
RLS prevents cross-account access.
Work Mode assignment exists after onboarding.
Legacy venue routes still work during migration.
```

---

# Recommended Execution Order

Do not start by rebuilding the UI. Start with foundation and data.

```txt
Phase 0: types + rules + TypeScript cleanup
Phase 1: migration + RLS + backfill
Phase 2: HiringEntity + permissions + service facade
Phase 3: template resolver + token route fix
Phase 4: API cleanup
Phase 5: worker onboarding UI
Phase 6: employer dashboard
Phase 7: job posting builder
Phase 8: application review
Phase 9: candidate kanban/workflow
Phase 10: roster + Work Mode
Phase 11: compliance/files/PII
Phase 12: persona separation
Phase 13: real-data testing
```

This should be treated as a rebuild of the onboarding system, not just a component cleanup. The current UI has useful pieces, but the new foundation must be `HiringEntity`, real Supabase data, and one worker-facing onboarding experience.
