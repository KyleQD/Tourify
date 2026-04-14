import { supabase } from "@/lib/supabase"

// Enhanced types for comprehensive staff management
export interface StaffMember {
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
}

export interface JobPosting {
  id: string
  venue_id: string
  title: string
  description: string
  department: string
  location: string
  employment_type: 'full_time' | 'part_time' | 'contract' | 'freelance'
  salary_range: {
    min: number
    max: number
    type: 'hourly' | 'salary' | 'daily'
  }
  requirements: string[]
  responsibilities: string[]
  benefits: string[]
  status: 'draft' | 'published' | 'paused' | 'closed'
  posted_date: string
  closing_date?: string
  urgent: boolean
  remote: boolean
  experience_level: 'entry' | 'mid' | 'senior' | 'executive'
  skills: string[]
  created_at: string
  updated_at: string
}

export interface JobApplication {
  id: string
  job_id: string
  applicant_id: string
  applicant_name: string
  applicant_email: string
  applicant_phone: string
  resume_url?: string
  cover_letter: string
  skills: string[]
  experience: string
  available_start: string
  salary_expectation?: number
  status: 'pending' | 'reviewed' | 'shortlisted' | 'rejected' | 'hired'
  applied_date: string
  notes?: string
  rating?: number
  interview_scheduled?: string
  hired_as?: 'staff' | 'crew' | 'contractor'
  hired_date?: string
  final_rate?: number
  created_at: string
  updated_at: string
}

export interface OnboardingCandidate {
  id: string
  venue_id: string
  application_id?: string
  name: string
  email: string
  phone: string
  position: string
  department: string
  status: 'pending' | 'in_progress' | 'completed' | 'rejected'
  stage: 'application' | 'interview' | 'background_check' | 'documentation' | 'training' | 'completed'
  application_date: string
  avatar?: string
  experience: string
  skills: string[]
  documents: any[]
  notes: string
  assigned_manager?: string
  start_date?: string
  salary?: number
  employment_type: 'full_time' | 'part_time' | 'contractor' | 'volunteer'
  onboarding_progress: number
  created_at: string
  updated_at: string
}

export interface Contract {
  id: string
  venue_id: string
  employee_id: string
  template_id?: string
  contract_type: 'employment' | 'contractor' | 'nda' | 'performance'
  title: string
  content: string
  status: 'draft' | 'pending_signature' | 'signed' | 'expired'
  created_date: string
  signed_date?: string
  expiry_date?: string
  terms: Record<string, any>
  signatures: any[]
  created_at: string
  updated_at: string
}

export class EnhancedStaffManagementService {
  
  // ============================================================================
  // JOB POSTING MANAGEMENT
  // ============================================================================
  
