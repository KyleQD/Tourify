import { createClient, SupabaseClient } from '@supabase/supabase-js'

let _supabase: SupabaseClient | null = null
function getSupabase(): SupabaseClient {
  if (!_supabase) {
    _supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
  }
  return _supabase
}

export interface OnboardingField {
  id: string
  type: 'text' | 'email' | 'phone' | 'date' | 'select' | 'multiselect' | 'textarea' | 'file' | 'checkbox' | 'number' | 'address' | 'emergency_contact' | 'bank_info' | 'tax_info' | 'id_document'
  label: string
  required: boolean
  placeholder?: string
  options?: string[]
  validation?: {
    min?: number
    max?: number
    pattern?: string
    custom?: string
  }
  help_text?: string
  order: number
  section: string
}

export interface OnboardingTemplate {
  id: string
  venue_id: string
  name: string
  description: string
  department: string
  position: string
  employment_type: 'full_time' | 'part_time' | 'contractor' | 'volunteer' | 'intern'
  fields: OnboardingField[]
  estimated_days: number
  required_documents: string[]
  assignees: string[]
  tags: string[]
  is_default: boolean
  use_count: number
  created_by?: string
  created_at: string
  updated_at: string
}

export class OnboardingTemplatesService {
  /**
   * Get all onboarding templates for a venue
   */
  static async getTemplates(venueId: string): Promise<OnboardingTemplate[]> {
    try {
      const { data, error } = await getSupabase()
        .from('staff_onboarding_templates')
        .select('*')
        .eq('venue_id', venueId)
        .order('is_default', { ascending: false })
        .order('use_count', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching onboarding templates:', error)
      throw error
    }
  }

  /**
   * Create a new onboarding template
   */
  static async createTemplate(template: Omit<OnboardingTemplate, 'id' | 'created_at' | 'updated_at'>): Promise<OnboardingTemplate> {
    try {
      const { data, error } = await getSupabase()
        .from('staff_onboarding_templates')
        .insert({
          ...template,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error creating onboarding template:', error)
      throw error
    }
  }

  /**
   * Update an existing onboarding template
   */
  static async updateTemplate(id: string, updates: Partial<OnboardingTemplate>): Promise<OnboardingTemplate> {
    try {
      const { data, error } = await getSupabase()
        .from('staff_onboarding_templates')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error updating onboarding template:', error)
      throw error
    }
  }

  /**
   * Delete an onboarding template
   */
  static async deleteTemplate(id: string): Promise<void> {
    try {
      const { error } = await getSupabase()
        .from('staff_onboarding_templates')
        .delete()
        .eq('id', id)

      if (error) throw error
    } catch (error) {
      console.error('Error deleting onboarding template:', error)
      throw error
    }
  }

  /**
   * Get default templates for common roles
   */
  static getDefaultTemplates(venueId: string): Omit<OnboardingTemplate, 'id' | 'created_at' | 'updated_at'>[] {
    return [
      {
        venue_id: venueId,
        name: 'General Staff Onboarding',
        description: 'Standard onboarding for general staff positions',
        department: 'General',
        position: 'Staff Member',
        employment_type: 'full_time',
        fields: this.getGeneralStaffFields(),
        estimated_days: 3,
        required_documents: [
          'Government-issued ID',
          'Social Security Card',
          'Direct Deposit Form',
          'W-4 Form',
          'Emergency Contact Form',
          'Employee Handbook Acknowledgment'
        ],
        assignees: [],
        tags: ['general', 'staff', 'standard'],
        is_default: true,
        use_count: 0
      },
      {
        venue_id: venueId,
        name: 'Security Staff Onboarding',
        description: 'Comprehensive onboarding for security personnel',
        department: 'Security',
        position: 'Security Officer',
        employment_type: 'full_time',
        fields: this.getSecurityStaffFields(),
        estimated_days: 5,
        required_documents: [
          'Government-issued ID',
          'Social Security Card',
          'Security License/Certification',
          'Background Check Authorization',
          'Direct Deposit Form',
          'W-4 Form',
          'Emergency Contact Form',
          'Security Training Certificate',
          'Employee Handbook Acknowledgment'
        ],
        assignees: [],
        tags: ['security', 'licensed', 'background-check'],
        is_default: false,
        use_count: 0
      },
      {
        venue_id: venueId,
        name: 'Bar Staff Onboarding',
        description: 'Onboarding for bartenders and bar staff',
        department: 'Food & Beverage',
        position: 'Bartender',
        employment_type: 'part_time',
        fields: this.getBarStaffFields(),
        estimated_days: 4,
        required_documents: [
          'Government-issued ID',
          'Social Security Card',
          'Alcohol Server Certification',
          'Food Handler Certification',
          'Direct Deposit Form',
          'W-4 Form',
          'Emergency Contact Form',
          'Employee Handbook Acknowledgment'
        ],
        assignees: [],
        tags: ['food-beverage', 'bartender', 'certified'],
        is_default: false,
        use_count: 0
      },
      {
        venue_id: venueId,
        name: 'Technical Staff Onboarding',
        description: 'Onboarding for sound, lighting, and technical staff',
        department: 'Technical',
        position: 'Technical Staff',
        employment_type: 'contractor',
        fields: this.getTechnicalStaffFields(),
        estimated_days: 3,
        required_documents: [
          'Government-issued ID',
          'Social Security Card',
          'Technical Certifications',
          'Direct Deposit Form',
          'W-9 Form',
          'Emergency Contact Form',
          'Equipment Training Certificate',
          'Safety Training Certificate'
        ],
        assignees: [],
        tags: ['technical', 'contractor', 'certified'],
        is_default: false,
        use_count: 0
      },
      {
        venue_id: venueId,
        name: 'Management Onboarding',
        description: 'Comprehensive onboarding for management positions',
        department: 'Management',
        position: 'Manager',
        employment_type: 'full_time',
        fields: this.getManagementFields(),
        estimated_days: 7,
        required_documents: [
          'Government-issued ID',
          'Social Security Card',
          'Resume/CV',
          'Reference Letters',
          'Direct Deposit Form',
          'W-4 Form',
          'Emergency Contact Form',
          'Management Training Certificate',
          'Employee Handbook Acknowledgment',
          'Non-Disclosure Agreement'
        ],
        assignees: [],
        tags: ['management', 'leadership', 'full-time'],
        is_default: false,
        use_count: 0
      }
    ]
  }

  /**
   * Get fields for general staff onboarding
   */
  private static getGeneralStaffFields(): OnboardingField[] {
    return [
      // Personal Information
      {
        id: 'personal_info',
        type: 'text',
        label: 'Full Legal Name',
        required: true,
        placeholder: 'Enter your full legal name as it appears on your ID',
        order: 1,
        section: 'Personal Information'
      },
      {
        id: 'email',
        type: 'email',
        label: 'Email Address',
        required: true,
        placeholder: 'your.email@example.com',
        order: 2,
        section: 'Personal Information'
      },
      {
        id: 'phone',
        type: 'phone',
        label: 'Phone Number',
        required: true,
        placeholder: '(555) 123-4567',
        order: 3,
        section: 'Personal Information'
      },
      {
        id: 'date_of_birth',
        type: 'date',
        label: 'Date of Birth',
        required: true,
        order: 4,
        section: 'Personal Information'
      },
      {
        id: 'address',
        type: 'address',
        label: 'Current Address',
        required: true,
        placeholder: 'Enter your full address',
        order: 5,
        section: 'Personal Information'
      },
      {
        id: 'ssn',
        type: 'text',
        label: 'Social Security Number',
        required: true,
        placeholder: 'XXX-XX-XXXX',
        validation: { pattern: '^\\d{3}-\\d{2}-\\d{4}$' },
        help_text: 'Required for tax purposes',
        order: 6,
        section: 'Personal Information'
      },

      // Emergency Contact
      {
        id: 'emergency_contact',
        type: 'emergency_contact',
        label: 'Emergency Contact Information',
        required: true,
        order: 7,
        section: 'Emergency Contact'
      },

      // Employment Information
      {
        id: 'start_date',
        type: 'date',
        label: 'Expected Start Date',
        required: true,
        order: 8,
        section: 'Employment Information'
      },
      {
        id: 'availability',
        type: 'multiselect',
        label: 'Available Work Days',
        required: true,
        options: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
        order: 9,
        section: 'Employment Information'
      },
      {
        id: 'shift_preference',
        type: 'select',
        label: 'Preferred Shift',
        required: false,
        options: ['Morning', 'Afternoon', 'Evening', 'Night', 'Flexible'],
        order: 10,
        section: 'Employment Information'
      },

      // Banking Information
      {
        id: 'bank_info',
        type: 'bank_info',
        label: 'Direct Deposit Information',
        required: true,
        help_text: 'Required for payroll processing',
        order: 11,
        section: 'Banking Information'
      },

      // Documents
      {
        id: 'government_id',
        type: 'file',
        label: 'Government-Issued ID',
        required: true,
        help_text: 'Upload a clear photo of your driver\'s license, passport, or state ID',
        order: 12,
        section: 'Required Documents'
      },
      {
        id: 'ssn_card',
        type: 'file',
        label: 'Social Security Card',
        required: true,
        help_text: 'Upload a clear photo of your Social Security card',
        order: 13,
        section: 'Required Documents'
      },
      {
        id: 'direct_deposit_form',
        type: 'file',
        label: 'Direct Deposit Authorization Form',
        required: true,
        help_text: 'Download, complete, and upload the direct deposit form',
        order: 14,
        section: 'Required Documents'
      },

      // Agreements
      {
        id: 'handbook_acknowledgment',
        type: 'checkbox',
        label: 'I have read and agree to the Employee Handbook',
        required: true,
        order: 15,
        section: 'Agreements'
      },
      {
        id: 'background_check_consent',
        type: 'checkbox',
        label: 'I consent to a background check as part of the hiring process',
        required: true,
        order: 16,
        section: 'Agreements'
      }
    ]
  }

  /**
   * Get fields for security staff onboarding
   */
  private static getSecurityStaffFields(): OnboardingField[] {
    const generalFields = this.getGeneralStaffFields()
    
    const securityFields: OnboardingField[] = [
      // Security-specific fields
      {
        id: 'security_license',
        type: 'text',
        label: 'Security License Number',
        required: true,
        placeholder: 'Enter your security license number',
        order: 17,
        section: 'Security Information'
      },
      {
        id: 'security_license_expiry',
        type: 'date',
        label: 'Security License Expiry Date',
        required: true,
        order: 18,
        section: 'Security Information'
      },
      {
        id: 'security_license_file',
        type: 'file',
        label: 'Security License',
        required: true,
        help_text: 'Upload a copy of your current security license',
        order: 19,
        section: 'Required Documents'
      },
      {
        id: 'firearm_permit',
        type: 'text',
        label: 'Firearm Permit Number (if applicable)',
        required: false,
        placeholder: 'Enter firearm permit number if you have one',
        order: 20,
        section: 'Security Information'
      },
      {
        id: 'firearm_permit_file',
        type: 'file',
        label: 'Firearm Permit (if applicable)',
        required: false,
        help_text: 'Upload firearm permit if you have one',
        order: 21,
        section: 'Required Documents'
      },
      {
        id: 'cpr_certification',
        type: 'text',
        label: 'CPR Certification Number',
        required: true,
        placeholder: 'Enter your CPR certification number',
        order: 22,
        section: 'Security Information'
      },
      {
        id: 'cpr_certification_expiry',
        type: 'date',
        label: 'CPR Certification Expiry Date',
        required: true,
        order: 23,
        section: 'Security Information'
      },
      {
        id: 'cpr_certification_file',
        type: 'file',
        label: 'CPR Certification',
        required: true,
        help_text: 'Upload a copy of your current CPR certification',
        order: 24,
        section: 'Required Documents'
      },
      {
        id: 'previous_security_experience',
        type: 'textarea',
        label: 'Previous Security Experience',
        required: true,
        placeholder: 'Describe your previous security experience',
        order: 25,
        section: 'Security Information'
      },
      {
        id: 'conflict_resolution_training',
        type: 'checkbox',
        label: 'I have completed conflict resolution training',
        required: true,
        order: 26,
        section: 'Security Information'
      }
    ]

    return [...generalFields, ...securityFields]
  }

  /**
   * Get fields for bar staff onboarding
   */
  private static getBarStaffFields(): OnboardingField[] {
    const generalFields = this.getGeneralStaffFields()
    
    const barFields: OnboardingField[] = [
      // Bar-specific fields
      {
        id: 'alcohol_server_certification',
        type: 'text',
        label: 'Alcohol Server Certification Number',
        required: true,
        placeholder: 'Enter your alcohol server certification number',
        order: 17,
        section: 'Bar Information'
      },
      {
        id: 'alcohol_cert_expiry',
        type: 'date',
        label: 'Alcohol Server Certification Expiry Date',
        required: true,
        order: 18,
        section: 'Bar Information'
      },
      {
        id: 'alcohol_cert_file',
        type: 'file',
        label: 'Alcohol Server Certification',
        required: true,
        help_text: 'Upload a copy of your current alcohol server certification',
        order: 19,
        section: 'Required Documents'
      },
      {
        id: 'food_handler_certification',
        type: 'text',
        label: 'Food Handler Certification Number',
        required: true,
        placeholder: 'Enter your food handler certification number',
        order: 20,
        section: 'Bar Information'
      },
      {
        id: 'food_cert_expiry',
        type: 'date',
        label: 'Food Handler Certification Expiry Date',
        required: true,
        order: 21,
        section: 'Bar Information'
      },
      {
        id: 'food_cert_file',
        type: 'file',
        label: 'Food Handler Certification',
        required: true,
        help_text: 'Upload a copy of your current food handler certification',
        order: 22,
        section: 'Required Documents'
      },
      {
        id: 'bartending_experience',
        type: 'textarea',
        label: 'Bartending Experience',
        required: true,
        placeholder: 'Describe your bartending experience and skills',
        order: 23,
        section: 'Bar Information'
      },
      {
        id: 'wine_knowledge',
        type: 'select',
        label: 'Wine Knowledge Level',
        required: false,
        options: ['Beginner', 'Intermediate', 'Advanced', 'Expert'],
        order: 24,
        section: 'Bar Information'
      },
      {
        id: 'cocktail_specialties',
        type: 'textarea',
        label: 'Cocktail Specialties',
        required: false,
        placeholder: 'List any cocktail specialties or signature drinks you can make',
        order: 25,
        section: 'Bar Information'
      }
    ]

    return [...generalFields, ...barFields]
  }

  /**
   * Get fields for technical staff onboarding
   */
  private static getTechnicalStaffFields(): OnboardingField[] {
    const generalFields = this.getGeneralStaffFields()
    
    const technicalFields: OnboardingField[] = [
      // Technical-specific fields
      {
        id: 'technical_specialties',
        type: 'multiselect',
        label: 'Technical Specialties',
        required: true,
        options: ['Sound Engineering', 'Lighting Design', 'Video Production', 'Stage Management', 'Rigging', 'Audio Visual', 'Broadcast', 'Live Streaming'],
        order: 17,
        section: 'Technical Information'
      },
      {
        id: 'certifications',
        type: 'textarea',
        label: 'Technical Certifications',
        required: false,
        placeholder: 'List any technical certifications you hold',
        order: 18,
        section: 'Technical Information'
      },
      {
        id: 'certification_files',
        type: 'file',
        label: 'Certification Documents',
        required: false,
        help_text: 'Upload copies of your technical certifications',
        order: 19,
        section: 'Required Documents'
      },
      {
        id: 'equipment_experience',
        type: 'textarea',
        label: 'Equipment Experience',
        required: true,
        placeholder: 'Describe your experience with specific equipment and systems',
        order: 20,
        section: 'Technical Information'
      },
      {
        id: 'software_proficiency',
        type: 'multiselect',
        label: 'Software Proficiency',
        required: false,
        options: ['Pro Tools', 'Logic Pro', 'Ableton Live', 'QLab', 'GrandMA', 'Hog4', 'Vectorworks', 'AutoCAD', 'Adobe Creative Suite', 'DaVinci Resolve', 'OBS Studio'],
        order: 21,
        section: 'Technical Information'
      },
      {
        id: 'safety_training',
        type: 'checkbox',
        label: 'I have completed workplace safety training',
        required: true,
        order: 22,
        section: 'Technical Information'
      },
      {
        id: 'height_certification',
        type: 'checkbox',
        label: 'I am certified to work at heights',
        required: false,
        order: 23,
        section: 'Technical Information'
      },
      {
        id: 'forklift_certification',
        type: 'checkbox',
        label: 'I am certified to operate forklifts',
        required: false,
        order: 24,
        section: 'Technical Information'
      }
    ]

    return [...generalFields, ...technicalFields]
  }

  /**
   * Get fields for management onboarding
   */
  private static getManagementFields(): OnboardingField[] {
    const generalFields = this.getGeneralStaffFields()
    
    const managementFields: OnboardingField[] = [
      // Management-specific fields
      {
        id: 'resume',
        type: 'file',
        label: 'Resume/CV',
        required: true,
        help_text: 'Upload your current resume or CV',
        order: 17,
        section: 'Management Information'
      },
      {
        id: 'management_experience',
        type: 'textarea',
        label: 'Management Experience',
        required: true,
        placeholder: 'Describe your management experience and leadership style',
        order: 18,
        section: 'Management Information'
      },
      {
        id: 'team_size_managed',
        type: 'number',
        label: 'Largest Team Size Managed',
        required: false,
        placeholder: 'Number of direct reports',
        order: 19,
        section: 'Management Information'
      },
      {
        id: 'budget_experience',
        type: 'select',
        label: 'Budget Management Experience',
        required: false,
        options: ['None', 'Under $10K', '$10K-$50K', '$50K-$100K', '$100K-$500K', 'Over $500K'],
        order: 20,
        section: 'Management Information'
      },
      {
        id: 'project_management',
        type: 'checkbox',
        label: 'I have project management experience',
        required: false,
        order: 21,
        section: 'Management Information'
      },
      {
        id: 'conflict_resolution',
        type: 'textarea',
        label: 'Conflict Resolution Experience',
        required: true,
        placeholder: 'Describe your experience handling workplace conflicts',
        order: 22,
        section: 'Management Information'
      },
      {
        id: 'references',
        type: 'file',
        label: 'Professional References',
        required: true,
        help_text: 'Upload letters of recommendation or reference contact information',
        order: 23,
        section: 'Required Documents'
      },
      {
        id: 'nda_agreement',
        type: 'checkbox',
        label: 'I agree to sign a Non-Disclosure Agreement',
        required: true,
        order: 24,
        section: 'Agreements'
      },
      {
        id: 'leadership_philosophy',
        type: 'textarea',
        label: 'Leadership Philosophy',
        required: true,
        placeholder: 'Describe your leadership philosophy and management approach',
        order: 25,
        section: 'Management Information'
      }
    ]

    return [...generalFields, ...managementFields]
  }

  /**
   * Initialize default templates for a venue
   */
  static async initializeDefaultTemplates(venueId: string): Promise<void> {
    try {
      const defaultTemplates = this.getDefaultTemplates(venueId)
      
      for (const template of defaultTemplates) {
        await this.createTemplate(template)
      }
      
      console.log('✅ Default onboarding templates initialized for venue:', venueId)
    } catch (error) {
      console.error('Error initializing default templates:', error)
      throw error
    }
  }
} 