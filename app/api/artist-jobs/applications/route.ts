import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildHiringMilestones } from '@/lib/hiring/states'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user)
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const includeJobsAsCards = searchParams.get('format') === 'cards'

    const { data: applications, error } = await supabase
      .from('artist_job_applications')
      .select(
        `
        *,
        job:artist_jobs(
          *,
          category:artist_job_categories(*)
        )
      `
      )
      .eq('applicant_id', user.id)
      .order('applied_at', { ascending: false })

    if (error) throw error

    const { data: onboardingCandidates } = await supabase
      .from('staff_onboarding_candidates')
      .select('application_id, status, stage, updated_at')
      .eq('user_id', user.id)

    const { data: contracts } = await supabase
      .from('artist_contracts')
      .select('id, status, metadata, updated_at')
      .or(`counterparty_user_id.eq.${user.id},user_id.eq.${user.id}`)
      .order('updated_at', { ascending: false })

    const onboardingByApplication = new Map(
      (onboardingCandidates || [])
        .filter((candidate: any) => candidate.application_id)
        .map((candidate: any) => [candidate.application_id, candidate])
    )

    const contractsByApplication = new Map<string, any>()
    ;(contracts || []).forEach((contract: any) => {
      const applicationId = (contract.metadata as any)?.application_id
      if (!applicationId || contractsByApplication.has(applicationId)) return
      contractsByApplication.set(applicationId, contract)
    })

    const rows = (applications || []).map((application: any) => {
      const onboarding = onboardingByApplication.get(application.id)
      const contract = contractsByApplication.get(application.id)
      const milestones = buildHiringMilestones({
        applicationStatus: application.status,
        appliedAt: application.applied_at,
        reviewedAt: application.reviewed_at,
        respondedAt: application.responded_at,
        onboardingStatus: onboarding?.status,
        contractStatus: contract?.status,
        contractUpdatedAt: contract?.updated_at,
      })

      return {
        ...application,
        onboarding_status: onboarding
          ? {
              status: onboarding.status,
              stage: onboarding.stage,
              updated_at: onboarding.updated_at,
            }
          : null,
        contract_status: contract
          ? {
              id: contract.id,
              status: contract.status,
              updated_at: contract.updated_at,
            }
          : null,
        milestones,
      }
    })

    if (!includeJobsAsCards) return NextResponse.json({ success: true, data: rows })

    const cards = rows
      .filter((row: any) => row.job)
      .map((row: any) => ({
        ...row.job,
        user_application: {
          id: row.id,
          status: row.status,
          feedback: row.feedback,
          applied_at: row.applied_at,
          reviewed_at: row.reviewed_at,
          responded_at: row.responded_at,
        },
        hiring_milestones: row.milestones,
      }))

    return NextResponse.json({ success: true, data: cards })
  } catch (error) {
    console.error('Error in GET /api/artist-jobs/applications:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch user applications' },
      { status: 500 }
    )
  }
}
