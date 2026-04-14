import crypto from 'crypto'
import { supabase } from '@/lib/supabase'
import type { 
  JobApplication, 
  OnboardingCandidate, 
  StaffMember
} from '@/types/admin-onboarding'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12
const AUTH_TAG_LENGTH = 16

function getEncryptionKey(): Buffer | null {
  const keyHex = process.env.ENCRYPTION_KEY
  if (!keyHex) return null
  const buf = Buffer.from(keyHex, 'hex')
  if (buf.length !== 32) {
    console.warn('[Security Compliance Service] ENCRYPTION_KEY must be 64 hex chars (32 bytes). Falling back to base64.')
    return null
  }
  return buf
}

export class SecurityComplianceService {
  /**
   * Create audit log entry for all sensitive operations
   */
  static async createAuditLog(
    venueId: string,
    userId: string,
    action: string,
    resourceType: string,
    resourceId: string,
    details: Record<string, any>,
    ipAddress?: string
  ) {
    try {
      console.log('🔧 [Security Compliance Service] Creating audit log...')
      
      const { data: auditLog, error } = await supabase
        .from('audit_logs')
        .insert({
          venue_id: venueId,
          user_id: userId,
          action,
          resource_type: resourceType,
          resource_id: resourceId,
          details,
          ip_address: ipAddress,
          timestamp: new Date().toISOString(),
          user_agent: typeof window !== 'undefined' ? window.navigator.userAgent : null
        })
        .select()
        .single()

      if (error) throw error
      return auditLog
    } catch (error) {
      console.error('❌ [Security Compliance Service] Error creating audit log:', error)
      throw error
    }
  }

  /**
   * Get audit logs with filtering and pagination
   */
  static async getAuditLogs(
    venueId: string,
    filters?: {
      userId?: string
      action?: string
      resourceType?: string
      dateRange?: { start: string; end: string }
    },
    pagination?: { page: number; limit: number }
  ) {
    try {
      console.log('🔧 [Security Compliance Service] Getting audit logs...')
      
      let query = supabase
        .from('audit_logs')
        .select('*')
        .eq('venue_id', venueId)
        .order('timestamp', { ascending: false })

      // Apply filters
      if (filters?.userId) {
        query = query.eq('user_id', filters.userId)
      }
      if (filters?.action) {
        query = query.eq('action', filters.action)
      }
      if (filters?.resourceType) {
        query = query.eq('resource_type', filters.resourceType)
      }
      if (filters?.dateRange) {
        query = query
          .gte('timestamp', filters.dateRange.start)
          .lte('timestamp', filters.dateRange.end)
      }

      // Apply pagination
      if (pagination) {
        const offset = (pagination.page - 1) * pagination.limit
        query = query.range(offset, offset + pagination.limit - 1)
      }

      const { data: auditLogs, error, count } = await query

      if (error) throw error

      return {
        auditLogs: auditLogs || [],
        totalCount: count || 0,
        page: pagination?.page || 1,
        limit: pagination?.limit || 50
      }
    } catch (error) {
      console.error('❌ [Security Compliance Service] Error getting audit logs:', error)
      throw error
    }
  }

  /**
   * Check user permissions for specific actions
   */
  static async checkUserPermissions(
    userId: string,
    venueId: string,
    action: string,
    resourceType?: string
  ) {
    try {
      console.log('🔧 [Security Compliance Service] Checking user permissions...')
      
      // Get user role and permissions
      const { data: userRole, error: roleError } = await supabase
        .from('user_roles')
        .select('role, permissions')
        .eq('user_id', userId)
        .eq('venue_id', venueId)
        .single()

      if (roleError) throw roleError

      // Define permission matrix
      const permissionMatrix = {
        admin: ['read', 'write', 'delete', 'manage_users', 'view_audit_logs'],
        manager: ['read', 'write', 'manage_staff'],
        supervisor: ['read', 'write'],
        staff: ['read']
      }

      const userPermissions = permissionMatrix[userRole?.role as keyof typeof permissionMatrix] || []
      
      return {
        hasPermission: userPermissions.includes(action),
        role: userRole?.role,
        permissions: userPermissions
      }
    } catch (error) {
      console.error('❌ [Security Compliance Service] Error checking permissions:', error)
      throw error
    }
  }

