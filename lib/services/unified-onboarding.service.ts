import { supabase } from '@/lib/supabase'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

type OnboardingClient = SupabaseClient<Database>

export interface OnboardingField {
  id: string
  type: string
  label: string
  placeholder?: string
  required: boolean
  description?: string
  options?: string[]
}

export interface OnboardingTemplate {
  id: string
  name: string
  description?: string
  flow_type: 'artist' | 'venue' | 'staff' | 'invitation'
  fields: OnboardingField[]
  is_default: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface OnboardingFlow {
  id: string
  user_id: string
  flow_type: 'artist' | 'venue' | 'staff' | 'invitation'
  status: 'in_progress' | 'completed' | 'abandoned'
  template_id?: string
  responses: Record<string, any>
  metadata: Record<string, any>
  created_at: string
  updated_at: string
  completed_at?: string
}

export interface CreateOnboardingFlowParams {
  user_id: string
  flow_type: 'artist' | 'venue' | 'staff' | 'invitation'
  template_id?: string
  metadata?: Record<string, any>
}

export interface UpdateOnboardingFlowParams {
  id: string
  status?: 'in_progress' | 'completed' | 'abandoned'
  responses?: Record<string, any>
  metadata?: Record<string, any>
  completed_at?: string
}

export class UnifiedOnboardingService {
  /**
   * Get onboarding template by flow type
   */
  static async getTemplateByFlowType(
    flowType: string,
    client: OnboardingClient = supabase,
  ): Promise<OnboardingTemplate | null> {
    try {
      const { data, error } = await client
        .from('onboarding_templates')
        .select('*')
        .eq('flow_type', flowType)
        .eq('is_default', true)
        .eq('is_active', true)
        .single()

      if (error) {
        console.error('❌ [Unified Onboarding Service] Error fetching template:', error)
        return null
      }

      return data as unknown as OnboardingTemplate
    } catch (error) {
      console.error('❌ [Unified Onboarding Service] Error fetching template:', error)
      return null
    }
  }

  /**
   * Get onboarding template by ID
   */
  static async getTemplateById(
    templateId: string,
    client: OnboardingClient = supabase,
  ): Promise<OnboardingTemplate | null> {
    try {
      const { data, error } = await client
        .from('onboarding_templates')
        .select('*')
        .eq('id', templateId)
        .eq('is_active', true)
        .single()

      if (error) {
        console.error('❌ [Unified Onboarding Service] Error fetching template:', error)
        return null
      }

      return data as unknown as OnboardingTemplate
    } catch (error) {
      console.error('❌ [Unified Onboarding Service] Error fetching template:', error)
      return null
    }
  }

  /**
   * Get user's onboarding flow
   */
  static async getUserOnboardingFlow(
    userId: string,
    flowType: string,
    client: OnboardingClient = supabase,
  ): Promise<OnboardingFlow | null> {
    try {
      const { data, error } = await client
        .from('onboarding_flows')
        .select('*')
        .eq('user_id', userId)
        .eq('flow_type', flowType)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          // No flow found
          return null
        }
        console.error('❌ [Unified Onboarding Service] Error fetching user flow:', error)
        return null
      }

