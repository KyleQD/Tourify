import { 
  Zap, Droplets, Building, Users, Utensils, Camera, 
  MapPin, Navigation, TreePine, Shield, Wifi, Car,
  Music, Home, Bed, Coffee, Gift, Heart, Star,
  Square, Circle, Triangle, Hexagon, Tent,
  Truck, Flame, Cigarette, Baby, Dog, Bike, Bus,
  Phone, Volume2, Lightbulb, TrafficCone, DoorOpen,
  Footprints, ArrowUpRight, Hammer, Wrench, Package,
  Ticket, Flag, Megaphone, Umbrella, Shirt,
  Trash2, Recycle, ParkingCircle, Accessibility,
  Stethoscope, Siren, ShieldAlert, BadgeCheck,
  Store, ShoppingBag, Banknote, CreditCard,
  Mic, Speaker, MonitorSpeaker, Projector
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
  },

  // === VENDOR BOOTHS ===
  {
    id: 'vendor-booth-10x10',
    name: 'Vendor Booth 10x10',
    category: 'vendors',
    subcategory: 'booths',
    icon: Store,
    width: 60,
    height: 60,
    color: '#f97316',
    strokeColor: '#ea580c',
    description: 'Standard 10x10ft vendor booth',
    properties: { size: '10x10ft', power_outlet: true, table_included: true, chairs: 2 }
  },
  {
    id: 'vendor-booth-10x20',
    name: 'Vendor Booth 10x20',
    category: 'vendors',
    subcategory: 'booths',
    icon: Store,
    width: 120,
    height: 60,
    color: '#f97316',
    strokeColor: '#ea580c',
    description: 'Double-wide 10x20ft vendor booth',
    properties: { size: '10x20ft', power_outlet: true, tables: 2, chairs: 4 }
  },
  {
    id: 'artisan-market-stall',
    name: 'Artisan Market Stall',
    category: 'vendors',
    subcategory: 'booths',
    icon: ShoppingBag,
    width: 50,
    height: 50,
    color: '#d97706',
    strokeColor: '#b45309',
    description: 'Craft and artisan market stall',
    properties: { size: '8x8ft', canopy: true, display_table: true }
  },
  {
    id: 'merch-trailer',
    name: 'Merch Trailer',
    category: 'vendors',
    subcategory: 'retail',
    icon: Truck,
    width: 100,
    height: 50,
    color: '#f59e0b',
    strokeColor: '#d97706',
    description: 'Mobile merchandise sales trailer',
    properties: { capacity: '300+ items', pos_system: true, power_requirements: '5kW' }
  },
  {
    id: 'atm-machine',
    name: 'ATM Machine',
    category: 'vendors',
    subcategory: 'financial',
    icon: Banknote,
    width: 25,
    height: 25,
    color: '#22c55e',
    strokeColor: '#16a34a',
    description: 'Cash withdrawal ATM',
    properties: { network: 'visa/mastercard', power_requirements: '500W', security: true }
  },
  {
    id: 'ticket-booth',
    name: 'Ticket Booth',
    category: 'vendors',
    subcategory: 'tickets',
    icon: Ticket,
    width: 60,
    height: 40,
    color: '#8b5cf6',
    strokeColor: '#7c3aed',
    description: 'On-site ticket sales and will-call',
    properties: { stations: 2, pos_system: true, printer: true, power_requirements: '2kW' }
  },

  // === FOOD & BEVERAGE (expanded) ===
  {
    id: 'food-vendor-tent',
    name: 'Food Vendor Tent',
    category: 'food',
    subcategory: 'vendors',
    icon: Utensils,
    width: 80,
    height: 60,
    color: '#f97316',
    strokeColor: '#ea580c',
    description: 'Covered food vendor with cooking area',
    properties: { size: '15x10ft', fire_extinguisher: true, power_requirements: '10kW', water: true }
  },
  {
    id: 'bbq-grill-station',
    name: 'BBQ Grill Station',
    category: 'food',
    subcategory: 'vendors',
    icon: Flame,
    width: 60,
    height: 40,
    color: '#dc2626',
    strokeColor: '#b91c1c',
    description: 'Outdoor BBQ grilling station',
    properties: { fuel: 'propane', fire_extinguisher: true, capacity: '50 meals/hour' }
  },
  {
    id: 'coffee-cart',
    name: 'Coffee Cart',
    category: 'food',
    subcategory: 'beverages',
    icon: Coffee,
    width: 40,
    height: 30,
    color: '#78350f',
    strokeColor: '#92400e',
    description: 'Mobile espresso and coffee cart',
    properties: { capacity: '80 drinks/hour', espresso_machine: true, power_requirements: '3kW' }
  },
  {
    id: 'ice-cream-stand',
    name: 'Ice Cream Stand',
    category: 'food',
    subcategory: 'vendors',
    icon: Utensils,
    width: 50,
    height: 40,
    color: '#ec4899',
    strokeColor: '#db2777',
    description: 'Frozen treats and ice cream stand',
    properties: { freezer: true, power_requirements: '3kW' }
  },
  {
    id: 'water-refill-station',
    name: 'Water Refill Station',
    category: 'food',
    subcategory: 'beverages',
    icon: Droplets,
    width: 30,
    height: 30,
    color: '#0ea5e9',
    strokeColor: '#0284c7',
    description: 'Free water bottle refill station',
    properties: { capacity: '500 gallons', filtered: true, water_connection: true }
  },

  // === ESSENTIAL SERVICES ===
  {
    id: 'first-aid-station',
    name: 'First Aid Station',
    category: 'essential_services',
    subcategory: 'medical',
    icon: Stethoscope,
    width: 60,
    height: 50,
    color: '#ef4444',
    strokeColor: '#dc2626',
    description: 'Staffed first aid and medical station',
    properties: { staff: 2, equipment: ['AED', 'stretcher', 'first_aid_kit', 'oxygen'], ada: true }
  },
  {
    id: 'ambulance-bay',
    name: 'Ambulance Bay',
    category: 'essential_services',
    subcategory: 'medical',
    icon: Siren,
    width: 100,
    height: 50,
    color: '#ef4444',
    strokeColor: '#dc2626',
    description: 'Emergency vehicle staging area',
    properties: { capacity: '2 ambulances', clear_access: true, lighting: true }
  },
  {
    id: 'info-booth',
    name: 'Info Booth',
    category: 'essential_services',
    subcategory: 'guest_services',
    icon: MapPin,
    width: 50,
    height: 50,
    color: '#0ea5e9',
    strokeColor: '#0284c7',
    description: 'Guest information and assistance booth',
    properties: { maps: true, schedule: true, lost_and_found: true, staff: 2 }
  },
  {
    id: 'lost-and-found',
    name: 'Lost & Found',
    category: 'essential_services',
    subcategory: 'guest_services',
    icon: Package,
    width: 40,
    height: 40,
    color: '#6366f1',
    strokeColor: '#4f46e5',
    description: 'Lost and found collection point',
    properties: { storage: true, staff: 1, log_book: true }
  },
  {
    id: 'phone-charging-station',
    name: 'Phone Charging Station',
    category: 'essential_services',
    subcategory: 'guest_services',
    icon: Phone,
    width: 40,
    height: 30,
    color: '#22c55e',
    strokeColor: '#16a34a',
    description: 'Mobile phone charging lockers',
    properties: { lockers: 20, charger_types: ['USB-C', 'Lightning', 'USB-A'], power_requirements: '3kW' }
  },
  {
    id: 'baby-changing-station',
    name: 'Baby Changing Station',
    category: 'essential_services',
    subcategory: 'family',
    icon: Baby,
    width: 40,
    height: 40,
    color: '#f9a8d4',
    strokeColor: '#ec4899',
    description: 'Baby changing and family rest area',
    properties: { changing_tables: 2, seating: true, private: true }
  },
  {
    id: 'accessibility-ramp',
    name: 'Accessibility Ramp',
    category: 'essential_services',
    subcategory: 'accessibility',
    icon: Accessibility,
    width: 60,
    height: 20,
    color: '#3b82f6',
    strokeColor: '#2563eb',
    accessibility: true,
    description: 'ADA-compliant wheelchair ramp',
    properties: { slope: '1:12', width: '48in', handrails: true, non_slip: true }
  },
  {
    id: 'accessible-viewing-platform',
    name: 'Accessible Viewing Platform',
    category: 'essential_services',
    subcategory: 'accessibility',
    icon: Accessibility,
    width: 80,
    height: 60,
    color: '#3b82f6',
    strokeColor: '#2563eb',
    accessibility: true,
    capacity: 20,
    description: 'Elevated ADA viewing platform near stage',
    properties: { capacity: '20 wheelchair + companion', raised: true, covered: true }
  },

  // === TENTS & SHELTERS (expanded) ===
  {
    id: 'pop-up-tent-10x10',
    name: 'Pop-Up Tent 10x10',
    category: 'venue',
    subcategory: 'tents',
    icon: Tent,
    width: 60,
    height: 60,
    color: '#10b981',
    strokeColor: '#059669',
    capacity: 15,
    description: 'Quick-deploy pop-up canopy',
    properties: { size: '10x10ft', height: '10ft peak', sidewalls: 'optional', weight: '50lbs' }
  },
  {
    id: 'frame-tent-20x30',
    name: 'Frame Tent 20x30',
    category: 'venue',
    subcategory: 'tents',
    icon: Tent,
    width: 120,
    height: 90,
    color: '#10b981',
    strokeColor: '#059669',
    capacity: 60,
    description: 'Medium frame tent for events',
    properties: { size: '20x30ft', height: '12ft peak', sidewalls: true, weight_plates: true }
  },
  {
    id: 'pole-tent-40x60',
    name: 'Pole Tent 40x60',
    category: 'venue',
    subcategory: 'tents',
    icon: Tent,
    width: 180,
    height: 140,
    color: '#10b981',
    strokeColor: '#059669',
    capacity: 200,
    description: 'Large pole tent for main events',
    properties: { size: '40x60ft', center_poles: 2, staking_required: true, lighting: true }
  },
  {
    id: 'shade-sail',
    name: 'Shade Sail',
    category: 'venue',
    subcategory: 'tents',
    icon: Umbrella,
    width: 80,
    height: 80,
    color: '#06b6d4',
    strokeColor: '#0891b2',
    description: 'UV-blocking shade sail canopy',
    properties: { size: '15x15ft', uv_protection: 'UPF 50+', anchor_points: 4 }
  },
  {
    id: 'backstage-tent',
    name: 'Backstage Tent',
    category: 'venue',
    subcategory: 'tents',
    icon: Tent,
    width: 100,
    height: 80,
    color: '#374151',
    strokeColor: '#1f2937',
    capacity: 30,
    description: 'Private backstage / green room tent',
    properties: { private: true, climate_control: true, catering: true, mirrors: true }
  },

  // === FURNITURE (expanded) ===
  {
    id: 'picnic-table',
    name: 'Picnic Table',
    category: 'furniture',
    subcategory: 'tables',
    icon: Square,
    width: 72,
    height: 30,
    color: '#92400e',
    strokeColor: '#78350f',
    capacity: 8,
    description: 'Outdoor picnic table with benches',
    properties: { seats: 8, material: 'treated_wood', weight: '120lbs' }
  },
  {
    id: 'bench-seating',
    name: 'Bench Seating',
    category: 'furniture',
    subcategory: 'seating',
    icon: Square,
    width: 72,
    height: 18,
    color: '#78350f',
    strokeColor: '#92400e',
    capacity: 4,
    description: 'Outdoor bench for 4 people',
    properties: { seats: 4, material: 'wood_or_metal', backrest: true }
  },
  {
    id: 'bean-bag-lounge',
    name: 'Bean Bag Lounge',
    category: 'furniture',
    subcategory: 'seating',
    icon: Circle,
    width: 30,
    height: 30,
    color: '#a855f7',
    strokeColor: '#9333ea',
    capacity: 1,
    description: 'Festival-style bean bag seat',
    properties: { material: 'vinyl', waterproof: true }
  },
  {
    id: 'high-top-table',
    name: 'High-Top Table',
    category: 'furniture',
    subcategory: 'tables',
    icon: Circle,
    width: 24,
    height: 24,
    color: '#6b7280',
    strokeColor: '#4b5563',
    capacity: 4,
    description: 'Standing-height bar table',
    properties: { height: '42in', diameter: '24in', material: 'cocktail' }
  },

  // === SAFETY & EMERGENCY (expanded) ===
  {
    id: 'emergency-exit-gate',
    name: 'Emergency Exit Gate',
    category: 'security',
    subcategory: 'safety',
    icon: DoorOpen,
    width: 60,
    height: 20,
    color: '#ef4444',
    strokeColor: '#dc2626',
    description: 'Wide emergency exit gate with signage',
    properties: { width: '12ft', illuminated_signage: true, panic_hardware: true, alarm: true }
  },
  {
    id: 'fire-extinguisher',
    name: 'Fire Extinguisher Station',
    category: 'security',
    subcategory: 'safety',
    icon: Flame,
    width: 15,
    height: 15,
    color: '#ef4444',
    strokeColor: '#dc2626',
    description: 'Wall-mounted fire extinguisher',
    properties: { type: 'ABC', capacity: '10lbs', inspection: 'monthly' }
  },
  {
    id: 'fire-lane',
    name: 'Fire Lane (Keep Clear)',
    category: 'security',
    subcategory: 'safety',
    icon: ShieldAlert,
    width: 200,
    height: 30,
    color: 'rgba(239, 68, 68, 0.15)',
    strokeColor: '#ef4444',
    description: 'Designated fire lane — must remain clear',
    properties: { width: '20ft', marked: true, no_parking: true }
  },
  {
    id: 'crowd-barrier',
    name: 'Crowd Barrier',
    category: 'security',
    subcategory: 'barriers',
    icon: Square,
    width: 80,
    height: 8,
    color: '#6b7280',
    strokeColor: '#374151',
    description: 'Steel crowd control barrier (bike rack)',
    properties: { length: '8ft', height: '42in', interlocking: true }
  },
  {
    id: 'security-tower',
    name: 'Security Observation Tower',
    category: 'security',
    subcategory: 'checkpoints',
    icon: ShieldAlert,
    width: 30,
    height: 30,
    color: '#1f2937',
    strokeColor: '#111827',
    description: 'Elevated security observation post',
    properties: { height: '15ft', capacity: 2, lighting: true, radio: true }
  },
  {
    id: 'bag-check-area',
    name: 'Bag Check / Coat Check',
    category: 'security',
    subcategory: 'checkpoints',
    icon: Package,
    width: 80,
    height: 40,
    color: '#475569',
    strokeColor: '#334155',
    description: 'Secure bag and coat check area',
    properties: { capacity: '500 items', ticketed: true, staff: 3 }
  },

  // === SIGNAGE & WAYFINDING ===
  {
    id: 'directional-sign',
    name: 'Directional Sign',
    category: 'signage',
    subcategory: 'wayfinding',
    icon: ArrowUpRight,
    width: 15,
    height: 40,
    color: '#3b82f6',
    strokeColor: '#2563eb',
    description: 'Directional wayfinding signpost',
    properties: { height: '8ft', illuminated: false, double_sided: true }
  },
  {
    id: 'event-banner',
    name: 'Event Banner',
    category: 'signage',
    subcategory: 'branding',
    icon: Flag,
    width: 60,
    height: 15,
    color: '#a855f7',
    strokeColor: '#9333ea',
    description: 'Branded event banner or flag',
    properties: { size: '3x8ft', material: 'vinyl', grommets: true }
  },
  {
    id: 'digital-schedule-board',
    name: 'Digital Schedule Board',
    category: 'signage',
    subcategory: 'information',
    icon: Projector,
    width: 40,
    height: 60,
    color: '#0ea5e9',
    strokeColor: '#0284c7',
    description: 'LED screen showing event schedule',
    properties: { size: '55in', resolution: '4K', power_requirements: '500W', weather_proof: true }
  },
  {
    id: 'speaker-pa-tower',
    name: 'PA Speaker Tower',
    category: 'signage',
    subcategory: 'announcements',
    icon: Volume2,
    width: 20,
    height: 20,
    color: '#374151',
    strokeColor: '#1f2937',
    description: 'Public address speaker tower for announcements',
    properties: { wattage: '500W', range: '200ft', weatherproof: true }
  },

  // === WASTE & SANITATION ===
  {
    id: 'trash-bin',
    name: 'Trash Bin',
    category: 'sanitation',
    subcategory: 'waste',
    icon: Trash2,
    width: 15,
    height: 15,
    color: '#475569',
    strokeColor: '#334155',
    description: 'Standard 55-gallon trash receptacle',
    properties: { capacity: '55 gallons', lid: true, liner: true }
  },
  {
    id: 'recycling-station',
    name: 'Recycling Station',
    category: 'sanitation',
    subcategory: 'waste',
    icon: Recycle,
    width: 30,
    height: 20,
    color: '#22c55e',
    strokeColor: '#16a34a',
    description: '3-bin recycling station (trash, recycle, compost)',
    properties: { bins: 3, sorted: ['trash', 'recycling', 'compost'], signage: true }
  },
  {
    id: 'dumpster',
    name: 'Dumpster',
    category: 'sanitation',
    subcategory: 'waste',
    icon: Trash2,
    width: 50,
    height: 30,
    color: '#374151',
    strokeColor: '#1f2937',
    description: 'Large roll-off dumpster for cleanup',
    properties: { capacity: '8 cubic yards', pickup: 'scheduled' }
  },
  {
    id: 'hand-washing-station',
    name: 'Hand Washing Station',
    category: 'sanitation',
    subcategory: 'hygiene',
    icon: Droplets,
    width: 30,
    height: 20,
    color: '#0ea5e9',
    strokeColor: '#0284c7',
    description: 'Portable hand washing sink',
    properties: { faucets: 4, soap_dispenser: true, paper_towels: true, water_capacity: '30 gallons' }
  },

  // === TRANSPORTATION (expanded) ===
  {
    id: 'shuttle-stop',
    name: 'Shuttle Stop',
    category: 'transportation',
    subcategory: 'transit',
    icon: Bus,
    width: 80,
    height: 30,
    color: '#2563eb',
    strokeColor: '#1d4ed8',
    description: 'Shuttle bus pickup and drop-off point',
    properties: { capacity: '40 passengers/bus', shelter: true, schedule_posted: true }
  },
  {
    id: 'rideshare-zone',
    name: 'Rideshare Pickup Zone',
    category: 'transportation',
    subcategory: 'transit',
    icon: Car,
    width: 100,
    height: 30,
    color: '#1e40af',
    strokeColor: '#1e3a8a',
    description: 'Designated Uber/Lyft pickup zone',
    properties: { capacity: '10 vehicles', signage: true, lighting: true, queue_lane: true }
  },
  {
    id: 'bicycle-rack',
    name: 'Bicycle Rack',
    category: 'transportation',
    subcategory: 'parking',
    icon: Bike,
    width: 40,
    height: 20,
    color: '#16a34a',
    strokeColor: '#15803d',
    capacity: 10,
    description: 'Bicycle parking rack',
    properties: { capacity: '10 bikes', locked: false, covered: false }
  },
  {
    id: 'loading-dock',
    name: 'Loading Dock',
    category: 'transportation',
    subcategory: 'loading',
    icon: Truck,
    width: 120,
    height: 40,
    color: '#475569',
    strokeColor: '#334155',
    description: 'Vehicle loading and unloading area',
    properties: { truck_capacity: 2, ramp: true, restricted_hours: true }
  },

  // === LANDSCAPING & DECOR ===
  {
    id: 'tree',
    name: 'Tree',
    category: 'landscaping',
    subcategory: 'natural',
    icon: TreePine,
    width: 30,
    height: 30,
    color: '#16a34a',
    strokeColor: '#15803d',
    description: 'Existing tree (mark for protection)',
    properties: { type: 'existing', protection_radius: '10ft', do_not_remove: true }
  },
  {
    id: 'planter-box',
    name: 'Planter Box',
    category: 'landscaping',
    subcategory: 'decor',
    icon: TreePine,
    width: 40,
    height: 20,
    color: '#65a30d',
    strokeColor: '#4d7c0f',
    description: 'Decorative planter and divider',
    properties: { material: 'wood', flowers: true, weight: '200lbs' }
  },
  {
    id: 'string-lights',
    name: 'String Lights',
    category: 'landscaping',
    subcategory: 'lighting',
    icon: Lightbulb,
    width: 100,
    height: 10,
    color: '#fbbf24',
    strokeColor: '#f59e0b',
    description: 'Decorative string light run',
    properties: { length: '50ft', bulb_type: 'LED', power_requirements: '200W', dimmable: true }
  },
  {
    id: 'spotlight',
    name: 'Ground Spotlight',
    category: 'landscaping',
    subcategory: 'lighting',
    icon: Lightbulb,
    width: 15,
    height: 15,
    color: '#fbbf24',
    strokeColor: '#f59e0b',
    description: 'Upward-facing ground spotlight',
    properties: { wattage: '150W', color_changing: true, waterproof: true }
  },

  // === CAMPING & GLAMPING ===
  {
    id: 'camping-tent-site',
    name: 'Camping Tent Site',
    category: 'venue',
    subcategory: 'camping',
    icon: Tent,
    width: 40,
    height: 40,
    color: '#059669',
    strokeColor: '#047857',
    capacity: 2,
    description: 'Individual tent camping site',
    properties: { size: '10x10ft', fire_ring: true, max_occupancy: 4 }
  },
  {
    id: 'glamping-bell-tent',
    name: 'Glamping Bell Tent',
    category: 'venue',
    subcategory: 'camping',
    icon: Tent,
    width: 50,
    height: 50,
    color: '#d4a574',
    strokeColor: '#b8956a',
    capacity: 2,
    description: 'Luxury bell tent with furnishings',
    properties: { diameter: '16ft', beds: 1, lighting: true, flooring: true, power: true }
  },
  {
    id: 'rv-hookup',
    name: 'RV Hookup Space',
    category: 'venue',
    subcategory: 'camping',
    icon: Home,
    width: 100,
    height: 40,
    color: '#64748b',
    strokeColor: '#475569',
    capacity: 4,
    description: 'RV parking with full hookups',
    properties: { power: '30/50 amp', water_hookup: true, sewer: true, size: '30x12ft' }
  },

  // === SMOKING & SPECIAL AREAS ===
  {
    id: 'smoking-area',
    name: 'Designated Smoking Area',
    category: 'essential_services',
    subcategory: 'special_areas',
    icon: Cigarette,
    width: 40,
    height: 40,
    color: '#78716c',
    strokeColor: '#57534e',
    description: 'Enclosed designated smoking zone',
    properties: { ash_trays: true, signage: true, ventilation: true }
  },
  {
    id: 'pet-relief-area',
    name: 'Pet Relief Area',
    category: 'essential_services',
    subcategory: 'special_areas',
    icon: Dog,
    width: 40,
    height: 40,
    color: '#84cc16',
    strokeColor: '#65a30d',
    description: 'Service animal relief area',
    properties: { fenced: true, waste_bags: true, water_bowl: true }
  },
  {
    id: 'quiet-zone',
    name: 'Quiet / Sensory Zone',
    category: 'essential_services',
    subcategory: 'special_areas',
    icon: Volume2,
    width: 60,
    height: 60,
    color: '#6366f1',
    strokeColor: '#4f46e5',
    description: 'Low-stimulation rest area for sensory needs',
    properties: { quiet: true, dim_lighting: true, seating: true, staffed: true }
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
    name: 'Tents & Shelters',
    icon: Tent,
    subcategories: {
      tents: 'Tents & Canopies',
      camping: 'Camping & Glamping'
    }
  },
  vendors: {
    name: 'Vendors & Retail',
    icon: Store,
    subcategories: {
      booths: 'Vendor Booths',
      retail: 'Retail',
      tickets: 'Ticketing',
      financial: 'ATM & Finance'
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
  essential_services: {
    name: 'Essential Services',
    icon: Heart,
    subcategories: {
      medical: 'Medical & First Aid',
      guest_services: 'Guest Services',
      family: 'Family Services',
      accessibility: 'Accessibility',
      special_areas: 'Special Areas'
    }
  },
  security: {
    name: 'Security & Safety',
    icon: Shield,
    subcategories: {
      checkpoints: 'Checkpoints',
      safety: 'Safety Equipment',
      barriers: 'Barriers & Fencing'
    }
  },
  signage: {
    name: 'Signage & Wayfinding',
    icon: Flag,
    subcategories: {
      wayfinding: 'Wayfinding',
      branding: 'Branding & Banners',
      information: 'Info Displays',
      announcements: 'PA & Announcements'
    }
  },
  sanitation: {
    name: 'Waste & Sanitation',
    icon: Trash2,
    subcategories: {
      waste: 'Trash & Recycling',
      hygiene: 'Hand Washing & Hygiene'
    }
  },
  transportation: {
    name: 'Transportation',
    icon: Car,
    subcategories: {
      parking: 'Parking',
      transit: 'Shuttles & Rideshare',
      loading: 'Loading Areas'
    }
  },
  landscaping: {
    name: 'Landscaping & Decor',
    icon: TreePine,
    subcategories: {
      natural: 'Trees & Greenery',
      decor: 'Decor & Planters',
      lighting: 'Decorative Lighting'
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
