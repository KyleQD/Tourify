import { supabase } from "@/lib/supabase"

// Types matching our database schema
export interface JobPosting {
  id: string
  venue_id: string
  posted_by: string
  title: string
  description: string
  role: string
  department: string
  location: string
  job_type: 'full-time' | 'part-time' | 'contract' | 'temporary'
  salary_range_min: number
  salary_range_max: number
  salary_type: 'hourly' | 'daily' | 'annual' | 'project'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  requirements: string[]
  required_skills: string[]
  preferred_skills: string[]
  certifications_required: string[]
  benefits: string[]
  status: 'draft' | 'open' | 'paused' | 'closed'
  deadline: string
  applications_count: number
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
  cover_letter: string
  resume_url?: string
  portfolio_url?: string
  experience_years: number
  skills: string[]
  availability: string
  status: 'pending' | 'reviewed' | 'interviewed' | 'offered' | 'hired' | 'rejected'
  rating: number
  notes?: string
  ai_match_score: number
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
  avatar_url?: string
  experience_years: number
  skills: string[]
  documents: any[]
  notes: string
  assigned_manager?: string
  start_date?: string
  salary?: number
  employment_type: 'full_time' | 'part_time' | 'contractor' | 'volunteer'
  onboarding_progress: number
  template_id?: string
  created_at: string
  updated_at: string
}

export interface OnboardingTemplate {
  id: string
  venue_id: string
  name: string
  department: string
  position: string
  description?: string
  estimated_days: number
  required_documents: string[]
  assignees: string[]
  tags: string[]
  is_default: boolean
  last_used?: string
  use_count: number
  created_by?: string
  created_at: string
  updated_at: string
  steps?: OnboardingStep[]
}

export interface OnboardingStep {
  id: string
  template_id: string
  step_order: number
  title: string
  description?: string
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
  status?: 'pending' | 'in_progress' | 'completed' | 'blocked' | 'skipped'
  created_at: string
  updated_at: string
}

export interface StaffMessage {
  id: string
  venue_id: string
  sender_id: string
  recipients: string[]
  subject: string
  content: string
  message_type: 'announcement' | 'schedule' | 'training' | 'emergency' | 'general'
  priority: 'low' | 'normal' | 'high' | 'urgent'
  read_by: string[]
  sent_at: string
  created_at: string
}

export class StaffJobBoardService {
  
  // ============================================================================
  // JOB POSTINGS
  // ============================================================================
  
