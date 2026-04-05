import { supabase } from '@/lib/supabase'
import { z } from 'zod'
import {
  ONBOARDING_POSITION_TEMPLATES,
  getPositionTemplateByKey,
  type OnboardingPositionTemplate,
} from '@/lib/staff/onboarding-position-templates'

// Validation schemas
const onboardingFieldSchema = z.object({
  id: z.string(),
  type: z.enum(['text', 'email', 'phone', 'date', 'select', 'multiselect', 'textarea', 'file', 'checkbox', 'number', 'address', 'emergency_contact', 'bank_info', 'tax_info', 'id_document']),
  label: z.string().min(1, "Label is required"),
  required: z.boolean(),
  placeholder: z.string().optional(),
  options: z.array(z.string()).optional(),
  validation: z.object({
    min: z.number().optional(),
    max: z.number().optional(),
    pattern: z.string().optional(),
    custom: z.string().optional()
  }).optional(),
  helpText: z.string().optional(),
  order: z.number(),
  section: z.string(),
  defaultValue: z.any().optional(),
  conditional: z.object({
    field: z.string().optional(),
    value: z.any().optional(),
    operator: z.enum(['equals', 'not_equals', 'contains', 'greater_than', 'less_than']).optional()
  }).optional()
})

const createTemplateSchema = z.object({
  venueId: z.string().uuid(),
  name: z.string().min(1, "Template name is required"),
  description: z.string().optional(),
  department: z.string().min(1, "Department is required"),
  position: z.string().min(1, "Position is required"),
  employmentType: z.enum(['full_time', 'part_time', 'contractor', 'volunteer', 'intern']),
  fields: z.array(onboardingFieldSchema).min(1, "At least one field is required"),
  estimatedDays: z.number().min(1, "Estimated days must be at least 1"),
  requiredDocuments: z.array(z.string()),
  assignees: z.array(z.string()),
  tags: z.array(z.string()),
  isDefault: z.boolean().optional().default(false),
  parentTemplateId: z.string().uuid().optional(), // For template inheritance
  customValidation: z.record(z.any()).optional()
})

const updateTemplateSchema = createTemplateSchema.partial().extend({
  id: z.string().uuid()
})

export class EnhancedOnboardingTemplatesService {
  static getPositionTemplateCatalog() {
    return ONBOARDING_POSITION_TEMPLATES
  }

  static getRequiredCredentialsForPosition(positionTemplateKey?: string | null) {
    const preset = getPositionTemplateByKey(positionTemplateKey)
    if (!preset) return []
    return preset.requiredCredentials
  }

  private static supabase = supabase

