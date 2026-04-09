import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/types/supabase'

export interface VerificationRequest {
  id: string
  account_id: string
  request_type: 'identity' | 'business' | 'artist' | 'venue' | 'influence'
  status: 'pending' | 'under_review' | 'approved' | 'rejected' | 'requires_info'
  priority: number
  submitted_documents: any[]
  verification_data: Record<string, any>
  social_links: Record<string, any>
  business_info: Record<string, any>
  reviewed_by?: string
  reviewed_at?: string
  review_notes?: string
  rejection_reason?: string
  auto_verification_score: number
  created_at: string
  updated_at: string
  expires_at: string
}

export interface VerificationDocument {
  id: string
  verification_request_id: string
  document_type: 'id_card' | 'passport' | 'business_license' | 'tax_document' | 'social_proof' | 'portfolio' | 'press_kit' | 'other'
  document_url: string
  document_name?: string
  file_size?: number
  mime_type?: string
  verification_status: 'pending' | 'verified' | 'rejected' | 'expired'
  verified_by?: string
  verified_at?: string
  metadata: Record<string, any>
  created_at: string
}

export interface VerificationBadge {
  id: string
  account_id: string
  badge_type: 'verified' | 'business' | 'artist' | 'venue' | 'influencer' | 'government' | 'media'
  badge_level: number
  issued_by?: string
  issued_at: string
  expires_at?: string
  metadata: Record<string, any>
}

export interface VerificationCriteria {
  id: string
  account_type: string
  criteria_name: string
  criteria_description?: string
  required_documents: string[]
  minimum_score: number
  auto_verify_threshold: number
  weight: number
  is_active: boolean
}

export interface VerificationStatus {
  is_verified: boolean
  badges: VerificationBadge[]
  pending_requests: number
  verification_score: number
}

export class VerificationService {
  private supabase = createClientComponentClient<Database>()

  /**
   * Submit a verification request for an account
   */
  async submitVerificationRequest(
    accountId: string,
    requestType: VerificationRequest['request_type'],
    verificationData: Record<string, any> = {},
    socialLinks: Record<string, any> = {},
    businessInfo: Record<string, any> = {}
  ): Promise<string> {
    const { data, error } = await this.supabase.rpc('submit_verification_request', {
      p_account_id: accountId,
      p_request_type: requestType,
      p_verification_data: verificationData,
      p_social_links: socialLinks,
      p_business_info: businessInfo
    })

    if (error) throw error
    return data
  }

  /**
   * Get verification status for an account
   */
  async getVerificationStatus(accountId: string): Promise<VerificationStatus> {
    const { data, error } = await this.supabase
      .rpc('get_verification_status', { p_account_id: accountId })
      .single()

    if (error) throw error
    return {
      is_verified: (data as any).is_verified,
      badges: (data as any).badges || [],
      pending_requests: (data as any).pending_requests,
      verification_score: (data as any).verification_score
    }
  }

