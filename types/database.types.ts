export type Profile = {
  id: string;
  display_name: string | null;
  bio: string | null;
  location: string | null;
  role: string | null;
  experience_level: string | null;
  company_name: string | null;
  notification_preferences: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
  primary_genres: string[];
  venue_types: string[];
  created_at: string;
  updated_at: string;
};

export type OnboardingStatus = {
  id: string;
  user_id: string;
  completed: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type NotificationPreferences = {
  email: boolean;
  push: boolean;
  sms: boolean;
};

// =============================================================================
// VENUE MANAGEMENT TYPES
// =============================================================================

export type VenueProfile = {
  id: string;
  user_id: string;
  main_profile_id: string | null;
  venue_name: string;
  description: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  postal_code: string | null;
  capacity: number | null;
  venue_types: string[];
  avatar_url: string | null;
  cover_image_url: string | null;
  contact_info: {
    phone?: string;
    email?: string;
    booking_email?: string;
    manager_name?: string;
  };
  social_links: {
    website?: string;
    instagram?: string;
    facebook?: string;
    twitter?: string;
  };
  verification_status: 'unverified' | 'pending' | 'verified' | 'rejected';
  account_tier: 'basic' | 'pro' | 'premium';
  settings: {
    public_profile: boolean;
    allow_bookings: boolean;
    show_contact_info: boolean;
    require_approval: boolean;
  };
  created_at: string;
  updated_at: string;
};

export type VenueBookingRequest = {
  id: string;
  venue_id: string;
  requester_id: string;
  event_name: string;
  event_type: string;
  event_date: string;
  event_duration: number;
  expected_attendance: number | null;
  budget_range: string | null;
  description: string | null;
  special_requirements: string | null;
  contact_email: string;
  contact_phone: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  response_message: string | null;
  requested_at: string;
  responded_at: string | null;
  created_at: string;
  updated_at: string;
};

export type VenueDocument = {
  id: string;
  venue_id: string;
  name: string;
  description: string | null;
  document_type: 'contract' | 'rider' | 'insurance' | 'license' | 'safety' | 'marketing' | 'other';
  file_url: string;
  file_size: number | null;
  mime_type: string | null;
  is_public: boolean;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
};

export type VenueTeamMember = {
  id: string;
  venue_id: string;
  user_id: string | null;
  name: string;
  email: string;
  role: string;
  permissions: {
    manage_bookings: boolean;
    manage_events: boolean;
    view_analytics: boolean;
    manage_team: boolean;
    manage_documents: boolean;
  };
  phone: string | null;
  hire_date: string | null;
  employment_type: 'full_time' | 'part_time' | 'contractor' | 'volunteer' | null;
  status: 'active' | 'inactive' | 'terminated';
  created_at: string;
  updated_at: string;
  // Enhanced staff profile fields
  first_name: string | null;
  last_name: string | null;
  pronouns: string | null;
  bio: string | null;
  avatar_url: string | null;
  date_of_birth: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
  department: string | null;
  role_level: 'entry' | 'mid' | 'senior' | 'manager' | 'director' | null;
  role_category: 'foh' | 'tech' | 'security' | 'bar' | 'kitchen' | 'management' | 'marketing' | 'maintenance' | 'other' | null;
  hourly_rate: number | null;
  salary: number | null;
  pay_frequency: 'hourly' | 'weekly' | 'biweekly' | 'monthly' | null;
  termination_date: string | null;
  termination_reason: string | null;
  performance_rating: number | null;
  reliability_score: number | null;
  events_completed: number | null;
  total_hours_worked: number | null;
  last_performance_review: string | null;
  next_review_date: string | null;
  emergency_contact: Record<string, any> | null;
  internal_notes: string | null;
  admin_notes: string | null;
  weekly_availability: Record<string, any> | null;
  preferred_shifts: string[] | null;
  blackout_dates: string[] | null;
  last_active: string | null;
  is_available: boolean | null;
  onboarding_completed: boolean | null;
  onboarding_completed_at: string | null;
};

export type VenueEquipment = {
  id: string;
  venue_id: string;
  name: string;
  category: 'sound' | 'lighting' | 'stage' | 'seating' | 'catering' | 'security' | 'other';
  description: string | null;
  quantity: number;
  condition: 'excellent' | 'good' | 'fair' | 'needs_repair' | 'out_of_service' | null;
  purchase_date: string | null;
  last_maintenance: string | null;
  next_maintenance: string | null;
  is_available_for_rent: boolean;
  rental_price: number | null;
  manufacturer: string | null;
  model: string | null;
  serial_number: string | null;
  purchase_price: number | null;
  replacement_value: number | null;
  insurance_policy: string | null;
  created_at: string;
  updated_at: string;
};

export type VenueReview = {
  id: string;
  venue_id: string;
  reviewer_id: string;
  event_id: string | null;
  rating: number;
  title: string | null;
  comment: string | null;
  photos: string[];
  is_verified: boolean;
  response_from_venue: string | null;
  responded_at: string | null;
  created_at: string;
  updated_at: string;
};

export type VenueAnalytics = {
  id: string;
  venue_id: string;
  date: string;
  page_views: number;
  unique_visitors: number;
  booking_requests: number;
  bookings_confirmed: number;
  revenue: number;
  events_hosted: number;
  average_rating: number | null;
  created_at: string;
};

export type VenueAvailability = {
  id: string;
  venue_id: string;
  date: string;
  is_available: boolean;
  booking_id: string | null;
  event_id: string | null;
  blocked_reason: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type VenuePricing = {
  id: string;
  venue_id: string;
  package_name: string;
  description: string | null;
  base_price: number;
  price_per_hour: number | null;
  price_per_person: number | null;
  minimum_hours: number | null;
  maximum_capacity: number | null;
  included_services: string[];
  additional_fees: Record<string, any>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type VenueSocialIntegration = {
  id: string;
  venue_id: string;
  platform: 'instagram' | 'facebook' | 'twitter' | 'tiktok' | 'youtube';
  account_handle: string;
  access_token: string | null;
  refresh_token: string | null;
  is_connected: boolean;
  last_sync: string | null;
  created_at: string;
  updated_at: string;
};

// =============================================================================
// TOUR AND EVENT MANAGEMENT TYPES
// =============================================================================

export type Tour = {
  id: string;
  name: string;
  description: string | null;
  artist_id: string;
  status: 'planning' | 'active' | 'completed' | 'cancelled';
  start_date: string | null;
  end_date: string | null;
  total_shows: number;
  completed_shows: number;
  budget: number;
  expenses: number;
  revenue: number;
  transportation: string | null;
  accommodation: string | null;
  equipment_requirements: string | null;
  crew_size: number;
  created_at: string;
  updated_at: string;
  created_by: string;
};

export type Event = {
  id: string;
  name: string;
  description: string | null;
  tour_id: string | null;
  venue_id: string | null;
  venue_name: string | null;
  venue_address: string | null;
  event_date: string;
  event_time: string | null;
  doors_open: string | null;
  duration_minutes: number | null;
  status: 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'postponed';
  capacity: number;
  tickets_sold: number;
  ticket_price: number | null;
  vip_price: number | null;
  expected_revenue: number;
  actual_revenue: number;
  expenses: number;
  sound_requirements: string | null;
  lighting_requirements: string | null;
  stage_requirements: string | null;
  special_requirements: string | null;
  venue_contact_name: string | null;
  venue_contact_email: string | null;
  venue_contact_phone: string | null;
  load_in_time: string | null;
  sound_check_time: string | null;
  created_at: string;
  updated_at: string;
  created_by: string;
};

export type TourTeamMember = {
  id: string;
  tour_id: string;
  user_id: string;
  role: string;
  contact_email: string | null;
  contact_phone: string | null;
  status: 'pending' | 'confirmed' | 'declined';
  created_at: string;
  updated_at: string;
};

export type EventExpense = {
  id: string;
  event_id: string;
  tour_id: string;
  category: string;
  description: string;
  amount: number;
  vendor: string | null;
  expense_date: string;
  status: 'pending' | 'approved' | 'paid' | 'cancelled';
  receipt_url: string | null;
  created_at: string;
  updated_at: string;
  created_by: string;
};

export type EventNote = {
  id: string;
  event_id: string;
  tour_id: string;
  note_type: 'general' | 'technical' | 'logistics' | 'financial' | 'urgent';
  title: string | null;
  content: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  created_at: string;
  updated_at: string;
  created_by: string;
};

// =============================================================================
// EXTENDED EXISTING TYPES
// =============================================================================

// Project related types
export type Project = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  project_type: ProjectType;
  start_date: string | null;
  end_date: string | null;
  budget: number | null;
  venue_type: string | null;
  genre: string | null;
  capacity: number | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
};

export type ProjectMember = {
  id: string;
  project_id: string;
  user_id: string;
  role: ProjectMemberRole;
  permissions: ProjectPermissions;
  created_at: string;
  updated_at: string;
};

export type ProjectPermissions = {
  can_edit: boolean;
  can_delete: boolean;
  can_invite: boolean;
};

// =============================================================================
// ENUMS FOR STANDARDIZED VALUES
// =============================================================================

export enum UserRole {
  ARTIST = 'artist',
  VENUE_OWNER = 'venue_owner',
  PROMOTER = 'promoter',
  MANAGER = 'manager',
  OTHER = 'other'
}

export enum ExperienceLevel {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
  PROFESSIONAL = 'professional'
}

export enum ProjectStatus {
  DRAFT = 'draft',
  PLANNING = 'planning',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

export enum ProjectType {
  TOUR = 'tour',
  FESTIVAL = 'festival',
  SINGLE_EVENT = 'single_event',
  RESIDENCY = 'residency',
  CORPORATE = 'corporate',
  OTHER = 'other'
}

export enum ProjectMemberRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  MEMBER = 'member',
  VIEWER = 'viewer'
}

export enum VenueBookingStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled'
}

export enum DocumentType {
  CONTRACT = 'contract',
  RIDER = 'rider',
  INSURANCE = 'insurance',
  LICENSE = 'license',
  SAFETY = 'safety',
  MARKETING = 'marketing',
  OTHER = 'other'
}

export enum EquipmentCategory {
  SOUND = 'sound',
  LIGHTING = 'lighting',
  STAGE = 'stage',
  SEATING = 'seating',
  CATERING = 'catering',
  SECURITY = 'security',
  OTHER = 'other'
}

export enum EquipmentCondition {
  EXCELLENT = 'excellent',
  GOOD = 'good',
  FAIR = 'fair',
  NEEDS_REPAIR = 'needs_repair',
  OUT_OF_SERVICE = 'out_of_service'
}

export enum EmploymentType {
  FULL_TIME = 'full_time',
  PART_TIME = 'part_time',
  CONTRACTOR = 'contractor',
  VOLUNTEER = 'volunteer'
}

export enum TeamMemberStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  TERMINATED = 'terminated'
}

