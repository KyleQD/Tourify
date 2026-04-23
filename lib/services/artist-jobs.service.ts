import type { SupabaseClient } from '@supabase/supabase-js'
import { getPostgrestErrorMessage } from '@/lib/supabase/postgrest-error'
import { supabase } from '@/lib/supabase'
import {
  ArtistJob,
  ArtistJobApplication,
  ArtistJobCategory,
  ArtistJobSave,
  JobSearchFilters,
  JobSearchResults,
  CreateJobFormData,
  CreateApplicationFormData,
  CollaborationApplication,
  CreateCollaborationApplicationFormData,
  CollaborationFilters,
  ApiResponse
} from '@/types/artist-jobs'

/** Server routes must pass createClient(); browser code can omit. */
type ArtistJobsDbClient = SupabaseClient<any>

function resolveArtistJobsClient(client?: ArtistJobsDbClient): ArtistJobsDbClient {
  return client ?? (supabase as ArtistJobsDbClient)
}

export class ArtistJobsService {
  // =============================================================================
  // JOB CATEGORIES
  // =============================================================================

  static async getCategories(): Promise<ArtistJobCategory[]> {
    const { data, error } = await supabase
      .from('artist_job_categories')
      .select('*')
      .eq('is_active', true)
      .order('name')

    if (error) {
      console.error('Error fetching job categories:', error)
      throw new Error('Failed to fetch job categories')
    }

    return data || []
  }

  // =============================================================================
  // JOB MANAGEMENT
  // =============================================================================

  static async searchJobs(filters: JobSearchFilters = {}): Promise<JobSearchResults> {
    const {
      query,
      category_id,
      payment_type,
      job_type,
      location_type,
      city,
      state,
      country,
      required_experience,
      required_genres,
      required_skills,
      min_payment,
      max_payment,
      date_from,
      date_to,
      deadline_from,
      deadline_to,
      featured_only,
      sort_by = 'created_at',
      sort_order = 'desc',
      page = 1,
      per_page = 20
    } = filters

    let queryBuilder = supabase
      .from('artist_jobs')
      .select(`
        *,
        category:artist_job_categories(*)
      `)
      .eq('status', 'open')

    // Text search
    if (query) {
      queryBuilder = queryBuilder.or(`title.ilike.%${query}%,description.ilike.%${query}%`)
    }

    // Category filter
    if (category_id) {
      queryBuilder = queryBuilder.eq('category_id', category_id)
    }

    // Payment type filter
    if (payment_type?.length) {
      queryBuilder = queryBuilder.in('payment_type', payment_type)
    }

    // Job type filter
    if (job_type?.length) {
      queryBuilder = queryBuilder.in('job_type', job_type)
    }

    // Location type filter
    if (location_type?.length) {
      queryBuilder = queryBuilder.in('location_type', location_type)
    }

    // Location filters
    if (city) {
      queryBuilder = queryBuilder.ilike('city', `%${city}%`)
    }
    if (state) {
      queryBuilder = queryBuilder.ilike('state', `%${state}%`)
    }
    if (country) {
      queryBuilder = queryBuilder.ilike('country', `%${country}%`)
    }

    // Experience filter
    if (required_experience?.length) {
      queryBuilder = queryBuilder.in('required_experience', required_experience)
    }

    // Genre filter
    if (required_genres?.length) {
      queryBuilder = queryBuilder.overlaps('required_genres', required_genres)
    }

    // Skills filter
    if (required_skills?.length) {
      queryBuilder = queryBuilder.overlaps('required_skills', required_skills)
    }

    // Payment range filter
    if (min_payment !== undefined) {
      queryBuilder = queryBuilder.gte('payment_amount', min_payment)
    }
    if (max_payment !== undefined) {
      queryBuilder = queryBuilder.lte('payment_amount', max_payment)
    }

    // Date filters
    if (date_from) {
      queryBuilder = queryBuilder.gte('event_date', date_from)
    }
    if (date_to) {
      queryBuilder = queryBuilder.lte('event_date', date_to)
    }

    // Deadline filters
    if (deadline_from) {
      queryBuilder = queryBuilder.gte('deadline', deadline_from)
    }
    if (deadline_to) {
      queryBuilder = queryBuilder.lte('deadline', deadline_to)
    }

    // Featured filter
    if (featured_only) {
      queryBuilder = queryBuilder.eq('featured', true)
    }

    // Sorting
    const ascending = sort_order === 'asc'
    queryBuilder = queryBuilder.order(sort_by, { ascending })

    // Pagination
    const from = (page - 1) * per_page
    const to = from + per_page - 1
    queryBuilder = queryBuilder.range(from, to)

    const { data, error, count } = await queryBuilder

    if (error) {
      console.error('Error searching jobs:', error)
      throw new Error('Failed to search jobs')
    }

    const total_count = count || 0
    const total_pages = Math.ceil(total_count / per_page)

    return {
      jobs: data || [],
      total_count,
      page,
      per_page,
      total_pages,
      has_next: page < total_pages,
      has_previous: page > 1
    }
  }

