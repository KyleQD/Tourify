import { supabase } from '@/lib/supabase'
import { authenticator } from 'otplib'
import QRCode from 'qrcode'
import bcrypt from 'bcryptjs'
import { SMSDeliveryService } from './sms-delivery.service'
import {
  InMemoryMfaVerificationCodeStore,
  MfaVerificationCodeStore,
} from './mfa-verification-code-store'
import { SupabaseMfaVerificationCodeStore } from './mfa-verification-code-store.server'

const BACKUP_CODE_HASH_ROUNDS = 12

export interface MFAMethod {
  id: string
  type: 'sms' | 'totp' | 'backup_codes'
  name: string
  isEnabled: boolean
  isPrimary: boolean
  createdAt: string
  lastUsed?: string
  metadata?: Record<string, any>
}

export interface MFASetupResult {
  secret?: string
  qrCode?: string
  backupCodes?: string[]
  verificationRequired: boolean
}

export interface MFAVerificationResult {
  success: boolean
  methodUsed?: string
  attemptsRemaining?: number
  lockedUntil?: string
  error?: string
}

export interface SMSProvider {
  sendSMS: (phoneNumber: string, message: string) => Promise<boolean>
}

class TwilioSMSProvider implements SMSProvider {
  async sendSMS(phoneNumber: string, message: string): Promise<boolean> {
    const result = await SMSDeliveryService.sendSMS({ to: phoneNumber, body: message })
    return result.success
  }
}

class MockSMSProvider implements SMSProvider {
  async sendSMS(phoneNumber: string, message: string): Promise<boolean> {
    // Never log verification codes. This provider is only a local fallback;
    // production must configure Twilio and a durable code store.
    console.info(`[MockSMS] SMS delivery is not configured for ${phoneNumber}`)
    return true
  }
}

function createSMSProvider(): SMSProvider {
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    console.log('[MFA] Using Twilio SMS provider')
    return new TwilioSMSProvider()
  }
  console.log('[MFA] Twilio not configured, using mock SMS provider')
  return new MockSMSProvider()
}

export class MFAService {
  private static instance: MFAService
  private smsProvider: SMSProvider
  private verificationCodeStore: MfaVerificationCodeStore

  private constructor(options: MFAServiceOptions = {}) {
    this.smsProvider = options.smsProvider ?? createSMSProvider()
    this.verificationCodeStore = options.verificationCodeStore ?? new SupabaseMfaVerificationCodeStore()
  }

  public static getInstance(): MFAService {
    if (!MFAService.instance) {
      MFAService.instance = new MFAService()
    }
    return MFAService.instance
  }

  /**
   * Factory for deterministic tests. Production composition uses the
   * server-only durable repository by default; the in-memory store is
   * intentionally selected only by this explicit testing factory.
   */
  public static createForTesting(options: {
    smsProvider?: SMSProvider
    verificationCodeStore?: MfaVerificationCodeStore
  } = {}): MFAService {
    return new MFAService({
      ...options,
      verificationCodeStore: options.verificationCodeStore ?? new InMemoryMfaVerificationCodeStore(),
    })
  }