// =============================================================================
// HELPER TYPES FOR FORMS AND API
// =============================================================================

export type OnboardingFormData = Omit<Profile, 'id' | 'created_at' | 'updated_at'> & {
  role: UserRole;
  experience_level: ExperienceLevel;
};

export type VenueBookingRequestCreateData = Omit<VenueBookingRequest, 
  'id' | 'status' | 'response_message' | 'requested_at' | 'responded_at' | 'created_at' | 'updated_at'
>;

export type VenueDocumentCreateData = Omit<VenueDocument, 
  'id' | 'uploaded_by' | 'created_at' | 'updated_at'
>;

export type VenueTeamMemberCreateData = Omit<VenueTeamMember, 
  'id' | 'created_at' | 'updated_at'
>;

export type VenueEquipmentCreateData = Omit<VenueEquipment, 
  'id' | 'created_at' | 'updated_at'
>;

export type VenueReviewCreateData = Omit<VenueReview, 
  'id' | 'is_verified' | 'response_from_venue' | 'responded_at' | 'created_at' | 'updated_at'
>;

export type VenuePricingCreateData = Omit<VenuePricing, 
  'id' | 'created_at' | 'updated_at'
>;

// Dashboard stats type
export type VenueDashboardStats = {
  totalBookings: number;
  pendingRequests: number;
  thisMonthRevenue: number;
  averageRating: number;
  totalReviews: number;
  teamMembers: number;
  upcomingEvents: number;
}; 