  static async createJobPosting(venueId: string, jobData: Partial<JobPosting>): Promise<JobPosting> {
    const { data: user } = await supabase.auth.getUser()
    if (!user.user) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('staff_jobs')
      .insert([{
        ...jobData,
        venue_id: venueId,
        posted_by: user.user.id,
        applications_count: 0
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
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', jobId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async deleteJobPosting(jobId: string): Promise<boolean> {
    const { error } = await supabase
      .from('staff_jobs')
      .delete()
      .eq('id', jobId)

    if (error) throw error
    return true
  }

  // ============================================================================
  // JOB APPLICATIONS
  // ============================================================================

  static async getJobApplications(venueId: string): Promise<JobApplication[]> {
    const { data, error } = await supabase
      .from('staff_applications')
      .select(`
        *,
        job:staff_jobs!inner(venue_id, title, department)
      `)
      .eq('job.venue_id', venueId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  }

  static async updateApplicationStatus(
    applicationId: string, 
    status: string,
    additionalData?: Partial<JobApplication>
  ): Promise<JobApplication> {
    const updateData = {
      status,
      ...additionalData,
      updated_at: new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('staff_applications')
      .update(updateData)
      .eq('id', applicationId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async calculateAndUpdateAIScore(applicationId: string, jobId: string): Promise<number> {
    // Call our database function for AI matching
    const { data, error } = await supabase.rpc('calculate_ai_match_score', {
      p_application_id: applicationId,
      p_job_id: jobId
    })

    if (error) throw error

    // Update the application with the calculated score
    await supabase
      .from('staff_applications')
      .update({ ai_match_score: data })
      .eq('id', applicationId)

    return data || 0
  }

  static async bulkUpdateApplications(
    applicationIds: string[],
    updates: Partial<JobApplication>
  ): Promise<JobApplication[]> {
    const { data, error } = await supabase
      .from('staff_applications')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .in('id', applicationIds)
      .select()

    if (error) throw error
    return data || []
  }

  // ============================================================================
  // ONBOARDING CANDIDATES
  // ============================================================================

  static async createOnboardingCandidate(candidateData: Partial<OnboardingCandidate>): Promise<OnboardingCandidate> {
    const { data, error } = await supabase
      .from('staff_onboarding_candidates')
      .insert([candidateData])
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async getOnboardingCandidates(venueId: string): Promise<OnboardingCandidate[]> {
    const { data, error } = await supabase
      .from('staff_onboarding_candidates')
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
      .from('staff_onboarding_candidates')
      .update(updates)
      .eq('id', candidateId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async hireFromApplication(applicationId: string, venueId: string): Promise<OnboardingCandidate> {
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
    const candidateData: Partial<OnboardingCandidate> = {
      venue_id: venueId,
      application_id: applicationId,
      name: application.applicant_name,
      email: application.applicant_email,
      phone: application.applicant_phone,
      position: application.job.title,
      department: application.job.department,
      status: 'pending',
      stage: 'documentation',
      experience_years: application.experience_years,
      skills: application.skills,
      employment_type: application.job.job_type,
      onboarding_progress: 0
    }

    const candidate = await this.createOnboardingCandidate(candidateData)

    // Update application status
    await this.updateApplicationStatus(applicationId, 'hired', {
      hired_date: new Date().toISOString()
    })

    return candidate
  }

  // ============================================================================
  // ONBOARDING TEMPLATES
  // ============================================================================

  static async getOnboardingTemplates(venueId: string): Promise<OnboardingTemplate[]> {
    const { data, error } = await supabase
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
  }

  static async createOnboardingTemplate(templateData: Partial<OnboardingTemplate>): Promise<OnboardingTemplate> {
    const { data: user } = await supabase.auth.getUser()
    if (!user.user) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('staff_onboarding_templates')
      .insert([{
        ...templateData,
        created_by: user.user.id,
        use_count: 0
      }])
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async createOnboardingSteps(templateId: string, steps: Partial<OnboardingStep>[]): Promise<OnboardingStep[]> {
    const stepsWithTemplate = steps.map((step, index) => ({
      ...step,
      template_id: templateId,
      step_order: index + 1
    }))

    const { data, error } = await supabase
      .from('staff_onboarding_steps')
      .insert(stepsWithTemplate)
      .select()

    if (error) throw error
    return data || []
  }

  static async updateTemplateUsage(templateId: string): Promise<void> {
    const { error } = await supabase
      .from('staff_onboarding_templates')
      .update({
        use_count: 1, // TODO: Implement proper increment
        last_used: new Date().toISOString().split('T')[0]
      })
      .eq('id', templateId)

    if (error) throw error
  }

  // ============================================================================
  // COMMUNICATION
  // ============================================================================

  static async sendStaffMessage(messageData: Partial<StaffMessage>): Promise<StaffMessage> {
    const { data: user } = await supabase.auth.getUser()
    if (!user.user) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('staff_messages')
      .insert([{
        ...messageData,
        sender_id: user.user.id,
        read_by: [],
        sent_at: new Date().toISOString()
      }])
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async broadcastMessage(
    venueId: string,
    message: {
      subject: string
      content: string
      priority: 'low' | 'normal' | 'high' | 'urgent'
      message_type: 'announcement' | 'schedule' | 'training' | 'emergency' | 'general'
    }
  ): Promise<StaffMessage> {
    // Get all active staff members for this venue
    const { data: staff, error: staffError } = await supabase
      .from('venue_team_members')
      .select('user_id')
      .eq('venue_id', venueId)
      .eq('status', 'active')
      .not('user_id', 'is', null)

    if (staffError) throw staffError

    const recipients = staff.map(s => s.user_id).filter(Boolean)

    return await this.sendStaffMessage({
      venue_id: venueId,
      recipients,
      ...message
    })
  }

  static async getStaffMessages(venueId: string, limit: number = 50): Promise<StaffMessage[]> {
    const { data, error } = await supabase
      .from('staff_messages')
      .select('*')
      .eq('venue_id', venueId)
      .order('sent_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data || []
  }

  // ============================================================================
  // ANALYTICS AND STATISTICS
  // ============================================================================

  static async getDashboardStats(venueId: string): Promise<any> {
    const { data, error } = await supabase.rpc('get_staff_dashboard_stats', {
      p_venue_id: venueId
    })

    if (error) throw error
    return data || {}
  }

  static async getAnalytics(venueId: string): Promise<any> {
    const [jobs, applications, candidates] = await Promise.all([
      this.getJobPostings(venueId),
      this.getJobApplications(venueId),
      this.getOnboardingCandidates(venueId)
    ])

    return {
      jobsCount: jobs.length,
      activeJobs: jobs.filter(j => j.status === 'open').length,
      applicationsCount: applications.length,
      applicationsByStatus: {
        pending: applications.filter(a => a.status === 'pending').length,
        reviewed: applications.filter(a => a.status === 'reviewed').length,
        interviewed: applications.filter(a => a.status === 'interviewed').length,
        hired: applications.filter(a => a.status === 'hired').length,
        rejected: applications.filter(a => a.status === 'rejected').length
      },
      averageAIMatchScore: applications.length > 0 
        ? Math.round(applications.reduce((sum, app) => sum + (app.ai_match_score || 0), 0) / applications.length)
        : 0,
      onboardingCandidates: candidates.length,
      onboardingByStage: {
        documentation: candidates.filter(c => c.stage === 'documentation').length,
        training: candidates.filter(c => c.stage === 'training').length,
        completed: candidates.filter(c => c.stage === 'completed').length
      },
      topSkillsInDemand: this.extractTopSkills(jobs),
      departmentMetrics: this.calculateDepartmentMetrics(jobs, applications)
    }
  }

  private static extractTopSkills(jobs: JobPosting[]): Array<{skill: string, count: number, trend: string}> {
    const skillCounts = new Map<string, number>()
    
    jobs.forEach(job => {
      job.required_skills?.forEach(skill => {
        skillCounts.set(skill, (skillCounts.get(skill) || 0) + 1)
      })
    })

    return Array.from(skillCounts.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 8)
      .map(([skill, count]) => ({
        skill,
        count,
        trend: Math.random() > 0.5 ? 'up' : Math.random() > 0.3 ? 'stable' : 'down'
      }))
  }

  private static calculateDepartmentMetrics(jobs: JobPosting[], applications: JobApplication[]): any {
    const departments = ['Technical', 'Security', 'Operations', 'Service']
    
    return departments.map(dept => {
      const deptJobs = jobs.filter(job => job.department === dept)
      const deptApps = applications.filter(app => {
        const job = jobs.find(j => j.id === app.job_id)
        return job?.department === dept
      })
      const hiredCount = deptApps.filter(app => app.status === 'hired').length
      
      return {
        department: dept,
        activePositions: deptJobs.length,
        applications: deptApps.length,
        hired: hiredCount,
        conversionRate: deptApps.length > 0 ? ((hiredCount / deptApps.length) * 100).toFixed(1) : '0.0'
      }
    })
  }

  // ============================================================================
  // FILE UPLOAD HELPERS
  // ============================================================================

  static async uploadResume(file: File, applicantId: string): Promise<string> {
    const fileName = `${applicantId}/resume-${Date.now()}.${file.name.split('.').pop()}`
    
    const { data, error } = await supabase.storage
      .from('staff-resumes')
      .upload(fileName, file)

    if (error) throw error

    const { data: { publicUrl } } = supabase.storage
      .from('staff-resumes')
      .getPublicUrl(fileName)

    return publicUrl
  }

  static async uploadStaffDocument(file: File, venueId: string, category: string): Promise<string> {
    const fileName = `${venueId}/${category}/${Date.now()}-${file.name}`
    
    const { data, error } = await supabase.storage
      .from('staff-documents')
      .upload(fileName, file)

    if (error) throw error

    const { data: { publicUrl } } = supabase.storage
      .from('staff-documents')
      .getPublicUrl(fileName)

    return publicUrl
  }
} 