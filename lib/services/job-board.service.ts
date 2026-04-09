import { supabase } from '@/lib/supabase/client'
import { z } from 'zod'
import type { CreateJobPostingData, JobPostingTemplate } from '@/types/admin-onboarding'

// Schema for job board posting
const jobBoardPostingSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  department: z.string().min(1, 'Department is required'),
  position: z.string().min(1, 'Position is required'),
  employment_type: z.enum(['full_time', 'part_time', 'contractor', 'volunteer']),
  location: z.string().min(1, 'Location is required'),
  // venue_id is optional to avoid FK/UUID issues during early setup
  venue_id: z.string().uuid().optional(),
  organization_id: z.string().min(1, 'Organization ID is required'),
  organization_name: z.string().min(1, 'Organization name is required'),
  organization_logo: z.string().optional(),
  organization_description: z.string().optional(),
  number_of_positions: z.number().min(1, 'At least 1 position is required'),
  salary_range: z.object({
    min: z.number().min(0, 'Minimum salary must be positive'),
    max: z.number().min(0, 'Maximum salary must be positive'),
    type: z.enum(['hourly', 'salary', 'daily'])
  }).optional(),
  requirements: z.array(z.string()).min(1, 'At least one requirement is required'),
  responsibilities: z.array(z.string()).min(1, 'At least one responsibility is required'),
  benefits: z.array(z.string()),
  skills: z.array(z.string()),
  experience_level: z.enum(['entry', 'mid', 'senior', 'executive']),
  remote: z.boolean(),
  urgent: z.boolean(),
  required_certifications: z.array(z.string()),
  role_type: z.enum(['security', 'bartender', 'street_team', 'production', 'management', 'other']),
  background_check_required: z.boolean(),
  drug_test_required: z.boolean(),
  uniform_provided: z.boolean(),
  training_provided: z.boolean(),
  age_requirement: z.number().min(18, 'Minimum age is 18').optional(),
  status: z.enum(['draft', 'published', 'paused', 'closed']).default('published'),
  application_form_template: z.object({
    fields: z.array(z.object({
      id: z.string(),
      name: z.string(),
      label: z.string(),
      type: z.enum(['text', 'textarea', 'email', 'phone', 'date', 'select', 'multiselect', 'file', 'checkbox', 'number']),
      required: z.boolean(),
      placeholder: z.string().optional(),
      description: z.string().optional(),
      options: z.array(z.string()).optional(),
      validation: z.object({
        min: z.number().optional(),
        max: z.number().optional(),
        pattern: z.string().optional(),
        custom: z.string().optional()
      }).optional(),
      order: z.number()
    }))
  })
})

export class JobBoardService {
  private static isValidUuid(id?: string) {
    if (!id) return false
    return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(id)
  }
  /**
   * Create a job posting and publish it to both the job board and organization profile
   */
  static async createJobPosting(
    venueId: string, 
    data: CreateJobPostingData,
    organizationData: {
      id: string
      name: string
      logo?: string
      description?: string
    },
    templateId?: string
  ): Promise<JobPostingTemplate> {
    try {
      console.log('🔧 [Job Board Service] Starting job posting creation...')
      console.log('🔧 [Job Board Service] Venue ID:', venueId)
      console.log('🔧 [Job Board Service] Organization Data:', organizationData)
      
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')
      
      // Validate the data
      // Normalize org/venue IDs to avoid invalid UUID errors
      const normalizedOrgId = this.isValidUuid(organizationData.id) ? organizationData.id : user.id
      const normalizedVenueId = this.isValidUuid(venueId) ? venueId : null

      const validatedData = jobBoardPostingSchema.parse({
        ...data,
        venue_id: normalizedVenueId,
        organization_id: normalizedOrgId,
        organization_name: organizationData.name,
        organization_logo: organizationData.logo,
        organization_description: organizationData.description,
        status: 'published'
      })
      
      console.log('✅ [Job Board Service] Data validation passed')
      
      // Check if tables exist
      const jobBoardTableExists = await this.checkTableExists('job_board_postings')
      const organizationProfileTableExists = await this.checkTableExists('organization_job_postings')
      
      console.log('🔍 [Job Board Service] Tables exist - Job Board:', jobBoardTableExists, 'Organization Profile:', organizationProfileTableExists)
      
      if (!jobBoardTableExists || !organizationProfileTableExists) {
        console.warn('⚠️ [Job Board Service] Tables do not exist, returning mock data')
        return this.createMockJobPosting(venueId, validatedData, organizationData)
      }
      
      // Create job posting in job board
      console.log('🔧 [Job Board Service] Creating job posting in job board...')
      const { data: jobBoardPosting, error: jobBoardError } = await supabase
        .from('job_board_postings')
        .insert({
          ...validatedData,
          created_by: user.id,
          applications_count: 0,
          views_count: 0,
          is_featured: false,
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
          template_id: templateId
        })
        .select()
        .single()
      
      if (jobBoardError) {
        console.error('❌ [Job Board Service] Job board posting creation error:', jobBoardError)
        throw jobBoardError
      }
      
      // Create job posting in organization profile
      console.log('🔧 [Job Board Service] Creating job posting in organization profile...')
      const { data: organizationPosting, error: organizationError } = await supabase
        .from('organization_job_postings')
        .insert({
          ...validatedData,
          created_by: user.id,
          applications_count: 0,
          views_count: 0,
          template_id: templateId
        })
        .select()
        .single()
      
      if (organizationError) {
        console.error('❌ [Job Board Service] Organization posting creation error:', organizationError)
        // Try to clean up the job board posting
        await supabase.from('job_board_postings').delete().eq('id', jobBoardPosting.id)
        throw organizationError
      }
      
      console.log('✅ [Job Board Service] Job posting created successfully in both locations')
      console.log('✅ [Job Board Service] Job Board ID:', jobBoardPosting.id)
      console.log('✅ [Job Board Service] Organization Profile ID:', organizationPosting.id)
      
      // Return the job board posting as the primary result
      return {
        ...jobBoardPosting,
        id: jobBoardPosting.id,
        job_board_id: jobBoardPosting.id,
        organization_profile_id: organizationPosting.id
      }
      
    } catch (error) {
      const err: any = error
      const message = Array.isArray(err?.issues)
        ? err.issues.map((i: any) => i?.message).join('\n')
        : err?.message || 'Unknown error'
      console.error('❌ [Job Board Service] Error creating job posting:', message)
      throw new Error(message)
    }
  }
  
