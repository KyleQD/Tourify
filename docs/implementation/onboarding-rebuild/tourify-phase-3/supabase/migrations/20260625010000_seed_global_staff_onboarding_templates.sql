-- Phase 3: Seed real global staff onboarding templates.
-- This migration is additive and idempotent. It does not delete or overwrite employer templates.
-- If your existing staff_onboarding_templates table requires venue_id NOT NULL, relax that constraint
-- or move these rows into the first employer-scoped template initialization endpoint instead.

insert into public.staff_onboarding_templates (
  name,
  description,
  department,
  position,
  employment_type,
  fields,
  estimated_days,
  required_documents,
  tags,
  is_default,
  employer_entity_type,
  employer_entity_id,
  created_at,
  updated_at
)
select
  'General Staff',
  'Default onboarding for general event staff and contractors.',
  'General',
  'General Staff',
  'contractor',
  '[
    {"id":"legal_name","name":"legal_name","label":"Legal full name","type":"text","section":"Identity","order":10,"required":true,"blocking":true},
    {"id":"date_of_birth","name":"date_of_birth","label":"Date of birth","type":"date","section":"Identity","order":20,"required":true,"blocking":true,"validation":{"minimumAge":16}},
    {"id":"phone","name":"phone","label":"Mobile phone","type":"phone","section":"Contact","order":100,"required":true,"blocking":true},
    {"id":"address","name":"address","label":"Home address","type":"address","section":"Contact","order":110,"required":true,"blocking":true},
    {"id":"emergency_contact","name":"emergency_contact","label":"Emergency contact","type":"emergency_contact","section":"Emergency Contact","order":120,"required":true,"blocking":true},
    {"id":"work_authorization","name":"work_authorization","label":"I am legally authorized to work for this engagement","type":"checkbox","section":"Work Eligibility","order":200,"required":true,"blocking":true},
    {"id":"government_id","name":"government_id","label":"Government ID","type":"id_document","section":"Documents","order":300,"required":true,"blocking":true,"requiresAdminReview":true,"credentialType":"government_id"},
    {"id":"w9_or_tax_form","name":"w9_or_tax_form","label":"W-9 / tax form","type":"tax_info","section":"Tax / Payment","order":400,"required":true,"blocking":true,"requiresAdminReview":true,"credentialType":"tax_form"},
    {"id":"worker_waiver","name":"worker_waiver","label":"Worker agreement and event safety waiver","type":"waiver","section":"Waiver","order":500,"required":true,"blocking":true}
  ]'::jsonb,
  2,
  array['Government ID', 'W-9 or tax form', 'Worker waiver'],
  array['default', 'general', 'staff'],
  true,
  null,
  null,
  now(),
  now()
where not exists (
  select 1
  from public.staff_onboarding_templates
  where name = 'General Staff'
    and employer_entity_type is null
    and employer_entity_id is null
);

insert into public.staff_onboarding_templates (
  name,
  description,
  department,
  position,
  employment_type,
  fields,
  estimated_days,
  required_documents,
  tags,
  is_default,
  employer_entity_type,
  employer_entity_id,
  created_at,
  updated_at
)
select
  'Security Guard',
  'Compliance onboarding for licensed security staff.',
  'Security',
  'Security Guard',
  'contractor',
  '[
    {"id":"legal_name","name":"legal_name","label":"Legal full name","type":"text","section":"Identity","order":10,"required":true,"blocking":true},
    {"id":"date_of_birth","name":"date_of_birth","label":"Date of birth","type":"date","section":"Identity","order":20,"required":true,"blocking":true,"validation":{"minimumAge":18}},
    {"id":"phone","name":"phone","label":"Mobile phone","type":"phone","section":"Contact","order":100,"required":true,"blocking":true},
    {"id":"address","name":"address","label":"Home address","type":"address","section":"Contact","order":110,"required":true,"blocking":true},
    {"id":"emergency_contact","name":"emergency_contact","label":"Emergency contact","type":"emergency_contact","section":"Emergency Contact","order":120,"required":true,"blocking":true},
    {"id":"guard_card","name":"guard_card","label":"Guard card / security license","type":"file","section":"Certifications","order":250,"required":true,"blocking":true,"requiresAdminReview":true,"credentialType":"guard_card","validation":{"fileTypes":["image/jpeg","image/png","application/pdf"],"maxFileSizeMb":10}},
    {"id":"government_id","name":"government_id","label":"Government ID","type":"id_document","section":"Documents","order":300,"required":true,"blocking":true,"requiresAdminReview":true,"credentialType":"government_id"},
    {"id":"w9_or_tax_form","name":"w9_or_tax_form","label":"W-9 / tax form","type":"tax_info","section":"Tax / Payment","order":400,"required":true,"blocking":true,"requiresAdminReview":true,"credentialType":"tax_form"},
    {"id":"worker_waiver","name":"worker_waiver","label":"Worker agreement and event safety waiver","type":"waiver","section":"Waiver","order":500,"required":true,"blocking":true}
  ]'::jsonb,
  3,
  array['Government ID', 'Guard card', 'W-9 or tax form', 'Worker waiver'],
  array['security', 'licensed', 'compliance'],
  false,
  null,
  null,
  now(),
  now()