  /**
   * Get all templates for a venue
   */
  static async getTemplates(venueId: string) {
    try {
      const { data, error } = await this.supabase
        .from('staff_onboarding_templates')
        .select(`
          *,
          steps:staff_onboarding_steps(*)
        `)
        .eq('venue_id', venueId)
        .order('is_default', { ascending: false })
        .order('use_count', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('❌ [Enhanced Onboarding Templates Service] Error fetching templates:', error)
      throw error
    }
  }

  /**
   * Get a specific template by ID
   */
  static async getTemplateById(templateId: string) {
    try {
      const { data, error } = await this.supabase
        .from('staff_onboarding_templates')
        .select(`
          *,
          steps:staff_onboarding_steps(*)
        `)
        .eq('id', templateId)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('❌ [Enhanced Onboarding Templates Service] Error fetching template:', error)
      throw error
    }
  }

  /**
   * Create a new onboarding template
   */
  static async createTemplate(data: z.infer<typeof createTemplateSchema>) {
    try {
      const validatedData = createTemplateSchema.parse(data)

      // If this is a default template, unset other defaults in the same department
      if (validatedData.isDefault) {
        await this.supabase
          .from('staff_onboarding_templates')
          .update({ is_default: false })
          .eq('venue_id', validatedData.venueId)
          .eq('department', validatedData.department)
      }

      // Create the template
      const { data: template, error: templateError } = await this.supabase
        .from('staff_onboarding_templates')
        .insert({
          venue_id: validatedData.venueId,
          name: validatedData.name,
          description: validatedData.description,
          department: validatedData.department,
          position: validatedData.position,
          employment_type: validatedData.employmentType,
          fields: validatedData.fields,
          estimated_days: validatedData.estimatedDays,
          required_documents: validatedData.requiredDocuments,
          assignees: validatedData.assignees,
          tags: validatedData.tags,
          is_default: validatedData.isDefault,
          parent_template_id: validatedData.parentTemplateId,
          custom_validation: validatedData.customValidation,
          use_count: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (templateError) throw templateError

      // Create onboarding steps if parent template exists
      if (validatedData.parentTemplateId) {
        await this.inheritStepsFromParent(template.id, validatedData.parentTemplateId)
      } else {
        // Create default steps
        await this.createDefaultSteps(template.id, validatedData.fields)
      }

      return template
    } catch (error) {
      console.error('❌ [Enhanced Onboarding Templates Service] Error creating template:', error)
      throw error
    }
  }

  /**
   * Update an existing template
   */
  static async updateTemplate(data: z.infer<typeof updateTemplateSchema>) {
    try {
      const validatedData = updateTemplateSchema.parse(data)

      // If this is a default template, unset other defaults in the same department
      if (validatedData.isDefault) {
        await this.supabase
          .from('staff_onboarding_templates')
          .update({ is_default: false })
          .eq('venue_id', validatedData.venueId)
          .eq('department', validatedData.department)
          .neq('id', validatedData.id)
      }

      const { data: template, error } = await this.supabase
        .from('staff_onboarding_templates')
        .update({
          name: validatedData.name,
          description: validatedData.description,
          department: validatedData.department,
          position: validatedData.position,
          employment_type: validatedData.employmentType,
          fields: validatedData.fields,
          estimated_days: validatedData.estimatedDays,
          required_documents: validatedData.requiredDocuments,
          assignees: validatedData.assignees,
          tags: validatedData.tags,
          is_default: validatedData.isDefault,
          custom_validation: validatedData.customValidation,
          updated_at: new Date().toISOString()
        })
        .eq('id', validatedData.id)
        .select()
        .single()

      if (error) throw error
      return template
    } catch (error) {
      console.error('❌ [Enhanced Onboarding Templates Service] Error updating template:', error)
      throw error
    }
  }

  /**
   * Delete a template
   */
  static async deleteTemplate(templateId: string) {
    try {
      // Check if template is being used
      const { data: usage, error: usageError } = await this.supabase
        .from('staff_onboarding_candidates')
        .select('id')
        .eq('template_id', templateId)
        .limit(1)

      if (usageError) throw usageError

      if (usage && usage.length > 0) {
        throw new Error('Cannot delete template that is being used by candidates')
      }

      // Delete associated steps first
      await this.supabase
        .from('staff_onboarding_steps')
        .delete()
        .eq('template_id', templateId)

      // Delete the template
      const { error } = await this.supabase
        .from('staff_onboarding_templates')
        .delete()
        .eq('id', templateId)

      if (error) throw error

      return { success: true }
    } catch (error) {
      console.error('❌ [Enhanced Onboarding Templates Service] Error deleting template:', error)
      throw error
    }
  }

  /**
   * Initialize default templates for a venue
   */
  static async initializeDefaultTemplates(venueId: string) {
    try {
      const defaultTemplates = ONBOARDING_POSITION_TEMPLATES.map((preset) => ({
        name: `${preset.label} Onboarding`,
        description: `Template for ${preset.label} onboarding`,
        department: preset.department,
        position: preset.position,
        employmentType: preset.employmentType,
        fields: this.getFieldsForPositionTemplate(preset),
        estimatedDays: preset.estimatedDays,
        requiredDocuments: [
          ...preset.requiredDocuments,
          ...preset.requiredCredentials.filter((credential) => credential.isRequired).map((credential) => credential.label),
        ],
        assignees: this.getDefaultAssigneesForDepartment(preset.department),
        tags: [...preset.tags, 'templated', 'credentials'],
        isDefault: true,
      }))

      const createdTemplates = []

      for (const template of defaultTemplates) {
        try {
          const created = await this.createTemplate({
            ...template,
            venueId
          })
          createdTemplates.push(created)
        } catch (error) {
          console.warn(`Failed to create template ${template.name}:`, error)
        }
      }

      return createdTemplates
    } catch (error) {
      console.error('❌ [Enhanced Onboarding Templates Service] Error initializing default templates:', error)
      throw error
    }
  }

  private static getDefaultAssigneesForDepartment(department: string) {
    if (department === 'Security') return ['Security Manager', 'HR Manager']
    if (department === 'Technical') return ['Technical Manager', 'Safety Officer']
    if (department === 'Management') return ['HR Director', 'Operations Director']
    if (department === 'Service') return ['Service Manager', 'HR Manager']
    return ['HR Manager', 'Department Head']
  }

  private static getFieldsForPositionTemplate(template: OnboardingPositionTemplate) {
    if (template.department === 'Security') return this.getSecurityStaffFields()
    if (template.department === 'Technical') return this.getTechnicalStaffFields()
    if (template.department === 'Management') return this.getManagementFields()
    if (template.employmentType === 'volunteer') return this.getVolunteerFields()

    const credentialFields = template.requiredCredentials.map((credential, index) => ({
      id: `credential_${credential.key}`,
      type: 'text' as const,
      label: `${credential.label} Number / ID`,
      required: credential.isRequired,
      order: 20 + index,
      section: 'Credential Wallet',
      helpText: credential.notes || 'Upload supporting document in the credential wallet.',
    }))

    return [...this.getGeneralStaffFields(), ...credentialFields]
  }

  /**
   * Get recommended template based on position and department
   */
  static async getRecommendedTemplate(venueId: string, position: string, department: string) {
    try {
      const { data, error } = await this.supabase
        .from('staff_onboarding_templates')
        .select('*')
        .eq('venue_id', venueId)
        .or(`department.eq.${department},position.eq.${position}`)
        .order('use_count', { ascending: false })
        .limit(1)

      if (error) throw error
      return data?.[0] || null
    } catch (error) {
      console.error('❌ [Enhanced Onboarding Templates Service] Error getting recommended template:', error)
      throw error
    }
  }

  /**
   * Increment template usage count
   */
  static async incrementUsageCount(templateId: string) {
    try {
      const { error } = await this.supabase
        .from('staff_onboarding_templates')
        .update({
          use_count: 1, // TODO: Implement proper increment
          last_used: new Date().toISOString()
        })
        .eq('id', templateId)

      if (error) throw error
    } catch (error) {
      console.error('❌ [Enhanced Onboarding Templates Service] Error incrementing usage count:', error)
      throw error
    }
  }

  /**
   * Create default onboarding steps based on fields
   */
  private static async createDefaultSteps(templateId: string, fields: any[]) {
    const steps = [
      {
        template_id: templateId,
        step_order: 1,
        title: "Welcome & Introduction",
        description: "Welcome to the team and overview of the onboarding process",
        step_type: "meeting",
        category: "social",
        required: true,
        estimated_hours: 1,
        assigned_to: "HR Manager",
        instructions: "Schedule welcome meeting with new team member",
        completion_criteria: ["Meeting completed", "Welcome packet received"]
      },
      {
        template_id: templateId,
        step_order: 2,
        title: "Document Collection",
        description: "Collect required documents and information",
        step_type: "document",
        category: "admin",
        required: true,
        estimated_hours: 2,
        assigned_to: "HR Manager",
        instructions: "Collect all required documents from the candidate",
        completion_criteria: ["All required documents submitted", "Documents verified"],
        documents: fields.filter(f => f.type === 'file').map(f => f.label)
      },
      {
        template_id: templateId,
        step_order: 3,
        title: "Training & Orientation",
        description: "Complete required training and orientation",
        step_type: "training",
        category: "training",
        required: true,
        estimated_hours: 4,
        assigned_to: "Department Head",
        instructions: "Complete role-specific training and orientation",
        completion_criteria: ["Training completed", "Assessment passed"]
      },
      {
        template_id: templateId,
        step_order: 4,
        title: "Equipment Setup",
        description: "Set up necessary equipment and access",
        step_type: "setup",
        category: "equipment",
        required: true,
        estimated_hours: 1,
        assigned_to: "IT Manager",
        instructions: "Set up computer, email, and system access",
        completion_criteria: ["Equipment received", "Access granted", "Login working"]
      },
      {
        template_id: templateId,
        step_order: 5,
        title: "Team Introduction",
        description: "Meet team members and understand team dynamics",
        step_type: "meeting",
        category: "social",
        required: true,
        estimated_hours: 2,
        assigned_to: "Department Head",
        instructions: "Introduce to team members and explain team structure",
        completion_criteria: ["Team members met", "Team structure understood"]
      }
    ]

    for (const step of steps) {
      await this.supabase
        .from('staff_onboarding_steps')
        .insert(step)
    }
  }

  /**
   * Inherit steps from parent template
   */
  private static async inheritStepsFromParent(templateId: string, parentTemplateId: string) {
    try {
      const { data: parentSteps, error } = await this.supabase
        .from('staff_onboarding_steps')
        .select('*')
        .eq('template_id', parentTemplateId)
        .order('step_order')

      if (error) throw error

      for (const step of parentSteps || []) {
        const { step_order, title, description, step_type, category, required, estimated_hours, assigned_to, instructions, completion_criteria, documents } = step
        
        await this.supabase
          .from('staff_onboarding_steps')
          .insert({
            template_id: templateId,
            step_order,
            title,
            description,
            step_type,
            category,
            required,
            estimated_hours,
            assigned_to,
            instructions,
            completion_criteria,
            documents
          })
      }
    } catch (error) {
      console.error('❌ [Enhanced Onboarding Templates Service] Error inheriting steps:', error)
      throw error
    }
  }

  // Predefined field sets for different roles
  private static getGeneralStaffFields() {
    return [
      {
        id: "personal_info",
        type: "text" as const,
        label: "Full Name",
        required: true,
        order: 1,
        section: "Personal Information"
      },
      {
        id: "email",
        type: "email" as const,
        label: "Email Address",
        required: true,
        order: 2,
        section: "Personal Information"
      },
      {
        id: "phone",
        type: "phone" as const,
        label: "Phone Number",
        required: true,
        order: 3,
        section: "Personal Information"
      },
      {
        id: "address",
        type: "address" as const,
        label: "Home Address",
        required: true,
        order: 4,
        section: "Personal Information"
      },
      {
        id: "emergency_contact",
        type: "emergency_contact" as const,
        label: "Emergency Contact",
        required: true,
        order: 5,
        section: "Emergency Contact"
      },
      {
        id: "bank_info",
        type: "bank_info" as const,
        label: "Banking Information",
        required: true,
        order: 6,
        section: "Employment Information"
      },
      {
        id: "tax_info",
        type: "tax_info" as const,
        label: "Tax Information",
        required: true,
        order: 7,
        section: "Employment Information"
      },
      {
        id: "availability",
        type: "textarea" as const,
        label: "Availability Schedule",
        required: true,
        order: 8,
        section: "Employment Information"
      }
    ]
  }

  private static getSecurityStaffFields() {
    return [
      ...this.getGeneralStaffFields(),
      {
        id: "security_license",
        type: "text" as const,
        label: "Security License Number",
        required: true,
        order: 9,
        section: "Security Information"
      },
      {
        id: "license_expiry",
        type: "date" as const,
        label: "License Expiry Date",
        required: true,
        order: 10,
        section: "Security Information"
      },
      {
        id: "cpr_certification",
        type: "text" as const,
        label: "CPR Certification Number",
        required: true,
        order: 11,
        section: "Security Information"
      },
      {
        id: "firearm_permit",
        type: "text" as const,
        label: "Firearm Permit Number (if applicable)",
        required: false,
        order: 12,
        section: "Security Information"
      },
      {
        id: "background_check",
        type: "checkbox" as const,
        label: "Background Check Consent",
        required: true,
        order: 13,
        section: "Security Information"
      }
    ]
  }

  private static getTechnicalStaffFields() {
    return [
      ...this.getGeneralStaffFields(),
      {
        id: "technical_certifications",
        type: "multiselect" as const,
        label: "Technical Certifications",
        required: true,
        options: ["Audio Engineering", "Lighting Design", "Rigging", "Electrical", "Safety", "Other"],
        order: 9,
        section: "Technical Information"
      },
      {
        id: "experience_years",
        type: "number" as const,
        label: "Years of Technical Experience",
        required: true,
        validation: { min: 0, max: 50 },
        order: 10,
        section: "Technical Information"
      },
      {
        id: "equipment_familiarity",
        type: "multiselect" as const,
        label: "Equipment Familiarity",
        required: true,
        options: ["Audio Consoles", "Lighting Boards", "Rigging Equipment", "Video Systems", "Other"],
        order: 11,
        section: "Technical Information"
      },
      {
        id: "safety_training",
        type: "checkbox" as const,
        label: "Safety Training Completed",
        required: true,
        order: 12,
        section: "Technical Information"
      }
    ]
  }

  private static getManagementFields() {
    return [
      ...this.getGeneralStaffFields(),
      {
        id: "management_experience",
        type: "number" as const,
        label: "Years of Management Experience",
        required: true,
        validation: { min: 0, max: 50 },
        order: 9,
        section: "Management Information"
      },
      {
        id: "leadership_style",
        type: "select" as const,
        label: "Leadership Style",
        required: true,
        options: ["Democratic", "Autocratic", "Laissez-faire", "Transformational", "Situational"],
        order: 10,
        section: "Management Information"
      },
      {
        id: "team_size",
        type: "number" as const,
        label: "Previous Team Size Managed",
        required: true,
        validation: { min: 1, max: 100 },
        order: 11,
        section: "Management Information"
      },
      {
        id: "budget_experience",
        type: "checkbox" as const,
        label: "Budget Management Experience",
        required: true,
        order: 12,
        section: "Management Information"
      }
    ]
  }

  private static getVolunteerFields() {
    return [
      {
        id: "personal_info",
        type: "text" as const,
        label: "Full Name",
        required: true,
        order: 1,
        section: "Personal Information"
      },
      {
        id: "email",
        type: "email" as const,
        label: "Email Address",
        required: true,
        order: 2,
        section: "Personal Information"
      },
      {
        id: "phone",
        type: "phone" as const,
        label: "Phone Number",
        required: true,
        order: 3,
        section: "Personal Information"
      },
      {
        id: "emergency_contact",
        type: "emergency_contact" as const,
        label: "Emergency Contact",
        required: true,
        order: 4,
        section: "Emergency Contact"
      },
      {
        id: "availability",
        type: "textarea" as const,
        label: "Volunteer Availability",
        required: true,
        order: 5,
        section: "Volunteer Information"
      },
      {
        id: "interests",
        type: "multiselect" as const,
        label: "Areas of Interest",
        required: true,
        options: ["Events", "Customer Service", "Technical", "Administrative", "Marketing", "Other"],
        order: 6,
        section: "Volunteer Information"
      }
    ]
  }
} 