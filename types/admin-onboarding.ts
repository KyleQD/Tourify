// =============================================================================
// ADMIN ONBOARDING & STAFF MANAGEMENT TYPES
// =============================================================================

import type { HiringEntityType } from '@/types/hiring-entity'

/** Polymorphic employer scope — populated after Phase 1 migration backfill. */
export interface EmployerScopedFields {
  employer_entity_type?: HiringEntityType
  employer_entity_id?: string
}

export interface JobPostingTemplate extends EmployerScopedFields {
  id: string
  venue_id: string
  title: string
  description: string
  department: string
  position: string
  employment_type: 'full_time' | 'part_time' | 'contractor' | 'volunteer'
  location: string
  number_of_positions: number
  salary_range?: {
    min: number
    max: number
    type: 'hourly' | 'salary' | 'daily'
  }
  requirements: string[]
  responsibilities: string[]
  benefits: string[]
  skills: string[]
  experience_level: 'entry' | 'mid' | 'senior' | 'executive'
  remote: boolean
  urgent: boolean
  status: 'draft' | 'published' | 'paused' | 'closed'
  created_by: string
  created_at: string
  updated_at: string
  expires_at?: string
  applications_count: number
  views_count: number
  // Enhanced fields for role-based templates
  event_id?: string
  event_date?: string
  required_certifications: string[]
  role_type?: 'security' | 'bartender' | 'street_team' | 'production' | 'management' | 'other'
  shift_duration?: number // in hours
  age_requirement?: number
  background_check_required: boolean
  drug_test_required: boolean
  uniform_provided: boolean
  training_provided: boolean
  application_form_template: {
    fields: ApplicationFormField[]
  }
}

export interface ApplicationFormTemplate {
  id: string
  job_posting_id: string
  fields: ApplicationFormField[]
  created_at: string
  updated_at: string
}

export interface ApplicationFormField {
  id: string
  name: string
  label: string
  type: 'text' | 'textarea' | 'email' | 'phone' | 'date' | 'select' | 'multiselect' | 'file' | 'checkbox' | 'number'
  required: boolean
  placeholder?: string
  description?: string
  options?: string[]
  validation?: {
    min?: number
    max?: number
    pattern?: string
    custom?: string
  }
  order: number
  // Quick Apply: when true the field is auto-filled from the applicant's general
  // profile and hidden from the screening step of the Quick Apply flow.
  profileField?: boolean
}

export interface JobApplication extends EmployerScopedFields {
  id: string
  job_posting_id: string
  applicant_id: string
  applicant_name: string
  applicant_email: string
  applicant_phone?: string
  status: 'pending' | 'reviewed' | 'shortlisted' | 'approved' | 'accepted' | 'rejected' | 'withdrawn'
  form_responses: Record<string, any>
  resume_url?: string
  cover_letter?: string
  rating?: number
  feedback?: string
  reviewed_by?: string
  reviewed_at?: string
  applied_at: string
  updated_at: string
  // Enhanced fields for auto-screening
  auto_screening_result: AutoScreeningResult
  screening_issues: string[]
  screening_recommendations: string[]
  performance_notes?: string
  interview_scheduled: boolean
  interview_date?: string
  interview_notes?: string
  offer_made: boolean
  offer_date?: string
  offer_details: Record<string, any>
  evidence_request_status?: {
    requested_at: string
    requested_by?: string
    message?: string
  } | null
}

// New interface for auto-screening results
export interface AutoScreeningResult {
  passed: boolean
  issues: string[]
  recommendations: string[]
  score?: number
  screening_date: string
  screened_by?: string
}

export interface OnboardingWorkflow extends EmployerScopedFields {
  id: string
  venue_id: string
  name: string
  description: string
  department: string
  position: string
  steps: OnboardingStep[]
  estimated_days: number
  required_documents: string[]
  assignees: string[]
  is_default: boolean
  created_by: string
  created_at: string
  updated_at: string
}

export interface OnboardingStep {
  id: string
  workflow_id: string
  title: string
  description: string
  step_type: 'document' | 'training' | 'meeting' | 'setup' | 'review' | 'task' | 'approval'
  category: 'admin' | 'training' | 'equipment' | 'social' | 'performance'
  required: boolean
  estimated_hours: number
  assigned_to?: string
  depends_on: string[]
  due_date_offset?: number
  instructions?: string
  completion_criteria: string[]
  documents: string[]
  order: number
  created_at: string
  updated_at: string
}