  /**
   * Get verification requests for an account
   */
  async getVerificationRequests(accountId: string): Promise<VerificationRequest[]> {
    const { data, error } = await this.supabase
      .from('verification_requests')
      .select('*')
      .eq('account_id', accountId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  }

  /**
   * Get a specific verification request
   */
  async getVerificationRequest(requestId: string): Promise<VerificationRequest | null> {
    const { data, error } = await this.supabase
      .from('verification_requests')
      .select('*')
      .eq('id', requestId)
      .single()

    if (error) return null
    return data
  }

  /**
   * Upload verification document
   */
  async uploadVerificationDocument(
    file: File,
    verificationRequestId: string,
    documentType: VerificationDocument['document_type'],
    metadata: Record<string, any> = {}
  ): Promise<VerificationDocument> {
    // Upload file to Supabase storage
    const fileName = `verification/${verificationRequestId}/${Date.now()}-${file.name}`
    const { data: uploadData, error: uploadError } = await this.supabase.storage
      .from('verification-documents')
      .upload(fileName, file)

    if (uploadError) throw uploadError

    // Get public URL
    const { data: { publicUrl } } = this.supabase.storage
      .from('verification-documents')
      .getPublicUrl(fileName)

    // Create document record
    const { data, error } = await this.supabase
      .from('verification_documents')
      .insert({
        verification_request_id: verificationRequestId,
        document_type: documentType,
        document_url: publicUrl,
        document_name: file.name,
        file_size: file.size,
        mime_type: file.type,
        metadata
      })
      .select()
      .single()

    if (error) throw error

    // Integrate with staffing/compliance document registry when available.
    try {
      const { data: request } = await this.supabase
        .from('verification_requests')
        .select('account_id')
        .eq('id', verificationRequestId)
        .maybeSingle()

      if (request?.account_id) {
        await this.supabase.from('staff_documents').insert({
          owner_user_id: request.account_id,
          document_type: `verification:${documentType}`,
          storage_bucket: 'verification-documents',
          storage_path: fileName,
          verified_status: 'pending',
          metadata: {
            source: 'verification_service',
            verification_request_id: verificationRequestId,
          },
        })
      }
    } catch (registryError) {
      console.warn('[VerificationService] staff_documents registry skipped:', registryError)
    }

    return data
  }

  /**
   * Get documents for a verification request
   */
  async getVerificationDocuments(verificationRequestId: string): Promise<VerificationDocument[]> {
    const { data, error } = await this.supabase
      .from('verification_documents')
      .select('*')
      .eq('verification_request_id', verificationRequestId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  }

  /**
   * Get verification criteria for an account type
   */
  async getVerificationCriteria(accountType: string): Promise<VerificationCriteria[]> {
    const { data, error } = await this.supabase
      .from('verification_criteria')
      .select('*')
      .eq('account_type', accountType)
      .eq('is_active', true)
      .order('weight', { ascending: false })

    if (error) throw error
    return data || []
  }

  /**
   * Calculate verification score for account
   */
  async calculateVerificationScore(
    accountId: string,
    verificationData: Record<string, any>
  ): Promise<number> {
    const { data, error } = await this.supabase
      .rpc('calculate_verification_score', {
        p_account_id: accountId,
        p_verification_data: verificationData
      })

    if (error) throw error
    return data || 0
  }

  /**
   * Get verification badges for an account
   */
  async getVerificationBadges(accountId: string): Promise<VerificationBadge[]> {
    const { data, error } = await this.supabase
      .from('verification_badges')
      .select('*')
      .eq('account_id', accountId)
      .is('revoked_at', null)
      .order('issued_at', { ascending: false })

    if (error) throw error
    return data || []
  }

  /**
   * Get verification history for an account
   */
  async getVerificationHistory(accountId: string): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('verification_history')
      .select('*')
      .eq('account_id', accountId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  }

  /**
   * Check if account meets verification requirements
   */
  async checkVerificationRequirements(
    accountId: string,
    accountType: string
  ): Promise<{
    requirements: Array<{
      criteria: VerificationCriteria
      met: boolean
      score: number
      required: boolean
    }>
    overall_score: number
    can_auto_verify: boolean
  }> {
    const criteria = await this.getVerificationCriteria(accountType)
    const currentStatus = await this.getVerificationStatus(accountId)
    
    const requirements = criteria.map(criterion => ({
      criteria: criterion,
      met: currentStatus.verification_score >= criterion.minimum_score,
      score: currentStatus.verification_score,
      required: criterion.minimum_score > 0
    }))

    const overall_score = currentStatus.verification_score
    const can_auto_verify = overall_score >= Math.max(...criteria.map(c => c.auto_verify_threshold))

    return {
      requirements,
      overall_score,
      can_auto_verify
    }
  }

  /**
   * Submit social media verification data
   */
  async submitSocialMediaVerification(
    accountId: string,
    socialData: {
      instagram?: { username: string; followers: number; verified: boolean }
      twitter?: { username: string; followers: number; verified: boolean }
      youtube?: { channel: string; subscribers: number; verified: boolean }
      spotify?: { artist_id: string; monthly_listeners: number; verified: boolean }
      website?: { url: string; verified: boolean }
    }
  ): Promise<VerificationRequest> {
    // Calculate social media score based on metrics
    const socialScore = this.calculateSocialMediaScore(socialData)
    
    const verificationData = {
      social_presence: socialScore,
      social_verification_data: socialData
    }

    const requestId = await this.submitVerificationRequest(
      accountId,
      'artist', // Default to artist, can be overridden
      verificationData,
      socialData
    )

    const request = await this.getVerificationRequest(requestId)
    if (!request) throw new Error('Verification request not found')
    return request
  }

  /**
   * Submit business verification data
   */
  async submitBusinessVerification(
    accountId: string,
    businessData: {
      business_name: string
      business_type: string
      registration_number?: string
      tax_id?: string
      address: string
      phone: string
      email: string
      website?: string
      established_date?: string
      employee_count?: number
    }
  ): Promise<VerificationRequest> {
    const businessScore = this.calculateBusinessScore(businessData)
    
    const verificationData = {
      business_registration: businessScore,
      business_verification_data: businessData
    }

    const requestId = await this.submitVerificationRequest(
      accountId,
      'business',
      verificationData,
      {},
      businessData
    )

    const request = await this.getVerificationRequest(requestId)
    if (!request) throw new Error('Verification request not found')
    return request
  }

  /**
   * Auto-verify based on external data sources
   */
  async attemptAutoVerification(
    accountId: string,
    externalData: {
      instagram_verified?: boolean
      spotify_verified?: boolean
      youtube_verified?: boolean
      business_registration_verified?: boolean
      domain_verified?: boolean
    }
  ): Promise<{ success: boolean; score: number; auto_approved: boolean }> {
    let score = 0
    
    // Calculate score based on external verifications
    if (externalData.instagram_verified) score += 0.2
    if (externalData.spotify_verified) score += 0.25
    if (externalData.youtube_verified) score += 0.2
    if (externalData.business_registration_verified) score += 0.3
    if (externalData.domain_verified) score += 0.15

    const verificationData = {
      external_verification_score: score,
      external_data: externalData
    }

    const requestId = await this.submitVerificationRequest(
      accountId,
      'identity',
      verificationData
    )

    const request = await this.getVerificationRequest(requestId)
    
    return {
      success: true,
      score,
      auto_approved: request?.status === 'approved'
    }
  }

  /**
   * Get trending verified accounts
   */
  async getTrendingVerifiedAccounts(
    accountType?: string,
    limit: number = 20
  ): Promise<any[]> {
    let query = this.supabase
      .from('accounts')
      .select(`
        *,
        verification_badges!inner (
          badge_type,
          badge_level,
          issued_at
        )
      `)
      .eq('is_verified', true)
      .eq('is_active', true)
      .order('engagement_score', { ascending: false })
      .limit(limit)

    if (accountType) {
      query = query.eq('account_type', accountType)
    }

    const { data, error } = await query

    if (error) throw error
    return data || []
  }

  /**
   * Private helper methods
   */
  private calculateSocialMediaScore(socialData: any): number {
    let score = 0
    let factors = 0

    // Instagram scoring
    if (socialData.instagram) {
      const { followers, verified } = socialData.instagram
      score += Math.min(followers / 10000, 1) * 0.3 // Max 0.3 for followers
      if (verified) score += 0.2
      factors++
    }

    // Twitter scoring
    if (socialData.twitter) {
      const { followers, verified } = socialData.twitter
      score += Math.min(followers / 5000, 1) * 0.25
      if (verified) score += 0.25
      factors++
    }

    // YouTube scoring
    if (socialData.youtube) {
      const { subscribers, verified } = socialData.youtube
      score += Math.min(subscribers / 1000, 1) * 0.3
      if (verified) score += 0.3
      factors++
    }

    // Spotify scoring
    if (socialData.spotify) {
      const { monthly_listeners, verified } = socialData.spotify
      score += Math.min(monthly_listeners / 1000, 1) * 0.35
      if (verified) score += 0.35
      factors++
    }

    // Website verification
    if (socialData.website?.verified) {
      score += 0.1
    }

    // Normalize by number of platforms (encourage multi-platform presence)
    return factors > 0 ? Math.min(score, 1.0) : 0
  }

  private calculateBusinessScore(businessData: any): number {
    let score = 0

    // Required fields
    if (businessData.business_name) score += 0.1
    if (businessData.registration_number) score += 0.3
    if (businessData.tax_id) score += 0.3
    if (businessData.address) score += 0.1
    if (businessData.phone) score += 0.05
    if (businessData.email) score += 0.05

    // Optional but valuable
    if (businessData.website) score += 0.05
    if (businessData.established_date) {
      const yearsInBusiness = (new Date().getFullYear() - new Date(businessData.established_date).getFullYear())
      score += Math.min(yearsInBusiness / 5, 0.1) // Max 0.1 for 5+ years
    }
    if (businessData.employee_count) {
      score += Math.min(businessData.employee_count / 50, 0.05) // Max 0.05 for 50+ employees
    }

    return Math.min(score, 1.0)
  }
}

export const verificationService = new VerificationService() 