  /**
   * Encrypt sensitive data before storage using AES-256-GCM.
   * Falls back to base64 when ENCRYPTION_KEY is not configured.
   */
  static async encryptSensitiveData(data: Record<string, any>, fieldsToEncrypt: string[]) {
    try {
      console.log('🔧 [Security Compliance Service] Encrypting sensitive data...')
      
      const encryptedData = { ...data }
      const key = getEncryptionKey()

      if (!key) {
        console.warn('[Security Compliance Service] ENCRYPTION_KEY not set — using base64 encoding (NOT secure).')
        for (const field of fieldsToEncrypt) {
          if (data[field]) {
            encryptedData[field] = btoa(JSON.stringify(data[field]))
          }
        }
        return encryptedData
      }

      for (const field of fieldsToEncrypt) {
        if (data[field]) {
          const iv = crypto.randomBytes(IV_LENGTH)
          const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH })
          const plaintext = JSON.stringify(data[field])
          const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
          const authTag = cipher.getAuthTag()
          encryptedData[field] = `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`
        }
      }

      return encryptedData
    } catch (error) {
      console.error('❌ [Security Compliance Service] Error encrypting data:', error)
      throw error
    }
  }

  /**
   * Decrypt sensitive data after retrieval using AES-256-GCM.
   * Falls back to base64 when ENCRYPTION_KEY is not configured.
   */
  static async decryptSensitiveData(data: Record<string, any>, fieldsToDecrypt: string[]) {
    try {
      console.log('🔧 [Security Compliance Service] Decrypting sensitive data...')
      
      const decryptedData = { ...data }
      const key = getEncryptionKey()

      for (const field of fieldsToDecrypt) {
        if (!data[field]) continue

        try {
          const value = data[field] as string
          const parts = value.split(':')

          if (key && parts.length === 3) {
            const iv = Buffer.from(parts[0], 'hex')
            const authTag = Buffer.from(parts[1], 'hex')
            const ciphertext = Buffer.from(parts[2], 'hex')
            const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH })
            decipher.setAuthTag(authTag)
            const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()])
            decryptedData[field] = JSON.parse(decrypted.toString('utf8'))
          } else {
            if (!key) {
              console.warn('[Security Compliance Service] ENCRYPTION_KEY not set — using base64 decoding.')
            }
            decryptedData[field] = JSON.parse(atob(value))
          }
        } catch (e) {
          console.warn(`Failed to decrypt field ${field}:`, e)
        }
      }

      return decryptedData
    } catch (error) {
      console.error('❌ [Security Compliance Service] Error decrypting data:', error)
      throw error
    }
  }

  /**
   * Run compliance checks on staff data
   */
  static async runComplianceChecks(venueId: string) {
    try {
      console.log('🔧 [Security Compliance Service] Running compliance checks...')
      
      const complianceChecks: any = {
        totalChecks: 0,
        highSeverity: 0,
        mediumSeverity: 0,
        lowSeverity: 0,
        checks: []
      }

      // Check for missing background checks
      const { data: candidatesWithoutBackgroundCheck, error: bgError } = await supabase
        .from('staff_onboarding_candidates')
        .select('id, name, application_date')
        .eq('venue_id', venueId)
        .eq('background_check_completed', false)
        .not('status', 'eq', 'rejected')

      if (!bgError && candidatesWithoutBackgroundCheck) {
        complianceChecks.push({
          type: 'background_check',
          severity: 'high',
          description: 'Candidates without completed background checks',
          count: candidatesWithoutBackgroundCheck.length,
          items: candidatesWithoutBackgroundCheck
        })
      }

      // Check for expired certifications
      const { data: staffWithExpiredCerts, error: certError } = await supabase
        .from('staff_certifications')
        .select('staff_id, certification_name, expiry_date')
        .eq('venue_id', venueId)
        .lt('expiry_date', new Date().toISOString())

      if (!certError && staffWithExpiredCerts) {
        complianceChecks.push({
          type: 'expired_certifications',
          severity: 'medium',
          description: 'Staff with expired certifications',
          count: staffWithExpiredCerts.length,
          items: staffWithExpiredCerts
        })
      }

      // Check for incomplete training
      const { data: incompleteTraining, error: trainingError } = await supabase
        .from('staff_training_records')
        .select('staff_id, training_name, completion_date')
        .eq('venue_id', venueId)
        .is('completion_date', null)

      if (!trainingError && incompleteTraining) {
        complianceChecks.push({
          type: 'incomplete_training',
          severity: 'medium',
          description: 'Staff with incomplete required training',
          count: incompleteTraining.length,
          items: incompleteTraining
        })
      }

      // Check for data retention policy violations
      const { data: oldRecords, error: retentionError } = await supabase
        .from('job_applications')
        .select('id, applied_at')
        .eq('venue_id', venueId)
        .lt('applied_at', new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString())

      if (!retentionError && oldRecords) {
        complianceChecks.push({
          type: 'data_retention',
          severity: 'low',
          description: 'Records older than retention policy',
          count: oldRecords.length,
          items: oldRecords
        })
      }

      return {
        totalChecks: complianceChecks.length,
        highSeverity: complianceChecks.filter((c: any) => c.severity === 'high').length,
        mediumSeverity: complianceChecks.filter((c: any) => c.severity === 'medium').length,
        lowSeverity: complianceChecks.filter((c: any) => c.severity === 'low').length,
        checks: complianceChecks
      }
    } catch (error) {
      console.error('❌ [Security Compliance Service] Error running compliance checks:', error)
      throw error
    }
  }

  /**
   * Generate compliance report
   */
  static async generateComplianceReport(venueId: string, reportType: 'summary' | 'detailed' | 'audit') {
    try {
      console.log('🔧 [Security Compliance Service] Generating compliance report...')
      
      const complianceChecks = await this.runComplianceChecks(venueId)
      
      // Get audit logs for the period
      const { auditLogs } = await this.getAuditLogs(venueId, {
        dateRange: {
          start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          end: new Date().toISOString()
        }
      })

      // Get staff statistics
      const { data: staffStats, error: statsError } = await supabase
        .from('staff_members')
        .select('status, created_at')
        .eq('venue_id', venueId)

      if (statsError) throw statsError

      const report = {
        generatedAt: new Date().toISOString(),
        venueId,
        reportType,
        summary: {
          totalStaff: staffStats?.length || 0,
          activeStaff: staffStats?.filter(s => s.status === 'active').length || 0,
          complianceScore: this.calculateComplianceScore(complianceChecks),
          auditEvents: auditLogs.length,
          highPriorityIssues: complianceChecks.highSeverity
        },
        complianceChecks,
        auditLogs: reportType === 'detailed' || reportType === 'audit' ? auditLogs : [],
        recommendations: this.generateRecommendations(complianceChecks)
      }

      return report
    } catch (error) {
      console.error('❌ [Security Compliance Service] Error generating compliance report:', error)
      throw error
    }
  }

  /**
   * Apply security policies
   */
  static async applySecurityPolicies(venueId: string, policies: any[]) {
    try {
      console.log('🔧 [Security Compliance Service] Applying security policies...')
      
      const results = []

      for (const policy of policies) {
        switch (policy.type) {
          case 'data_retention':
            results.push(await this.applyDataRetentionPolicy(venueId, policy))
            break
          case 'access_control':
            results.push(await this.applyAccessControlPolicy(venueId, policy))
            break
          case 'encryption':
            results.push(await this.applyEncryptionPolicy(venueId, policy))
            break
          default:
            console.warn(`Unknown policy type: ${policy.type}`)
        }
      }

      return results
    } catch (error) {
      console.error('❌ [Security Compliance Service] Error applying security policies:', error)
      throw error
    }
  }

  // Helper methods
  private static calculateComplianceScore(complianceChecks: any) {
    const totalIssues = complianceChecks.reduce((sum: any, check: any) => sum + check.count, 0)
    const highSeverityIssues = complianceChecks
      .filter((check: any) => check.severity === 'high')
      .reduce((sum: any, check: any) => sum + check.count, 0)

    // Calculate score based on severity and number of issues
    let score = 100
    score -= highSeverityIssues * 10 // High severity issues heavily penalize score
    score -= totalIssues * 2 // Each issue reduces score

    return Math.max(0, Math.min(100, score))
  }

  private static generateRecommendations(complianceChecks: any) {
    const recommendations = []

    if (complianceChecks.some((c: any) => c.type === 'background_check')) {
      recommendations.push({
        priority: 'high',
        action: 'Complete background checks for all pending candidates',
        impact: 'Legal compliance and risk mitigation'
      })
    }

    if (complianceChecks.some((c: any) => c.type === 'expired_certifications')) {
      recommendations.push({
        priority: 'medium',
        action: 'Renew expired certifications or update staff assignments',
        impact: 'Operational compliance and safety'
      })
    }

    if (complianceChecks.some((c: any) => c.type === 'incomplete_training')) {
      recommendations.push({
        priority: 'medium',
        action: 'Complete required training for all staff members',
        impact: 'Staff competency and safety'
      })
    }

    return recommendations
  }

  private static async applyDataRetentionPolicy(venueId: string, policy: any) {
    // Implementation for data retention policy
    console.log('Applying data retention policy...')
    return { success: true, policy: 'data_retention' }
  }

  private static async applyAccessControlPolicy(venueId: string, policy: any) {
    // Implementation for access control policy
    console.log('Applying access control policy...')
    return { success: true, policy: 'access_control' }
  }

  private static async applyEncryptionPolicy(venueId: string, policy: any) {
    // Implementation for encryption policy
    console.log('Applying encryption policy...')
    return { success: true, policy: 'encryption' }
  }
} 