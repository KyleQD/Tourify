import { 
  Zap, Droplets, Building, Users, Utensils, Camera, 
  MapPin, Navigation, TreePine, Shield, Wifi, Car,
  Music, Home, Bed, Coffee, Gift, Heart, Star,
  Square, Circle, Triangle, Hexagon, Tent
} from "lucide-react"

export interface CannedElement {
  id: string
  name: string
  category: string
  subcategory: string
  icon: React.ComponentType<any>
  width: number
  height: number
  color: string
  strokeColor: string
  capacity?: number
  powerRequirements?: string
  waterRequirements?: string
  accessibility?: boolean
  description: string
  properties: {
    [key: string]: any
  }
  variants?: CannedElement[]
}

export const CANNED_ELEMENTS: CannedElement[] = [
  // === POWER & ELECTRICAL ===
  {
    id: 'generator-50kw',
    name: '50kW Generator',
    category: 'infrastructure',
    subcategory: 'power',
    icon: Zap,
    width: 80,
    height: 60,
    color: '#fbbf24',
    strokeColor: '#f59e0b',
    powerRequirements: '50kW',
    description: 'Portable 50kW generator for medium events',
    properties: {
      fuel_type: 'diesel',
      noise_level: '78dB',
      connections: 8,
      voltage: '110V/220V',
      runtime: '8-12 hours',
      weight: '1200lbs'
    }
  },
  {
    id: 'generator-100kw',
    name: '100kW Generator',
    category: 'infrastructure',
    subcategory: 'power',
    icon: Zap,
    width: 100,
    height: 80,
    color: '#fbbf24',
    strokeColor: '#f59e0b',
    powerRequirements: '100kW',
    description: 'Heavy-duty 100kW generator for large events',
    properties: {
      fuel_type: 'diesel',
      noise_level: '82dB',
      connections: 12,
      voltage: '110V/220V/480V',
      runtime: '10-14 hours',
      weight: '2000lbs'
    }
  },
  {
    id: 'power-distribution',
    name: 'Power Distribution Box',
    category: 'infrastructure',
    subcategory: 'power',
    icon: Zap,
    width: 40,
    height: 30,
    color: '#ef4444',
    strokeColor: '#dc2626',
    description: 'Central power distribution with multiple outlets',
    properties: {
      outlets: 16,
      voltage: '110V',
      amperage: '20A per outlet',
      gfi_protected: true,
      weather_resistant: true
    }
  },

  // === WATER & PLUMBING ===
  {
    id: 'water-station',
    name: 'Water Station',
    category: 'infrastructure',
    subcategory: 'water',
    icon: Droplets,
    width: 60,
    height: 40,
    color: '#3b82f6',
    strokeColor: '#2563eb',
    waterRequirements: 'City water connection',
    description: 'Drinking water station with hot/cold options',
    properties: {
      capacity: '100 gallons',
      temperature: 'hot/cold',
      filtration: true,
      dispensing_rate: '2 gallons/minute',
      maintenance_required: 'daily'
    }
  },
  {
    id: 'portable-restroom',
    name: 'Portable Restroom',
    category: 'infrastructure',
    subcategory: 'bathrooms',
    icon: Building,
    width: 50,
    height: 40,
    color: '#8b5cf6',
    strokeColor: '#7c3aed',
    capacity: 4,
    accessibility: true,
    description: 'ADA-compliant portable restroom',
    properties: {
      capacity: '4-person',
      ada_compliant: true,
      amenities: ['hand_washing', 'mirror'],
      maintenance: 'daily',
      waste_capacity: '60 gallons'
    }
  },
  {
    id: 'luxury-restroom',
    name: 'Luxury Restroom',
    category: 'infrastructure',
    subcategory: 'bathrooms',
    icon: Building,
    width: 60,
    height: 50,
    color: '#8b5cf6',
    strokeColor: '#7c3aed',
    capacity: 2,
    description: 'Premium portable restroom with amenities',
    properties: {
      capacity: '2-person',
      amenities: ['mirror', 'sink', 'lighting', 'climate_control'],
      maintenance: 'twice daily',
      waste_capacity: '40 gallons'
    }
  },

  // === TENTS & SHELTERS ===
  {
    id: 'vip-tent',
    name: 'VIP Tent',
    category: 'venue',
    subcategory: 'tents',
    icon: Tent,
    width: 120,
    height: 80,
    color: '#10b981',
    strokeColor: '#059669',
    capacity: 50,
    description: 'Premium VIP tent with full amenities',
    properties: {
      capacity: '50-person',
      amenities: ['catering', 'security', 'climate_control'],
      flooring: 'hardwood',
      lighting: 'LED',
      power_requirements: '20kW'
    }
  },
  {
    id: 'merchandise-tent',
    name: 'Merchandise Tent',
    category: 'venue',
    subcategory: 'tents',
    icon: Gift,
    width: 100,
    height: 60,
    color: '#f59e0b',
    strokeColor: '#d97706',
    capacity: 100,
    description: 'Merchandise sales tent with storage',
    properties: {
      capacity: '100-person',
      storage: true,
      security: true,
      lighting: 'LED',
      power_requirements: '5kW'
    }
  },
  {
    id: 'information-tent',
    name: 'Information Tent',
    category: 'venue',
    subcategory: 'tents',
    icon: MapPin,
    width: 80,
    height: 60,
    color: '#06b6d4',
    strokeColor: '#0891b2',
    capacity: 20,
    description: 'Information and customer service tent',
    properties: {
      capacity: '20-person',
      digital_signs: true,
      wifi: true,
      seating: true,
      power_requirements: '3kW'
    }
  },
  {
    id: 'check-in-tent',
    name: 'Check-In Tent',
    category: 'venue',
    subcategory: 'tents',
    icon: Users,
    width: 150,
    height: 80,
    color: '#8b5cf6',
    strokeColor: '#7c3aed',
    capacity: 200,
    description: 'Event check-in and registration tent',
    properties: {
      capacity: '200-person',
      queuing: true,
      multiple_stations: 4,
      wifi: true,
      power_requirements: '8kW'
    }
  },
  {
    id: 'medical-tent',
    name: 'Medical Tent',
    category: 'venue',
    subcategory: 'tents',
    icon: Heart,
    width: 80,
    height: 60,
    color: '#ef4444',
    strokeColor: '#dc2626',
    capacity: 10,
    description: 'First aid and medical assistance tent',
    properties: {
      capacity: '10-person',
      equipment: ['first_aid', 'stretcher', 'oxygen'],
      accessibility: true,
      emergency_access: true,
      power_requirements: '2kW'
    }
  },

  // === STAGES & PERFORMANCE ===
  {
    id: 'main-stage',
    name: 'Main Stage',
    category: 'performance',
    subcategory: 'stages',
    icon: Music,
    width: 200,
    height: 150,
    color: '#ec4899',
    strokeColor: '#db2777',
    capacity: 5000,
    description: 'Main performance stage for headliners',
    properties: {
      size: '40x30ft',
      height: '8ft',
      load_capacity: '5000lbs',
      sound_system: true,
      lighting_rig: true,
      power_requirements: '100kW'
    }
  },
  {
    id: 'dj-booth',
    name: 'DJ Booth',
    category: 'performance',
    subcategory: 'stages',
    icon: Music,
    width: 100,
    height: 80,
    color: '#ec4899',
    strokeColor: '#db2777',
    capacity: 1000,
    description: 'DJ performance stage with sound system',
    properties: {
      size: '20x15ft',
      height: '6ft',
      sound_system: true,
      dj_equipment: true,
      lighting: 'LED',
      power_requirements: '25kW'
    }
  },
  {
    id: 'acoustic-stage',
    name: 'Acoustic Stage',
    category: 'performance',
    subcategory: 'stages',
    icon: Music,
    width: 80,
    height: 60,
    color: '#ec4899',
    strokeColor: '#db2777',
    capacity: 200,
    description: 'Intimate acoustic performance stage',
    properties: {
      size: '15x10ft',
      height: '4ft',
      natural_sound: true,
      minimal_equipment: true,
      power_requirements: '5kW'
    }
  },

  // === SEATING & FURNITURE ===
  {
    id: 'folding-chair',
    name: 'Folding Chair',
    category: 'furniture',
    subcategory: 'seating',
    icon: Square,
    width: 20,
    height: 20,
    color: '#6b7280',
    strokeColor: '#4b5563',
    capacity: 1,
    description: 'Standard folding chair',
    properties: {
      capacity: '1-person',
      stackable: true,
      weight: '8lbs',
      material: 'steel_frame',
      padding: 'minimal'
    }
  },
  {
    id: 'vip-chair',
    name: 'VIP Chair',
    category: 'furniture',
    subcategory: 'seating',
    icon: Square,
    width: 25,
    height: 25,
    color: '#8b5cf6',
    strokeColor: '#7c3aed',
    capacity: 1,
    description: 'Premium VIP seating',
    properties: {
      capacity: '1-person',
      cushion: true,
      armrests: true,
      material: 'premium_fabric',
      weight: '15lbs'
    }
  },
  {
    id: 'accessible-chair',
    name: 'Accessible Chair',
    category: 'furniture',
    subcategory: 'seating',
    icon: Square,
    width: 30,
    height: 25,
    color: '#10b981',
    strokeColor: '#059669',
    capacity: 1,
    accessibility: true,
    description: 'ADA-compliant accessible seating',
    properties: {
      capacity: '1-person',
      ada_compliant: true,
      armrests: true,
      easy_transfer: true,
      material: 'premium_fabric'
    }
  },
  {
    id: 'round-table',
    name: 'Round Table',
    category: 'furniture',
    subcategory: 'tables',
    icon: Circle,
    width: 60,
    height: 60,
    color: '#6b7280',
    strokeColor: '#4b5563',
    capacity: 8,
    description: '8-person round table',
    properties: {
      capacity: '8-person',
      diameter: '60in',
      height: '30in',
      material: 'wood',
      weight: '45lbs'
    }
  },
  {
    id: 'rectangular-table',
    name: 'Rectangular Table',
    category: 'furniture',
    subcategory: 'tables',
    icon: Square,
    width: 96,
    height: 30,
    color: '#6b7280',
    strokeColor: '#4b5563',
    capacity: 10,
    description: '10-person rectangular table',
    properties: {
      capacity: '10-person',
      size: '96x30in',
      height: '30in',
      material: 'wood',
      weight: '60lbs'
    }
  },
  {
    id: 'cocktail-table',
    name: 'Cocktail Table',
    category: 'furniture',
    subcategory: 'tables',
    icon: Circle,
    width: 30,
    height: 42,
    color: '#f59e0b',
    strokeColor: '#d97706',
    capacity: 4,
    description: 'High cocktail table for standing',
    properties: {
      capacity: '4-person',
      diameter: '30in',
      height: '42in',
      material: 'wood',
      weight: '25lbs'
    }
  },

  // === FOOD & BEVERAGE ===
  {
    id: 'food-truck',
    name: 'Food Truck',
    category: 'food',
    subcategory: 'vendors',
    icon: Utensils,
    width: 120,
    height: 80,
    color: '#f97316',
    strokeColor: '#ea580c',
    description: 'Mobile food service truck',
    properties: {
      capacity: '100 meals/hour',
      cuisine_type: 'customizable',
      power_requirements: '15kW',
      water_requirements: 'yes',
      waste_disposal: true
    }
  },
  {
    id: 'bar-station',
    name: 'Bar Station',
    category: 'food',
    subcategory: 'beverages',
    icon: Coffee,
    width: 80,
    height: 60,
    color: '#84cc16',
    strokeColor: '#65a30d',
    description: 'Full-service bar with bartender',
    properties: {
      capacity: '50 drinks/hour',
      refrigeration: true,
      ice_machine: true,
      power_requirements: '8kW',
      water_requirements: 'yes'
    }
  },

  // === SECURITY & SAFETY ===
  {
    id: 'security-checkpoint',
    name: 'Security Checkpoint',
    category: 'security',
    subcategory: 'checkpoints',
    icon: Shield,
    width: 100,
    height: 80,
    color: '#ef4444',
    strokeColor: '#dc2626',
    description: 'Entry security and bag check',
    properties: {
      capacity: '200 people/hour',
      metal_detector: true,
      bag_check: true,
      staff_required: 4,
      power_requirements: '3kW'
    }
  },
  {
    id: 'emergency-exit',
    name: 'Emergency Exit',
    category: 'security',
    subcategory: 'safety',
    icon: Navigation,
    width: 40,
    height: 80,
    color: '#ef4444',
    strokeColor: '#dc2626',
    description: 'Emergency exit and evacuation route',
    properties: {
      width: '4ft',
      height: '8ft',
      emergency_lighting: true,
      panic_bar: true,
      alarm_system: true
    }
  },

  // === TRANSPORTATION ===
  {
    id: 'parking-lot',
    name: 'Parking Lot',
    category: 'transportation',
    subcategory: 'parking',
    icon: Car,
    width: 200,
    height: 150,
    color: '#64748b',
    strokeColor: '#475569',
    capacity: 100,
    description: 'General parking area',
    properties: {
      capacity: '100 cars',
      surface: 'asphalt',
      lighting: true,
      security: true,
      accessibility_spaces: 5
    }
  },
  {
    id: 'vip-parking',
    name: 'VIP Parking',
    category: 'transportation',
    subcategory: 'parking',
    icon: Star,
    width: 100,
    height: 80,
    color: '#fbbf24',
    strokeColor: '#f59e0b',
    capacity: 25,
    description: 'Premium VIP parking area',
    properties: {
      capacity: '25 cars',
      surface: 'asphalt',
      valet_service: true,
      security: true,
      lighting: 'premium'
    }
  },

  // === TECHNOLOGY ===
  {
    id: 'wifi-tower',
    name: 'WiFi Tower',
    category: 'technology',
    subcategory: 'connectivity',
    icon: Wifi,
    width: 20,
    height: 40,
    color: '#06b6d4',
    strokeColor: '#0891b2',
    description: 'High-capacity WiFi access point',
    properties: {
      range: '300ft radius',
      capacity: '500 users',
      speed: '100Mbps',
      power_requirements: '2kW',
      backup_battery: true
    }
  },
  {
    id: 'camera-mount',
    name: 'Security Camera',
    category: 'technology',
    subcategory: 'surveillance',
    icon: Camera,
    width: 15,
    height: 15,
    color: '#8b5cf6',
    strokeColor: '#7c3aed',
    description: 'High-definition security camera',
    properties: {
      resolution: '4K',
      night_vision: true,
      pan_tilt_zoom: true,
      recording: true,
      power_requirements: '100W'
    }
  }
]