  // Get user's MFA methods
  public async getUserMFAMethods(userId: string): Promise<MFAMethod[]> {
    try {
      const { data, error } = await supabase
        .from('user_mfa_methods')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching MFA methods:', error)
        throw error
      }

      return data?.map(method => ({
        id: method.id,
        type: method.method_type,
        name: method.method_name,
        isEnabled: method.is_enabled,
        isPrimary: method.is_primary,
        createdAt: method.created_at,
        lastUsed: method.last_used,
        metadata: method.metadata
      })) || []
    } catch (error) {
      console.error('Error in getUserMFAMethods:', error)
      return []
    }
  }

  // Check if user has MFA enabled
  public async isMFAEnabled(userId: string): Promise<boolean> {
    const methods = await this.getUserMFAMethods(userId)
    return methods.some(method => method.isEnabled)
  }

  // Setup TOTP (Time-based One-Time Password) authentication
  public async setupTOTP(userId: string, appName: string = 'Tourify'): Promise<MFASetupResult> {
    try {
      // Generate a secret key
      const secret = authenticator.generateSecret()
      
      // Get user email for the TOTP label
      const { data: userData } = await supabase.auth.getUser()
      const userEmail = userData.user?.email || 'user@example.com'
      
      // Generate QR code
      const otpauthUrl = authenticator.keyuri(userEmail, appName, secret)
      const qrCode = await QRCode.toDataURL(otpauthUrl)

      // Store the secret temporarily (user needs to verify before it's permanent)
      const { error } = await supabase
        .from('user_mfa_setup_temp')
        .upsert({
          user_id: userId,
          method_type: 'totp',
          secret_key: secret,
          expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 minutes
        })

      if (error) {
        console.error('Error storing temporary TOTP setup:', error)
        throw error
      }

      return {
        secret,
        qrCode,
        verificationRequired: true
      }
    } catch (error) {
      console.error('Error setting up TOTP:', error)
      throw error
    }
  }

  // Verify TOTP setup and enable it
  public async verifyTOTPSetup(userId: string, token: string): Promise<boolean> {
    try {
      // Get the temporary secret
      const { data: tempSetup, error } = await supabase
        .from('user_mfa_setup_temp')
        .select('secret_key')
        .eq('user_id', userId)
        .eq('method_type', 'totp')
        .gte('expires_at', new Date().toISOString())
        .single()

      if (error || !tempSetup) {
        console.error('TOTP setup not found or expired:', error)
        return false
      }

      // Verify the token
      const isValid = authenticator.verify({
        token,
        secret: tempSetup.secret_key
      })

      if (isValid) {
        // Create the permanent MFA method
        const { error: insertError } = await supabase
          .from('user_mfa_methods')
          .insert({
            user_id: userId,
            method_type: 'totp',
            method_name: 'Authenticator App',
            secret_key: tempSetup.secret_key,
            is_enabled: true,
            is_primary: false, // User can set as primary later
            is_active: true
          })

        if (insertError) {
          console.error('Error creating TOTP method:', insertError)
          throw insertError
        }

        // Clean up temporary setup
        await supabase
          .from('user_mfa_setup_temp')
          .delete()
          .eq('user_id', userId)
          .eq('method_type', 'totp')

        return true
      }

      return false
    } catch (error) {
      console.error('Error verifying TOTP setup:', error)
      return false
    }
  }

  // Setup SMS authentication
  public async setupSMS(userId: string, phoneNumber: string): Promise<MFASetupResult> {
    try {
      // Generate verification code
      const verificationCode = this.generateSMSCode()
      
      // Store verification code temporarily
      const challengeId = `sms_setup_${userId}`
      const issued = await this.verificationCodeStore.issue({
        challengeId,
        userId,
        kind: 'sms_setup',
        code: verificationCode,
      })
      if (!issued.accepted) {
        throw new Error(`SMS verification is rate limited; retry after ${new Date(issued.retryAt ?? Date.now()).toISOString()}`)
      }

      // Send SMS
      const message = `Your Tourify verification code is: ${verificationCode}. This code expires in 5 minutes.`
      const sent = await this.smsProvider.sendSMS(phoneNumber, message)

      if (!sent) {
        await this.verificationCodeStore.revoke(challengeId, userId)
        throw new Error('Failed to send SMS')
      }

      // Store temporary setup info
      const { error } = await supabase
        .from('user_mfa_setup_temp')
        .upsert({
          user_id: userId,
          method_type: 'sms',
          phone_number: phoneNumber,
          expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString()
        })

      if (error) {
        console.error('Error storing temporary SMS setup:', error)
        throw error
      }

      return {
        verificationRequired: true
      }
    } catch (error) {
      console.error('Error setting up SMS:', error)
      throw error
    }
  }

  // Verify SMS setup and enable it
  public async verifySMSSetup(userId: string, code: string): Promise<boolean> {
    try {
      const result = await this.verificationCodeStore.consume({
        challengeId: `sms_setup_${userId}`,
        userId,
        code,
      })
      if (result.status !== 'valid') {
        return false
      }

      // Get the temporary setup info
      const { data: tempSetup, error } = await supabase
        .from('user_mfa_setup_temp')
        .select('phone_number')
        .eq('user_id', userId)
        .eq('method_type', 'sms')
        .single()

      if (error || !tempSetup) {
        console.error('SMS setup not found:', error)
        return false
      }

      // Create the permanent MFA method
      const { error: insertError } = await supabase
        .from('user_mfa_methods')
        .insert({
          user_id: userId,
          method_type: 'sms',
          method_name: `SMS (${tempSetup.phone_number})`,
          phone_number: tempSetup.phone_number,
          is_enabled: true,
          is_primary: false,
          is_active: true
        })

      if (insertError) {
        console.error('Error creating SMS method:', insertError)
        throw insertError
      }

      // Clean up
      await this.verificationCodeStore.revoke(`sms_setup_${userId}`, userId)
      await supabase
        .from('user_mfa_setup_temp')
        .delete()
        .eq('user_id', userId)
        .eq('method_type', 'sms')

      return true
    } catch (error) {
      console.error('Error verifying SMS setup:', error)
      return false
    }
  }

  // Generate backup codes
  public async generateBackupCodes(userId: string): Promise<string[]> {
    try {
      const codes = Array.from({ length: 10 }, () => this.generateBackupCode())
      
      // Hash and store the codes
      const hashedCodes = await Promise.all(codes.map(async code => ({
        user_id: userId,
        code_hash: await this.hashCode(code),
        is_used: false
      })))

      const { error } = await supabase
        .from('user_mfa_backup_codes')
        .insert(hashedCodes)

      if (error) {
        console.error('Error storing backup codes:', error)
        throw error
      }

      // Also create an MFA method entry for backup codes
      await supabase
        .from('user_mfa_methods')
        .upsert({
          user_id: userId,
          method_type: 'backup_codes',
          method_name: 'Backup Codes',
          is_enabled: true,
          is_primary: false,
          is_active: true
        })

      return codes
    } catch (error) {
      console.error('Error generating backup codes:', error)
      throw error
    }
  }

  // Start MFA verification process
  public async startMFAVerification(userId: string, preferredMethod?: string): Promise<{ methods: MFAMethod[]; challengeId: string }> {
    try {
      const methods = await this.getUserMFAMethods(userId)
      const enabledMethods = methods.filter(m => m.isEnabled)

      if (enabledMethods.length === 0) {
        throw new Error('No MFA methods enabled')
      }

      // Generate challenge ID
      const challengeId = this.generateChallengeId()

      // If SMS is requested or is the primary method, send SMS
      const smsMethod = enabledMethods.find(m => m.type === 'sms')
      if (smsMethod && (preferredMethod === 'sms' || smsMethod.isPrimary)) {
        await this.sendSMSChallenge(userId, challengeId, smsMethod.metadata?.phone_number)
      }

      return {
        methods: enabledMethods,
        challengeId
      }
    } catch (error) {
      console.error('Error starting MFA verification:', error)
      throw error
    }
  }

  // Verify MFA token
  public async verifyMFAToken(
    userId: string,
    challengeId: string,
    token: string,
    methodType: 'sms' | 'totp' | 'backup_codes'
  ): Promise<MFAVerificationResult> {
    try {
      let isValid = false

      switch (methodType) {
        case 'sms':
          isValid = await this.verifySMSToken(userId, challengeId, token)
          break
        case 'totp':
          isValid = await this.verifyTOTPToken(userId, token)
          break
        case 'backup_codes':
          isValid = await this.verifyBackupCode(userId, token)
          break
      }

      if (isValid) {
        // Update last used timestamp
        await supabase
          .from('user_mfa_methods')
          .update({ last_used: new Date().toISOString() })
          .eq('user_id', userId)
          .eq('method_type', methodType)

        return {
          success: true,
          methodUsed: methodType
        }
      }

      return {
        success: false,
        error: 'Invalid verification code'
      }
    } catch (error) {
      console.error('Error verifying MFA token:', error)
      return {
        success: false,
        error: 'Verification failed'
      }
    }
  }

  // Disable MFA method
  public async disableMFAMethod(userId: string, methodId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('user_mfa_methods')
        .update({ is_enabled: false, is_active: false })
        .eq('id', methodId)
        .eq('user_id', userId)

      if (error) {
        console.error('Error disabling MFA method:', error)
        throw error
      }

      return true
    } catch (error) {
      console.error('Error in disableMFAMethod:', error)
      return false
    }
  }

  // Set primary MFA method
  public async setPrimaryMFAMethod(userId: string, methodId: string): Promise<boolean> {
    try {
      // First, unset all as primary
      await supabase
        .from('user_mfa_methods')
        .update({ is_primary: false })
        .eq('user_id', userId)

      // Then set the specified method as primary
      const { error } = await supabase
        .from('user_mfa_methods')
        .update({ is_primary: true })
        .eq('id', methodId)
        .eq('user_id', userId)

      if (error) {
        console.error('Error setting primary MFA method:', error)
        throw error
      }

      return true
    } catch (error) {
      console.error('Error in setPrimaryMFAMethod:', error)
      return false
    }
  }

  // Private helper methods
  private async sendSMSChallenge(userId: string, challengeId: string, phoneNumber: string): Promise<void> {
    const code = this.generateSMSCode()
    const storeChallengeId = `mfa_${challengeId}`
    const issued = await this.verificationCodeStore.issue({
      challengeId: storeChallengeId,
      userId,
      kind: 'sms_login',
      code,
    })
    if (!issued.accepted) {
      throw new Error(`SMS verification is rate limited; retry after ${new Date(issued.retryAt ?? Date.now()).toISOString()}`)
    }

    const message = `Your Tourify login code is: ${code}. This code expires in 5 minutes.`
    const sent = await this.smsProvider.sendSMS(phoneNumber, message)
    if (!sent) {
      await this.verificationCodeStore.revoke(storeChallengeId, userId)
      throw new Error('Failed to send SMS')
    }
  }

  private async verifySMSToken(userId: string, challengeId: string, token: string): Promise<boolean> {
    const result = await this.verificationCodeStore.consume({
      challengeId: `mfa_${challengeId}`,
      userId,
      code: token,
    })
    return result.status === 'valid'
  }

  private async verifyTOTPToken(userId: string, token: string): Promise<boolean> {
    try {
      const { data: method, error } = await supabase
        .from('user_mfa_methods')
        .select('secret_key')
        .eq('user_id', userId)
        .eq('method_type', 'totp')
        .eq('is_enabled', true)
        .single()

      if (error || !method) return false

      return authenticator.verify({
        token,
        secret: method.secret_key
      })
    } catch (error) {
      console.error('Error verifying TOTP token:', error)
      return false
    }
  }

  private async verifyBackupCode(userId: string, code: string): Promise<boolean> {
    try {
      const { data: backupCodes, error } = await supabase
        .from('user_mfa_backup_codes')
        .select('id, code_hash')
        .eq('user_id', userId)
        .eq('is_used', false)

      if (error || !backupCodes?.length) return false

      const matchingCode = await (async () => {
        for (const backupCode of backupCodes) {
          if (await bcrypt.compare(code, backupCode.code_hash)) return backupCode
        }
        return null
      })()

      if (!matchingCode) return false

      // Mark the code as used only if another concurrent verification has not
      // already redeemed it.
      const { data: redeemedCode, error: redeemError } = await supabase
        .from('user_mfa_backup_codes')
        .update({ is_used: true, used_at: new Date().toISOString() })
        .eq('id', matchingCode.id)
        .eq('is_used', false)
        .select('id')
        .maybeSingle()

      return !redeemError && Boolean(redeemedCode)
    } catch (error) {
      console.error('Error verifying backup code:', error)
      return false
    }
  }

  private generateSMSCode(): string {
    return this.generateRandomDigits(6)
  }

  private generateBackupCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let result = ''
    const random = new Uint32Array(8)
    globalThis.crypto.getRandomValues(random)
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(random[i] % chars.length)
    }
    return result
  }

  private generateChallengeId(): string {
    return globalThis.crypto.randomUUID()
  }

  private hashCode(code: string): Promise<string> {
    return bcrypt.hash(code, BACKUP_CODE_HASH_ROUNDS)
  }

  private generateRandomDigits(length: number): string {
    const random = new Uint32Array(length)
    globalThis.crypto.getRandomValues(random)
    return Array.from(random, (value) => String(value % 10)).join('').padStart(length, '0')
  }
}

export interface MFAServiceOptions {
  smsProvider?: SMSProvider
  verificationCodeStore?: MfaVerificationCodeStore
}

// Export singleton instance
export const mfaService = MFAService.getInstance()
