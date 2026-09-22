/**
 * Tourify Profile Type Definitions
 * ---------------------------------
 * Every profile belongs to exactly one category: Person, Place, or Thing.
 * Every user account is an "Individual" (Person) that can own/manage other profiles.
 * Admin is a permission / Work Mode surface, not a public persona type.
 * Tour manager is a role/grant on a General user — not a public persona.
 * Organization subtypes (band, label, promoter, agency, …) share `/organization/{slug}`.
 * See docs/organization-personas.md.
 */

export type ProfileCategory = "Person" | "Place" | "Thing";

export interface ProfileTypeConfig {
  key: string;                  // Unique profile type identifier
  category: ProfileCategory;    // Person, Place, or Thing
  displayName: string;          // Name shown in UI
  primaryPurpose: string;       // Why this profile exists
  layoutTemplate: string;       // Which UI template to render
  defaultFields: string[];      // Required or recommended fields
  discoveryTags: string[];      // Search keywords/tags
}

// Master Profile Type Definitions
export const PROFILE_TYPES: ProfileTypeConfig[] = [
  // ----- Person -----
  {
    key: "individual",
    category: "Person",
    displayName: "Individual",
    primaryPurpose: "Represents a single human user and their personal identity.",
    layoutTemplate: "personProfile",
    defaultFields: ["bio", "skills", "availability", "aliases", "contactInfo"],
    discoveryTags: ["person", "user", "individual", "member", "profile"]
  },
  {
    key: "organizer",
    category: "Thing",
    displayName: "Organization (legacy alias)",
    primaryPurpose: "Legacy key for Organization public brand. Prefer organization / subtype keys.",
    layoutTemplate: "organizationProfile",
    defaultFields: ["bio", "experience", "services", "contactInfo"],
    discoveryTags: ["organizer", "organization", "event manager", "coordinator"]
  },

  // ----- Thing -----
  {
    key: "artist",
    category: "Thing",
    displayName: "Artist",
    primaryPurpose: "Creative identity for performances, music, art, or other media.",
    layoutTemplate: "artistProfile",
    defaultFields: ["bio", "portfolio", "mediaLinks", "upcomingEvents", "members"],
    discoveryTags: ["artist", "musician", "performer", "creative"]
  },
  {
    key: "band",
    category: "Thing",
    displayName: "Band",
    primaryPurpose: "Collective brand that rosters Artist personas while each artist keeps a personal page.",
    layoutTemplate: "organizationProfile",
    defaultFields: ["bio", "artistRoster", "upcomingEvents", "contactInfo"],
    discoveryTags: ["band", "group", "collective", "roster"]
  },
  {
    key: "label",
    category: "Thing",
    displayName: "Label",
    primaryPurpose: "Record label brand with a roster of signed artists.",
    layoutTemplate: "organizationProfile",
    defaultFields: ["bio", "artistRoster", "catalog", "contactInfo"],
    discoveryTags: ["label", "record label", "imprint", "roster"]
  },
  {
    key: "organization",
    category: "Thing",
    displayName: "Organization",
    primaryPurpose: "Generic public brand for companies that do not fit a more specific subtype.",
    layoutTemplate: "organizationProfile",
    defaultFields: ["bio", "services", "jobs", "contactInfo"],
    discoveryTags: ["organization", "company", "brand"]
  },
  {
    key: "performanceAgency",
    category: "Thing",
    displayName: "Performance Agency",
    primaryPurpose: "Represents multiple artists and books performances.",
    layoutTemplate: "organizationProfile",
    defaultFields: ["bio", "artistRoster", "bookingInfo", "contactInfo"],
    discoveryTags: ["agency", "performance", "roster", "representation"]
  },
  {
    key: "staffingAgency",
    category: "Thing",
    displayName: "Staffing Agency",
    primaryPurpose: "Provides event crew and staffing services.",
    layoutTemplate: "organizationProfile",
    defaultFields: ["bio", "staffRoster", "services", "contactInfo"],
    discoveryTags: ["staff", "crew", "security", "event staffing"]
  },
  {
    key: "rentalCompany",
    category: "Thing",
    displayName: "Rental Company",
    primaryPurpose: "Provides equipment or materials for events.",
    layoutTemplate: "organizationProfile",
    defaultFields: ["bio", "inventory", "rentalTerms", "contactInfo"],
    discoveryTags: ["equipment", "rental", "production gear"]
  },
  {
    key: "productionCompany",
    category: "Thing",
    displayName: "Production Company",
    primaryPurpose: "Oversees event execution and production services.",
    layoutTemplate: "organizationProfile",
    defaultFields: ["bio", "services", "portfolio", "contactInfo"],
    discoveryTags: ["production", "event services", "event execution"]
  },
  {
    key: "promoter",
    category: "Thing",
    displayName: "Promoter",
    primaryPurpose: "Markets and sells tickets for events.",
    layoutTemplate: "organizationProfile",
    defaultFields: ["bio", "events", "ticketLinks", "contactInfo"],
    discoveryTags: ["promotion", "marketing", "ticket sales"]
  },

  // ----- Place -----
  {
    key: "venue",
    category: "Place",
    displayName: "Venue",
    primaryPurpose: "Hosts events at a fixed location.",
    layoutTemplate: "venueProfile",
    defaultFields: ["address", "capacity", "amenities", "bookingInfo"],
    discoveryTags: ["venue", "club", "theater", "location"]
  },
  {
    key: "publicLocation",
    category: "Place",
    displayName: "Public Location",
    primaryPurpose: "Outdoor or public space for events.",
    layoutTemplate: "placeProfile",
    defaultFields: ["locationMap", "permitsInfo", "accessibility"],
    discoveryTags: ["park", "public space", "outdoor", "festival"]
  },
  {
    key: "privateLocation",
    category: "Place",
    displayName: "Private Location",
    primaryPurpose: "Privately owned property for events.",
    layoutTemplate: "placeProfile",
    defaultFields: ["address", "capacity", "bookingTerms"],
    discoveryTags: ["private venue", "estate", "backyard", "warehouse"]
  },
  {
    key: "virtualLocation",
    category: "Place",
    displayName: "Virtual Location",
    primaryPurpose: "Online or virtual space for events.",
    layoutTemplate: "virtualProfile",
    defaultFields: ["platform", "accessLink", "capacity"],
    discoveryTags: ["virtual", "online", "stream", "metaverse"]
  }
];

//////////////////////////////
// Utility Functions        //
//////////////////////////////

/**
 * Get profile config by key
 */
export const getProfileTypeConfig = (key: string): ProfileTypeConfig | undefined => {
  return PROFILE_TYPES.find(type => type.key === key);
};

/**
 * Filter profile types by category
 */
export const getProfilesByCategory = (category: ProfileCategory): ProfileTypeConfig[] => {
  return PROFILE_TYPES.filter(type => type.category === category);
};
