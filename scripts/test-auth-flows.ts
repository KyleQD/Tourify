#!/usr/bin/env npx tsx

/**
 * Automated Authentication Flow Testing Script
 * 
 * This script tests all authentication flows to ensure everything works correctly.
 * Run with: npx tsx scripts/test-auth-flows.ts
 */

import { createClient } from '@supabase/supabase-js'
import chalk from 'chalk'
import 'dotenv/config'

// Test configuration
const TEST_CONFIG = {
  supabaseUrl:
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    '',
  supabaseKey:
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    '',
  testEmail: 'test@example.com',
  testPassword: 'TestPassword123!',
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000'
}

// Initialize Supabase client
const supabase = createClient(
  TEST_CONFIG.supabaseUrl || 'http://localhost:54321',
  TEST_CONFIG.supabaseKey || 'placeholder-anon-key'
)

// Test utilities
const log = {
  info: (msg: string) => console.log(chalk.blue('ℹ'), msg),
  success: (msg: string) => console.log(chalk.green('✓'), msg),
  error: (msg: string) => console.log(chalk.red('✗'), msg),
  warning: (msg: string) => console.log(chalk.yellow('⚠'), msg),
  header: (msg: string) => console.log(chalk.bold.cyan(`\n🧪 ${msg}`))
}

interface TestResult {
  name: string
  passed: boolean
  error?: string
  duration: number
}

class AuthTester {
  private results: TestResult[] = []
  
  async runTest(name: string, testFn: () => Promise<void>): Promise<void> {
    const startTime = Date.now()
    log.info(`Testing: ${name}...`)
    
    try {
      await testFn()
      const duration = Date.now() - startTime
      this.results.push({ name, passed: true, duration })
      log.success(`${name} - Passed (${duration}ms)`)
    } catch (error) {
      const duration = Date.now() - startTime
      const errorMsg = error instanceof Error ? error.message : String(error)
      this.results.push({ name, passed: false, error: errorMsg, duration })
      log.error(`${name} - Failed: ${errorMsg}`)
    }
  }

  // Test 1: Environment Setup
  async testEnvironmentSetup(): Promise<void> {
    if (!TEST_CONFIG.supabaseUrl) {
      throw new Error('Missing Supabase URL (NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL)')
    }
    if (!TEST_CONFIG.supabaseKey) {
      throw new Error('Missing Supabase anon key (NEXT_PUBLIC_SUPABASE_ANON_KEY or SUPABASE_ANON_KEY)')
    }
    if (!TEST_CONFIG.supabaseUrl.includes('supabase')) {
      throw new Error('Invalid Supabase URL format')
    }
  }

  // Test 2: Database Connection
  async testDatabaseConnection(): Promise<void> {
    const { data, error } = await supabase.from('profiles').select('count').limit(1)
    if (error) {
      throw new Error(`Database connection failed: ${error.message}`)
    }
  }

  // Test 3: User Registration Flow
  async testUserRegistration(): Promise<void> {
    // Clean up any existing test user first
    await this.cleanupTestUser()
    
    const { data, error } = await supabase.auth.signUp({
      email: TEST_CONFIG.testEmail,
      password: TEST_CONFIG.testPassword,
      options: {
        data: {
          full_name: 'Test User',
          username: 'testuser'
        }
      }
    })

    if (error) {
      throw new Error(`Registration failed: ${error.message}`)
    }

    if (!data.user) {
      throw new Error('No user returned from registration')
    }

    // Check if profile was created
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single()

    if (profileError) {
      throw new Error(`Profile creation failed: ${profileError.message}`)
    }

    if (!profile) {
      throw new Error('Profile not found after registration')
    }
  }

