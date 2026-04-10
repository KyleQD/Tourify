import {
  evaluateHiringEligibility,
  getHiringEligibilityMode,
  HiringEligibilityGateError,
  isHiringEligibilityGateError,
} from '../hiring-eligibility.service'

type Row = Record<string, any>

function createMockSupabase(seed: Record<string, Row[]>) {
  function buildQuery(table: string) {
    const state: {
      filters: Array<{ key: string; value: any }>
      limitValue?: number
      orderBy?: string
      ascending?: boolean
    } = { filters: [] }

    function getRows() {
      let rows = [...(seed[table] || [])]
      for (const filter of state.filters)
        rows = rows.filter((row) => row?.[filter.key] === filter.value)
      if (state.orderBy) {
        rows.sort((a, b) => {
          const left = a?.[state.orderBy || '']
          const right = b?.[state.orderBy || '']
          if (left === right) return 0
          if (left < right) return state.ascending ? -1 : 1
          return state.ascending ? 1 : -1
        })
      }
      if (state.limitValue !== undefined) rows = rows.slice(0, state.limitValue)
      return rows
    }

    return {
      select() {
        return this
      },
      eq(key: string, value: any) {
        state.filters.push({ key, value })
        return this
      },
      order(key: string, options?: { ascending?: boolean }) {
        state.orderBy = key
        state.ascending = Boolean(options?.ascending)
        return this
      },
      limit(value: number) {
        state.limitValue = value
        return this
      },
      async maybeSingle() {
        const rows = getRows()
        return { data: rows[0] || null, error: null }
      },
      async single() {
        const rows = getRows()
        if (!rows[0]) return { data: null, error: new Error('not found') }
        return { data: rows[0], error: null }
      },
      then(resolve: (value: any) => any) {
        const rows = getRows()
        return Promise.resolve(resolve({ data: rows, count: rows.length, error: null }))
      },
    }
  }

  return {
    from(table: string) {
      return buildQuery(table)
    },
  } as any
}

