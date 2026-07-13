export interface ArtistFeedEngagementRateInput {
  engagementTotal: number
  followers: number
}

/** When followers are 0, rate is 0 to avoid a fake 100% from max(followers, 1). */
export function computeArtistFeedEngagementRate({
  engagementTotal,
  followers,
}: ArtistFeedEngagementRateInput): number {
  if (followers <= 0) return 0
  return Math.round((engagementTotal / followers) * 1000) / 10
}
