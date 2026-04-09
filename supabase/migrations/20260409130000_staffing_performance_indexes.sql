-- Staffing query performance indexes for deployment-scale filtering and dashboards

create index if not exists idx_staff_members_venue_status_created
  on staff_members(venue_id, status, created_at desc);

create index if not exists idx_staff_members_venue_department
  on staff_members(venue_id, department);

create index if not exists idx_job_applications_venue_status_applied
  on job_applications(venue_id, status, applied_at desc);

create index if not exists idx_staff_onboarding_candidates_venue_status_user
  on staff_onboarding_candidates(venue_id, status, user_id);

create index if not exists idx_staff_documents_org_owner_verified_expires
  on staff_documents(organization_id, owner_user_id, verified_status, expires_at);

create index if not exists idx_agreement_acceptances_org_user_accepted
  on agreement_acceptances(organization_id, user_id, accepted_at desc);

create index if not exists idx_rbac_user_entity_roles_entity_active_user
  on rbac_user_entity_roles(entity_type, entity_id, is_active, user_id);