export interface OnboardingCandidate extends EmployerScopedFields {
  id: string
  venue_id: string
  application_id?: string
  user_id?: string
  name: string
  email: string
  phone?: string
  position: string
  department: string
  status: 'pending' | 'in_progress' | 'completed' | 'rejected'
  stage: 'invitation' | 'onboarding' | 'review' | 'approved' | 'rejected'
  application_date: string
  avatar_url?: string
  experience_years: number
  skills: string[]
  documents: any[]
  notes?: string
  assigned_manager?: string
  start_date?: string
  salary?: number
  employment_type: 'full_time' | 'part_time' | 'contractor' | 'volunteer'
  onboarding_progress: number
  workflow_id?: string
  invitation_token?: string
  onboarding_responses?: Record<string, any>
  review_notes?: string
  approved_by?: string
  approved_at?: string
  created_at: string
  updated_at: string
  // Enhanced compliance fields
  background_check_completed: boolean
  background_check_date?: string
  drug_test_completed: boolean
  drug_test_date?: string
  certifications_verified: boolean
  certifications_verified_date?: string
  training_completed: boolean
  training_completion_date?: string
  uniform_issued: boolean
  uniform_issue_date?: string
  emergency_contact: Record<string, any>
  personal_info: Record<string, any>
  employment_info: Record<string, any>
  compliance_agreements: Record<string, any>
}

export interface OnboardingActivity {
  id: string
  candidate_id: string
  step_id?: string
  activity_type: 'step_started' | 'step_completed' | 'document_uploaded' | 'meeting_scheduled' | 'email_sent' | 'note_added'
  title: string
  description?: string
  status: 'pending' | 'in_progress' | 'completed' | 'blocked' | 'skipped'
  completed_by?: string
  completed_at?: string
  due_date?: string
  metadata: Record<string, any>
  created_at: string
}

export interface StaffMember extends EmployerScopedFields {
  id: string
  venue_id: string
  user_id?: string
  name: string
  email: string
  phone?: string
  role: string
  department?: string
  employment_type: 'full_time' | 'part_time' | 'contractor' | 'volunteer'
  status: 'active' | 'inactive' | 'on_leave' | 'terminated'
  hire_date?: string
  hourly_rate?: number
  permissions: Record<string, boolean>
  weekly_schedule?: Record<string, any>
  performance_metrics?: Record<string, any>
  emergency_contact?: Record<string, any>
  avatar_url?: string
  notes?: string
  last_active?: string
  created_at: string
  updated_at: string
  // Enhanced performance and assignment fields
  performance_rating?: number
  attendance_rate?: number
  incidents_count: number
  commendations_count: number
  training_completed_count: number
  certifications_valid_count: number
  last_performance_review?: string
  next_performance_review?: string
  assigned_zones: string[]
  preferred_shifts: string[]
  availability_schedule: Record<string, any>
}

export interface StaffInvitation extends EmployerScopedFields {
  id: string
  candidate_id: string
  token: string
  email: string
  status: 'pending' | 'opened' | 'completed' | 'expired' | 'revoked' | 'accepted'
  template_id?: string | null
  expires_at?: string | null
  completed_at?: string | null
  created_at: string
  updated_at?: string
  venue_id?: string
}

export interface StaffOnboardingTemplate extends EmployerScopedFields {
  id: string
  name: string
  description?: string | null
  department?: string | null
  position?: string | null
  employment_type?: 'full_time' | 'part_time' | 'contractor' | 'volunteer' | 'intern' | null
  fields: ApplicationFormField[]
  estimated_days?: number | null
  required_documents?: string[]
  assignees?: string[]
  tags?: string[]
  is_default?: boolean
  parent_template_id?: string | null
  use_count?: number
  created_at: string
  updated_at?: string
  venue_id?: string
}

export interface HiringAuditEvent extends EmployerScopedFields {
  id: string
  actor_id?: string | null
  subject_user_id?: string | null
  application_id?: string | null
  candidate_id?: string | null
  event_type: string
  previous_status?: string | null
  next_status?: string | null
  metadata?: Record<string, unknown> | null
  created_at: string
  updated_at?: string
  venue_id?: string
}

export interface HiringEligibilitySnapshot extends EmployerScopedFields {
  id: string
  application_id?: string | null
  candidate_id?: string | null
  is_eligible: boolean
  mode: 'off' | 'shadow' | 'enforce'
  checklist: Record<string, unknown>
  blocking_reasons?: string[]
  created_at: string
  updated_at?: string
  venue_id?: string
}