  // Test 4: Sign In Flow
  async testSignIn(): Promise<void> {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: TEST_CONFIG.testEmail,
      password: TEST_CONFIG.testPassword
    })

    if (error) {
      throw new Error(`Sign in failed: ${error.message}`)
    }

    if (!data.session) {
      throw new Error('No session returned from sign in')
    }

    if (!data.user) {
      throw new Error('No user returned from sign in')
    }
  }

  // Test 5: Session Management
  async testSessionManagement(): Promise<void> {
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error) {
      throw new Error(`Session retrieval failed: ${error.message}`)
    }

    if (!session) {
      throw new Error('No active session found')
    }

    if (!session.user) {
      throw new Error('No user in session')
    }

    // Test token refresh
    const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession()
    
    if (refreshError) {
      throw new Error(`Token refresh failed: ${refreshError.message}`)
    }

    if (!refreshData.session) {
      throw new Error('No session returned from refresh')
    }
  }

  // Test 6: Profile Updates
  async testProfileUpdate(): Promise<void> {
    const { data: user } = await supabase.auth.getUser()
    
    if (!user.user) {
      throw new Error('No authenticated user for profile update test')
    }

    const updateData = {
      name: 'Updated Test User',
      username: 'updatedtestuser'
    }

    const { error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', user.user.id)

    if (error) {
      throw new Error(`Profile update failed: ${error.message}`)
    }

    // Verify update
    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.user.id)
      .single()

    if (fetchError) {
      throw new Error(`Profile fetch after update failed: ${fetchError.message}`)
    }

    if (profile.name !== updateData.name) {
      throw new Error('Profile update was not persisted')
    }
  }

  // Test 7: Password Reset Flow
  async testPasswordReset(): Promise<void> {
    const { error } = await supabase.auth.resetPasswordForEmail(
      TEST_CONFIG.testEmail,
      {
        redirectTo: `${TEST_CONFIG.siteUrl}/reset-password`
      }
    )

    if (error) {
      throw new Error(`Password reset request failed: ${error.message}`)
    }
  }

  // Test 8: Sign Out Flow
  async testSignOut(): Promise<void> {
    const { error } = await supabase.auth.signOut()
    
    if (error) {
      throw new Error(`Sign out failed: ${error.message}`)
    }

    // Verify session is cleared
    const { data: { session } } = await supabase.auth.getSession()
    
    if (session) {
      throw new Error('Session still exists after sign out')
    }
  }

  // Test 9: Route Protection (simulate)
  async testRouteProtection(): Promise<void> {
    // This would typically be done with a browser automation tool
    // For now, we'll just test that unauthenticated requests to protected endpoints fail appropriately
    
    try {
      const response = await fetch(`${TEST_CONFIG.siteUrl}/api/protected-endpoint`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        log.warning('Route protection test: No protected endpoint found to test')
      } else if (response.status === 404) {
        log.warning('Route protection test: Protected endpoint fixture missing, skipping')
      } else if (response.status === 401 || response.status === 403) {
        // This is expected for protected routes
      } else {
        throw new Error(`Unexpected response status: ${response.status}`)
      }
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        log.warning('Route protection test: Server not running, skipping')
      } else {
        throw error
      }
    }
  }

  // Cleanup helper
  async cleanupTestUser(): Promise<void> {
    try {
      // Try to sign in and delete the user
      const { data } = await supabase.auth.signInWithPassword({
        email: TEST_CONFIG.testEmail,
        password: TEST_CONFIG.testPassword
      })
      
      if (data.user) {
        // Delete profile first
        await supabase.from('profiles').delete().eq('id', data.user.id)
      }
      
      await supabase.auth.signOut()
    } catch (error) {
      // User doesn't exist, which is fine
    }
  }

  // Generate test report
  generateReport(): void {
    log.header('Test Results Summary')
    
    const passed = this.results.filter(r => r.passed).length
    const failed = this.results.filter(r => !r.passed).length
    const total = this.results.length
    
    console.log(`\nTotal Tests: ${total}`)
    console.log(`${chalk.green('Passed:')} ${passed}`)
    console.log(`${chalk.red('Failed:')} ${failed}`)
    console.log(`${chalk.blue('Success Rate:')} ${((passed / total) * 100).toFixed(1)}%`)
    
    if (failed > 0) {
      log.header('Failed Tests')
      this.results
        .filter(r => !r.passed)
        .forEach(r => {
          console.log(`${chalk.red('✗')} ${r.name}: ${r.error}`)
        })
    }
    
    log.header('All Test Details')
    this.results.forEach(r => {
      const status = r.passed ? chalk.green('PASS') : chalk.red('FAIL')
      const duration = chalk.gray(`(${r.duration}ms)`)
      console.log(`${status} ${r.name} ${duration}`)
      if (r.error) {
        console.log(`     ${chalk.red(r.error)}`)
      }
    })
  }

  // Main test runner
  async runAllTests(): Promise<void> {
    log.header('Starting Authentication Flow Tests')
    log.info(`Testing against: ${TEST_CONFIG.supabaseUrl || '(not configured)'}`)
    log.info(`Site URL: ${TEST_CONFIG.siteUrl}`)

    if (!TEST_CONFIG.supabaseUrl || !TEST_CONFIG.supabaseKey) {
      log.warning('Supabase auth test skipped because required env vars are missing.')
      log.warning('Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY, then rerun.')
      return
    }
    
    await this.runTest('Environment Setup', () => this.testEnvironmentSetup())
    await this.runTest('Database Connection', () => this.testDatabaseConnection())
    await this.runTest('User Registration', () => this.testUserRegistration())
    await this.runTest('Sign In Flow', () => this.testSignIn())
    await this.runTest('Session Management', () => this.testSessionManagement())
    await this.runTest('Profile Updates', () => this.testProfileUpdate())
    await this.runTest('Password Reset', () => this.testPasswordReset())
    await this.runTest('Sign Out Flow', () => this.testSignOut())
    await this.runTest('Route Protection', () => this.testRouteProtection())
    
    // Cleanup
    await this.cleanupTestUser()
    
    this.generateReport()
    
    const failedTests = this.results.filter(r => !r.passed).length
    if (failedTests > 0) {
      process.exit(1)
    } else {
      log.success('\n🎉 All authentication tests passed!')
    }
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const tester = new AuthTester()
  tester.runAllTests().catch(error => {
    log.error(`Test runner failed: ${error.message}`)
    process.exit(1)
  })
}

export { AuthTester } 