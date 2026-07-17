---
description: >
  Build a scalable, type-safe staff onboarding and management platform in `/admin` 
  using Next.js App Router, Supabase, Genql, and Tailwind. Enable admins to post jobs, 
  vet applicants, collect onboarding documents, and manage large event teams 
  (e.g., security, bartenders, street teams) with certification workflows, 
  automated screening, and real-time team tools.
globs: ["app/**", "components/**", "lib/**", "types/**", "services/**"]
alwaysApply: true
---

You are an expert developer in TypeScript, Node.js, Next.js 15 (App Router), React, Supabase, GraphQL (Genql), Tailwind CSS, Radix UI, and Shadcn UI.

## Goal
Implement a modular staff onboarding system for high-volume event hiring. Ensure type safety, declarative logic, composable UI, and security via RLS. Optimize for compliance-heavy workflows and team oversight at scale.

## System Scope
Admin-driven workflow for:
- Posting jobs and role requirements
- Vetting applications with custom forms and auto-validations
- Guiding approved applicants through secure onboarding
- Managing teams with real-time status, zone/shift assignments, messaging, and exports



## Core Features

### 1. Job Postings
- Admins create job postings tied to roles (e.g., "Security", "Bartender", "Street Team").
- Each posting supports a dynamic form builder (text, file, enum, boolean, etc).
- Store metadata in Supabase `job_postings` table; form schema saved in `form_templates`.
- Add `event_id`, `required_certifications`, and `role_type` fields.
- Enforce RLS: admins can only modify their org's postings.

### 2. Application Flow
- Users submit responses to form templates using `react-hook-form` + `zod`.
- Validate on submit (e.g., file presence, license format, age).
- Save to `applications` table with `status: 'pending' | 'approved' | 'rejected' | 'waitlisted'`.
- Notify user via Supabase channel on status change.

### 3. Admin Review Dashboard
- Sort, filter, and bulk update applications.
- Use logic for auto-screening (e.g., guard card present, license format matches).
- Actions:
  - Approve and send onboarding link
  - Reject with message
  - Add to waitlist
- Store reviewer ID and decision timestamp.

### 4. Onboarding Wizard
- Multi-step secure onboarding flow:
  - Legal name, SSN, W9, ID uploads, certifications, waiver
  - Step gating with `zod` schemas
  - Real-time status tracking: `incomplete`, `in-review`, `complete`
- Secure uploads via Supabase Storage with signed URLs

### 5. Team Management
- Visual dashboard of filled roles
- Display:
  - Onboarding completion (RAG system)
  - Assigned shifts/zones
  - Eligibility (certs, docs, waivers)
- Actions:
  - Assign shift/zone
  - Message team member
  - Replace / backup assignment
- Use `components/team-table` and `components/user-card` for layout

### 6. Messaging
- In-dashboard chat and announcements
- Scoped per job or team
- Use Supabase Channels for real-time delivery
- Ensure only onboarded users can participate

### 7. Compliance & Security
- Enforce RLS across all Supabase tables:
  - Users access only their data
  - Admins scoped by org
- Validate file types and required docs (e.g., PDF, image, license format)
- Mark required legal steps as blocking onboarding

## Implementation Conventions

### Server Actions
- Use `next-safe-action` for all server actions
- Validate inputs with `zod`
- Model expected errors as return values (avoid try/catch)
- Use early returns + guard clauses

### File Structure
- `/app/admin/(routes)/job-postings`
- `/app/admin/(routes)/applications`
- `/components/forms/application-form.tsx`
- `/components/onboarding/onboarding-wizard.tsx`
- `/services/onboarding.service.ts`
- `/types/onboarding.type.ts`, `/job-posting.type.ts`, `/application.type.ts`

### UI & Component Design
- Use Tailwind CSS, Shadcn UI, Radix UI
- Follow utility-first, mobile-first, accessible layout
- Build micro-folders per feature:
  - `components/onboarding/onboarding-wizard.tsx`
  - `components/team/team-table.tsx`
  - `components/admin/job-posting-form.tsx`
- Use CVA for component variants

### TypeScript Conventions
- Use `function` keyword for pure functions
- Prefer interfaces over types
- Use named exports
- Avoid enums; use union literals or maps
- Apply RORO pattern for all functions

### Performance
- Use React Server Components for data fetching
- Minimize `use client`; wrap with `Suspense` if needed
- Use Genql to fetch only necessary fields from Supabase GraphQL

### Testing & Accessibility
- Test all critical flows (onboarding, approvals, role assignment)
- Ensure keyboard navigation and ARIA support
- Use JSDoc for component-level documentation

## Example Scenarios to Cover

- Security (200+ licensed guards): license validation, zone shift assignment, compliance files
- Bartenders (100 staff): age/license gating, shift assignment, W9 and pay setup
- Street Team (400+ volunteers): zone preference, training videos, shirt size, QR check-ins

## Summary
Build a scalable, type-safe, admin-first workflow for managing event staffing. Prioritize performance, security, declarative logic, and modularity. Handle all data via Supabase with RLS and Supabase GraphQL via Genql. Follow defined conventions strictly.

## Real data only

No production component may ship with hardcoded fake staff, fake AI insights, fake activity, fake candidates, fake templates, or local-only dashboard data. Empty states must represent real empty Supabase query results.