  /**
   * Get job postings from the job board
   */
  static async getJobBoardPostings(filters?: {
    location?: string
    department?: string
    employment_type?: string
    experience_level?: string
    remote?: boolean
    urgent?: boolean
    limit?: number
    offset?: number
    organization_id?: string
    created_by?: string
  }): Promise<JobPostingTemplate[]> {
    try {
      const tableExists = await this.checkTableExists('job_board_postings')
      if (!tableExists) {
        console.warn('⚠️ [Job Board Service] job_board_postings table does not exist, returning mock data')
        return this.getMockJobBoardPostings()
      }
      
      let query = supabase
        .from('job_board_postings')
        .select('*')
        .eq('status', 'published')
        .order('created_at', { ascending: false })
      
      if (filters?.location) {
        query = query.ilike('location', `%${filters.location}%`)
      }
      if (filters?.department) {
        query = query.eq('department', filters.department)
      }
      if (filters?.employment_type) {
        query = query.eq('employment_type', filters.employment_type)
      }
      if (filters?.experience_level) {
        query = query.eq('experience_level', filters.experience_level)
      }
      if (filters?.remote !== undefined) {
        query = query.eq('remote', filters.remote)
      }
      if (filters?.urgent) {
        query = query.eq('urgent', true)
      }
      if (filters?.organization_id && filters?.created_by) {
        query = query.or(
          `organization_id.eq.${filters.organization_id},created_by.eq.${filters.created_by}`
        )
      } else if (filters?.organization_id) {
        query = query.eq('organization_id', filters.organization_id)
      } else if (filters?.created_by) {
        query = query.eq('created_by', filters.created_by)
      }
      if (filters?.limit) {
        query = query.limit(filters.limit)
      }
      if (filters?.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1)
      }
      
      const { data, error } = await query
      if (error) throw error
      
      return data || []
    } catch (error) {
      console.error('❌ [Job Board Service] Error fetching job board postings:', error)
      return this.getMockJobBoardPostings()
    }
  }
  
  /**
   * Get job postings for an organization's profile
   */
  static async getOrganizationJobPostings(organizationId: string): Promise<JobPostingTemplate[]> {
    try {
      const tableExists = await this.checkTableExists('organization_job_postings')
      if (!tableExists) {
        console.warn('⚠️ [Job Board Service] organization_job_postings table does not exist, returning mock data')
        return this.getMockOrganizationJobPostings(organizationId)
      }
      
      const { data, error } = await supabase
        .from('organization_job_postings')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      return data || []
    } catch (error) {
      console.error('❌ [Job Board Service] Error fetching organization job postings:', error)
      return this.getMockOrganizationJobPostings(organizationId)
    }
  }
  
  /**
   * Update job posting status
   */
  static async updateJobPostingStatus(
    jobId: string, 
    status: 'draft' | 'published' | 'paused' | 'closed',
    location: 'job_board' | 'organization' | 'both' = 'both'
  ): Promise<void> {
    try {
      if (location === 'job_board' || location === 'both') {
        const tableExists = await this.checkTableExists('job_board_postings')
        if (tableExists) {
          await supabase
            .from('job_board_postings')
            .update({ status })
            .eq('id', jobId)
        }
      }
      
      if (location === 'organization' || location === 'both') {
        const tableExists = await this.checkTableExists('organization_job_postings')
        if (tableExists) {
          await supabase
            .from('organization_job_postings')
            .update({ status })
            .eq('id', jobId)
        }
      }
    } catch (error) {
      console.error('❌ [Job Board Service] Error updating job posting status:', error)
      throw error
    }
  }
  
  /**
   * Increment view count for a job posting
   */
  static async incrementViewCount(jobId: string, location: 'job_board' | 'organization' | 'both' = 'both'): Promise<void> {
    try {
      if (location === 'job_board' || location === 'both') {
        const tableExists = await this.checkTableExists('job_board_postings')
        if (tableExists) {
          await supabase
            .from('job_board_postings')
            .update({ views_count: supabase.rpc('increment') })
            .eq('id', jobId)
        }
      }
      
      if (location === 'organization' || location === 'both') {
        const tableExists = await this.checkTableExists('organization_job_postings')
        if (tableExists) {
          await supabase
            .from('organization_job_postings')
            .update({ views_count: supabase.rpc('increment') })
            .eq('id', jobId)
        }
      }
    } catch (error) {
      console.error('❌ [Job Board Service] Error incrementing view count:', error)
    }
  }
  
  /**
   * Check if a table exists
   */
  private static async checkTableExists(tableName: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('id')
        .limit(1)
      
      if (error && error.code === '42P01') {
        return false // Table doesn't exist
      }
      return true
    } catch (error) {
      return false
    }
  }
  
  /**
   * Create mock job posting data
   */
  private static createMockJobPosting(
    venueId: string, 
    data: any, 
    organizationData: any
  ): JobPostingTemplate {
    return {
      id: `mock-job-${Date.now()}`,
      venue_id: venueId,
      created_by: 'mock-user',
      ...data,
      applications_count: 0,
      views_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      job_board_id: `mock-job-board-${Date.now()}`,
      organization_profile_id: `mock-org-profile-${Date.now()}`
    }
  }
  
  /**
   * Get mock job board postings
   */
  private static getMockJobBoardPostings(): JobPostingTemplate[] {
    return [
      {
        id: 'mock-job-board-1',
        venue_id: 'mock-venue-1',
        created_by: 'mock-user',
        title: 'Security Guard - Event Staff',
        description: 'We are seeking experienced security guards for upcoming events. Must have valid security license and first aid certification.',
        department: 'Security',
        position: 'Security Guard',
        employment_type: 'part_time',
        location: 'Los Angeles, CA',
        number_of_positions: 5,
        requirements: ['Security License', 'First Aid/CPR', 'Background Check'],
        responsibilities: ['Monitor event areas', 'Handle security incidents', 'Assist with crowd control'],
        benefits: ['Competitive pay', 'Flexible schedule', 'Training provided'],
        skills: ['Security', 'Crowd Control', 'First Aid'],
        experience_level: 'mid',
        remote: false,
        urgent: true,
        required_certifications: ['Security License', 'First Aid/CPR'],
        role_type: 'security',
        background_check_required: true,
        drug_test_required: true,
        uniform_provided: true,
        training_provided: true,
        age_requirement: 21,
        status: 'published',
        applications_count: 12,
        views_count: 45,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        application_form_template: { fields: [] }
      }
    ]
  }
  
  /**
   * Get mock organization job postings
   */
  private static getMockOrganizationJobPostings(organizationId: string): JobPostingTemplate[] {
    return [
      {
        id: 'mock-org-job-1',
        venue_id: 'mock-venue-1',
        created_by: 'mock-user',
        title: 'Bartender - Premium Events',
        description: 'Join our team of professional bartenders for high-end events and venues.',
        department: 'Food & Beverage',
        position: 'Bartender',
        employment_type: 'part_time',
        location: 'Los Angeles, CA',
        number_of_positions: 3,
        requirements: ['Alcohol Serving License', 'Food Handler Certificate', 'Customer Service Experience'],
        responsibilities: ['Prepare and serve drinks', 'Maintain bar cleanliness', 'Handle customer requests'],
        benefits: ['Competitive tips', 'Flexible hours', 'Professional development'],
        skills: ['Bartending', 'Customer Service', 'POS Systems'],
        experience_level: 'mid',
        remote: false,
        urgent: false,
        required_certifications: ['Alcohol License', 'Food Handler Cert'],
        role_type: 'bartender',
        background_check_required: true,
        drug_test_required: false,
        uniform_provided: true,
        training_provided: true,
        age_requirement: 21,
        status: 'published',
        applications_count: 8,
        views_count: 23,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        application_form_template: { fields: [] }
      }
    ]
  }
} 