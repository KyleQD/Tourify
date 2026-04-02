export interface AdminDashboardStats {
  totalTours: number
  activeTours: number
  totalEvents: number
  upcomingEvents: number
  totalArtists: number
  totalVenues: number
  totalRevenue: number
  monthlyRevenue: number
  ticketsSold: number
  totalCapacity: number
  staffMembers: number
  completedTasks: number
  pendingTasks: number
  averageRating: number
  totalTravelGroups: number
  totalTravelers: number
  confirmedTravelers: number
  coordinationCompletionRate: number
  fullyCoordinatedGroups: number
  activeTransportation: number
  completedTransportation: number
  logisticsCompletionRate: number
  ticketRevenue?: number
}

export interface AdminTour {
  id: string
  name: string
  status: string
  start_date: string
  end_date: string
  total_shows: number
  completed_shows: number
  revenue: number
}

export interface AdminEvent {
  id: string
  name: string
  event_date: string
  status: string
  venue: {
    name: string
    address?: string
  }
  capacity: number
  tickets_sold: number
  revenue: number
}

export interface AdminTask {
  id: string
  title: string
  description?: string
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  due_date?: string
  assigned_to?: string
  created_at: string
}

export interface AdminNotification {
  id: string
  title: string
  message: string
  type: string
  created_at: string
  read: boolean
}

export interface AdminArtist {
  id: string
  name: string
  genre: string
  status: 'active' | 'inactive' | 'pending'
  image?: string
  rating: number
  upcomingShows: number
  totalRevenue: number
  followers: number
  bio?: string
}

export interface AdminVenue {
  id: string
  name: string
  location: string
  capacity: number
  status: 'active' | 'inactive' | 'pending'
  image?: string
  rating: number
  upcomingEvents: number
  totalRevenue: number
  type: string
}

export interface AdminJobPosting {
  id: string
  title: string
  department?: string
  location?: string
  employment_type?: string
  experience_level?: string
  status: string
  created_at: string
  applications_count?: number
}

export type AdminAccountType = 'admin'

export interface ApiResponse<T> {
  success?: boolean
  data?: T
  error?: string
}
