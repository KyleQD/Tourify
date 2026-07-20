// Quarantined: do not import from production venue ops pages.
// Prefer live Supabase data via venueService /api/venue/*.
// This file contains mock data for legacy demos only.
import type { ProfileData } from "./types"

// Define types for the mock data
export interface User {
  id: string
  name: string
  email: string
  image: string
  bio: string
  location: string
  website: string
  interests: string[]
  skills: string[]
  createdAt: string
  updatedAt: string
  professions?: ProfessionAssignment[]
  contentItems?: ContentItem[]
}

export interface Profession {
  id: string
  name: string
  category: string
  description: string
  skillsRequired: string[]
}

export interface ProfessionAssignment {
  professionId: string
  userId: string
  yearsExperience: number
  isPrimary: boolean
  skills: string[]
  portfolioItems: string[]
}

export interface ContentItem {
  id: string
  userId: string
  title: string
  description: string
  contentType: string
  url: string
  thumbnailUrl: string
  tags: string[]
  professionId: string
  createdAt: string
  updatedAt: string
  isPublic: boolean
  likes: number
  views: number
  comments: number
}

// Export the default profile that's used throughout the application
export const defaultProfile: ProfileData = {
  id: "1",
  fullName: "Alex Martinez",
  username: "alexbeats",
  location: "Los Angeles, CA",
  bio: "Live music professional with 8+ years experience managing tours, festivals, and concert productions. Specializing in artist management and live event coordination across North America and Europe.",
  title: "Tour Manager",
  avatar: "/images/alex-profile.jpeg",
  stats: {
    tours: 56,
    connections: 2300,
    rating: 4.8,
  },
  skills: [
    "Tour Management",
    "Artist Relations",
    "Event Production",
    "Sound Engineering",
    "Contract Negotiation",
    "Stage Management",
    "Budget Planning",
    "Venue Coordination",
    "Talent Booking",
  ],
  experience: [
    {
      id: "exp1",
      title: "Senior Tour Manager",
      company: "Rhythm Nation Entertainment",
      period: "2019 - Present",
      description:
        "Managing national and international tours for multiple platinum-selling artists. Coordinating logistics, budgets, and personnel for 20+ venue tours.",
    },
    {
      id: "exp2",
      title: "Production Coordinator",
      company: "LiveSound Productions",
      period: "2017 - 2019",
      description:
        "Coordinated technical aspects of live music events, including sound, lighting, and stage setup for festivals and concert venues.",
    },
    {
      id: "exp3",
      title: "Artist Relations Manager",
      company: "Sunset Strip Music Festival",
      period: "2015 - 2017",
      description:
        "Managed artist hospitality, scheduling, and backstage operations for annual music festival featuring 40+ artists across multiple stages.",
    },
  ],
  certifications: [
    {
      id: "cert1",
      title: "Certified Event Manager",
      organization: "International Live Events Association",
      year: "2018",
    },
    {
      id: "cert2",
      title: "Live Sound Engineering",
      organization: "Berklee College of Music",
      year: "2016",
    },
    {
      id: "cert3",
      title: "Concert & Touring Safety",
      organization: "Event Safety Alliance",
      year: "2017",
    },
  ],
  gallery: Array(9)
    .fill(null)
    .map((_, i) => ({
      id: `gallery${i + 1}`,
      url: `/placeholder.svg?height=120&width=120&text=Concert+${i + 1}`,
      alt: `Concert photo ${i + 1}`,
    })),
  events: [
    {
      id: "event1",
      title: "Neon Dreams World Tour",
      date: "Jan - May 2023",
      venues: 32,
      rating: 5,
    },
    {
      id: "event2",
      title: "Summer Soundwave Festival",
      date: "July 15-17, 2022",
      venues: 4,
      rating: 4.9,
    },
    {
      id: "event3",
      title: "Acoustic Sessions Tour",
      date: "Sept - Nov 2022",
      venues: 24,
      rating: 4.8,
    },
    {
      id: "event4",
      title: "Electronic Horizons Festival",
      date: "August 5-7, 2022",
      venues: 3,
      rating: 4.7,
    },
  ],
  reviews: [
    {
      id: "review1",
      name: "Skylar James",
      position: "Lead Singer, The Resonants",
      date: "August 2023",
      comment:
        "Alex managed our 30-city tour flawlessly. From logistics to crisis management, everything was handled with professionalism. Our band could focus entirely on the music.",
      rating: 5,
    },
    {
      id: "review2",
      name: "Marcus Chen",
      position: "Festival Director, Summer Soundwave",
      date: "July 2022",
      comment:
        "Having Alex coordinate our main stage was the best decision we made. Perfect timing, seamless transitions between acts, and excellent communication with all artists.",
      rating: 5,
    },
    {
      id: "review3",
      name: "Olivia Rodriguez",
      position: "Venue Manager, The Echo",
      date: "May 2022",
      comment:
        "Alex is the most organized tour manager we've worked with. Advance planning was detailed, load-in was efficient, and the show ran perfectly on schedule.",
      rating: 4.7,
    },
  ],
  theme: "dark",
  isPublic: true,
  connections: [],
  pendingConnections: [],
  blockedUsers: [],
}

