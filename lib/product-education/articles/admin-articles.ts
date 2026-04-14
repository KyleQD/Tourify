import type { HelpArticle } from "../types"

/** Copy aligned with `app/admin/dashboard/hooks/use-keyboard-shortcuts.ts` and `optimized-sidebar.tsx` */
export const adminHelpArticles: HelpArticle[] = [
  {
    id: "dashboard-overview",
    title: "Dashboard Overview",
    description: "Learn about the main dashboard and key metrics",
    category: "Getting Started",
    contentHtml: `
        <h3>Welcome to the Tourify Admin Dashboard</h3>
        <p>The dashboard summarizes tours, events, and operations. Use the left sidebar (or number shortcuts while you are in the admin area) to jump between modules.</p>
        <h4>Quick actions</h4>
        <ul>
          <li>Use <kbd>⌘1</kbd>–<kbd>⌘9</kbd>, <kbd>⌘0</kbd>, and <kbd>⌘,</kbd> for sidebar destinations (Windows: <kbd>Ctrl</kbd>).</li>
          <li>Open quick navigation with <kbd>⌘K</kbd> or <kbd>⌘G</kbd> (global search / go-to).</li>
          <li>Use the top notification area for alerts tied to tours and events.</li>
        </ul>
        <p>From any page, open the global <strong>Help</strong> panel from the top bar to search guides without leaving your work.</p>
      `,
    keywords: ["dashboard", "overview", "metrics", "getting started"],
    difficulty: "beginner",
    lastUpdated: "2026-04-12",
    relatedTopicIds: ["keyboard-shortcuts", "tour-management"],
    audiences: ["admin"],
    relatedRoutePrefixes: ["/admin/dashboard"],
  },
  {
    id: "keyboard-shortcuts",
    title: "Keyboard Shortcuts",
    description: "Shortcuts that exist in the admin dashboard today",
    category: "Productivity",
    contentHtml: `
        <h3>Admin shortcuts</h3>
        <p>These shortcuts are registered while you use the admin dashboard. They do not run when focus is in a text field, search box, or content-editable region.</p>
        <h4>Navigation</h4>
        <ul>
          <li><kbd>⌘1</kbd> Dashboard</li>
          <li><kbd>⌘2</kbd> Tours</li>
          <li><kbd>⌘3</kbd> Events</li>
          <li><kbd>⌘4</kbd> Artists</li>
          <li><kbd>⌘5</kbd> Venues</li>
          <li><kbd>⌘6</kbd> Ticketing</li>
          <li><kbd>⌘7</kbd> Staff &amp; Crew</li>
          <li><kbd>⌘8</kbd> Logistics</li>
          <li><kbd>⌘9</kbd> Finances</li>
          <li><kbd>⌘0</kbd> Analytics</li>
          <li><kbd>⌘,</kbd> Settings</li>
          <li><kbd>⌘G</kbd> or <kbd>⌘K</kbd> Open global search (same custom action)</li>
          <li><kbd>⌘B</kbd> Browser back</li>
          <li><kbd>⌘F</kbd> Browser forward</li>
        </ul>
        <h4>Actions</h4>
        <ul>
          <li><kbd>⌘N</kbd> New item (contextual: tours/events/artists)</li>
          <li><kbd>⌘S</kbd> Save (dispatches save event to the current view)</li>
          <li><kbd>⌘R</kbd> Refresh data</li>
          <li><kbd>⌘E</kbd> Export</li>
          <li><kbd>⌘A</kbd> / <kbd>⌘D</kbd> Select all / deselect all</li>
        </ul>
        <h4>System</h4>
        <ul>
          <li><kbd>⌘?</kbd> Keyboard shortcuts overlay (same as the shortcuts help entry in the header when wired)</li>
          <li><kbd>⌘H</kbd> Toggle help (dispatches <code>toggleHelp</code> for integrations)</li>
          <li><kbd>⌘M</kbd> Toggle sidebar</li>
          <li><kbd>⌘T</kbd> Toggle theme</li>
        </ul>
        <p>On Windows/Linux use <kbd>Ctrl</kbd> instead of <kbd>⌘</kbd>. For <kbd>?</kbd>, use <kbd>Shift</kbd>+<kbd>/</kbd>.</p>
      `,
    keywords: ["keyboard", "shortcuts", "navigation", "productivity"],
    difficulty: "beginner",
    lastUpdated: "2026-04-12",
    relatedTopicIds: ["dashboard-overview", "tour-management"],
    audiences: ["admin"],
    relatedRoutePrefixes: ["/admin/dashboard"],
  },
  {
    id: "tour-management",
    title: "Tour & Event Management",
    description: "Plan tours, attach venues, and track events",
    category: "Tours & Events",
    contentHtml: `
        <h3>Tours and events</h3>
        <p>Use <strong>Tours</strong> for multi-date routing and <strong>Events</strong> for individual show records. Keep venue contacts and ticketing notes aligned with each event so finance and logistics stay in sync.</p>
        <h4>Suggested flow</h4>
        <ol>
          <li>Create or open a tour from <strong>Tours</strong>.</li>
          <li>Add or import dates and venue assignments.</li>
          <li>Open <strong>Events</strong> for day-of details: doors, capacity, and status.</li>
          <li>Link ticketing and staff assignments from their respective areas.</li>
        </ol>
        <p>Empty lists are normal for new organizers—use <strong>New</strong> actions or <kbd>⌘N</kbd> from the relevant screen.</p>
      `,
    keywords: ["tour", "management", "events", "planning"],
    difficulty: "intermediate",
    lastUpdated: "2026-04-12",
    relatedTopicIds: ["dashboard-overview", "analytics-insights"],
    audiences: ["admin"],
    relatedRoutePrefixes: ["/admin/dashboard/tours", "/admin/dashboard/events"],
  },
  {
    id: "analytics-insights",
    title: "Analytics & Insights",
    description: "Read performance metrics in the admin area",
    category: "Analytics",
    contentHtml: `
        <h3>Analytics</h3>
        <p>Open <strong>Analytics</strong> from the sidebar or press <kbd>⌘0</kbd>. Use charts to compare ticket velocity, attendance, and revenue across tours.</p>
        <h4>Tips</h4>
        <ul>
          <li>Filter by date range that matches your settlement periods.</li>
          <li>Pair analytics with <strong>Finances</strong> for payout checks.</li>
          <li>Export when you need to share summaries with partners.</li>
        </ul>
      `,
    keywords: ["analytics", "insights", "reports", "metrics"],
    difficulty: "intermediate",
    lastUpdated: "2026-04-12",
    relatedTopicIds: ["tour-management"],
    audiences: ["admin"],
    relatedRoutePrefixes: ["/admin/dashboard/analytics"],
  },
]