describe('hiring eligibility service', () => {
  const originalFlag = process.env.FEATURE_HIRING_ELIGIBILITY_GATE
  const originalEndorsementRequirement = process.env.FEATURE_HIRING_GATE_REQUIRE_ENDORSEMENT

  afterEach(() => {
    process.env.FEATURE_HIRING_ELIGIBILITY_GATE = originalFlag
    process.env.FEATURE_HIRING_GATE_REQUIRE_ENDORSEMENT = originalEndorsementRequirement
  })

  it('resolves eligibility mode from env flag', () => {
    process.env.FEATURE_HIRING_ELIGIBILITY_GATE = 'shadow'
    expect(getHiringEligibilityMode()).toBe('shadow')

    process.env.FEATURE_HIRING_ELIGIBILITY_GATE = '1'
    expect(getHiringEligibilityMode()).toBe('enforce')

    process.env.FEATURE_HIRING_ELIGIBILITY_GATE = 'off'
    expect(getHiringEligibilityMode()).toBe('off')
  })

  it('marks application eligible when required verified evidence exists', async () => {
    process.env.FEATURE_HIRING_ELIGIBILITY_GATE = 'enforce'
    const supabase = createMockSupabase({
      job_applications: [
        {
          id: 'app-1',
          applicant_id: 'user-1',
          venue_id: 'venue-1',
          job_posting_id: 'job-1',
        },
      ],
      job_posting_templates: [
        {
          id: 'job-1',
          required_certifications: ['Security License'],
        },
      ],
      staff_documents: [
        {
          id: 'doc-1',
          owner_user_id: 'user-1',
          document_type: 'certification:security-license',
          verified_status: 'approved',
          expires_at: null,
        },
      ],
      agreement_acceptances: [
        {
          id: 'agree-1',
          user_id: 'user-1',
          organization_id: 'venue-1',
        },
      ],
      endorsements: [
        {
          id: 'endorse-1',
          endorsee_id: 'user-1',
          is_verified: true,
          is_active: true,
        },
      ],
      user_reward_wallets: [{ user_id: 'user-1', tier: 'silver', total_points: 900 }],
      user_achievements: [{ id: 'ua-1', user_id: 'user-1', is_completed: true }],
      follows: [{ id: 'follow-1', following_id: 'user-1' }],
      staff_onboarding_candidates: [],
    })

    const assessment = await evaluateHiringEligibility({
      supabase,
      applicationId: 'app-1',
    })

    expect(assessment.is_eligible).toBe(true)
    expect(assessment.blocking_reasons).toEqual([])
  })

  it('returns deterministic blocking reason when agreement is missing', async () => {
    process.env.FEATURE_HIRING_ELIGIBILITY_GATE = 'enforce'
    const supabase = createMockSupabase({
      job_applications: [
        {
          id: 'app-2',
          applicant_id: 'user-2',
          venue_id: 'venue-2',
          job_posting_id: 'job-2',
        },
      ],
      job_posting_templates: [{ id: 'job-2', required_certifications: [] }],
      staff_documents: [
        {
          id: 'doc-2',
          owner_user_id: 'user-2',
          document_type: 'certification:general-safety',
          verified_status: 'approved',
          expires_at: null,
        },
      ],
      agreement_acceptances: [],
      endorsements: [],
      user_reward_wallets: [],
      user_achievements: [],
      follows: [],
      staff_onboarding_candidates: [],
    })

    const assessment = await evaluateHiringEligibility({
      supabase,
      applicationId: 'app-2',
    })

    expect(assessment.is_eligible).toBe(false)
    expect(assessment.blocking_reasons).toContain('agreement_not_signed')
    const gateError = new HiringEligibilityGateError(assessment)
    expect(isHiringEligibilityGateError(gateError)).toBe(true)
  })

  it('blocks when required certification is missing', async () => {
    process.env.FEATURE_HIRING_ELIGIBILITY_GATE = 'enforce'
    const supabase = createMockSupabase({
      job_applications: [
        {
          id: 'app-3',
          applicant_id: 'user-3',
          venue_id: 'venue-3',
          job_posting_id: 'job-3',
        },
      ],
      job_posting_templates: [{ id: 'job-3', required_certifications: ['Crowd Control License'] }],
      staff_documents: [
        {
          id: 'doc-3',
          owner_user_id: 'user-3',
          document_type: 'certification:first-aid',
          verified_status: 'approved',
          expires_at: null,
        },
      ],
      agreement_acceptances: [{ id: 'agree-3', user_id: 'user-3', organization_id: 'venue-3' }],
      endorsements: [],
      user_reward_wallets: [],
      user_achievements: [],
      follows: [],
      staff_onboarding_candidates: [],
    })

    const assessment = await evaluateHiringEligibility({
      supabase,
      applicationId: 'app-3',
    })

    expect(assessment.is_eligible).toBe(false)
    expect(assessment.blocking_reasons).toContain('required_certifications_missing')
  })

  it('can require verified endorsements via feature flag', async () => {
    process.env.FEATURE_HIRING_ELIGIBILITY_GATE = 'enforce'
    process.env.FEATURE_HIRING_GATE_REQUIRE_ENDORSEMENT = '1'

    const supabase = createMockSupabase({
      job_applications: [
        {
          id: 'app-4',
          applicant_id: 'user-4',
          venue_id: 'venue-4',
          job_posting_id: 'job-4',
        },
      ],
      job_posting_templates: [{ id: 'job-4', required_certifications: [] }],
      staff_documents: [
        {
          id: 'doc-4',
          owner_user_id: 'user-4',
          document_type: 'certification:safety',
          verified_status: 'approved',
          expires_at: null,
        },
      ],
      agreement_acceptances: [{ id: 'agree-4', user_id: 'user-4', organization_id: 'venue-4' }],
      endorsements: [],
      user_reward_wallets: [],
      user_achievements: [],
      follows: [],
      staff_onboarding_candidates: [],
    })

    const assessment = await evaluateHiringEligibility({
      supabase,
      applicationId: 'app-4',
    })

    expect(assessment.is_eligible).toBe(false)
    expect(assessment.blocking_reasons).toContain('missing_verified_endorsements')
  })
})
