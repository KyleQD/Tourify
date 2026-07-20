/** Relevant persona copy for UI fill agents (no DB seeding). */

export interface ArtistPersonaContent {
  key: string
  email: string
  password: string
  displayName: string
  stageName: string
  title: string
  company: string
  location: string
  bio: string
  website: string
  instagram: string
  twitter: string
  youtube: string
  spotify: string
  genres: string[]
  bookingEmail: string
  post: string
  epkOneLiner: string
  musicStyle: string
  recordLabel: string
}

export interface WorkerPersonaContent {
  key: string
  email: string
  password: string
  fullName: string
  title: string
  company: string
  location: string
  bio: string
  website: string
  linkedin: string
  instagram: string
  twitter: string
  github: string
  hourlyRate: string
  post: string
  experienceTitle: string
  experienceOrg: string
  experienceDesc: string
  certName: string
  certAuthority: string
  portfolioTitle: string
  portfolioDesc: string
}

export interface OrgPersonaContent {
  key: string
  email: string
  password: string
  organizationName: string
  description: string
  website: string
  post: string
  location: string
  fullName: string
  title: string
  bio: string
}

export const ARTISTS: ArtistPersonaContent[] = [
  {
    key: "artist1",
    email: process.env.QA_FLOW_ARTIST_1_EMAIL || "qa-flow-artist1@tourify.test",
    password: process.env.QA_FLOW_ARTIST_1_PASSWORD || "QaFlowPass123!",
    displayName: "River Quinn",
    stageName: "River Quinn",
    title: "Lead Vocals & Guitar — Pacific Signal",
    company: "Pacific Signal",
    location: "Seattle, WA",
    bio: "Frontperson of Pacific Signal. Writing coastal indie-rock for the West Coast Run — nights that feel like headlights on wet pavement.",
    website: "https://pacific-signal.tourify.test/river",
    instagram: "@riverquinn.music",
    twitter: "@riverquinn",
    youtube: "RiverQuinnMusic",
    spotify: "https://open.spotify.com/artist/riverquinn",
    genres: ["indie", "rock", "alternative"],
    bookingEmail: "river.booking@pacific-signal.test",
    post: "Pacific Signal is locking in the West Coast Run. Seattle to Vegas — who are we seeing out there? #PacificSignal #WestCoastRun",
    epkOneLiner: "Coastal indie-rock built for night drives and sold-out rooms.",
    musicStyle: "Indie rock with analog warmth and big choruses",
    recordLabel: "Independent / Pacific Signal Collective",
  },
  {
    key: "artist2",
    email: process.env.QA_FLOW_ARTIST_2_EMAIL || "qa-flow-artist2@tourify.test",
    password: process.env.QA_FLOW_ARTIST_2_PASSWORD || "QaFlowPass123!",
    displayName: "Sage Ortega",
    stageName: "Sage Ortega",
    title: "Bass & Synths — Pacific Signal",
    company: "Pacific Signal",
    location: "Portland, OR",
    bio: "Low-end architect for Pacific Signal. Blending bass lines with modular textures for the West Coast Run.",
    website: "https://pacific-signal.tourify.test/sage",
    instagram: "@sageortega.bass",
    twitter: "@sageortega",
    youtube: "SageOrtegaAudio",
    spotify: "https://open.spotify.com/artist/sageortega",
    genres: ["indie", "electronic", "rock"],
    bookingEmail: "sage@pacific-signal.test",
    post: "Dialing in the tour bus synth rig for Pacific Signal. Portland soundcheck energy incoming. #PacificSignal",
    epkOneLiner: "Bass + modular textures that glue the live show together.",
    musicStyle: "Indie electronic bass grooves",
    recordLabel: "Independent",
  },
  {
    key: "artist3",
    email: process.env.QA_FLOW_ARTIST_3_EMAIL || "qa-flow-artist3@tourify.test",
    password: process.env.QA_FLOW_ARTIST_3_PASSWORD || "QaFlowPass123!",
    displayName: "Morgan Hale",
    stageName: "Morgan Hale",
    title: "Drums & Production — Pacific Signal",
    company: "Pacific Signal",
    location: "Los Angeles, CA",
    bio: "Drummer and live producer for Pacific Signal. Chasing pocket, dynamics, and show-ready transitions.",
    website: "https://pacific-signal.tourify.test/morgan",
    instagram: "@morganhale.drums",
    twitter: "@morganhaledrums",
    youtube: "MorganHaleDrums",
    spotify: "https://open.spotify.com/artist/morganhale",
    genres: ["rock", "indie", "pop"],
    bookingEmail: "morgan@pacific-signal.test",
    post: "Tracking day sheets for the West Coast Run. Load-in 2pm, doors 7 — see you in the pit. #PacificSignal #TourLife",
    epkOneLiner: "Live drums and production that keep the set tight.",
    musicStyle: "Dynamic rock drumming with electronic accents",
    recordLabel: "Independent",
  },
]

