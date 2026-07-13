import type { PersonaOnboardingConfig, PersonaOnboardingType } from "@/types/persona-onboarding"

export const PERSONA_ONBOARDING_CONFIGS: Record<PersonaOnboardingType, PersonaOnboardingConfig> = {
  individual: {
    type: "individual",
    title: "Set up your Tourify profile",
    description: "Create your personal identity for applying to jobs, joining teams, and managing your Tourify account.",
    sections: [
      {
        id: "identity",
        title: "Identity",
        fields: [
          { name: "displayName", label: "Display name", type: "text", required: true },
          { name: "bio", label: "Short bio", type: "textarea", placeholder: "Tell people what you do in live events." },
          { name: "location", label: "Primary location", type: "text" },
        ],
      },
      {
        id: "skills",
        title: "Skills and availability",
        fields: [
          { name: "skills", label: "Skills", type: "multiselect", options: ["Production", "Security", "Bartending", "FOH", "Lighting", "Photography", "Tour Management"] },
          { name: "availability", label: "Availability notes", type: "textarea" },
        ],
      },
    ],
  },
  artist: {
    type: "artist",
    title: "Create an artist profile",
    description: "Build a public-facing artist identity for bookings, EPKs, events, and team hiring.",
    createsHiringEntityType: "artist",
    sections: [
      {
        id: "artist-basics",
        title: "Artist basics",
        fields: [
          { name: "artistName", label: "Artist name", type: "text", required: true },
          { name: "genres", label: "Genres", type: "multiselect", options: ["Electronic", "Hip-Hop", "Rock", "Pop", "Jam", "House", "Techno", "Bass", "Other"] },
          { name: "bio", label: "Artist bio", type: "textarea" },
        ],
      },
      {
        id: "artist-links",
        title: "Links",
        fields: [
          { name: "website", label: "Website", type: "url" },
          { name: "spotify", label: "Spotify", type: "url" },
          { name: "instagram", label: "Instagram", type: "url" },
          { name: "youtube", label: "YouTube", type: "url" },
        ],
      },
    ],
  },
  venue: {
    type: "venue",
    title: "Create a venue profile",
    description: "Set up a venue profile for bookings, event management, staffing, and discovery.",
    createsHiringEntityType: "venue",
    sections: [
      {
        id: "venue-basics",
        title: "Venue basics",
        fields: [
          { name: "venueName", label: "Venue name", type: "text", required: true },
          { name: "venueType", label: "Venue type", type: "select", options: ["Club", "Theater", "Festival Site", "Warehouse", "Restaurant/Bar", "Outdoor Space", "Other"] },
          { name: "capacity", label: "Capacity", type: "number" },
          { name: "address", label: "Address", type: "text" },
        ],
      },
      {
        id: "venue-operations",
        title: "Operations",
        fields: [
          { name: "amenities", label: "Amenities", type: "multiselect", options: ["Stage", "Sound", "Lighting", "Green Room", "Bar", "Kitchen", "Parking", "ADA Access"] },
          { name: "bookingEmail", label: "Booking email", type: "email" },
          { name: "bookingNotes", label: "Booking notes", type: "textarea" },
        ],
      },
    ],
  },
  organization: {
    type: "organization",
    title: "Create an organization profile",
    description: "Set up a company, agency, vendor, or event services organization.",
    createsHiringEntityType: "organization",
    sections: [
      {
        id: "organization-basics",
        title: "Organization basics",
        fields: [
          { name: "organizationName", label: "Organization name", type: "text", required: true },
          { name: "services", label: "Services", type: "multiselect", options: ["Staffing", "Security", "Production", "Promotion", "Rentals", "Catering", "Bar Operations", "Artist Management"] },
          { name: "description", label: "Description", type: "textarea" },
          { name: "website", label: "Website", type: "url" },
        ],
      },
    ],
  },
  performanceAgency: {
    type: "performanceAgency",
    title: "Create a performance agency profile",
    description: "Represent rosters, booking contacts, and performance services.",
    createsHiringEntityType: "organization",
    sections: [
      {
        id: "agency-basics",
        title: "Agency basics",
        fields: [
          { name: "agencyName", label: "Agency name", type: "text", required: true },
          { name: "rosterDescription", label: "Roster description", type: "textarea" },
          { name: "bookingEmail", label: "Booking email", type: "email" },
        ],
      },
    ],
  },
  staffingAgency: {
    type: "staffingAgency",
    title: "Create a staffing agency profile",
    description: "Manage event crew, staff rosters, and hiring workflows.",
    createsHiringEntityType: "organization",
    sections: [
      {
        id: "staffing-basics",
        title: "Staffing basics",
        fields: [
          { name: "agencyName", label: "Agency name", type: "text", required: true },
          { name: "staffingCategories", label: "Staffing categories", type: "multiselect", options: ["Security", "Bartenders", "Street Team", "Production", "Stagehands", "Hospitality", "Box Office"] },
          { name: "coverageMarkets", label: "Coverage markets", type: "textarea" },
        ],
      },
    ],
  },
  rentalCompany: {
    type: "rentalCompany",
    title: "Create a rental company profile",
    description: "List rental categories, inventory contacts, and service areas.",
    createsHiringEntityType: "organization",
    sections: [
      {
        id: "rental-basics",
        title: "Rental basics",
        fields: [
          { name: "companyName", label: "Company name", type: "text", required: true },
          { name: "rentalCategories", label: "Rental categories", type: "multiselect", options: ["Audio", "Lighting", "Backline", "Staging", "Tents", "Furniture", "Power", "Video"] },
          { name: "rentalTerms", label: "Rental terms", type: "textarea" },
        ],
      },
    ],
  },
  productionCompany: {
    type: "productionCompany",
    title: "Create a production company profile",
    description: "Showcase event production services, portfolio, and crew capabilities.",
    createsHiringEntityType: "organization",
    sections: [
      {
        id: "production-basics",
        title: "Production basics",
        fields: [
          { name: "companyName", label: "Company name", type: "text", required: true },
          { name: "services", label: "Production services", type: "multiselect", options: ["Full Production", "Audio", "Lighting", "Video", "Stage Management", "Site Ops", "Permitting"] },
          { name: "portfolioUrl", label: "Portfolio URL", type: "url" },
        ],
      },
    ],
  },
  promoter: {
    type: "promoter",
    title: "Create a promoter profile",
    description: "Set up a promotion profile for events, ticketing, audiences, and marketing.",
    createsHiringEntityType: "organization",
    sections: [
      {
        id: "promoter-basics",
        title: "Promoter basics",
        fields: [
          { name: "promoterName", label: "Promoter name", type: "text", required: true },
          { name: "markets", label: "Markets", type: "textarea" },
          { name: "genres", label: "Genres", type: "multiselect", options: ["Electronic", "Hip-Hop", "Rock", "Pop", "Country", "Latin", "Comedy", "Community"] },
          { name: "ticketingUrl", label: "Ticketing URL", type: "url" },
        ],
      },
    ],
  },
}

interface GetPersonaOnboardingConfigArgs {
  type?: PersonaOnboardingType
}

export function getPersonaOnboardingConfig({ type = "individual" }: GetPersonaOnboardingConfigArgs): PersonaOnboardingConfig {
  return PERSONA_ONBOARDING_CONFIGS[type]
}
