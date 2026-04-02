export interface HybridFanoutDecision {
  strategy: 'fanout_on_write' | 'fanout_on_read'
  reason: string
}

interface ChooseFanoutStrategyParams {
  followerCount: number
  velocityPerMinute: number
}

export function chooseFanoutStrategy(params: ChooseFanoutStrategyParams): HybridFanoutDecision {
  const { followerCount, velocityPerMinute } = params

  if (followerCount >= 10000 || velocityPerMinute >= 25)
    return {
      strategy: 'fanout_on_write',
      reason: 'High reach or high velocity candidate'
    }

  return {
    strategy: 'fanout_on_read',
    reason: 'Long-tail candidate with lower fanout pressure'
  }
}