  static async createJobPosting(venueId: string, jobData: Partial<JobPosting>): Promise<JobPosting> {
    const { data, error } = await supabase
      .from('staff_jobs')
      .insert([{
        ...jobData,
        venue_id: venueId,
        posted_by: (await supabase.auth.getUser()).data.user?.id
      }])
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async getJobPostings(venueId: string): Promise<JobPosting[]> {
    const { data, error } = await supabase
      .from('staff_jobs')
      .select('*')
      .eq('venue_id', venueId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  }

  static async updateJobPosting(jobId: string, updates: Partial<JobPosting>): Promise<JobPosting> {
    const { data, error } = await supabase
      .from('staff_jobs')
      .update(updates)
      .eq('id', jobId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  // ============================================================================
  // APPLICATION MANAGEMENT
  // ============================================================================

  static async getJobApplications(venueId: string): Promise<JobApplication[]> {
    const { data, error } = await supabase
      .from('staff_applications')
      .select(`
        *,
        job:staff_jobs!inner(venue_id)
      `)
      .eq('job.venue_id', venueId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  }

  static async updateApplicationStatus(
    applicationId: string, 
    status: string,
    notes?: string
  ): Promise<JobApplication> {
    const { data, error } = await supabase
      .from('staff_applications')
      .update({ 
        status,
        notes,
        updated_at: new Date().toISOString()
      })
      .eq('id', applicationId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async hireFromApplication(
    applicationId: string,
    hireDetails: {
      hire_type: 'staff' | 'crew' | 'contractor'
      venue_id: string
      rate: number
      start_date: string
    }
  ): Promise<boolean> {
    try {
      // Update application status
      await this.updateApplicationStatus(applicationId, 'hired')

      // Get application details
      const { data: application, error: appError } = await supabase
        .from('staff_applications')
        .select(`
          *,
          job:staff_jobs(*)
        `)
        .eq('id', applicationId)
        .single()

      if (appError) throw appError

      // Create onboarding candidate
      const onboardingData: Partial<OnboardingCandidate> = {
        venue_id: hireDetails.venue_id,
        application_id: applicationId,
        name: application.applicant_name,
        email: application.applicant_email,
        phone: application.applicant_phone,
        position: application.job.title,
        department: application.job.department,
        status: 'pending',
        stage: 'documentation',
        application_date: application.applied_date,
        experience: application.experience,
        skills: application.skills,
        notes: application.notes || '',
        start_date: hireDetails.start_date,
        salary: hireDetails.rate,
        employment_type: application.job.employment_type,
        onboarding_progress: 0
      }

      const { error: onboardingError } = await supabase
        .from('onboarding_candidates')
        .insert([onboardingData])

      if (onboardingError) throw onboardingError

      return true
    } catch (error) {
      console.error('Error hiring from application:', error)
      throw error
    }
  }

  // ============================================================================
  // ONBOARDING MANAGEMENT
  // ============================================================================

  static async getOnboardingCandidates(venueId: string): Promise<OnboardingCandidate[]> {
    const { data, error } = await supabase
      .from('onboarding_candidates')
      .select('*')
      .eq('venue_id', venueId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  }

  static async updateOnboardingProgress(
    candidateId: string, 
    progress: number,
    stage?: string,
    status?: string
  ): Promise<OnboardingCandidate> {
    const updates: any = {
      onboarding_progress: progress,
      updated_at: new Date().toISOString()
    }

    if (stage) updates.stage = stage
    if (status) updates.status = status

    const { data, error } = await supabase
      .from('onboarding_candidates')
      .update(updates)
      .eq('id', candidateId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async completeOnboarding(candidateId: string): Promise<StaffMember> {
    // Get candidate details
    const { data: candidate, error: candidateError } = await supabase
      .from('onboarding_candidates')
      .select('*')
      .eq('id', candidateId)
      .single()

    if (candidateError) throw candidateError

    // Create staff member record
    const staffData: Partial<StaffMember> = {
      venue_id: candidate.venue_id,
      name: candidate.name,
      email: candidate.email,
      phone: candidate.phone,
      role: candidate.position,
      department: candidate.department,
      employment_type: candidate.employment_type,
      status: 'active',
      hire_date: candidate.start_date,
      hourly_rate: candidate.salary,
      permissions: {},
      notes: candidate.notes
    }

    const { data: staffMember, error: staffError } = await supabase
      .from('venue_team_members')
      .insert([staffData])
      .select()
      .single()

    if (staffError) throw staffError

    // Update onboarding status
    await this.updateOnboardingProgress(candidateId, 100, 'completed', 'completed')

    return staffMember
  }

  // ============================================================================
  // CONTRACT MANAGEMENT
  // ============================================================================

  static async generateContract(
    venueId: string,
    employeeId: string,
    contractType: string,
    templateData: any
  ): Promise<Contract> {
    const contractData: Partial<Contract> = {
      venue_id: venueId,
      employee_id: employeeId,
      contract_type: contractType as any,
      title: `${contractType} Contract`,
      content: this.generateContractContent(contractType, templateData),
      status: 'draft',
      created_date: new Date().toISOString(),
      terms: templateData
    }

    const { data, error } = await supabase
      .from('staff_contracts')
      .insert([contractData])
      .select()
      .single()

    if (error) throw error
    return data
  }

  private static generateContractContent(contractType: string, templateData: any): string {
    // This would use a template engine to generate contract content
    // For now, returning a basic template
    return `
      EMPLOYMENT CONTRACT
      
      This ${contractType} contract is entered into between:
      
      Venue: ${templateData.venueName}
      Employee: ${templateData.employeeName}
      Position: ${templateData.position}
      Start Date: ${templateData.startDate}
      Compensation: $${templateData.salary} per ${templateData.salaryType}
      
      Terms and Conditions:
      ${templateData.terms?.map((term: string) => `- ${term}`).join('\n') || ''}
      
      This contract is governed by the laws of the jurisdiction in which the venue operates.
    `
  }

  static async getContracts(venueId: string): Promise<Contract[]> {
    const { data, error } = await supabase
      .from('staff_contracts')
      .select('*')
      .eq('venue_id', venueId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  }

  // ============================================================================
  // COMMUNICATION MANAGEMENT
  // ============================================================================

  static async sendStaffMessage(
    venueId: string,
    recipients: string[],
    message: {
      subject: string
      content: string
      priority: 'low' | 'normal' | 'high' | 'urgent'
      type: 'announcement' | 'schedule' | 'training' | 'emergency'
    }
  ): Promise<boolean> {
    try {
      const messageData = {
        venue_id: venueId,
        sender_id: (await supabase.auth.getUser()).data.user?.id,
        recipients,
        subject: message.subject,
        content: message.content,
        priority: message.priority,
        type: message.type,
        sent_at: new Date().toISOString()
      }

      const { error } = await supabase
        .from('staff_messages')
        .insert([messageData])

      if (error) throw error

      // Create notifications for each recipient
      for (const recipientId of recipients) {
        await supabase
          .from('notifications')
          .insert([{
            user_id: recipientId,
            type: 'staff_message',
            title: message.subject,
            content: message.content,
            metadata: { priority: message.priority, message_type: message.type }
          }])
      }

      return true
    } catch (error) {
      console.error('Error sending staff message:', error)
      throw error
    }
  }

  static async broadcastToAllStaff(
    venueId: string,
    message: {
      subject: string
      content: string
      priority: 'low' | 'normal' | 'high' | 'urgent'
      type: 'announcement' | 'schedule' | 'training' | 'emergency'
    }
  ): Promise<boolean> {
    // Get all active staff members
    const { data: staff, error } = await supabase
      .from('venue_team_members')
      .select('user_id')
      .eq('venue_id', venueId)
      .eq('status', 'active')
      .not('user_id', 'is', null)

    if (error) throw error

    const recipientIds = staff.map(s => s.user_id).filter(Boolean)
    
    if (recipientIds.length === 0) {
      throw new Error('No active staff members found')
    }

    return await this.sendStaffMessage(venueId, recipientIds, message)
  }

  // ============================================================================
  // ANALYTICS AND REPORTING
  // ============================================================================

  static async getStaffAnalytics(venueId: string): Promise<any> {
    try {
      const [staffStats, applicationStats, onboardingStats] = await Promise.all([
        this.getStaffStats(venueId),
        this.getApplicationStats(venueId),
        this.getOnboardingStats(venueId)
      ])

      return {
        staff: staffStats,
        applications: applicationStats,
        onboarding: onboardingStats,
        generated_at: new Date().toISOString()
      }
    } catch (error) {
      console.error('Error getting staff analytics:', error)
      throw error
    }
  }

  private static async getStaffStats(venueId: string) {
    const { data, error } = await supabase
      .from('venue_team_members')
      .select('status, employment_type, department')
      .eq('venue_id', venueId)

    if (error) throw error

    const staff = data || []
    return {
      total: staff.length,
      active: staff.filter(s => s.status === 'active').length,
      by_type: staff.reduce((acc: any, s) => {
        acc[s.employment_type] = (acc[s.employment_type] || 0) + 1
        return acc
      }, {}),
      by_department: staff.reduce((acc: any, s) => {
        acc[s.department] = (acc[s.department] || 0) + 1
        return acc
      }, {})
    }
  }

  private static async getApplicationStats(venueId: string) {
    const { data: applications, error } = await supabase
      .from('staff_applications')
      .select(`
        status,
        job:staff_jobs!inner(venue_id)
      `)
      .eq('job.venue_id', venueId)

    if (error) throw error

    const apps = applications || []
    return {
      total: apps.length,
      by_status: apps.reduce((acc: any, a) => {
        acc[a.status] = (acc[a.status] || 0) + 1
        return acc
      }, {}),
      hired_count: apps.filter(a => a.status === 'hired').length,
      pending_count: apps.filter(a => a.status === 'pending').length
    }
  }

  private static async getOnboardingStats(venueId: string) {
    const { data, error } = await supabase
      .from('onboarding_candidates')
      .select('status, stage, onboarding_progress')
      .eq('venue_id', venueId)

    if (error) throw error

    const candidates = data || []
    return {
      total: candidates.length,
      by_status: candidates.reduce((acc: any, c) => {
        acc[c.status] = (acc[c.status] || 0) + 1
        return acc
      }, {}),
      by_stage: candidates.reduce((acc: any, c) => {
        acc[c.stage] = (acc[c.stage] || 0) + 1
        return acc
      }, {}),
      average_progress: candidates.length > 0 
        ? candidates.reduce((sum, c) => sum + c.onboarding_progress, 0) / candidates.length
        : 0
    }
  }

  // ============================================================================
  // SCHEDULING INTEGRATION
  // ============================================================================

  static async createStaffSchedule(
    venueId: string,
    scheduleData: {
      staff_id: string
      event_id?: string
      shift_start: string
      shift_end: string
      role: string
      notes?: string
    }
  ): Promise<any> {
    const { data, error } = await supabase
      .from('staff_schedules')
      .insert([{
        ...scheduleData,
        venue_id: venueId
      }])
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async getStaffSchedules(
    venueId: string,
    startDate?: string,
    endDate?: string
  ): Promise<any[]> {
    let query = supabase
      .from('staff_schedules')
      .select(`
        *,
        staff:venue_team_members(name, role),
        event:events(title, start_date, end_date)
      `)
      .eq('venue_id', venueId)

    if (startDate) {
      query = query.gte('shift_start', startDate)
    }
    
    if (endDate) {
      query = query.lte('shift_end', endDate)
    }

    const { data, error } = await query.order('shift_start', { ascending: true })

    if (error) throw error
    return data || []
  }
} 