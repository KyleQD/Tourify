export const queryKeys = {
  feedPosts: (type: string, profileId: string | null) => ["feed-posts", type, profileId] as const,
  notifications: (scope: string) => ["notifications", scope] as const,
  discover: (intent?: string) => ["discover", intent || "default"] as const,
  featuredStory: () => ["featured-story"] as const,
  messages: () => ["messages"] as const,
}
