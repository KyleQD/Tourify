import { supabase } from '@/lib/supabase'
import { z } from 'zod'

// Zod schemas for validation
const startOnboardingSchema = z.object({
  admin_role: z.string().min(1, 'Admin role is required')
})

const completeStepSchema = z.object({
  step_number: z.number().min(1).max(7),
  step_data: z.record(z.any()).optional()
})

// TypeScript interfaces
export interface AdminRole {
  id: string
  name: string
  display_name: string
  description: string
  permissions: string[]
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface OnboardingStep {
  id: string
  step_number: number
  title: string
  description: string
  component_name: string
  is_required: boolean
  estimated_time: number
  prerequisites: string[]
  created_at: string
  updated_at: string
}

export interface AdminOnboarding {
  id: string
  user_id: string
  admin_role: string
  onboarding_status: 'pending' | 'in_progress' | 'completed'
  current_step: number
  total_steps: number
  completed_steps: number[]
  onboarding_data: Record<string, any>
  started_at: string
  completed_at?: string
  created_at: string
  updated_at: string
}

export class AdminOnboardingService {
  // Using imported supabase instance

  /**
   * Get all available admin roles
   */
  static async getAdminRoles(): Promise<AdminRole[]> {
    try {
      const { data, error } = await supabase
        .from('admin_roles')
        .select('*')
        .eq('is_active', true)
        .order('display_name')

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('❌ [Admin Onboarding Service] Error fetching admin roles:', error)
      throw error
    }
  }

  /**
   * Get all onboarding steps
   */
  static async getOnboardingSteps(): Promise<OnboardingStep[]> {
    try {
      const { data, error } = await supabase
        .from('admin_onboarding_steps')
        .select('*')
        .order('step_number')

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('❌ [Admin Onboarding Service] Error fetching onboarding steps:', error)
      throw error
    }
  }

  /**
   * Get user's onboarding status
   */
  static async getUserOnboarding(): Promise<AdminOnboarding | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const { data, error } = await supabase
        .from('admin_onboarding')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (error && error.code !== 'PGRST116') throw error
      return data
    } catch (error) {
      console.error('❌ [Admin Onboarding Service] Error fetching user onboarding:', error)
      throw error
    }
  }

  /**
   * Start admin onboarding process
   */
  static async startOnboarding(data: z.infer<typeof startOnboardingSchema>): Promise<AdminOnboarding> {
    try {
      const validatedData = startOnboardingSchema.parse(data)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      // Call the database function to start onboarding
      const { data: onboardingId, error: functionError } = await supabase
        .rpc('start_admin_onboarding', {
          user_uuid: user.id,
          role_name: validatedData.admin_role
        })

      if (functionError) throw functionError

      // Fetch the created onboarding record
      const { data: onboarding, error } = await supabase
        .from('admin_onboarding')
        .select('*')
        .eq('id', onboardingId)
        .single()

      if (error) throw error
      return onboarding
    } catch (error) {
      console.error('❌ [Admin Onboarding Service] Error starting onboarding:', error)
      throw error
    }
  }

  /**
   * Complete an onboarding step
   */
  static async completeStep(data: z.infer<typeof completeStepSchema>): Promise<boolean> {
    try {
      const validatedData = completeStepSchema.parse(data)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      // Get user's onboarding record
      const { data: onboarding, error: fetchError } = await supabase
        .from('admin_onboarding')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (fetchError) throw fetchError
      if (!onboarding) throw new Error('No onboarding record found')

      // Call the database function to complete the step
      const { error: functionError } = await supabase
        .rpc('complete_onboarding_step', {
          onboarding_uuid: onboarding.id,
          step_number: validatedData.step_number,
          step_data: validatedData.step_data || {}
        })

      if (functionError) throw functionError
      return true
    } catch (error) {
      console.error('❌ [Admin Onboarding Service] Error completing step:', error)
      throw error
    }
  }

  /**
   * Get onboarding progress
   */
  static async getOnboardingProgress(): Promise<{
    current_step: number
    total_steps: number
    completed_steps: number[]
    progress_percentage: number
    is_completed: boolean
  }> {
    try {
      const onboarding = await this.getUserOnboarding()
      
      if (!onboarding) {
        return {
          current_step: 1,
          total_steps: 7,
          completed_steps: [],
          progress_percentage: 0,
          is_completed: false
        }
      }

      const progress_percentage = Math.round((onboarding.completed_steps.length / onboarding.total_steps) * 100)
      
      return {
        current_step: onboarding.current_step,
        total_steps: onboarding.total_steps,
        completed_steps: onboarding.completed_steps,
        progress_percentage,
        is_completed: onboarding.onboarding_status === 'completed'
      }
    } catch (error) {
      console.error('❌ [Admin Onboarding Service] Error getting progress:', error)
      throw error
    }
  }

  /**
   * Check if user needs onboarding
   */
  static async needsOnboarding(): Promise<boolean> {
    try {
      const onboarding = await this.getUserOnboarding()
      return !onboarding || onboarding.onboarding_status !== 'completed'
    } catch (error) {
      console.error('❌ [Admin Onboarding Service] Error checking onboarding status:', error)
      return true // Default to needing onboarding if there's an error
    }
  }

  /**
   * Get onboarding statistics
   */
  static async getOnboardingStats(): Promise<{
    total_users: number
    completed_onboarding: number
    in_progress: number
    pending: number
    completion_rate: number
  }> {
    try {
      const { data, error } = await supabase
        .from('admin_onboarding')
        .select('onboarding_status')

      if (error) throw error

      const total_users = data?.length || 0
      const completed_onboarding = data?.filter(o => o.onboarding_status === 'completed').length || 0
      const in_progress = data?.filter(o => o.onboarding_status === 'in_progress').length || 0
      const pending = data?.filter(o => o.onboarding_status === 'pending').length || 0
      const completion_rate = total_users > 0 ? Math.round((completed_onboarding / total_users) * 100) : 0

      return {
        total_users,
        completed_onboarding,
        in_progress,
        pending,
        completion_rate
      }
    } catch (error) {
      console.error('❌ [Admin Onboarding Service] Error getting stats:', error)
      throw error
    }
  }
} 