export const ELEMENT_CATEGORIES = {
  infrastructure: {
    name: 'Infrastructure',
    icon: Building,
    subcategories: {
      power: 'Power & Electrical',
      water: 'Water & Plumbing',
      bathrooms: 'Restrooms'
    }
  },
  venue: {
    name: 'Venue Elements',
    icon: Tent,
    subcategories: {
      tents: 'Tents & Shelters',
      stages: 'Stages & Performance'
    }
  },
  furniture: {
    name: 'Furniture',
    icon: Square,
    subcategories: {
      seating: 'Seating',
      tables: 'Tables'
    }
  },
  performance: {
    name: 'Performance',
    icon: Music,
    subcategories: {
      stages: 'Stages',
      sound: 'Sound Systems',
      lighting: 'Lighting'
    }
  },
  food: {
    name: 'Food & Beverage',
    icon: Utensils,
    subcategories: {
      vendors: 'Food Vendors',
      beverages: 'Beverage Stations'
    }
  },
  security: {
    name: 'Security & Safety',
    icon: Shield,
    subcategories: {
      checkpoints: 'Security Checkpoints',
      safety: 'Safety Equipment'
    }
  },
  transportation: {
    name: 'Transportation',
    icon: Car,
    subcategories: {
      parking: 'Parking',
      loading: 'Loading Areas'
    }
  },
  technology: {
    name: 'Technology',
    icon: Wifi,
    subcategories: {
      connectivity: 'WiFi & Internet',
      surveillance: 'Security Cameras'
    }
  }
}

export function getElementsByCategory(category: string): CannedElement[] {
  return CANNED_ELEMENTS.filter(element => element.category === category)
}

export function getElementsBySubcategory(category: string, subcategory: string): CannedElement[] {
  return CANNED_ELEMENTS.filter(element => 
    element.category === category && element.subcategory === subcategory
  )
}

export function getElementById(id: string): CannedElement | undefined {
  return CANNED_ELEMENTS.find(element => element.id === id)
}

export function searchElements(query: string): CannedElement[] {
  const lowercaseQuery = query.toLowerCase()
  return CANNED_ELEMENTS.filter(element => 
    element.name.toLowerCase().includes(lowercaseQuery) ||
    element.description.toLowerCase().includes(lowercaseQuery) ||
    element.category.toLowerCase().includes(lowercaseQuery) ||
    element.subcategory.toLowerCase().includes(lowercaseQuery)
  )
}