  static async getJob(
    id: string,
    userId?: string,
    client?: ArtistJobsDbClient
  ): Promise<ArtistJob | null> {
    const db = resolveArtistJobsClient(client)
    const { data, error } = await db
      .from('artist_jobs')
      .select(`
        *,
        category:artist_job_categories(*)
      `)
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error fetching job:', error)
      return null
    }

    let job = data as ArtistJob

    // Check if user has saved this job
    if (userId) {
      const { data: saveData } = await db
        .from('artist_job_saves')
        .select('id')
        .eq('job_id', id)
        .eq('user_id', userId)
        .single()

      job.is_saved = !!saveData

      // Get user's application if exists
      const { data: applicationData } = await db
        .from('artist_job_applications')
        .select('*')
        .eq('job_id', id)
        .eq('applicant_id', userId)
        .single()

      job.user_application = applicationData || undefined
    }

    // Track view
    if (userId) await this.trackJobView(id, userId, db)

    return job
  }

  static async createJob(jobData: CreateJobFormData, userId: string): Promise<ArtistJob> {
    const { data, error } = await supabase
      .from('artist_jobs')
      .insert({
        ...jobData,
        posted_by: userId,
        posted_by_type: 'artist' // Default, can be changed based on user type
      })
      .select(`
        *,
        category:artist_job_categories(*)
      `)
      .single()

    if (error) {
      console.error('Error creating job:', error)
      throw new Error('Failed to create job')
    }

    return data as ArtistJob
  }

  static async updateJob(
    id: string,
    updates: Partial<CreateJobFormData>,
    userId: string,
    client?: ArtistJobsDbClient
  ): Promise<ArtistJob> {
    const db = resolveArtistJobsClient(client)
    const { data, error } = await db
      .from('artist_jobs')
      .update(updates)
      .eq('id', id)
      .eq('posted_by', userId)
      .select(`
        *,
        category:artist_job_categories(*)
      `)
      .single()

    if (error) {
      console.error('Error updating job:', error)
      throw new Error('Failed to update job')
    }

    return data as ArtistJob
  }

  static async deleteJob(id: string, userId: string, client?: ArtistJobsDbClient): Promise<void> {
    const db = resolveArtistJobsClient(client)
    const { error } = await db
      .from('artist_jobs')
      .delete()
      .eq('id', id)
      .eq('posted_by', userId)

    if (error) {
      console.error('Error deleting job:', error)
      throw new Error('Failed to delete job')
    }
  }

  static async getUserJobs(userId: string): Promise<ArtistJob[]> {
    const { data, error } = await supabase
      .from('artist_jobs')
      .select(`
        *,
        category:artist_job_categories(*)
      `)
      .eq('posted_by', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching user jobs:', error)
      throw new Error('Failed to fetch user jobs')
    }

    return data || []
  }

  // =============================================================================
  // JOB APPLICATIONS
  // =============================================================================

  static async applyToJob(
    applicationData: CreateApplicationFormData,
    userId: string,
    client?: ArtistJobsDbClient
  ): Promise<ArtistJobApplication> {
    const db = resolveArtistJobsClient(client)
    const { data, error } = await db
      .from('artist_job_applications')
      .insert({
        ...applicationData,
        applicant_id: userId
      })
      .select('*')
      .single()

    if (error) {
      console.error('Error applying to job:', error)
      throw new Error(getPostgrestErrorMessage(error) || 'Failed to apply to job')
    }

    return data as ArtistJobApplication
  }

  static async getJobApplications(
    jobId: string,
    userId: string,
    client?: ArtistJobsDbClient
  ): Promise<ArtistJobApplication[]> {
    const db = resolveArtistJobsClient(client)
    // Verify user owns the job
    const { data: job } = await db
      .from('artist_jobs')
      .select('posted_by')
      .eq('id', jobId)
      .eq('posted_by', userId)
      .single()

    if (!job) {
      throw new Error('Unauthorized: You can only view applications for your own jobs')
    }

    const { data, error } = await db
      .from('artist_job_applications')
      .select('*')
      .eq('job_id', jobId)
      .order('applied_at', { ascending: false })

    if (error) {
      console.error('Error fetching job applications:', error)
      throw new Error('Failed to fetch job applications')
    }

    return data || []
  }

  static async getUserApplications(userId: string): Promise<ArtistJobApplication[]> {
    const { data, error } = await supabase
      .from('artist_job_applications')
      .select(`
        *,
        job:artist_jobs(
          title,
          category:artist_job_categories(name)
        )
      `)
      .eq('applicant_id', userId)
      .order('applied_at', { ascending: false })

    if (error) {
      console.error('Error fetching user applications:', error)
      throw new Error('Failed to fetch user applications')
    }

    return data || []
  }

  static async updateApplicationStatus(
    applicationId: string,
    status: ArtistJobApplication['status'],
    userId: string,
    feedback?: string,
    client?: ArtistJobsDbClient
  ): Promise<ArtistJobApplication> {
    const db = resolveArtistJobsClient(client)
    const { data, error } = await db
      .from('artist_job_applications')
      .update({
        status,
        feedback,
        reviewed_at: new Date().toISOString(),
        responded_at: ['accepted', 'rejected'].includes(status) ? new Date().toISOString() : undefined
      })
      .eq('id', applicationId)
      .select('*')
      .single()

    if (error) {
      console.error('Error updating application status:', error)
      throw new Error('Failed to update application status')
    }

    return data as ArtistJobApplication
  }

  static async withdrawApplication(applicationId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('artist_job_applications')
      .update({ status: 'withdrawn' })
      .eq('id', applicationId)
      .eq('applicant_id', userId)

    if (error) {
      console.error('Error withdrawing application:', error)
      throw new Error('Failed to withdraw application')
    }
  }

  // =============================================================================
  // JOB SAVES/BOOKMARKS
  // =============================================================================

  static async saveJob(jobId: string, userId: string): Promise<ArtistJobSave> {
    const { data, error } = await supabase
      .from('artist_job_saves')
      .insert({
        job_id: jobId,
        user_id: userId
      })
      .select('*')
      .single()

    if (error) {
      console.error('Error saving job:', error)
      throw new Error('Failed to save job')
    }

    return data as ArtistJobSave
  }

  static async unsaveJob(jobId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('artist_job_saves')
      .delete()
      .eq('job_id', jobId)
      .eq('user_id', userId)

    if (error) {
      console.error('Error unsaving job:', error)
      throw new Error('Failed to unsave job')
    }
  }

  static async getSavedJobs(userId: string): Promise<ArtistJob[]> {
    const { data, error } = await supabase
      .from('artist_job_saves')
      .select(`
        job:artist_jobs(
          *,
          category:artist_job_categories(*)
        )
      `)
      .eq('user_id', userId)
      .order('saved_at', { ascending: false })

    if (error) {
      console.error('Error fetching saved jobs:', error)
      throw new Error('Failed to fetch saved jobs')
    }

    return (data || []).map(item => item.job as unknown as ArtistJob)
  }

  // =============================================================================
  // ANALYTICS & TRACKING
  // =============================================================================

  static async trackJobView(
    jobId: string,
    userId?: string,
    client?: ArtistJobsDbClient
  ): Promise<void> {
    const db = resolveArtistJobsClient(client)
    const { error } = await db
      .from('artist_job_views')
      .insert({
        job_id: jobId,
        viewer_id: userId || null
      })

    if (error) {
      console.error('Error tracking job view:', error)
      // Don't throw error for view tracking
    }
  }

  static async getJobAnalytics(jobId: string, userId: string): Promise<{
    views: number
    applications: number
    saves: number
    recent_views: Array<{ viewed_at: string }>
  }> {
    // Verify user owns the job
    const { data: job } = await supabase
      .from('artist_jobs')
      .select('posted_by')
      .eq('id', jobId)
      .eq('posted_by', userId)
      .single()

    if (!job) {
      throw new Error('Unauthorized: You can only view analytics for your own jobs')
    }

    const [viewsResult, applicationsResult, savesResult, recentViewsResult] = await Promise.all([
      supabase
        .from('artist_job_views')
        .select('id', { count: 'exact' })
        .eq('job_id', jobId),
      
      supabase
        .from('artist_job_applications')
        .select('id', { count: 'exact' })
        .eq('job_id', jobId),
      
      supabase
        .from('artist_job_saves')
        .select('id', { count: 'exact' })
        .eq('job_id', jobId),
      
      supabase
        .from('artist_job_views')
        .select('viewed_at')
        .eq('job_id', jobId)
        .order('viewed_at', { ascending: false })
        .limit(10)
    ])

    return {
      views: viewsResult.count || 0,
      applications: applicationsResult.count || 0,
      saves: savesResult.count || 0,
      recent_views: recentViewsResult.data || []
    }
  }

  // =============================================================================
  // UTILITY FUNCTIONS
  // =============================================================================

  static async getRecommendedJobs(userId: string, limit = 10): Promise<ArtistJob[]> {
    // Get user's application history to understand preferences
    const { data: userApplications } = await supabase
      .from('artist_job_applications')
      .select(`
        job:artist_jobs(
          category_id,
          required_genres,
          required_skills,
          payment_type,
          location_type
        )
      `)
      .eq('applicant_id', userId)
      .limit(20)

    if (!userApplications?.length) {
      // If no history, return recent jobs
      return this.getRecentJobs(limit)
    }

    // Extract preferences from application history
    const categories = new Set()
    const genres = new Set()
    const skills = new Set()
    const paymentTypes = new Set()
    const locationTypes = new Set()

    userApplications.forEach(app => {
      if (app.job && Array.isArray(app.job) && app.job.length > 0) {
        const job = app.job[0] as any
        categories.add(job.category_id)
        job.required_genres?.forEach((genre: any) => genres.add(genre))
        job.required_skills?.forEach((skill: any) => skills.add(skill))
        paymentTypes.add(job.payment_type)
        locationTypes.add(job.location_type)
      }
    })

    // Build recommendation query
    let queryBuilder = supabase
      .from('artist_jobs')
      .select(`
        *,
        category:artist_job_categories(*)
      `)
      .eq('status', 'open')
      .neq('posted_by', userId) // Don't recommend user's own jobs

    if (categories.size > 0) {
      queryBuilder = queryBuilder.in('category_id', Array.from(categories))
    }

    const { data, error } = await queryBuilder
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error fetching recommended jobs:', error)
      return this.getRecentJobs(limit)
    }

    return data || []
  }

  static async getRecentJobs(limit = 10): Promise<ArtistJob[]> {
    const { data, error } = await supabase
      .from('artist_jobs')
      .select(`
        *,
        category:artist_job_categories(*)
      `)
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error fetching recent jobs:', error)
      return []
    }

    return data || []
  }

  static async getFeaturedJobs(limit = 5): Promise<ArtistJob[]> {
    const { data, error } = await supabase
      .from('artist_jobs')
      .select(`
        *,
        category:artist_job_categories(*)
      `)
      .eq('status', 'open')
      .eq('featured', true)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error fetching featured jobs:', error)
      return []
    }

    return data || []
  }

  // =============================================================================
  // COLLABORATION-SPECIFIC METHODS
  // =============================================================================

  static async searchCollaborations(filters: CollaborationFilters = {}): Promise<JobSearchResults> {
    // Use the base search method but filter for collaboration type
    const collaborationFilters: JobSearchFilters = {
      ...filters,
      job_type: ['collaboration']
    }
    
    return this.searchJobs(collaborationFilters)
  }

  static async createCollaboration(collaborationData: CreateJobFormData, userId: string): Promise<ArtistJob> {
    // Ensure the job type is collaboration
    const jobData = {
      ...collaborationData,
      job_type: 'collaboration' as const,
      posted_by_type: 'artist' as const
    }

    return this.createJob(jobData, userId)
  }

  static async applyToCollaboration(
    applicationData: CreateCollaborationApplicationFormData, 
    userId: string
  ): Promise<CollaborationApplication> {
    const { data, error } = await supabase
      .from('collaboration_applications')
      .insert({
        ...applicationData,
        applicant_id: userId
      })
      .select('*')
      .single()

    if (error) {
      console.error('Error applying to collaboration:', error)
      throw new Error('Failed to apply to collaboration')
    }

    return data as CollaborationApplication
  }

  static async getCollaborationApplications(
    jobId: string, 
    userId: string
  ): Promise<CollaborationApplication[]> {
    // Verify user owns the collaboration job
    const { data: job } = await supabase
      .from('artist_jobs')
      .select('posted_by')
      .eq('id', jobId)
      .eq('posted_by', userId)
      .eq('job_type', 'collaboration')
      .single()

    if (!job) {
      throw new Error('Unauthorized: You can only view applications for your own collaboration jobs')
    }

    const { data, error } = await supabase
      .from('collaboration_applications')
      .select('*')
      .eq('job_id', jobId)
      .order('applied_at', { ascending: false })

    if (error) {
      console.error('Error fetching collaboration applications:', error)
      throw new Error('Failed to fetch collaboration applications')
    }

    return data || []
  }

  static async getUserCollaborationApplications(userId: string): Promise<CollaborationApplication[]> {
    const { data, error } = await supabase
      .from('collaboration_applications')
      .select(`
        *,
        job:artist_jobs(
          title,
          category:artist_job_categories(name)
        )
      `)
      .eq('applicant_id', userId)
      .order('applied_at', { ascending: false })

    if (error) {
      console.error('Error fetching user collaboration applications:', error)
      throw new Error('Failed to fetch user collaboration applications')
    }

    return data || []
  }

  static async updateCollaborationApplicationStatus(
    applicationId: string,
    status: CollaborationApplication['status'],
    userId: string,
    responseMessage?: string,
    client?: ArtistJobsDbClient
  ): Promise<CollaborationApplication> {
    const db = resolveArtistJobsClient(client)
    const { data, error } = await db
      .from('collaboration_applications')
      .update({
        status,
        response_message: responseMessage,
        reviewed_at: new Date().toISOString(),
        responded_at: ['accepted', 'rejected'].includes(status) ? new Date().toISOString() : undefined
      })
      .eq('id', applicationId)
      .select('*')
      .single()

    if (error) {
      console.error('Error updating collaboration application status:', error)
      throw new Error('Failed to update collaboration application status')
    }

    return data as CollaborationApplication
  }

  static async withdrawCollaborationApplication(applicationId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('collaboration_applications')
      .update({ status: 'withdrawn' })
      .eq('id', applicationId)
      .eq('applicant_id', userId)

    if (error) {
      console.error('Error withdrawing collaboration application:', error)
      throw new Error('Failed to withdraw collaboration application')
    }
  }

  static async getUserCollaborations(userId: string): Promise<ArtistJob[]> {
    const { data, error } = await supabase
      .from('artist_jobs')
      .select(`
        *,
        category:artist_job_categories(*)
      `)
      .eq('posted_by', userId)
      .eq('job_type', 'collaboration')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching user collaborations:', error)
      throw new Error('Failed to fetch user collaborations')
    }

    return data || []
  }

  static async getCollaborationStats(userId: string): Promise<{
    posted: number
    active: number
    applications_received: number
    applications_sent: number
  }> {
    const [
      postedResult,
      activeResult,
      receivedResult,
      sentResult
    ] = await Promise.all([
      supabase
        .from('artist_jobs')
        .select('id', { count: 'exact' })
        .eq('posted_by', userId)
        .eq('job_type', 'collaboration'),
      
      supabase
        .from('artist_jobs')
        .select('id', { count: 'exact' })
        .eq('posted_by', userId)
        .eq('job_type', 'collaboration')
        .eq('status', 'open'),
      
      supabase
        .from('collaboration_applications')
        .select('id', { count: 'exact' })
        .in('job_id', 
          await supabase
            .from('artist_jobs')
            .select('id')
            .eq('posted_by', userId)
            .eq('job_type', 'collaboration')
            .then(result => result.data?.map(job => job.id) || [])
        ),
      
      supabase
        .from('collaboration_applications')
        .select('id', { count: 'exact' })
        .eq('applicant_id', userId)
    ])

    return {
      posted: postedResult.count || 0,
      active: activeResult.count || 0,
      applications_received: receivedResult.count || 0,
      applications_sent: sentResult.count || 0
    }
  }

  static async getRecommendedCollaborations(userId: string, limit = 10): Promise<ArtistJob[]> {
    // Get user's collaboration application history to understand preferences
    const { data: userApplications } = await supabase
      .from('collaboration_applications')
      .select(`
        job:artist_jobs(
          category_id,
          genre,
          instruments_needed,
          required_genres,
          payment_type,
          location_type
        )
      `)
      .eq('applicant_id', userId)
      .limit(20)

    if (!userApplications?.length) {
      // If no collaboration history, return recent collaborations
      return this.getRecentCollaborations(limit)
    }

    // Extract preferences from collaboration application history
    const categories = new Set()
    const genres = new Set()
    const instruments = new Set()
    const paymentTypes = new Set()

    userApplications.forEach(app => {
      if (app.job && Array.isArray(app.job) && app.job.length > 0) {
        const job = app.job[0] as any
        categories.add(job.category_id)
        if (job.genre) genres.add(job.genre)
        job.instruments_needed?.forEach((instrument: any) => instruments.add(instrument))
        job.required_genres?.forEach((genre: any) => genres.add(genre))
        paymentTypes.add(job.payment_type)
      }
    })

    // Build recommendation query
    let queryBuilder = supabase
      .from('artist_jobs')
      .select(`
        *,
        category:artist_job_categories(*)
      `)
      .eq('status', 'open')
      .eq('job_type', 'collaboration')
      .neq('posted_by', userId) // Don't recommend user's own collaborations

    if (categories.size > 0) {
      queryBuilder = queryBuilder.in('category_id', Array.from(categories))
    }

    const { data, error } = await queryBuilder
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error fetching recommended collaborations:', error)
      return this.getRecentCollaborations(limit)
    }

    return data || []
  }

  static async getRecentCollaborations(limit = 10): Promise<ArtistJob[]> {
    const { data, error } = await supabase
      .from('artist_jobs')
      .select(`
        *,
        category:artist_job_categories(*)
      `)
      .eq('status', 'open')
      .eq('job_type', 'collaboration')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error fetching recent collaborations:', error)
      return []
    }

    return data || []
  }
} 