export interface EmploymentAssignment extends EmployerScopedFields {
  id: string
  user_id: string
  role_template_id?: string | null
  position: string
  department?: string | null
  permissions: Record<string, unknown>
  status: 'pending' | 'active' | 'inactive' | 'revoked'
  source: 'hiring_onboarding' | 'manual' | 'import'
  created_at: string
  updated_at?: string
  venue_id?: string
}

export interface TeamCommunication {
  id: string
  venue_id: string
  sender_id: string
  recipients: string[]
  subject: string
  content: string
  message_type: 'announcement' | 'schedule' | 'training' | 'emergency' | 'general' | 'performance' | 'compliance'
  priority: 'low' | 'normal' | 'high' | 'urgent'
  read_by: string[]
  sent_at: string
  created_at: string
  // Enhanced fields
  requires_acknowledgment: boolean
  acknowledged_by: string[]
  expires_at?: string
}

// New interfaces for enhanced features

export interface StaffShift {
  id: string
  venue_id: string
  event_id?: string
  staff_member_id: string
  shift_date: string
  start_time: string
  end_time: string
  break_duration: number // in minutes
  zone_assignment?: string
  role_assignment?: string
  status: 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show'
  notes?: string
  created_by: string
  created_at: string
  updated_at: string
}

export interface StaffZone {
  id: string
  venue_id: string
  event_id?: string
  zone_name: string
  zone_description?: string
  zone_type: 'security' | 'bartending' | 'crowd_control' | 'vip' | 'general' | 'backstage'
  capacity?: number
  required_staff_count: number
  assigned_staff_count: number
  supervisor_id?: string
  status: 'active' | 'inactive' | 'maintenance'
  created_at: string
  updated_at: string
}

export interface StaffPerformanceMetrics {
  id: string
  staff_member_id: string
  venue_id: string
  event_id?: string
  metric_date: string
  attendance_rate?: number
  performance_rating?: number
  incidents_count: number
  commendations_count: number
  training_completed: boolean
  certifications_valid: boolean
  customer_feedback_score?: number
  supervisor_rating?: number
  notes?: string
  reviewed_by?: string
  reviewed_at?: string
  created_at: string
  updated_at: string
}

export interface StaffTrainingRecord {
  id: string
  staff_member_id: string
  venue_id: string
  training_type: string
  training_name: string
  training_description?: string
  completion_date?: string
  expiration_date?: string
  status: 'pending' | 'in_progress' | 'completed' | 'expired' | 'failed'
  score?: number
  instructor_id?: string
  training_materials: string[]
  notes?: string
  created_at: string
  updated_at: string
}

export interface StaffCertification {
  id: string
  staff_member_id: string
  venue_id: string
  certification_name: string
  certification_type: string
  issuing_authority?: string
  issue_date?: string
  expiration_date?: string
  status: 'active' | 'expired' | 'suspended' | 'revoked'
  verification_status: 'pending' | 'verified' | 'failed' | 'expired'
  verification_date?: string
  verified_by?: string
  document_url?: string
  notes?: string
  created_at: string
  updated_at: string
}

// Form data interfaces for API requests
export interface CreateJobPostingData {
  title: string
  description: string
  department: string
  position: string
  employment_type: 'full_time' | 'part_time' | 'contractor' | 'volunteer'
  location: string
  number_of_positions: number
  salary_range?: {
    min: number
    max: number
    type: 'hourly' | 'salary' | 'daily'
  }
  requirements: string[]
  responsibilities: string[]
  benefits: string[]
  skills: string[]
  experience_level: 'entry' | 'mid' | 'senior' | 'executive'
  remote: boolean
  urgent: boolean
  // Enhanced fields
  event_id?: string
  event_date?: string
  required_certifications: string[]
  role_type?: 'security' | 'bartender' | 'street_team' | 'production' | 'management' | 'other'
  shift_duration?: number
  age_requirement?: number
  background_check_required: boolean
  drug_test_required: boolean
  uniform_provided: boolean
  training_provided: boolean
  application_form_template: {
    fields: ApplicationFormField[]
  }
}

export interface CreateOnboardingWorkflowData {
  name: string
  description: string
  department: string
  position: string
  steps: Omit<OnboardingStep, 'id' | 'workflow_id' | 'created_at' | 'updated_at'>[]
  estimated_days: number
  required_documents: string[]
  assignees: string[]
  is_default?: boolean
}

export interface UpdateApplicationStatusData {
  status: JobApplication['status']
  feedback?: string
  rating?: number
  // Enhanced fields
  auto_screening_result?: AutoScreeningResult
  screening_issues?: string[]
  screening_recommendations?: string[]
  performance_notes?: string
  interview_scheduled?: boolean
  interview_date?: string
  interview_notes?: string
  offer_made?: boolean
  offer_date?: string
  offer_details?: Record<string, any>
}