// Mock professions data
export const mockProfessions: Profession[] = [
  {
    id: "prof-1",
    name: "Tour Manager",
    category: "Tourism",
    description: "Leads tours and provides information about attractions, history, and culture.",
    skillsRequired: ["Communication", "Local Knowledge", "Languages", "Customer Service"],
  },
  {
    id: "prof-2",
    name: "Travel Photographer",
    category: "Media",
    description: "Captures images of destinations, landmarks, and travel experiences.",
    skillsRequired: ["Photography", "Editing", "Composition", "Visual Storytelling"],
  },
  {
    id: "prof-3",
    name: "Travel Writer",
    category: "Media",
    description: "Creates written content about travel destinations and experiences.",
    skillsRequired: ["Writing", "Research", "Storytelling", "SEO"],
  },
  {
    id: "prof-4",
    name: "Event Planner",
    category: "Events",
    description: "Organizes and coordinates events, conferences, and gatherings.",
    skillsRequired: ["Organization", "Budgeting", "Negotiation", "Logistics"],
  },
  {
    id: "prof-5",
    name: "Musician",
    category: "Entertainment",
    description: "Performs music at venues, events, and festivals.",
    skillsRequired: ["Musical Talent", "Performance", "Composition", "Instrument Proficiency"],
  },
  {
    id: "prof-6",
    name: "Culinary Expert",
    category: "Food & Beverage",
    description: "Creates and presents food experiences, recipes, and culinary tours.",
    skillsRequired: ["Cooking", "Food Knowledge", "Presentation", "Creativity"],
  },
  {
    id: "prof-7",
    name: "Adventure Guide",
    category: "Tourism",
    description: "Leads outdoor and adventure activities like hiking, climbing, and water sports.",
    skillsRequired: ["Safety Training", "First Aid", "Physical Fitness", "Risk Management"],
  },
  {
    id: "prof-8",
    name: "Cultural Consultant",
    category: "Education",
    description: "Provides expertise on local customs, traditions, and cultural practices.",
    skillsRequired: ["Cultural Knowledge", "Research", "Communication", "Languages"],
  },
]

// Mock user data
export const mockUsersBase: User[] = [
  {
    id: "user-1",
    name: "Alice Wonderland",
    email: "alice@example.com",
    image: "/alice.jpg",
    bio: "Travel enthusiast and tour guide. Exploring the world one adventure at a time.",
    location: "Machu Picchu, Peru",
    website: "https://alice.example.com",
    interests: ["Hiking", "Photography", "Culture", "History"],
    skills: ["Tour guiding", "Photography", "Spanish", "History"],
    createdAt: "2023-01-15T12:00:00Z",
    updatedAt: "2023-09-20T14:30:00Z",
  },
  {
    id: "user-2",
    name: "Bob The Builder",
    email: "bob@example.com",
    image: "/bob.jpg",
    bio: "Passionate about street food and sharing culinary experiences.",
    location: "Bangkok, Thailand",
    website: "https://bob.example.com",
    interests: ["Food", "Travel", "Cooking", "Culture"],
    skills: ["Cooking", "Video Editing", "Thai", "Social Media"],
    createdAt: "2023-02-28T18:45:00Z",
    updatedAt: "2023-09-20T14:30:00Z",
  },
  {
    id: "user-3",
    name: "Charlie Chaplin",
    email: "charlie@example.com",
    image: "/charlie.jpg",
    bio: "Dedicated to preserving and sharing traditional Balinese music.",
    location: "Bali, Indonesia",
    website: "https://charlie.example.com",
    interests: ["Music", "Culture", "Travel", "Performance"],
    skills: ["Gamelan", "Composition", "Performance", "Teaching"],
    createdAt: "2023-03-10T09:00:00Z",
    updatedAt: "2023-09-20T14:30:00Z",
  },
  {
    id: "user-4",
    name: "Diana Prince",
    email: "diana@example.com",
    image: "/diana.jpg",
    bio: "Capturing the architectural beauty of Barcelona through photography.",
    location: "Barcelona, Spain",
    website: "https://diana.example.com",
    interests: ["Architecture", "Photography", "Travel", "Art"],
    skills: ["Photography", "Editing", "Composition", "Visual Storytelling"],
    createdAt: "2023-04-01T15:20:00Z",
    updatedAt: "2023-09-20T14:30:00Z",
  },
]

