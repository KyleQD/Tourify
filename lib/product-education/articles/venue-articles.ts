import type { HelpArticle } from "../types"

export const venueHelpArticles: HelpArticle[] = [
  {
    id: "venue-dashboard-overview",
    title: "Venue dashboard",
    description: "Navigate your venue workspace from one place",
    category: "Getting Started",
    contentHtml: `
        <h3>Venue workspace</h3>
        <p>The venue dashboard groups social, events, teams, documents, and equipment. Use the main site navigation to reach News, Community, and Discover; venue-specific pages live under <code>/venue/dashboard</code>.</p>
        <h4>Where to start</h4>
        <ul>
          <li>Complete venue onboarding tasks first so permissions and profile data are correct.</li>
          <li>Publish posts from Social so artists and fans see activity.</li>
          <li>Upload documents and equipment lists before show weeks.</li>
        </ul>
      `,
    keywords: ["venue", "dashboard", "navigation"],
    difficulty: "beginner",
    lastUpdated: "2026-04-12",
    relatedTopicIds: ["venue-social-feed"],
    audiences: ["venue"],
    relatedRoutePrefixes: ["/venue/dashboard"],
  },
  {
    id: "venue-social-feed",
    title: "Social & feed",
    description: "Share updates and build audience in Community",
    category: "Social",
    contentHtml: `
        <h3>Social</h3>
        <p>Use the venue social area to highlight shows, staff spotlights, and behind-the-scenes content. Pair feed posts with events so dates stay discoverable.</p>
        <p>Open <strong>Community</strong> for the global community feed, or <strong>News</strong> for industry stories.</p>
      `,
    keywords: ["social", "feed", "posts", "community"],
    difficulty: "beginner",
    lastUpdated: "2026-04-12",
    relatedTopicIds: ["venue-dashboard-overview"],
    audiences: ["venue"],
    relatedRoutePrefixes: ["/venue/dashboard"],
  },
  {
    id: "venue-documents-equipment",
    title: "Documents & equipment",
    description: "Centralize specs and gear for every show",
    category: "Operations",
    contentHtml: `
        <h3>Operations</h3>
        <p>Store stage plots, insurance certificates, and hospitality riders under Documents. List backline and production inventory under Equipment so touring crews can prep advance without email threads.</p>
      `,
    keywords: ["documents", "equipment", "operations", "rider"],
    difficulty: "intermediate",
    lastUpdated: "2026-04-12",
    relatedTopicIds: ["venue-dashboard-overview"],
    audiences: ["venue"],
    relatedRoutePrefixes: ["/venue/dashboard/documents", "/venue/dashboard/equipment"],
  },
]