where not exists (
  select 1
  from public.staff_onboarding_templates
  where name = 'Security Guard'
    and employer_entity_type is null
    and employer_entity_id is null
);

insert into public.staff_onboarding_templates (
  name,
  description,
  department,
  position,
  employment_type,
  fields,
  estimated_days,
  required_documents,
  tags,
  is_default,
  employer_entity_type,
  employer_entity_id,
  created_at,
  updated_at
)
select
  'Bartender',
  'Onboarding for bar staff requiring age and alcohol service checks.',
  'Bar Staff',
  'Bartender',
  'contractor',
  '[
    {"id":"legal_name","name":"legal_name","label":"Legal full name","type":"text","section":"Identity","order":10,"required":true,"blocking":true},
    {"id":"date_of_birth","name":"date_of_birth","label":"Date of birth","type":"date","section":"Identity","order":20,"required":true,"blocking":true,"validation":{"minimumAge":21}},
    {"id":"phone","name":"phone","label":"Mobile phone","type":"phone","section":"Contact","order":100,"required":true,"blocking":true},
    {"id":"address","name":"address","label":"Home address","type":"address","section":"Contact","order":110,"required":true,"blocking":true},
    {"id":"emergency_contact","name":"emergency_contact","label":"Emergency contact","type":"emergency_contact","section":"Emergency Contact","order":120,"required":true,"blocking":true},
    {"id":"alcohol_server_permit","name":"alcohol_server_permit","label":"Alcohol server permit","type":"file","section":"Certifications","order":250,"required":true,"blocking":true,"requiresAdminReview":true,"credentialType":"alcohol_server_permit","validation":{"fileTypes":["image/jpeg","image/png","application/pdf"],"maxFileSizeMb":10}},
    {"id":"over_21_confirmation","name":"over_21_confirmation","label":"I confirm I am 21 or older where required for this role","type":"checkbox","section":"Work Eligibility","order":260,"required":true,"blocking":true},
    {"id":"government_id","name":"government_id","label":"Government ID","type":"id_document","section":"Documents","order":300,"required":true,"blocking":true,"requiresAdminReview":true,"credentialType":"government_id"},
    {"id":"w9_or_tax_form","name":"w9_or_tax_form","label":"W-9 / tax form","type":"tax_info","section":"Tax / Payment","order":400,"required":true,"blocking":true,"requiresAdminReview":true,"credentialType":"tax_form"},
    {"id":"worker_waiver","name":"worker_waiver","label":"Worker agreement and event safety waiver","type":"waiver","section":"Waiver","order":500,"required":true,"blocking":true}
  ]'::jsonb,
  2,
  array['Government ID', 'Alcohol server permit', 'W-9 or tax form', 'Worker waiver'],
  array['bar', 'service', 'alcohol'],
  false,
  null,
  null,
  now(),
  now()
where not exists (
  select 1
  from public.staff_onboarding_templates
  where name = 'Bartender'
    and employer_entity_type is null
    and employer_entity_id is null
);
