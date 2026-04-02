"use client"

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { AdminOnboardingStaffService } from '@/lib/services/admin-onboarding-staff.service'
import type { CreateJobPostingData } from '@/types/admin-onboarding'
import { CheckCircle, AlertTriangle, Loader2, Plus, Users, Briefcase, FileText, BarChart3 } from 'lucide-react'

export default function TestIntegration() {
  const [isLoading, setIsLoading] = useState(false)
  const [testResults, setTestResults] = useState<any>({})
  const { toast } = useToast()

  const venueId = 'test-venue-id'

  async function runIntegrationTests() {
    setIsLoading(true)
    setTestResults({})

    try {
      const results: any = {
        dashboardStats: {},
        jobPostings: null,
        applications: null,
        candidates: null,
        staffMembers: null,
        createJobPosting: null,
        updateApplicationStatus: null,
        updateOnboardingProgress: null
      }

      // Test 1: Dashboard Stats
      try {
        results.dashboardStats = await AdminOnboardingStaffService.getDashboardStats(venueId)
      } catch (error) {
        console.error('❌ Dashboard stats failed:', error)
        results.dashboardStats = { error: (error as Error)?.message ?? 'Unknown error' }
      }

      // Test 2: Job Postings
      try {
        results.jobPostings = await AdminOnboardingStaffService.getJobPostings(venueId)
      } catch (error) {
        console.error('❌ Job postings failed:', error)
        results.jobPostings = { error: (error as Error)?.message ?? 'Unknown error' }
      }

      // Test 3: Applications
      try {
        results.applications = await AdminOnboardingStaffService.getJobApplications(venueId)
      } catch (error) {
        console.error('❌ Applications failed:', error)
        results.applications = { error: (error as Error)?.message ?? 'Unknown error' }
      }

      // Test 4: Candidates
      try {
        results.candidates = await AdminOnboardingStaffService.getOnboardingCandidates(venueId)
      } catch (error) {
        console.error('❌ Candidates failed:', error)
        results.candidates = { error: (error as Error)?.message ?? 'Unknown error' }
      }

      // Test 5: Staff Members
      try {
        results.staffMembers = await AdminOnboardingStaffService.getStaffMembers(venueId)
      } catch (error) {
        console.error('❌ Staff members failed:', error)
        results.staffMembers = { error: (error as Error)?.message ?? 'Unknown error' }
      }

      // Test 6: Create Job Posting (mock data)
      try {
        const mockJobData: CreateJobPostingData = {
          title: 'Test Security Guard',
          description: 'Test job posting for integration testing',
          department: 'Security',
          position: 'Security Guard',
          employment_type: 'part_time',
          location: 'Test Location',
          number_of_positions: 1,
          requirements: ['Test requirement'],
          responsibilities: ['Test responsibility'],
          benefits: ['Test benefit'],
          skills: ['Test skill'],
          experience_level: 'entry',
          remote: false,
          urgent: false,
          required_certifications: [],
          background_check_required: false,
          drug_test_required: false,
          uniform_provided: false,
          training_provided: false,
          application_form_template: {
            fields: [
              {
                id: 'cover_letter',
                name: 'cover_letter',
                label: 'Cover Letter',
                type: 'textarea',
                required: true,
                order: 0
              }
            ]
          }
        }

        results.createJobPosting = await AdminOnboardingStaffService.createJobPosting(venueId, mockJobData)
      } catch (error) {
        console.error('❌ Create job posting failed:', error)
        results.createJobPosting = { error: (error as Error)?.message ?? 'Unknown error' }
      }

      setTestResults(results)

      // Count successful tests
      const successfulTests = Object.values(results).filter((result: any) => {
        if (!result) return false
        const r = result as any
        return !(r && typeof r === 'object' && 'error' in r)
      }).length

      const totalTests = Object.keys(results).length

      toast({
        title: 'Integration Test Complete',
        description: `${successfulTests}/${totalTests} tests passed`,
        variant: successfulTests === totalTests ? 'default' : 'destructive'
      })

    } catch (error) {
      console.error('❌ Integration test failed:', error)
      toast({
        title: 'Test Failed',
        description: 'Integration test encountered an error',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  function getTestStatus(result: any) {
    if (!result) return { status: 'pending', label: 'Pending', color: 'text-gray-500' }
    if (result.error) return { status: 'failed', label: 'Failed', color: 'text-red-500' }
    return { status: 'passed', label: 'Passed', color: 'text-green-500' }
  }

  return (
    <div className="min-h-screen bg-slate-900 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Integration Test</h1>
          <p className="text-slate-400">
            Test the integration between the staff page and the new onboarding system
          </p>
        </div>

        <Card className="bg-slate-800 border-slate-700 mb-6">
          <CardHeader>
            <CardTitle className="text-white">Test Controls</CardTitle>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={runIntegrationTests}
              disabled={isLoading}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Running Tests...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Run Integration Tests
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <div className="grid gap-4">
          {/* Dashboard Stats Test */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Dashboard Stats
                <Badge variant={getTestStatus(testResults.dashboardStats).status === 'passed' ? 'default' : 'destructive'}>
                  {getTestStatus(testResults.dashboardStats).label}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-slate-400">
                {testResults.dashboardStats?.error ? (
                  <p className="text-red-400">Error: {testResults.dashboardStats.error}</p>
                ) : testResults.dashboardStats ? (
                  <div className="space-y-2">
                    <p>✅ Dashboard stats loaded successfully</p>
                    <p>Onboarding: {testResults.dashboardStats.onboarding?.total_candidates || 0} candidates</p>
                    <p>Job Postings: {testResults.dashboardStats.job_postings?.total_postings || 0} postings</p>
                    <p>Staff: {testResults.dashboardStats.staff_management?.total_staff || 0} members</p>
                  </div>
                ) : (
                  <p>No test run yet</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Job Postings Test */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                Job Postings
                <Badge variant={getTestStatus(testResults.jobPostings).status === 'passed' ? 'default' : 'destructive'}>
                  {getTestStatus(testResults.jobPostings).label}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-slate-400">
                {testResults.jobPostings?.error ? (
                  <p className="text-red-400">Error: {testResults.jobPostings.error}</p>
                ) : testResults.jobPostings ? (
                  <div className="space-y-2">
                    <p>✅ Job postings loaded successfully</p>
                    <p>Total: {Array.isArray(testResults.jobPostings) ? testResults.jobPostings.length : 0} postings</p>
                  </div>
                ) : (
                  <p>No test run yet</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Applications Test */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Applications
                <Badge variant={getTestStatus(testResults.applications).status === 'passed' ? 'default' : 'destructive'}>
                  {getTestStatus(testResults.applications).label}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-slate-400">
                {testResults.applications?.error ? (
                  <p className="text-red-400">Error: {testResults.applications.error}</p>
                ) : testResults.applications ? (
                  <div className="space-y-2">
                    <p>✅ Applications loaded successfully</p>
                    <p>Total: {Array.isArray(testResults.applications) ? testResults.applications.length : 0} applications</p>
                  </div>
                ) : (
                  <p>No test run yet</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Candidates Test */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Users className="h-5 w-5" />
                Onboarding Candidates
                <Badge variant={getTestStatus(testResults.candidates).status === 'passed' ? 'default' : 'destructive'}>
                  {getTestStatus(testResults.candidates).label}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-slate-400">
                {testResults.candidates?.error ? (
                  <p className="text-red-400">Error: {testResults.candidates.error}</p>
                ) : testResults.candidates ? (
                  <div className="space-y-2">
                    <p>✅ Candidates loaded successfully</p>
                    <p>Total: {Array.isArray(testResults.candidates) ? testResults.candidates.length : 0} candidates</p>
                  </div>
                ) : (
                  <p>No test run yet</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Staff Members Test */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Users className="h-5 w-5" />
                Staff Members
                <Badge variant={getTestStatus(testResults.staffMembers).status === 'passed' ? 'default' : 'destructive'}>
                  {getTestStatus(testResults.staffMembers).label}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-slate-400">
                {testResults.staffMembers?.error ? (
                  <p className="text-red-400">Error: {testResults.staffMembers.error}</p>
                ) : testResults.staffMembers ? (
                  <div className="space-y-2">
                    <p>✅ Staff members loaded successfully</p>
                    <p>Total: {Array.isArray(testResults.staffMembers) ? testResults.staffMembers.length : 0} members</p>
                  </div>
                ) : (
                  <p>No test run yet</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Create Job Posting Test */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Create Job Posting
                <Badge variant={getTestStatus(testResults.createJobPosting).status === 'passed' ? 'default' : 'destructive'}>
                  {getTestStatus(testResults.createJobPosting).label}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-slate-400">
                {testResults.createJobPosting?.error ? (
                  <p className="text-red-400">Error: {testResults.createJobPosting.error}</p>
                ) : testResults.createJobPosting ? (
                  <div className="space-y-2">
                    <p>✅ Job posting created successfully</p>
                    <p>Title: {testResults.createJobPosting.title}</p>
                    <p>Department: {testResults.createJobPosting.department}</p>
                  </div>
                ) : (
                  <p>No test run yet</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
} 