export const WORKERS: WorkerPersonaContent[] = [
  {
    key: "worker1",
    email: process.env.QA_FLOW_WORKER_1_EMAIL || "qa-flow-worker1@tourify.test",
    password: process.env.QA_FLOW_WORKER_1_PASSWORD || "QaFlowPass123!",
    fullName: "Casey Stage",
    title: "Tour Stagehand",
    company: "West Coast Touring Co",
    location: "Sacramento, CA",
    bio: "Stagehand specializing in festival and club load-ins. Rigging-aware, calm under show pressure, always early for call.",
    website: "https://casey-stage.tourify.test",
    linkedin: "linkedin.com/in/casey-stage",
    instagram: "@caseystage.crew",
    twitter: "@caseystage",
    github: "github.com/casey-stage",
    hourlyRate: "35",
    post: "Excited to join the Pacific Signal West Coast Run as stagehand — ready for Seattle through Vegas. #TourCrew #PacificSignal",
    experienceTitle: "Stagehand — Festival Circuit",
    experienceOrg: "West Coast Live Ops",
    experienceDesc: "Load-in/out, deck management, and artist hospitality for 50+ shows.",
    certName: "OSHA 10 — Entertainment",
    certAuthority: "OSHA",
    portfolioTitle: "Club & amphitheater load-ins",
    portfolioDesc: "Photo log and call sheets from recent West Coast club runs.",
  },
  {
    key: "worker2",
    email: process.env.QA_FLOW_WORKER_2_EMAIL || "qa-flow-worker2@tourify.test",
    password: process.env.QA_FLOW_WORKER_2_PASSWORD || "QaFlowPass123!",
    fullName: "Jamie Security",
    title: "Tour Security Guard",
    company: "West Coast Touring Co",
    location: "San Francisco, CA",
    bio: "Event security focused on artist safety, crowd flow, and venue liaison. Clear radio etiquette and de-escalation first.",
    website: "https://jamie-security.tourify.test",
    linkedin: "linkedin.com/in/jamie-security",
    instagram: "@jamiesecurity",
    twitter: "@jamiesec",
    github: "github.com/jamie-security",
    hourlyRate: "42",
    post: "Security brief locked for Pacific Signal — soft barriers at doors, hard lines at the pit. Stay safe out there. #TourSecurity",
    experienceTitle: "Venue Security Lead",
    experienceOrg: "Bay Area Venues Collective",
    experienceDesc: "Nightly security lead for 1k–5k capacity rooms.",
    certName: "First Aid / CPR",
    certAuthority: "American Red Cross",
    portfolioTitle: "Crowd-flow plans",
    portfolioDesc: "Sample ingress/egress diagrams for amphitheater nights.",
  },
  {
    key: "worker3",
    email: process.env.QA_FLOW_WORKER_3_EMAIL || "qa-flow-worker3@tourify.test",
    password: process.env.QA_FLOW_WORKER_3_PASSWORD || "QaFlowPass123!",
    fullName: "Taylor Bar",
    title: "Tour Bartender",
    company: "West Coast Touring Co",
    location: "San Diego, CA",
    bio: "High-volume bartender for tours and festivals. Speed, inventory discipline, and guest experience.",
    website: "https://taylor-bar.tourify.test",
    linkedin: "linkedin.com/in/taylor-bar",
    instagram: "@taylorbarservice",
    twitter: "@taylorbar",
    github: "github.com/taylor-bar",
    hourlyRate: "38",
    post: "Hospitality kit packed for the West Coast Run — mocktails on the rider, espresso for call time. #TourHospitality",
    experienceTitle: "Festival Bar Lead",
    experienceOrg: "Coastal Events Hospitality",
    experienceDesc: "Ran multi-station bars for outdoor amphitheater weekends.",
    certName: "ServSafe Alcohol",
    certAuthority: "ServSafe",
    portfolioTitle: "Tour bar menus",
    portfolioDesc: "Compact high-volume cocktail list tuned for amphitheater nights.",
  },
]

export const ORG: OrgPersonaContent = {
  key: "org",
  email: process.env.QA_FLOW_ORG_EMAIL || "qa-flow-org@tourify.test",
  password: process.env.QA_FLOW_ORG_PASSWORD || "QaFlowPass123!",
  organizationName: "West Coast Touring Co",
  description:
    "Management and touring company producing Pacific Signal’s West Coast Run — routing, crew, lodging, and show-day ops from Seattle to Las Vegas.",
  website: "https://west-coast-touring.tourify.test",
  post: "West Coast Touring Co is proud to announce Pacific Signal — West Coast Run: 10 cities, one coastal route, full crew locked. #PacificSignal #TourOps",
  location: "Los Angeles, CA",
  fullName: "Alex Touring",
  title: "Tour Producer",
  bio: "Produces multi-city runs for emerging West Coast acts. Logistics-first, artist-friendly.",
}