export interface UpdateOnboardingProgressData {
  progress: number
  stage?: OnboardingCandidate['stage']
  status?: OnboardingCandidate['status']
  notes?: string
  // Enhanced compliance fields
  background_check_completed?: boolean
  background_check_date?: string
  drug_test_completed?: boolean
  drug_test_date?: string
  certifications_verified?: boolean
  certifications_verified_date?: string
  training_completed?: boolean
  training_completion_date?: string
  uniform_issued?: boolean
  uniform_issue_date?: string
}

// New interfaces for enhanced features
export interface CreateShiftData {
  venue_id: string
  event_id?: string
  staff_member_id: string
  shift_date: string
  start_time: string
  end_time: string
  break_duration?: number
  zone_assignment?: string
  role_assignment?: string
  notes?: string
}

export interface CreateZoneData {
  venue_id: string
  event_id?: string
  zone_name: string
  zone_description?: string
  zone_type: 'security' | 'bartending' | 'crowd_control' | 'vip' | 'general' | 'backstage'
  capacity?: number
  required_staff_count: number
  supervisor_id?: string
}

export interface UpdatePerformanceMetricsData {
  staff_member_id: string
  venue_id: string
  event_id?: string
  metric_date: string
  attendance_rate?: number
  performance_rating?: number
  incidents_count?: number
  commendations_count?: number
  training_completed?: boolean
  certifications_valid?: boolean
  customer_feedback_score?: number
  supervisor_rating?: number
  notes?: string
}

// Dashboard statistics
export interface OnboardingStats {
  total_candidates: number
  pending: number
  in_progress: number
  completed: number
  rejected: number
  approved: number
  avg_progress: number
}

export interface JobPostingStats {
  total_postings: number
  published: number
  draft: number
  paused: number
  closed: number
  total_applications: number
  pending_reviews: number
}

export interface StaffManagementStats {
  total_staff: number
  active_staff: number
  on_leave: number
  terminated: number
  departments: number
  avg_rating: number
  recent_hires: number
}

// Enhanced stats for new features
export interface ShiftManagementStats {
  total_shifts: number
  scheduled_shifts: number
  completed_shifts: number
  cancelled_shifts: number
  staff_coverage: number
  zone_coverage: number
}

export interface PerformanceStats {
  avg_performance_rating: number
  avg_attendance_rate: number
  total_incidents: number
  total_commendations: number
  training_completion_rate: number
  certification_validity_rate: number
}

// API Response types
export interface ApiResponse<T> {
  data: T
  success: boolean
  error?: string
  message?: string
}

export interface JobPostingsResponse extends ApiResponse<JobPostingTemplate[]> {}
export interface JobPostingResponse extends ApiResponse<JobPostingTemplate> {}
export interface ApplicationsResponse extends ApiResponse<JobApplication[]> {}
export interface ApplicationResponse extends ApiResponse<JobApplication> {}
export interface OnboardingWorkflowsResponse extends ApiResponse<OnboardingWorkflow[]> {}
export interface OnboardingWorkflowResponse extends ApiResponse<OnboardingWorkflow> {}
export interface OnboardingCandidatesResponse extends ApiResponse<OnboardingCandidate[]> {}
export interface OnboardingCandidateResponse extends ApiResponse<OnboardingCandidate> {}
export interface StaffMembersResponse extends ApiResponse<StaffMember[]> {}
export interface StaffMemberResponse extends ApiResponse<StaffMember> {}
export interface StaffShiftsResponse extends ApiResponse<StaffShift[]> {}
export interface StaffShiftResponse extends ApiResponse<StaffShift> {}
export interface StaffZonesResponse extends ApiResponse<StaffZone[]> {}
export interface StaffZoneResponse extends ApiResponse<StaffZone> {}
export interface PerformanceMetricsResponse extends ApiResponse<StaffPerformanceMetrics[]> {}
export interface TrainingRecordsResponse extends ApiResponse<StaffTrainingRecord[]> {}
export interface TrainingRecordResponse extends ApiResponse<StaffTrainingRecord> {}
export interface CertificationsResponse extends ApiResponse<StaffCertification[]> {}
export interface CertificationResponse extends ApiResponse<StaffCertification> {}
export interface StatsResponse extends ApiResponse<{
  onboarding: OnboardingStats
  job_postings: JobPostingStats
  staff_management: StaffManagementStats
  shift_management: ShiftManagementStats
  performance: PerformanceStats
}> {} 