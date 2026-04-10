import type { SupabaseClient } from '@supabase/supabase-js'

interface RewardWallet {
  total_points: number
  tier: 'bronze' | 'silver' | 'gold' | 'platinum'
}

interface ResumeHighlight {
  id: string
  title: string
  summary: string
  impact_score: number
  source_type: 'achievement' | 'badge' | 'endorsement' | 'manual'
  is_featured: boolean
  achievement_id?: string | null
  badge_id?: string | null
  endorsement_id?: string | null
  created_at: string
}

export interface ResumeAchievementsResponse {
  wallet: RewardWallet
  highlights: ResumeHighlight[]
  generated_bullets: string[]
}

export interface ResumeExportPayload {
  markdown: string
  plain_text: string
  bullets: string[]
}

export async function getResumeAchievements(args: {
  supabase: SupabaseClient
  userId: string
}): Promise<ResumeAchievementsResponse> {
  const [walletResult, highlightsResult, completedResult] = await Promise.all([
    args.supabase
      .from('user_reward_wallets')
      .select('total_points, tier')
      .eq('user_id', args.userId)
      .maybeSingle(),
    args.supabase
      .from('resume_achievement_highlights')
      .select('id, title, summary, impact_score, source_type, is_featured, achievement_id, badge_id, endorsement_id, created_at')
      .eq('user_id', args.userId)
      .eq('is_featured', true)
      .order('impact_score', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(8),
    args.supabase
      .from('user_achievements')
      .select('achievement:achievements(name, points)')
      .eq('user_id', args.userId)
      .eq('is_completed', true)
      .limit(20),
  ])

  const wallet = {
    total_points: Number(walletResult.data?.total_points || 0),
    tier: (walletResult.data?.tier || 'bronze') as RewardWallet['tier'],
  }

  const highlights = (highlightsResult.data || []) as ResumeHighlight[]
  const completedAchievements = completedResult.data || []

  const generatedBullets = [
    `Earned ${wallet.total_points} reward points (${wallet.tier} tier) from verified work outcomes and platform milestones.`,
    ...highlights.slice(0, 4).map((highlight) => `${highlight.title}: ${highlight.summary}`),
  ]

  if (highlights.length === 0 && completedAchievements.length > 0) {
    generatedBullets.push(
      ...completedAchievements.slice(0, 3).map((row: any) => {
        const name = row.achievement?.name || 'Work milestone achieved'
        const points = Number(row.achievement?.points || 0)
        return `${name} (${points} points) recognized in platform achievement history.`
      })
    )
  }

  return {
    wallet,
    highlights,
    generated_bullets: generatedBullets.slice(0, 8),
  }
}

export async function upsertResumeHighlight(args: {
  supabase: SupabaseClient
  userId: string
  title: string
  summary: string
  impactScore?: number
  sourceType?: 'achievement' | 'badge' | 'endorsement' | 'manual'
  achievementId?: string
  badgeId?: string
  endorsementId?: string
  isFeatured?: boolean
}) {
  const { data, error } = await args.supabase
    .from('resume_achievement_highlights')
    .insert({
      user_id: args.userId,
      title: args.title,
      summary: args.summary,
      impact_score: Number(args.impactScore || 0),
      source_type: args.sourceType || 'manual',
      achievement_id: args.achievementId || null,
      badge_id: args.badgeId || null,
      endorsement_id: args.endorsementId || null,
      is_featured: args.isFeatured ?? true,
    })
    .select('id, title, summary, impact_score, source_type, is_featured, achievement_id, badge_id, endorsement_id, created_at')
    .single()

  if (error) throw error
  return data as ResumeHighlight
}

export function buildResumeExport(input: ResumeAchievementsResponse): ResumeExportPayload {
  const walletLine = `Reward Tier: ${input.wallet.tier.toUpperCase()} (${input.wallet.total_points} points)`
  const highlightLines = input.highlights
    .slice(0, 6)
    .map((highlight) => `- ${highlight.title}: ${highlight.summary}`)
  const bullets = input.generated_bullets.slice(0, 8)

  const markdown = [
    '## Career Highlights',
    walletLine,
    '',
    '### Achievement Highlights',
    ...(highlightLines.length > 0 ? highlightLines : ['- Build additional verified achievements to populate this section.']),
    '',
    '### Resume Bullets',
    ...(bullets.length > 0 ? bullets.map((bullet) => `- ${bullet}`) : ['- No generated bullets yet.']),
  ].join('\n')

  const plainText = [
    'Career Highlights',
    walletLine,
    '',
    'Achievement Highlights',
    ...(highlightLines.length > 0 ? highlightLines.map((line) => line.replace(/^- /, '• ')) : ['• Build additional verified achievements to populate this section.']),
    '',
    'Resume Bullets',
    ...(bullets.length > 0 ? bullets.map((bullet) => `• ${bullet}`) : ['• No generated bullets yet.']),
  ].join('\n')

  return {
    markdown,
    plain_text: plainText,
    bullets,
  }
}
