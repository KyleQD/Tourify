import type { HelpArticle } from "../types"

export const generalHelpArticles: HelpArticle[] = [
  {
    id: "pulse-feed",
    title: "Pulse community feed",
    description: "Stay on top of what the community publishes",
    category: "Discovery",
    contentHtml: `
        <h3>Pulse</h3>
        <p>Pulse is the global activity feed. Use it to follow artists and venues you care about, react to drops, and jump into conversations.</p>
      `,
    keywords: ["pulse", "feed", "community"],
    difficulty: "beginner",
    lastUpdated: "2026-04-12",
    relatedTopicIds: ["discover-network"],
    audiences: ["all"],
    relatedRoutePrefixes: ["/feed"],
  },
  {
    id: "discover-network",
    title: "Discover",
    description: "Search the network for people and places",
    category: "Discovery",
    contentHtml: `
        <h3>Discover</h3>
        <p>Use Discover to search profiles, venues, and opportunities. Save interesting accounts to revisit them from your profile.</p>
      `,
    keywords: ["discover", "search", "network"],
    difficulty: "beginner",
    lastUpdated: "2026-04-12",
    relatedTopicIds: ["pulse-feed"],
    audiences: ["all"],
    relatedRoutePrefixes: ["/discover"],
  },
  {
    id: "jobs-opportunities",
    title: "Jobs & opportunities",
    description: "Find work and gigs across the industry",
    category: "Careers",
    contentHtml: `
        <h3>Jobs</h3>
        <p>Browse Jobs for touring roles, venue staffing, and creative briefs. Tailor your profile before applying so bookers see the right credits.</p>
      `,
    keywords: ["jobs", "gigs", "opportunities"],
    difficulty: "beginner",
    lastUpdated: "2026-04-12",
    relatedTopicIds: ["discover-network"],
    audiences: ["all"],
    relatedRoutePrefixes: ["/jobs"],
  },
  {
    id: "account-settings",
    title: "Account & settings",
    description: "Control notifications, security, and profile data",
    category: "Account",
    contentHtml: `
        <h3>Settings</h3>
        <p>Open Settings from your avatar menu to update contact info, notification channels, and profile visibility. Changes apply across Tourify surfaces tied to your login.</p>
      `,
    keywords: ["settings", "account", "notifications"],
    difficulty: "beginner",
    lastUpdated: "2026-04-12",
    relatedTopicIds: [],
    audiences: ["all"],
    relatedRoutePrefixes: ["/settings", "/profile"],
  },
]