// Enhanced Staff Profile Types
// =============================================================================

export type StaffCertification = {
  id: string;
  staff_member_id: string;
  venue_id: string;
  certification_name: string;
  certification_type: 'alcohol_handling' | 'food_safety' | 'rigging' | 'safety' | 'first_aid' | 'fire_safety' | 'security' | 'technical' | 'management' | 'other';
  issuing_organization: string | null;
  certification_number: string | null;
  issue_date: string;
  expiration_date: string | null;
  file_url: string | null;
  file_size: number | null;
  mime_type: string | null;
  is_verified: boolean;
  verified_by: string | null;
  verified_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type StaffPerformanceReview = {
  id: string;
  staff_member_id: string;
  venue_id: string;
  reviewer_id: string;
  review_date: string;
  review_period_start: string;
  review_period_end: string;
  overall_rating: number;
  reliability_rating: number | null;
  teamwork_rating: number | null;
  communication_rating: number | null;
  technical_skills_rating: number | null;
  strengths: string[] | null;
  areas_for_improvement: string[] | null;
  goals: string[] | null;
  comments: string | null;
  staff_comments: string | null;
  is_acknowledged: boolean;
  acknowledged_at: string | null;
  created_at: string;
  updated_at: string;
};

export type StaffSkill = {
  id: string;
  staff_member_id: string;
  venue_id: string;
  skill_name: string;
  skill_category: 'technical' | 'soft_skills' | 'safety' | 'management' | 'customer_service' | 'other' | null;
  proficiency_level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  years_experience: number | null;
  is_verified: boolean;
  verified_by: string | null;
  verified_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type StaffDocument = {
  id: string;
  staff_member_id: string;
  venue_id: string;
  document_name: string;
  document_type: 'id' | 'tax_forms' | 'contract' | 'training_certificate' | 'background_check' | 'drug_test' | 'medical_clearance' | 'other';
  file_url: string;
  file_size: number | null;
  mime_type: string | null;
  upload_date: string;
  expiration_date: string | null;
  is_required: boolean;
  is_verified: boolean;
  verified_by: string | null;
  verified_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type StaffAvailability = {
  id: string;
  staff_member_id: string;
  venue_id: string;
  day_of_week: number; // 0 = Sunday, 6 = Saturday
  start_time: string | null;
  end_time: string | null;
  is_available: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type StaffTimeOffRequest = {
  id: string;
  staff_member_id: string;
  venue_id: string;
  request_type: 'vacation' | 'sick_leave' | 'personal' | 'bereavement' | 'jury_duty' | 'other';
  start_date: string;
  end_date: string;
  start_time: string | null;
  end_time: string | null;
  is_all_day: boolean;
  reason: string | null;
  status: 'pending' | 'approved' | 'denied' | 'cancelled';
  approved_by: string | null;
  approved_at: string | null;
  denial_reason: string | null;
  created_at: string;
  updated_at: string;
};

// =============================================================================
// ENHANCED ROLES & PERMISSIONS TYPES
// =============================================================================

export type VenueRole = {
  id: string;
  venue_id: string;
  role_name: string;
  role_description: string | null;
  role_level: number; // 1=entry, 2=mid, 3=senior, 4=manager, 5=admin
  is_system_role: boolean;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type VenuePermission = {
  id: string;
  permission_name: string;
  permission_description: string | null;
  permission_category: 'staff' | 'events' | 'bookings' | 'analytics' | 'settings' | 'documents' | 'payroll' | 'communications' | 'admin';
  is_system_permission: boolean;
  created_at: string;
  updated_at: string;
};

export type VenueRolePermission = {
  id: string;
  role_id: string;
  permission_id: string;
  granted_by: string | null;
  granted_at: string;
};

export type VenueUserRole = {
  id: string;
  venue_id: string;
  user_id: string;
  role_id: string;
  assigned_by: string | null;
  assigned_at: string;
  expires_at: string | null;
  is_active: boolean;
  notes: string | null;
  venue_roles?: VenueRole;
};

export type VenueUserPermissionOverride = {
  id: string;
  venue_id: string;
  user_id: string;
  permission_id: string;
  is_granted: boolean; // true = grant, false = deny
  granted_by: string | null;
  granted_at: string;
  expires_at: string | null;
  reason: string | null;
};

export type VenuePermissionAuditLog = {
  id: string;
  venue_id: string;
  action_type: 'role_assigned' | 'role_removed' | 'permission_granted' | 'permission_denied' | 'override_added' | 'override_removed';
  target_user_id: string | null;
  role_id: string | null;
  permission_id: string | null;
  performed_by: string | null;
  performed_at: string;
  details: Record<string, any> | null;
  ip_address: string | null;
  user_agent: string | null;
};

// =============================================================================
// ROLE AND PERMISSION ENUMS
// =============================================================================

export enum RoleLevel {
  ENTRY = 1,
  MID = 2,
  SENIOR = 3,
  MANAGER = 4,
  ADMIN = 5
}

export enum PermissionCategory {
  STAFF = 'staff',
  EVENTS = 'events',
  BOOKINGS = 'bookings',
  ANALYTICS = 'analytics',
  SETTINGS = 'settings',
  DOCUMENTS = 'documents',
  PAYROLL = 'payroll',
  COMMUNICATIONS = 'communications',
  ADMIN = 'admin'
}

export enum SystemRoleName {
  VENUE_OWNER = 'Venue Owner',
  VENUE_MANAGER = 'Venue Manager',
  EVENT_COORDINATOR = 'Event Coordinator',
  STAFF_SUPERVISOR = 'Staff Supervisor',
  FOH_MANAGER = 'FOH Manager',
  TECHNICAL_MANAGER = 'Technical Manager',
  SECURITY_MANAGER = 'Security Manager',
  BAR_MANAGER = 'Bar Manager',
  KITCHEN_MANAGER = 'Kitchen Manager',
  SENIOR_STAFF = 'Senior Staff',
  STAFF_MEMBER = 'Staff Member',
  TEMPORARY_STAFF = 'Temporary Staff',
  VIEWER = 'Viewer'
}

export enum PermissionName {
  // Staff Management
  STAFF_VIEW = 'staff.view',
  STAFF_CREATE = 'staff.create',
  STAFF_EDIT = 'staff.edit',
  STAFF_DELETE = 'staff.delete',
  STAFF_MANAGE_ROLES = 'staff.manage_roles',
  STAFF_VIEW_SENSITIVE = 'staff.view_sensitive',
  STAFF_MANAGE_PERFORMANCE = 'staff.manage_performance',
  STAFF_MANAGE_CERTIFICATIONS = 'staff.manage_certifications',

  // Event Management
  EVENTS_VIEW = 'events.view',
  EVENTS_CREATE = 'events.create',
  EVENTS_EDIT = 'events.edit',
  EVENTS_DELETE = 'events.delete',
  EVENTS_MANAGE_STAFF = 'events.manage_staff',
  EVENTS_MANAGE_SCHEDULE = 'events.manage_schedule',
  EVENTS_VIEW_FINANCIAL = 'events.view_financial',
  EVENTS_MANAGE_FINANCIAL = 'events.manage_financial',

  // Booking Management
  BOOKINGS_VIEW = 'bookings.view',
  BOOKINGS_CREATE = 'bookings.create',
  BOOKINGS_EDIT = 'bookings.edit',
  BOOKINGS_DELETE = 'bookings.delete',
  BOOKINGS_APPROVE = 'bookings.approve',
  BOOKINGS_MANAGE_CONTRACTS = 'bookings.manage_contracts',

  // Analytics and Reporting
  ANALYTICS_VIEW = 'analytics.view',
  ANALYTICS_VIEW_FINANCIAL = 'analytics.view_financial',
  ANALYTICS_VIEW_STAFF = 'analytics.view_staff',
  ANALYTICS_EXPORT = 'analytics.export',
  ANALYTICS_MANAGE_DASHBOARDS = 'analytics.manage_dashboards',

  // Settings and Configuration
  SETTINGS_VIEW = 'settings.view',
  SETTINGS_EDIT_BASIC = 'settings.edit_basic',
  SETTINGS_EDIT_ADVANCED = 'settings.edit_advanced',
  SETTINGS_MANAGE_INTEGRATIONS = 'settings.manage_integrations',
  SETTINGS_MANAGE_BILLING = 'settings.manage_billing',

  // Document Management
  DOCUMENTS_VIEW = 'documents.view',
  DOCUMENTS_UPLOAD = 'documents.upload',
  DOCUMENTS_EDIT = 'documents.edit',
  DOCUMENTS_DELETE = 'documents.delete',
  DOCUMENTS_MANAGE_CATEGORIES = 'documents.manage_categories',

  // Payroll and Compensation
  PAYROLL_VIEW = 'payroll.view',
  PAYROLL_EDIT = 'payroll.edit',
  PAYROLL_PROCESS = 'payroll.process',
  PAYROLL_VIEW_TAX_INFO = 'payroll.view_tax_info',
  PAYROLL_MANAGE_RATES = 'payroll.manage_rates',

  // Communication
  COMMUNICATIONS_VIEW = 'communications.view',
  COMMUNICATIONS_SEND = 'communications.send',
  COMMUNICATIONS_BROADCAST = 'communications.broadcast',
  COMMUNICATIONS_MANAGE_TEMPLATES = 'communications.manage_templates',
  COMMUNICATIONS_VIEW_PRIVATE = 'communications.view_private',

  // System Administration
  ADMIN_MANAGE_ROLES = 'admin.manage_roles',
  ADMIN_MANAGE_USERS = 'admin.manage_users',
  ADMIN_VIEW_AUDIT_LOGS = 'admin.view_audit_logs',
  ADMIN_SYSTEM_SETTINGS = 'admin.system_settings',
  ADMIN_DATA_EXPORT = 'admin.data_export'
}

// =============================================================================
// PERMISSION SETS FOR COMMON ROLES
// =============================================================================

export const ROLE_PERMISSION_SETS: Record<SystemRoleName, PermissionName[]> = {
  [SystemRoleName.VENUE_OWNER]: Object.values(PermissionName),
  
  [SystemRoleName.VENUE_MANAGER]: [
    PermissionName.STAFF_VIEW,
    PermissionName.STAFF_CREATE,
    PermissionName.STAFF_EDIT,
    PermissionName.STAFF_MANAGE_ROLES,
    PermissionName.STAFF_VIEW_SENSITIVE,
    PermissionName.STAFF_MANAGE_PERFORMANCE,
    PermissionName.STAFF_MANAGE_CERTIFICATIONS,
    PermissionName.EVENTS_VIEW,
    PermissionName.EVENTS_CREATE,
    PermissionName.EVENTS_EDIT,
    PermissionName.EVENTS_MANAGE_STAFF,
    PermissionName.EVENTS_MANAGE_SCHEDULE,
    PermissionName.EVENTS_VIEW_FINANCIAL,
    PermissionName.BOOKINGS_VIEW,
    PermissionName.BOOKINGS_CREATE,
    PermissionName.BOOKINGS_EDIT,
    PermissionName.BOOKINGS_APPROVE,
    PermissionName.BOOKINGS_MANAGE_CONTRACTS,
    PermissionName.ANALYTICS_VIEW,
    PermissionName.ANALYTICS_VIEW_FINANCIAL,
    PermissionName.ANALYTICS_VIEW_STAFF,
    PermissionName.ANALYTICS_EXPORT,
    PermissionName.SETTINGS_VIEW,
    PermissionName.SETTINGS_EDIT_BASIC,
    PermissionName.SETTINGS_EDIT_ADVANCED,
    PermissionName.DOCUMENTS_VIEW,
    PermissionName.DOCUMENTS_UPLOAD,
    PermissionName.DOCUMENTS_EDIT,
    PermissionName.DOCUMENTS_MANAGE_CATEGORIES,
    PermissionName.PAYROLL_VIEW,
    PermissionName.PAYROLL_EDIT,
    PermissionName.PAYROLL_MANAGE_RATES,
    PermissionName.COMMUNICATIONS_VIEW,
    PermissionName.COMMUNICATIONS_SEND,
    PermissionName.COMMUNICATIONS_BROADCAST,
    PermissionName.COMMUNICATIONS_MANAGE_TEMPLATES
  ],

  [SystemRoleName.EVENT_COORDINATOR]: [
    PermissionName.STAFF_VIEW,
    PermissionName.STAFF_EDIT,
    PermissionName.EVENTS_VIEW,
    PermissionName.EVENTS_CREATE,
    PermissionName.EVENTS_EDIT,
    PermissionName.EVENTS_MANAGE_STAFF,
    PermissionName.EVENTS_MANAGE_SCHEDULE,
    PermissionName.BOOKINGS_VIEW,
    PermissionName.BOOKINGS_CREATE,
    PermissionName.BOOKINGS_EDIT,
    PermissionName.BOOKINGS_APPROVE,
    PermissionName.ANALYTICS_VIEW,
    PermissionName.DOCUMENTS_VIEW,
    PermissionName.DOCUMENTS_UPLOAD,
    PermissionName.DOCUMENTS_EDIT,
    PermissionName.COMMUNICATIONS_VIEW,
    PermissionName.COMMUNICATIONS_SEND
  ],

  [SystemRoleName.STAFF_SUPERVISOR]: [
    PermissionName.STAFF_VIEW,
    PermissionName.STAFF_EDIT,
    PermissionName.STAFF_MANAGE_PERFORMANCE,
    PermissionName.EVENTS_VIEW,
    PermissionName.EVENTS_MANAGE_STAFF,
    PermissionName.ANALYTICS_VIEW,
    PermissionName.ANALYTICS_VIEW_STAFF,
    PermissionName.PAYROLL_VIEW,
    PermissionName.PAYROLL_EDIT,
    PermissionName.COMMUNICATIONS_VIEW,
    PermissionName.COMMUNICATIONS_SEND
  ],

  [SystemRoleName.SENIOR_STAFF]: [
    PermissionName.STAFF_VIEW,
    PermissionName.EVENTS_VIEW,
    PermissionName.ANALYTICS_VIEW,
    PermissionName.COMMUNICATIONS_VIEW,
    PermissionName.COMMUNICATIONS_SEND
  ],

  [SystemRoleName.STAFF_MEMBER]: [
    PermissionName.STAFF_VIEW,
    PermissionName.EVENTS_VIEW,
    PermissionName.COMMUNICATIONS_VIEW,
    PermissionName.COMMUNICATIONS_SEND
  ],

  [SystemRoleName.VIEWER]: [
    PermissionName.STAFF_VIEW,
    PermissionName.EVENTS_VIEW
  ],

  // Manager roles get the same permissions as their base role plus management permissions
  [SystemRoleName.FOH_MANAGER]: [
    PermissionName.STAFF_VIEW,
    PermissionName.STAFF_EDIT,
    PermissionName.STAFF_MANAGE_PERFORMANCE,
    PermissionName.EVENTS_VIEW,
    PermissionName.EVENTS_MANAGE_STAFF,
    PermissionName.ANALYTICS_VIEW,
    PermissionName.ANALYTICS_VIEW_STAFF,
    PermissionName.PAYROLL_VIEW,
    PermissionName.PAYROLL_EDIT,
    PermissionName.COMMUNICATIONS_VIEW,
    PermissionName.COMMUNICATIONS_SEND
  ],

  [SystemRoleName.TECHNICAL_MANAGER]: [
    PermissionName.STAFF_VIEW,
    PermissionName.STAFF_EDIT,
    PermissionName.STAFF_MANAGE_PERFORMANCE,
    PermissionName.EVENTS_VIEW,
    PermissionName.EVENTS_MANAGE_STAFF,
    PermissionName.ANALYTICS_VIEW,
    PermissionName.ANALYTICS_VIEW_STAFF,
    PermissionName.PAYROLL_VIEW,
    PermissionName.PAYROLL_EDIT,
    PermissionName.COMMUNICATIONS_VIEW,
    PermissionName.COMMUNICATIONS_SEND
  ],

  [SystemRoleName.SECURITY_MANAGER]: [
    PermissionName.STAFF_VIEW,
    PermissionName.STAFF_EDIT,
    PermissionName.STAFF_MANAGE_PERFORMANCE,
    PermissionName.EVENTS_VIEW,
    PermissionName.EVENTS_MANAGE_STAFF,
    PermissionName.ANALYTICS_VIEW,
    PermissionName.ANALYTICS_VIEW_STAFF,
    PermissionName.PAYROLL_VIEW,
    PermissionName.PAYROLL_EDIT,
    PermissionName.COMMUNICATIONS_VIEW,
    PermissionName.COMMUNICATIONS_SEND
  ],

  [SystemRoleName.BAR_MANAGER]: [
    PermissionName.STAFF_VIEW,
    PermissionName.STAFF_EDIT,
    PermissionName.STAFF_MANAGE_PERFORMANCE,
    PermissionName.EVENTS_VIEW,
    PermissionName.EVENTS_MANAGE_STAFF,
    PermissionName.ANALYTICS_VIEW,
    PermissionName.ANALYTICS_VIEW_STAFF,
    PermissionName.PAYROLL_VIEW,
    PermissionName.PAYROLL_EDIT,
    PermissionName.COMMUNICATIONS_VIEW,
    PermissionName.COMMUNICATIONS_SEND
  ],

  [SystemRoleName.KITCHEN_MANAGER]: [
    PermissionName.STAFF_VIEW,
    PermissionName.STAFF_EDIT,
    PermissionName.STAFF_MANAGE_PERFORMANCE,
    PermissionName.EVENTS_VIEW,
    PermissionName.EVENTS_MANAGE_STAFF,
    PermissionName.ANALYTICS_VIEW,
    PermissionName.ANALYTICS_VIEW_STAFF,
    PermissionName.PAYROLL_VIEW,
    PermissionName.PAYROLL_EDIT,
    PermissionName.COMMUNICATIONS_VIEW,
    PermissionName.COMMUNICATIONS_SEND
  ],

  [SystemRoleName.TEMPORARY_STAFF]: [
    PermissionName.STAFF_VIEW,
    PermissionName.EVENTS_VIEW,
    PermissionName.COMMUNICATIONS_VIEW,
    PermissionName.COMMUNICATIONS_SEND
  ]
};

// =============================================================================
// UTILITY TYPES
// =============================================================================

export type UserPermissions = {
  permissions: PermissionName[];
  roleAssignments: VenueUserRole[];
  permissionOverrides: VenueUserPermissionOverride[];
};

export type RoleWithPermissions = VenueRole & {
  permissions: VenuePermission[];
};

export type UserWithRoles = {
  user_id: string;
  roles: VenueUserRole[];
  permissions: PermissionName[];
};

// =============================================================================
// CREATE TYPES FOR API OPERATIONS
// =============================================================================

export type CreateVenueRoleData = Omit<VenueRole, 'id' | 'created_at' | 'updated_at'>;
export type UpdateVenueRoleData = Partial<Omit<VenueRole, 'id' | 'venue_id' | 'created_at' | 'updated_at'>>;

export type AssignUserRoleData = {
  venue_id: string;
  user_id: string;
  role_id: string;
  expires_at?: string | null;
  notes?: string | null;
};

export type GrantPermissionOverrideData = {
  venue_id: string;
  user_id: string;
  permission_id: string;
  is_granted: boolean;
  expires_at?: string | null;
  reason?: string | null;
}; 

// =============================================================================
// SCHEDULING & SHIFTS SYSTEM TYPES
// =============================================================================

export type VenueShift = {
  id: string;
  venue_id: string;
  event_id: string | null;
  shift_title: string;
  shift_description: string | null;
  shift_date: string;
  start_time: string;
  end_time: string;
  location: string | null;
  department: string | null;
  role_required: string | null;
  staff_needed: number;
  staff_assigned: number;
  hourly_rate: number | null;
  flat_rate: number | null;
  is_recurring: boolean;
  recurring_pattern: Record<string, any> | null;
  shift_status: 'open' | 'filled' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  dress_code: string | null;
  special_requirements: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type VenueShiftAssignment = {
  id: string;
  shift_id: string;
  staff_member_id: string;
  assignment_status: 'assigned' | 'confirmed' | 'declined' | 'cancelled';
  assigned_by: string;
  assigned_at: string;
  confirmed_at: string | null;
  declined_at: string | null;
  decline_reason: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type VenueShiftTemplate = {
  id: string;
  venue_id: string;
  template_name: string;
  template_description: string | null;
  department: string | null;
  role_required: string | null;
  staff_needed: number;
  hourly_rate: number | null;
  flat_rate: number | null;
  start_time: string;
  end_time: string;
  location: string | null;
  dress_code: string | null;
  special_requirements: string | null;
  notes: string | null;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type VenueRecurringShift = {
  id: string;
  venue_id: string;
  template_id: string | null;
  shift_title: string;
  shift_description: string | null;
  department: string | null;
  role_required: string | null;
  staff_needed: number;
  hourly_rate: number | null;
  flat_rate: number | null;
  start_time: string;
  end_time: string;
  location: string | null;
  dress_code: string | null;
  special_requirements: string | null;
  notes: string | null;
  recurrence_pattern: Record<string, any>;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type VenueShiftSwap = {
  id: string;
  venue_id: string;
  original_shift_id: string;
  original_staff_id: string;
  requested_staff_id: string;
  swap_reason: string | null;
  request_status: 'pending' | 'approved' | 'denied' | 'cancelled';
  requested_by: string;
  requested_at: string;
  approved_by: string | null;
  approved_at: string | null;
  denied_by: string | null;
  denied_at: string | null;
  denial_reason: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type VenueShiftRequest = {
  id: string;
  venue_id: string;
  shift_id: string;
  staff_member_id: string;
  request_type: 'drop' | 'pickup';
  request_reason: string | null;
  request_status: 'pending' | 'approved' | 'denied' | 'cancelled';
  requested_at: string;
  approved_by: string | null;
  approved_at: string | null;
  denied_by: string | null;
  denied_at: string | null;
  denial_reason: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type VenueShiftNote = {
  id: string;
  shift_id: string;
  author_id: string;
  note_type: 'general' | 'dress_code' | 'call_time' | 'special_instructions' | 'emergency';
  title: string | null;
  content: string;
  is_public: boolean;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
};

export type VenueShiftCheckin = {
  id: string;
  shift_assignment_id: string;
  checkin_type: 'manual' | 'qr_code' | 'pin' | 'gps';
  checkin_time: string;
  checkout_time: string | null;
  checkin_location: Record<string, any> | null;
  checkout_location: Record<string, any> | null;
  is_late: boolean;
  late_minutes: number;
  is_no_show: boolean;
  manual_override: boolean;
  override_reason: string | null;
  override_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type VenueCheckinQrCode = {
  id: string;
  venue_id: string;
  shift_id: string | null;
  qr_code_hash: string;
  qr_code_data: Record<string, any>;
  is_active: boolean;
  expires_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};

// =============================================================================
// SCHEDULING ENUMS AND CONSTANTS
// =============================================================================

export enum ShiftStatus {
  OPEN = 'open',
  FILLED = 'filled',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

export enum ShiftPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent'
}

export enum AssignmentStatus {
  ASSIGNED = 'assigned',
  CONFIRMED = 'confirmed',
  DECLINED = 'declined',
  CANCELLED = 'cancelled'
}

export enum RequestStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  DENIED = 'denied',
  CANCELLED = 'cancelled'
}

export enum CheckinType {
  MANUAL = 'manual',
  QR_CODE = 'qr_code',
  PIN = 'pin',
  GPS = 'gps'
}

export enum NoteType {
  GENERAL = 'general',
  DRESS_CODE = 'dress_code',
  CALL_TIME = 'call_time',
  SPECIAL_INSTRUCTIONS = 'special_instructions',
  EMERGENCY = 'emergency'
}

export enum RecurrenceFrequency {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly'
}

// =============================================================================
// SCHEDULING UTILITY TYPES
// =============================================================================

export type ShiftWithAssignments = VenueShift & {
  assignments: VenueShiftAssignment[];
  staff_members: VenueTeamMember[];
  notes: VenueShiftNote[];
};

export type ShiftAssignmentWithDetails = VenueShiftAssignment & {
  shift: VenueShift;
  staff_member: VenueTeamMember;
  checkins: VenueShiftCheckin[];
};

export type RecurrencePattern = {
  frequency: RecurrenceFrequency;
  interval: number;
  days_of_week?: number[]; // 0=Sunday, 6=Saturday
  start_date: string;
  end_date: string;
};

export type ShiftTemplateWithRecurring = VenueShiftTemplate & {
  recurring_shifts: VenueRecurringShift[];
};

export type ShiftSwapWithDetails = VenueShiftSwap & {
  original_shift: VenueShift;
  original_staff: VenueTeamMember;
  requested_staff: VenueTeamMember;
};

export type ShiftRequestWithDetails = VenueShiftRequest & {
  shift: VenueShift;
  staff_member: VenueTeamMember;
};

// =============================================================================
// SCHEDULING API TYPES
// =============================================================================

export type CreateShiftData = Omit<VenueShift, 'id' | 'staff_assigned' | 'created_at' | 'updated_at'>;

export type UpdateShiftData = Partial<Omit<VenueShift, 'id' | 'venue_id' | 'created_by' | 'created_at' | 'updated_at'>>;

export type CreateShiftAssignmentData = Omit<VenueShiftAssignment, 'id' | 'assigned_at' | 'created_at' | 'updated_at'>;

export type CreateShiftTemplateData = Omit<VenueShiftTemplate, 'id' | 'created_at' | 'updated_at'>;

export type CreateRecurringShiftData = Omit<VenueRecurringShift, 'id' | 'created_at' | 'updated_at'>;

export type CreateShiftSwapData = Omit<VenueShiftSwap, 'id' | 'requested_at' | 'created_at' | 'updated_at'>;

export type CreateShiftRequestData = Omit<VenueShiftRequest, 'id' | 'requested_at' | 'created_at' | 'updated_at'>;

export type CreateShiftNoteData = Omit<VenueShiftNote, 'id' | 'created_at' | 'updated_at'>;

export type CreateCheckinData = Omit<VenueShiftCheckin, 'id' | 'created_at' | 'updated_at'>;

export type CreateQrCodeData = Omit<VenueCheckinQrCode, 'id' | 'qr_code_hash' | 'qr_code_data' | 'created_at' | 'updated_at'>;

// =============================================================================
// SCHEDULING RESPONSE TYPES
// =============================================================================

export type ShiftScheduleResponse = {
  shifts: ShiftWithAssignments[];
  total_shifts: number;
  open_shifts: number;
  filled_shifts: number;
  completed_shifts: number;
};

export type ShiftCalendarResponse = {
  date: string;
  shifts: VenueShift[];
  assignments: VenueShiftAssignment[];
  conflicts: string[];
};

export type ShiftAnalyticsResponse = {
  total_shifts: number;
  total_hours: number;
  total_cost: number;
  average_attendance: number;
  completion_rate: number;
  staff_utilization: Record<string, number>;
  department_stats: Record<string, {
    shifts: number;
    hours: number;
    cost: number;
  }>;
};

export type ShiftConflictResponse = {
  shift_id: string;
  staff_member_id: string;
  conflict_type: 'overlap' | 'availability' | 'time_off';
  conflict_details: string;
  suggested_resolution: string;
}; 

// =============================================================================
// ENTITY-SCOPED RBAC TYPES (GENERIC)
// =============================================================================

export interface RbacRole {
  id: string
  name: string
  display_name?: string | null
  scope_type: 'global' | 'entity'
  is_system: boolean
  description?: string | null
}

export interface RbacPermission {
  id: string
  name: string
  display_name?: string | null
  category?: string | null
  description?: string | null
}

export interface RbacRolePermission {
  role_id: string
  permission_id: string
}

export interface RbacUserEntityRole {
  id: string
  user_id: string
  entity_type: string
  entity_id: string
  role_id: string
  start_at: string | null
  end_at: string | null
  is_active: boolean
}

export interface RbacUserPermissionOverride {
  id: string
  user_id: string
  entity_type: string
  entity_id: string
  permission_id: string
  allow: boolean
}

export interface RbacPermissionAuditLog {
  id: string
  actor_id: string | null
  target_user_id: string | null
  entity_type?: string | null
  entity_id?: string | null
  action: string
  permission_name?: string | null
  created_at: string
}

// =============================================================================
// AGENCIES / ORGANIZATIONS
// =============================================================================

export interface PerformanceAgency {
  id: string
  name: string
  description?: string | null
  created_at: string
  updated_at: string
}

export interface StaffingAgency {
  id: string
  name: string
  description?: string | null
  created_at: string
  updated_at: string
}

export interface RentalCompany {
  id: string
  name: string
  description?: string | null
  created_at: string
  updated_at: string
}

export interface ProductionCompany {
  id: string
  name: string
  description?: string | null
  created_at: string
  updated_at: string
}

export interface Promoter {
  id: string
  name: string
  description?: string | null
  created_at: string
  updated_at: string
}

export interface AgencyArtistLink {
  agency_id: string
  artist_id: string
  created_at: string
}

export interface StaffingAgencyStaffLink {
  agency_id: string
  user_id: string
  created_at: string
}

export interface EntityManagerLink {
  id: string
  entity_type: string
  entity_id: string
  user_id: string
  created_at: string
}

// =============================================================================
// EQUIPMENT ASSETS (POLYMORPHIC OWNER)
// =============================================================================

export interface EquipmentAsset {
  id: string
  name: string
  category?: string | null
  description?: string | null
  serial_number?: string | null
  owner_type: 'Venue' | 'Artist' | 'RentalCompany' | 'ProductionCompany' | string
  owner_id: string
  is_available: boolean
  metadata?: Record<string, any>
  created_at: string
  updated_at: string
}

// =============================================================================
// LOCATIONS (MULTI-PLACE EVENTS)
// =============================================================================

export interface Location {
  id: string
  location_type: 'Venue' | 'PublicLocation' | 'PrivateLocation' | 'VirtualLocation'
  name: string
  address?: string | null
  coordinates?: Record<string, any> | null
  meta?: Record<string, any> | null
  created_at: string
  updated_at: string
}

export interface EventLocationLink {
  event_id: string
  location_id: string
  location_type: Location['location_type'] | string
  is_primary: boolean
  created_at: string
}

// =============================================================================
// EVENT PARTICIPANTS & PACKAGES
// =============================================================================

export interface EventParticipant {
  event_id: string
  participant_type: 'Individual' | 'Artist' | 'PerformanceAgency' | 'StaffingAgency' | 'ProductionCompany' | 'Promoter' | 'RentalCompany' | string
  participant_id: string
  role?: string | null
  created_at: string
}

export interface EventPackage {
  id: string
  name: string
  description?: string | null
  created_at: string
  updated_at: string
}

export interface EventPackageAssetLink {
  event_package_id: string
  equipment_asset_id: string
  created_at: string
}

export interface EventPackageServiceLink {
  event_package_id: string
  entity_type: string
  entity_id: string
  created_at: string
}