      return data as unknown as OnboardingFlow
    } catch (error) {
      console.error('❌ [Unified Onboarding Service] Error fetching user flow:', error)
      return null
    }
  }

  static async getUserOnboardingFlowById(
    userId: string,
    flowId: string,
    client: OnboardingClient = supabase,
  ): Promise<OnboardingFlow | null> {
    const { data, error } = await client
      .from('onboarding_flows')
      .select('*')
      .eq('id', flowId)
      .eq('user_id', userId)
      .maybeSingle()

    if (error) {
      console.error('❌ [Unified Onboarding Service] Error fetching flow by id:', error)
      return null
    }
    return data as OnboardingFlow | null
  }

  /**
   * Create a new onboarding flow
   */
  static async createOnboardingFlow(
    params: CreateOnboardingFlowParams,
    client: OnboardingClient = supabase,
  ): Promise<OnboardingFlow | null> {
    try {
      const { data, error } = await client
        .from('onboarding_flows')
        .insert({
          user_id: params.user_id,
          flow_type: params.flow_type,
          template_id: params.template_id,
          metadata: params.metadata || {},
          status: 'in_progress'
        })
        .select()
        .single()

      if (error) {
        console.error('❌ [Unified Onboarding Service] Error creating flow:', error)
        return null
      }

      return data as unknown as OnboardingFlow
    } catch (error) {
      console.error('❌ [Unified Onboarding Service] Error creating flow:', error)
      return null
    }
  }

  /**
   * Update onboarding flow
   */
  static async updateOnboardingFlow(
    params: UpdateOnboardingFlowParams,
    client: OnboardingClient = supabase,
    userId?: string,
  ): Promise<OnboardingFlow | null> {
    try {
      const updateData: any = {}
      
      if (params.status) updateData.status = params.status
      if (params.responses) updateData.responses = params.responses
      if (params.metadata) updateData.metadata = params.metadata
      if (params.completed_at) updateData.completed_at = params.completed_at

      let query = client
        .from('onboarding_flows')
        .update(updateData)
        .eq('id', params.id)
      if (userId) query = query.eq('user_id', userId)
      const { data, error } = await query
        .select()
        .single()

      if (error) {
        console.error('❌ [Unified Onboarding Service] Error updating flow:', error)
        return null
      }

      return data as unknown as OnboardingFlow
    } catch (error) {
      console.error('❌ [Unified Onboarding Service] Error updating flow:', error)
      return null
    }
  }

  /**
   * Complete onboarding flow
   */
  static async completeOnboardingFlow(
    flowId: string,
    responses: Record<string, any>,
    client: OnboardingClient = supabase,
    userId?: string,
  ): Promise<OnboardingFlow | null> {
    try {
      let query = client
        .from('onboarding_flows')
        .update({
          status: 'completed',
          responses,
          completed_at: new Date().toISOString()
        })
        .eq('id', flowId)
      if (userId) query = query.eq('user_id', userId)
      const { data, error } = await query
        .select()
        .single()

      if (error) {
        console.error('❌ [Unified Onboarding Service] Error completing flow:', error)
        return null
      }

      return data as unknown as OnboardingFlow
    } catch (error) {
      console.error('❌ [Unified Onboarding Service] Error completing flow:', error)
      return null
    }
  }

  /**
   * Get all onboarding flows for a user
   */
  static async getUserOnboardingFlows(userId: string): Promise<OnboardingFlow[]> {
    try {
      const { data, error } = await supabase
        .from('onboarding_flows')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('❌ [Unified Onboarding Service] Error fetching user flows:', error)
        return []
      }

      return (data || []) as unknown as OnboardingFlow[]
    } catch (error) {
      console.error('❌ [Unified Onboarding Service] Error fetching user flows:', error)
      return []
    }
  }

  /**
   * Check if user has completed onboarding
   */
  static async hasCompletedOnboarding(userId: string, flowType: string): Promise<boolean> {
    try {
      const flow = await this.getUserOnboardingFlow(userId, flowType)
      return flow?.status === 'completed'
    } catch (error) {
      console.error('❌ [Unified Onboarding Service] Error checking completion:', error)
      return false
    }
  }

  /**
   * Get onboarding statistics for admin
   */
  static async getOnboardingStats(): Promise<{
    total_flows: number
    completed_flows: number
    pending_flows: number
    in_progress_flows: number
    failed_flows: number
    flows_by_type: Record<string, number>
  }> {
    try {
      // Get total counts
      const { data: totalData, error: totalError } = await supabase
        .from('onboarding_flows')
        .select('status, flow_type')

      if (totalError) {
        console.error('❌ [Unified Onboarding Service] Error fetching stats:', totalError)
        return {
          total_flows: 0,
          completed_flows: 0,
          pending_flows: 0,
          in_progress_flows: 0,
          failed_flows: 0,
          flows_by_type: {}
        }
      }

      const flows = totalData || []
      const total_flows = flows.length
      const completed_flows = flows.filter(f => f.status === 'completed').length
      const pending_flows = flows.filter(f => f.status === 'pending').length
      const in_progress_flows = flows.filter(f => f.status === 'in_progress').length
      const failed_flows = flows.filter(f => f.status === 'failed').length

      // Count by flow type
      const flows_by_type: Record<string, number> = {}
      flows.forEach(flow => {
        flows_by_type[flow.flow_type] = (flows_by_type[flow.flow_type] || 0) + 1
      })

      return {
        total_flows,
        completed_flows,
        pending_flows,
        in_progress_flows,
        failed_flows,
        flows_by_type
      }
    } catch (error) {
      console.error('❌ [Unified Onboarding Service] Error fetching stats:', error)
      return {
        total_flows: 0,
        completed_flows: 0,
        pending_flows: 0,
        in_progress_flows: 0,
        failed_flows: 0,
        flows_by_type: {}
      }
    }
  }

  /**
   * Validate onboarding responses against template
   */
  static validateResponses(template: OnboardingTemplate, responses: Record<string, any>): {
    isValid: boolean
    errors: Record<string, string>
  } {
    const errors: Record<string, string> = {}

    template.fields.forEach(field => {
      if (field.required) {
        const value = responses[field.id]
        if (!value || (Array.isArray(value) && value.length === 0)) {
          errors[field.id] = `${field.label} is required`
        }
      }
    })

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    }
  }

  /**
   * Get or create onboarding flow for user
   */
  static async getOrCreateOnboardingFlow(
    userId: string, 
    flowType: string, 
    templateId?: string,
    client: OnboardingClient = supabase,
  ): Promise<OnboardingFlow | null> {
    try {
      // Try to get existing flow
      let flow = await this.getUserOnboardingFlow(userId, flowType, client)
      
      if (!flow) {
        // Create new flow if it doesn't exist
        flow = await this.createOnboardingFlow({
          user_id: userId,
          flow_type: flowType as any,
          template_id: templateId,
          metadata: {}
        }, client)
      }

      return flow
    } catch (error) {
      console.error('❌ [Unified Onboarding Service] Error getting/creating flow:', error)
      return null
    }
  }
}