// Mock content items
export const mockContentItems: ContentItem[] = [
  {
    id: "content-1",
    userId: "user-1",
    title: "Sunset at Machu Picchu",
    description: "Captured this amazing sunset while guiding a tour at Machu Picchu",
    contentType: "image",
    url: "/placeholder.svg?height=600&width=800",
    thumbnailUrl: "/placeholder.svg?height=300&width=400",
    tags: ["peru", "machupicchu", "sunset", "travel"],
    professionId: "prof-1",
    createdAt: "2023-05-15T14:30:00Z",
    updatedAt: "2023-05-15T14:30:00Z",
    isPublic: true,
    likes: 245,
    views: 1200,
    comments: 42,
  },
  {
    id: "content-2",
    userId: "user-2",
    title: "Street Food Tour in Bangkok",
    description: "A video guide to the best street food spots in Bangkok",
    contentType: "video",
    url: "/placeholder.svg?height=720&width=1280",
    thumbnailUrl: "/placeholder.svg?height=360&width=640",
    tags: ["bangkok", "thailand", "streetfood", "foodtour"],
    professionId: "prof-6",
    createdAt: "2023-06-22T09:15:00Z",
    updatedAt: "2023-06-22T09:15:00Z",
    isPublic: true,
    likes: 189,
    views: 3400,
    comments: 78,
  },
  {
    id: "content-3",
    userId: "user-3",
    title: "Traditional Music of Bali",
    description: "Audio recording of a traditional Balinese gamelan performance",
    contentType: "audio",
    url: "/placeholder.svg?height=400&width=400",
    thumbnailUrl: "/placeholder.svg?height=200&width=200",
    tags: ["bali", "indonesia", "music", "gamelan", "traditional"],
    professionId: "prof-5",
    createdAt: "2023-04-10T16:45:00Z",
    updatedAt: "2023-04-10T16:45:00Z",
    isPublic: true,
    likes: 112,
    views: 890,
    comments: 23,
  },
  {
    id: "content-4",
    userId: "user-1",
    title: "Hiking Guide: Inca Trail",
    description: "Comprehensive guide to hiking the Inca Trail to Machu Picchu",
    contentType: "document",
    url: "/placeholder.svg?height=1000&width=800",
    thumbnailUrl: "/placeholder.svg?height=500&width=400",
    tags: ["peru", "incatrail", "hiking", "guide", "machupicchu"],
    professionId: "prof-7",
    createdAt: "2023-03-05T11:20:00Z",
    updatedAt: "2023-03-05T11:20:00Z",
    isPublic: true,
    likes: 324,
    views: 2700,
    comments: 56,
  },
  {
    id: "content-5",
    userId: "user-4",
    title: "Architectural Wonders of Barcelona",
    description: "Photo series featuring Gaudi's architectural masterpieces",
    contentType: "image",
    url: "/placeholder.svg?height=600&width=800",
    thumbnailUrl: "/placeholder.svg?height=300&width=400",
    tags: ["barcelona", "spain", "architecture", "gaudi", "photography"],
    professionId: "prof-2",
    createdAt: "2023-07-18T13:10:00Z",
    updatedAt: "2023-07-18T13:10:00Z",
    isPublic: true,
    likes: 276,
    views: 1850,
    comments: 34,
  },
]

// Update mockUsers to include professions and content items
export const mockUsers = [
  {
    ...mockUsersBase[0],
    professions: [
      {
        professionId: "prof-1",
        userId: "user-1",
        yearsExperience: 5,
        isPrimary: true,
        skills: ["Inca Trail Expert", "Spanish Language", "History Knowledge", "First Aid Certified"],
        portfolioItems: ["content-1", "content-4"],
      },
      {
        professionId: "prof-7",
        userId: "user-1",
        yearsExperience: 3,
        isPrimary: false,
        skills: ["Mountain Climbing", "Wilderness Survival", "Navigation", "Emergency Response"],
        portfolioItems: ["content-4"],
      },
    ],
    contentItems: [mockContentItems[0], mockContentItems[3]],
  },
  {
    ...mockUsersBase[1],
    professions: [
      {
        professionId: "prof-6",
        userId: "user-2",
        yearsExperience: 2,
        isPrimary: true,
        skills: ["Thai Cuisine", "Street Food Expertise", "Video Production", "Social Media Marketing"],
        portfolioItems: ["content-2"],
      },
    ],
    contentItems: [mockContentItems[1]],
  },
  {
    ...mockUsersBase[2],
    professions: [
      {
        professionId: "prof-5",
        userId: "user-3",
        yearsExperience: 10,
        isPrimary: true,
        skills: ["Gamelan Performance", "Music Composition", "Cultural Preservation", "Instrument Making"],
        portfolioItems: ["content-3"],
      },
    ],
    contentItems: [mockContentItems[2]],
  },
  {
    ...mockUsersBase[3],
    professions: [
      {
        professionId: "prof-2",
        userId: "user-4",
        yearsExperience: 7,
        isPrimary: true,
        skills: ["Architectural Photography", "Photo Editing", "Visual Storytelling", "Social Media Promotion"],
        portfolioItems: ["content-5"],
      },
    ],
    contentItems: [mockContentItems[4]],
  },
]
