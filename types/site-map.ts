// Site Map System Types
// Interactive site maps for festival vendors and logistics management

export interface SiteMap {
  id: string
  eventId?: string
  tourId?: string
  name: string
  description?: string
  
  // Map dimensions and settings
  width: number
  height: number
  scale: number // meters per pixel
  
  // Map metadata
  backgroundImageUrl?: string
  backgroundColor: string
  gridEnabled: boolean
  gridSize: number
  
  // Access control
  isPublic: boolean
  requiresAuth: boolean
  
  // Status and versioning
  status: 'draft' | 'published' | 'archived'
  version: number
  
  // Metadata
  createdAt: string
  updatedAt: string
  createdBy?: string
  
  // Related data (populated by API)
  zones?: SiteMapZone[]
  tents?: GlampingTent[]
  elements?: SiteMapElement[]
  collaborators?: SiteMapCollaborator[]
}

export interface SiteMapZone {
  id: string
  siteMapId: string
  
  // Zone identification
  name: string
  zoneType: 'glamping' | 'parking' | 'vendor' | 'food' | 'restroom' | 'utility' | 
           'entrance' | 'exit' | 'stage' | 'medical' | 'security' | 'storage' | 'other'
  
  // Position and dimensions
  x: number
  y: number
  width: number
  height: number
  rotation: number
  
  // Visual properties
  color: string
  borderColor: string
  borderWidth: number
  opacity: number
  
  // Zone properties
  capacity?: number
  currentOccupancy: number
  powerAvailable: boolean
  waterAvailable: boolean
  internetAvailable: boolean
  
  // Metadata
  description?: string
  notes?: string
  tags: string[]
  
  // Status
  status: 'available' | 'occupied' | 'reserved' | 'maintenance' | 'closed'
  
  createdAt: string
  updatedAt: string
  
  // Related data
  tents?: GlampingTent[]
}

export interface GlampingTent {
  id: string
  siteMapId: string
  zoneId?: string
  
  // Tent identification
  tentNumber: string
  tentType: 'bell_tent' | 'safari_tent' | 'yurt' | 'tipi' | 'dome' | 'cabin' | 'custom'
  
  // Tent specifications
  capacity: number
  sizeCategory?: '1Q' | '2T' | '4T' | '4C' | '6P' | '8P' | 'custom'
  
  // Position within zone
  x: number
  y: number
  width: number
  height: number
  rotation: number
  
  // Tent status and booking
  status: 'available' | 'occupied' | 'maintenance' | 'reserved'
  guestName?: string
  guestPhone?: string
  guestEmail?: string
  checkInDate?: string
  checkOutDate?: string
  
  // Amenities and features
  hasPower: boolean
  hasHeating: boolean
  hasCooling: boolean
  hasPrivateBathroom: boolean
  hasWifi: boolean
  
  // Pricing
  basePrice?: number
  currentPrice?: number
  
  // Maintenance and notes
  lastCleaned?: string
  maintenanceNotes?: string
  specialRequirements?: string
  
  createdAt: string
  updatedAt: string
}

export interface SiteMapElement {
  id: string
  siteMapId: string
  
  // Element identification
  name?: string
  elementType: 'path' | 'road' | 'fence' | 'tree' | 'building' | 'utility_line' | 
               'water_source' | 'power_station' | 'waste_disposal' | 'sign' | 'marker' | 'custom'
  
  // Position and geometry
  x: number
  y: number
  width: number
  height: number
  rotation: number
  
  // Visual properties
  color: string
  strokeColor?: string
  strokeWidth: number
  opacity: number
  
  // Shape data (for complex shapes)
  pathData?: string // SVG path data for custom shapes
  shapeData?: Record<string, any> // Additional shape properties
  
  // Properties
  properties: Record<string, any>
  
  createdAt: string
  updatedAt: string
}

export interface SiteMapCollaborator {
  id: string
  siteMapId: string
  userId: string
  
  // Permissions
  canEdit: boolean
  canManageTents: boolean
  canManageZones: boolean
  canInviteUsers: boolean
  canExport: boolean
  
  // Access control
  isActive: boolean
  expiresAt?: string
  
  invitedAt: string
  invitedBy?: string
  acceptedAt?: string
  
  // Related data
  user?: {
    id: string
    username: string
    fullName: string
    avatar?: string
    email?: string
  }
}

export interface SiteMapActivityLog {
  id: string
  siteMapId: string
  userId?: string
  
  // Activity details
  action: string
  entityType: 'zone' | 'tent' | 'element' | 'collaborator'
  entityId?: string
  
  // Change data
  oldValues?: Record<string, any>
  newValues?: Record<string, any>
  
  // Metadata
  ipAddress?: string
  userAgent?: string
  
  createdAt: string
  
  // Related data
  user?: {
    id: string
    username: string
    fullName: string
    avatar?: string
  }
}

// API Request/Response Types

export interface CreateSiteMapRequest {
  eventId?: string
  tourId?: string
  name: string
  description?: string
  width?: number
  height?: number
  scale?: number
  backgroundColor?: string
  gridEnabled?: boolean
  gridSize?: number
  isPublic?: boolean
}

export interface UpdateSiteMapRequest {
  name?: string
  description?: string
  width?: number
  height?: number
  scale?: number
  backgroundImageUrl?: string
  backgroundColor?: string
  gridEnabled?: boolean
  gridSize?: number
  isPublic?: boolean
  status?: 'draft' | 'published' | 'archived'
}

export interface CreateZoneRequest {
  siteMapId: string
  name: string
  zoneType: SiteMapZone['zoneType']
  x: number
  y: number
  width: number
  height: number
  rotation?: number
  color?: string
  borderColor?: string
  borderWidth?: number
  opacity?: number
  capacity?: number
  powerAvailable?: boolean
  waterAvailable?: boolean
  internetAvailable?: boolean
  description?: string
  notes?: string
  tags?: string[]
}

export interface UpdateZoneRequest {
  name?: string
  zoneType?: SiteMapZone['zoneType']
  x?: number
  y?: number
  width?: number
  height?: number
  rotation?: number
  color?: string
  borderColor?: string
  borderWidth?: number
  opacity?: number
  capacity?: number
  currentOccupancy?: number
  powerAvailable?: boolean
  waterAvailable?: boolean
  internetAvailable?: boolean
  description?: string
  notes?: string
  tags?: string[]
  status?: SiteMapZone['status']
}

export interface CreateTentRequest {
  siteMapId: string
  zoneId?: string
  tentNumber: string
  tentType: GlampingTent['tentType']
  capacity: number
  sizeCategory?: GlampingTent['sizeCategory']
  x?: number
  y?: number
  width?: number
  height?: number
  rotation?: number
  hasPower?: boolean
  hasHeating?: boolean
  hasCooling?: boolean
  hasPrivateBathroom?: boolean
  hasWifi?: boolean
  basePrice?: number
  currentPrice?: number
  specialRequirements?: string
}

export interface UpdateTentRequest {
  zoneId?: string
  tentNumber?: string
  tentType?: GlampingTent['tentType']
  capacity?: number
  sizeCategory?: GlampingTent['sizeCategory']
  x?: number
  y?: number
  width?: number
  height?: number
  rotation?: number
  status?: GlampingTent['status']
  guestName?: string
  guestPhone?: string
  guestEmail?: string
  checkInDate?: string
  checkOutDate?: string
  hasPower?: boolean
  hasHeating?: boolean
  hasCooling?: boolean
  hasPrivateBathroom?: boolean
  hasWifi?: boolean
  basePrice?: number
  currentPrice?: number
  maintenanceNotes?: string
  specialRequirements?: string
}

export interface CreateElementRequest {
  siteMapId: string
  name?: string
  elementType: SiteMapElement['elementType']
  x: number
  y: number
  width?: number
  height?: number
  rotation?: number
  color?: string
  strokeColor?: string
  strokeWidth?: number
  opacity?: number
  pathData?: string
  shapeData?: Record<string, any>
  properties?: Record<string, any>
}

export interface UpdateElementRequest {
  name?: string
  elementType?: SiteMapElement['elementType']
  x?: number
  y?: number
  width?: number
  height?: number
  rotation?: number
  color?: string
  strokeColor?: string
  strokeWidth?: number
  opacity?: number
  pathData?: string
  shapeData?: Record<string, any>
  properties?: Record<string, any>
}

export interface InviteCollaboratorRequest {
  siteMapId: string
  userId: string
  canEdit?: boolean
  canManageTents?: boolean
  canManageZones?: boolean
  canInviteUsers?: boolean
  canExport?: boolean
  expiresAt?: string
}

// Canvas and Drawing Types

export interface CanvasPosition {
  x: number
  y: number
}

export interface CanvasBounds {
  x: number
  y: number
  width: number
  height: number
}

export interface CanvasTransform {
  scale: number
  translateX: number
  translateY: number
}

export interface DragState {
  isDragging: boolean
  startPosition: CanvasPosition
  currentPosition: CanvasPosition
  dragOffset: CanvasPosition
}

export interface SelectionState {
  selectedItems: string[]
  selectionBox?: CanvasBounds
  isSelecting: boolean
}

// Tool Types

export type CanvasTool = 
  | 'select'
  | 'pan'
  | 'zone'
  | 'tent'
  | 'path'
  | 'text'
  | 'measure'

export interface ToolState {
  activeTool: CanvasTool
  toolOptions: Record<string, any>
}

// Export/Import Types

export interface SiteMapExport {
  siteMap: SiteMap
  zones: SiteMapZone[]
  tents: GlampingTent[]
  elements: SiteMapElement[]
  metadata: {
    exportedAt: string
    exportedBy: string
    version: string
  }
}

export interface SiteMapImport {
  siteMap: Partial<SiteMap>
  zones?: Partial<SiteMapZone>[]
  tents?: Partial<GlampingTent>[]
  elements?: Partial<SiteMapElement>[]
}

// Statistics and Analytics Types

export interface SiteMapStats {
  totalZones: number
  totalTents: number
  totalCapacity: number
  occupiedTents: number
  availableTents: number
  utilizationRate: number
  revenue: number
  zonesByType: Record<string, number>
  tentsByType: Record<string, number>
  tentsByStatus: Record<string, number>
}

export interface TentAvailability {
  tentId: string
  tentNumber: string
  tentType: string
  status: string
  isAvailable: boolean
}

// Equipment Management Types

export interface EquipmentCatalog {
  id: string
  vendorId?: string
  
  // Equipment identification
  name: string
  category: 'sound' | 'lighting' | 'stage' | 'power' | 'generator' | 'tent' | 'furniture' | 'catering' | 'security' | 'transportation' | 'decor' | 'custom'
  subcategory?: string
  
  // Equipment specifications
  model?: string
  manufacturer?: string
  dimensions?: {
    width: number
    height: number
    depth: number
  }
  weight?: number // in kg
  powerConsumption?: number // in watts
  voltageRequirements?: string
  
  // Visual representation
  symbolType: 'rectangle' | 'circle' | 'triangle' | 'custom'
  symbolColor: string
  symbolSize: number
  iconName?: string
  customShapeData?: Record<string, any>
  
  // Equipment properties
  isPortable: boolean
  requiresSetup: boolean
  setupTimeMinutes: number
  requiresPower: boolean
  requiresWater: boolean
  requiresInternet: boolean
  weatherResistant: boolean
  
  // Rental information
  dailyRate?: number
  weeklyRate?: number
  securityDeposit?: number
  availabilityStatus: 'available' | 'rented' | 'maintenance' | 'reserved' | 'out_of_service'
  
  // Documentation
  description?: string
  setupInstructions?: string
  maintenanceNotes?: string
  imageUrl?: string
  manualUrl?: string
  
  createdAt: string
  updatedAt: string
  createdBy?: string
}

export interface EquipmentInstance {
  id: string
  siteMapId: string
  catalogId: string
  
  // Instance identification
  serialNumber?: string
  assetTag?: string
  instanceName?: string
  
  // Position on site map
  x: number
  y: number
  width: number
  height: number
  rotation: number
  
  // Status and assignment
  status: 'available' | 'in_use' | 'setup' | 'maintenance' | 'packed' | 'damaged'
  assignedToUserId?: string
  assignedAt?: string
  
  // Setup information
  setupStartTime?: string
  setupCompletedTime?: string
  setupNotes?: string
  
  // Power and utility connections
  powerSourceId?: string
  powerCableLength?: number
  connectedToNetwork: boolean
  
  // Rental information
  rentalStartDate?: string
  rentalEndDate?: string
  rentalRate?: number
  customerName?: string
  customerContact?: string
  
  // Maintenance
  lastInspectionDate?: string
  nextInspectionDate?: string
  maintenanceNotes?: string
  
  createdAt: string
  updatedAt: string
  
  // Related data
  catalog?: EquipmentCatalog
  assignedUser?: {
    id: string
    username: string
    fullName: string
    avatar?: string
  }
}

export interface EquipmentSetupWorkflow {
  id: string
  siteMapId: string
  name: string
  description?: string
  
  // Workflow settings
  isTemplate: boolean
  estimatedDurationMinutes?: number
  priority: 1 | 2 | 3 // 1=high, 2=medium, 3=low
  
  // Status
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled' | 'on_hold'
  
  // Timing
  scheduledStartTime?: string
  scheduledEndTime?: string
  actualStartTime?: string
  actualEndTime?: string
  
  // Assignment
  assignedTeamLeader?: string
  teamMembers: string[]
  
  createdAt: string
  updatedAt: string
  createdBy?: string
  
  // Related data
  tasks?: EquipmentSetupTask[]
  teamLeader?: {
    id: string
    username: string
    fullName: string
    avatar?: string
  }
}

export interface EquipmentSetupTask {
  id: string
  workflowId: string
  equipmentInstanceId?: string
  
  // Task details
  taskName: string
  description?: string
  taskType: 'setup' | 'positioning' | 'power_connection' | 'testing' | 'calibration' | 'network_setup' | 'safety_check' | 'documentation' | 'custom'
  
  // Task requirements
  estimatedDurationMinutes?: number
  requiredTools: string[]
  requiredSkills: string[]
  dependencies: string[]
  
  // Status and assignment
  status: 'pending' | 'in_progress' | 'completed' | 'skipped' | 'failed'
  assignedTo?: string
  priority: 1 | 2 | 3
  
  // Timing
  scheduledStartTime?: string
  scheduledEndTime?: string
  actualStartTime?: string
  actualEndTime?: string
  
  // Results
  completionNotes?: string
  issuesEncountered?: string
  photos: string[]
  
  // Position in workflow
  orderIndex: number
  
  createdAt: string
  updatedAt: string
  
  // Related data
  equipmentInstance?: EquipmentInstance
  assignedUser?: {
    id: string
    username: string
    fullName: string
    avatar?: string
  }
}

export interface PowerDistribution {
  id: string
  siteMapId: string
  
  // Power source identification
  name: string
  powerType: 'generator' | 'main_power' | 'solar' | 'battery' | 'ups'
  
  // Power specifications
  totalCapacityWatts: number
  availableCapacityWatts: number
  voltageOutput: string
  phaseType: 'single' | 'three-phase'
  
  // Position on site map
  x: number
  y: number
  width: number
  height: number
  
  // Status
  status: 'active' | 'maintenance' | 'offline' | 'overloaded'
  
  // Connections
  maxConnections: number
  currentConnections: number
  
  // Fuel/energy information
  fuelType?: string
  fuelLevelPercentage?: number
  estimatedRuntimeHours?: number
  
  // Monitoring
  lastMaintenanceDate?: string
  nextMaintenanceDate?: string
  maintenanceNotes?: string
  
  createdAt: string
  updatedAt: string
}

export interface EquipmentPowerConnection {
  id: string
  equipmentInstanceId: string
  powerSourceId: string
  
  // Connection details
  connectionType?: string
  cableLength?: number
  powerDrawWatts: number
  voltageRequired?: string
  
  // Connection status
  isConnected: boolean
  connectedAt?: string
  disconnectedAt?: string
  
  // Safety and monitoring
  isGfciProtected: boolean
  lastSafetyCheck?: string
  safetyCheckNotes?: string
  
  createdAt: string
  updatedAt: string
  
  // Related data
  equipmentInstance?: EquipmentInstance
  powerSource?: PowerDistribution
}

// Equipment API Request/Response Types

export interface CreateEquipmentCatalogRequest {
  vendorId?: string
  name: string
  category: EquipmentCatalog['category']
  subcategory?: string
  model?: string
  manufacturer?: string
  dimensions?: EquipmentCatalog['dimensions']
  weight?: number
  powerConsumption?: number
  voltageRequirements?: string
  symbolType?: EquipmentCatalog['symbolType']
  symbolColor?: string
  symbolSize?: number
  iconName?: string
  isPortable?: boolean
  requiresSetup?: boolean
  setupTimeMinutes?: number
  requiresPower?: boolean
  requiresWater?: boolean
  requiresInternet?: boolean
  weatherResistant?: boolean
  dailyRate?: number
  weeklyRate?: number
  securityDeposit?: number
  description?: string
  setupInstructions?: string
  imageUrl?: string
}

export interface CreateEquipmentInstanceRequest {
  siteMapId: string
  catalogId: string
  serialNumber?: string
  assetTag?: string
  instanceName?: string
  x: number
  y: number
  width?: number
  height?: number
  rotation?: number
  assignedToUserId?: string
  rentalStartDate?: string
  rentalEndDate?: string
  rentalRate?: number
  customerName?: string
  customerContact?: string
}

export interface CreatePowerDistributionRequest {
  siteMapId: string
  name: string
  powerType: PowerDistribution['powerType']
  totalCapacityWatts: number
  availableCapacityWatts: number
  voltageOutput: string
  phaseType?: PowerDistribution['phaseType']
  x: number
  y: number
  width?: number
  height?: number
  maxConnections?: number
  fuelType?: string
  fuelLevelPercentage?: number
  estimatedRuntimeHours?: number
}

// Visual Equipment Symbols

export interface EquipmentSymbol {
  id: string
  name: string
  category: string
  iconName: string
  symbolType: 'rectangle' | 'circle' | 'triangle' | 'custom'
  defaultColor: string
  defaultSize: number
  description?: string
}

// Enhanced interfaces for Phase 1 features

export interface MapLayer {
  id: string
  siteMapId: string
  name: string
  description?: string
  layerType: 'infrastructure' | 'crew_zones' | 'guest_areas' | 'safety_zones' | 'vip_areas' | 'backstage' | 'restricted' | 'power' | 'water' | 'wifi' | 'custom'
  color: string
  opacity: number
  isVisible: boolean
  isLocked: boolean
  zIndex: number
  createdAt: string
  updatedAt: string
}

export interface MapVersion {
  id: string
  siteMapId: string
  versionName: string
  description?: string
  versionNumber: number
  isCurrent: boolean
  createdBy?: string
  createdAt: string
  updatedAt: string
}

export interface EquipmentQRCode {
  id: string
  equipmentInstanceId: string
  qrCode: string
  qrData: Record<string, any>
  isActive: boolean
  generatedAt: string
  lastScanned?: string
  scanCount: number
  createdBy?: string
}

export interface MapTaskAssignment {
  id: string
  siteMapId: string
  elementId: string
  elementType: 'zone' | 'tent' | 'element' | 'equipment_instance' | 'power_distribution'
  assignedUserId?: string
  taskType: string
  taskDescription?: string
  priority: number
  status: 'pending' | 'in_progress' | 'completed' | 'blocked' | 'cancelled'
  scheduledStartTime?: string
  scheduledEndTime?: string
  actualStartTime?: string
  actualEndTime?: string
  createdAt: string
  updatedAt: string
}

export interface MapMeasurement {
  id: string
  siteMapId: string
  measurementType: 'distance' | 'area' | 'clearance' | 'fire_lane' | 'ada_access' | 'emergency_route'
  startX: number
  startY: number
  endX?: number
  endY?: number
  width?: number
  height?: number
  value?: number
  unit: string
  label?: string
  color: string
  isCompliant: boolean
  complianceNotes?: string
  createdAt: string
  updatedAt: string
}

export interface MapTemplate {
  id: string
  name: string
  description?: string
  category: 'festival' | 'concert' | 'corporate' | 'wedding' | 'sports' | 'exhibition' | 'custom'
  templateData: Record<string, any>
  isPublic: boolean
  createdBy?: string
  createdAt: string
  updatedAt: string
}

export interface MapIssue {
  id: string
  siteMapId: string
  issueType: 'safety' | 'maintenance' | 'logistics' | 'accessibility' | 'compliance' | 'other'
  severity: 'low' | 'medium' | 'high' | 'critical'
  title: string
  description?: string
  x: number
  y: number
  status: 'open' | 'in_progress' | 'resolved' | 'closed'
  assignedTo?: string
  reportedBy?: string
  photos?: string[]
  notes?: string
  resolvedAt?: string
  createdAt: string
  updatedAt: string
}

// Enhanced canvas types
export interface CanvasLayer {
  id: string
  name: string
  type: MapLayer['layerType']
  color: string
  opacity: number
  visible: boolean
  locked: boolean
  zIndex: number
  elements: CanvasElement[]
}

export interface CanvasElement {
  id: string
  type: 'zone' | 'tent' | 'equipment' | 'measurement' | 'issue' | 'custom'
  x: number
  y: number
  width: number
  height: number
  rotation: number
  layerId: string
  data: Record<string, any>
  selected: boolean
  locked: boolean
}

export interface CanvasToolConfig {
  id: string
  name: string
  icon: React.ComponentType<any>
  type: 'select' | 'pan' | 'zoom' | 'measure' | 'draw' | 'text' | 'shape'
  cursor: string
  enabled: boolean
}

export interface CanvasMeasurement {
  id: string
  type: 'distance' | 'area' | 'angle'
  startX: number
  startY: number
  endX: number
  endY: number
  value: number
  unit: string
  label?: string
  color: string
}

// Request/Response types for API
export interface CreateMapLayerRequest {
  siteMapId: string
  name: string
  description?: string
  layerType: MapLayer['layerType']
  color?: string
  opacity?: number
  zIndex?: number
}

export interface UpdateMapLayerRequest {
  id: string
  name?: string
  description?: string
  color?: string
  opacity?: number
  isVisible?: boolean
  isLocked?: boolean
  zIndex?: number
}

export interface CreateMapVersionRequest {
  siteMapId: string
  versionName: string
  description?: string
}

export interface CreateTaskAssignmentRequest {
  siteMapId: string
  elementId: string
  elementType: MapTaskAssignment['elementType']
  assignedUserId?: string
  taskType: string
  taskDescription?: string
  priority?: number
  scheduledStartTime?: string
  scheduledEndTime?: string
}

export interface CreateMeasurementRequest {
  siteMapId: string
  measurementType: MapMeasurement['measurementType']
  startX: number
  startY: number
  endX?: number
  endY?: number
  width?: number
  height?: number
  value?: number
  unit?: string
  label?: string
  color?: string
  complianceNotes?: string
}

export interface CreateMapIssueRequest {
  siteMapId: string
  issueType: MapIssue['issueType']
  severity: MapIssue['severity']
  title: string
  description?: string
  x: number
  y: number
  assignedTo?: string
  photos?: string[]
  notes?: string
}

export const EQUIPMENT_SYMBOLS: EquipmentSymbol[] = [
  // Sound Equipment
  { id: 'speaker', name: 'Speaker', category: 'sound', iconName: 'volume-2', symbolType: 'rectangle', defaultColor: '#3b82f6', defaultSize: 40 },
  { id: 'amplifier', name: 'Amplifier', category: 'sound', iconName: 'zap', symbolType: 'rectangle', defaultColor: '#f59e0b', defaultSize: 35 },
  { id: 'mixer', name: 'Audio Mixer', category: 'sound', iconName: 'sliders', symbolType: 'rectangle', defaultColor: '#8b5cf6', defaultSize: 45 },
  { id: 'microphone', name: 'Microphone', category: 'sound', iconName: 'mic', symbolType: 'circle', defaultColor: '#ef4444', defaultSize: 25 },
  
  // Lighting Equipment
  { id: 'spotlight', name: 'Spotlight', category: 'lighting', iconName: 'sun', symbolType: 'circle', defaultColor: '#fbbf24', defaultSize: 30 },
  { id: 'stage_light', name: 'Stage Light', category: 'lighting', iconName: 'lightbulb', symbolType: 'triangle', defaultColor: '#f59e0b', defaultSize: 35 },
  { id: 'led_bar', name: 'LED Bar', category: 'lighting', iconName: 'layers', symbolType: 'rectangle', defaultColor: '#10b981', defaultSize: 50 },
  { id: 'fog_machine', name: 'Fog Machine', category: 'lighting', iconName: 'cloud', symbolType: 'rectangle', defaultColor: '#6b7280', defaultSize: 40 },
  
  // Stage Equipment
  { id: 'stage', name: 'Stage', category: 'stage', iconName: 'square', symbolType: 'rectangle', defaultColor: '#374151', defaultSize: 100 },
  { id: 'stage_riser', name: 'Stage Riser', category: 'stage', iconName: 'layers', symbolType: 'rectangle', defaultColor: '#4b5563', defaultSize: 80 },
  { id: 'backdrop', name: 'Backdrop', category: 'stage', iconName: 'image', symbolType: 'rectangle', defaultColor: '#6366f1', defaultSize: 120 },
  
  // Power Equipment
  { id: 'generator', name: 'Generator', category: 'power', iconName: 'battery', symbolType: 'rectangle', defaultColor: '#059669', defaultSize: 60 },
  { id: 'power_distro', name: 'Power Distribution', category: 'power', iconName: 'plug', symbolType: 'rectangle', defaultColor: '#dc2626', defaultSize: 50 },
  { id: 'ups', name: 'UPS', category: 'power', iconName: 'shield', symbolType: 'rectangle', defaultColor: '#7c3aed', defaultSize: 40 },
  
  // Tent Equipment
  { id: 'bell_tent', name: 'Bell Tent', category: 'tent', iconName: 'home', symbolType: 'circle', defaultColor: '#3b82f6', defaultSize: 60 },
  { id: 'canopy', name: 'Canopy', category: 'tent', iconName: 'umbrella', symbolType: 'rectangle', defaultColor: '#06b6d4', defaultSize: 80 },
  { id: 'dome_tent', name: 'Dome Tent', category: 'tent', iconName: 'circle', symbolType: 'circle', defaultColor: '#8b5cf6', defaultSize: 55 },
  
  // Furniture
  { id: 'table', name: 'Table', category: 'furniture', iconName: 'square', symbolType: 'rectangle', defaultColor: '#92400e', defaultSize: 70 },
  { id: 'chair', name: 'Chair', category: 'furniture', iconName: 'user', symbolType: 'circle', defaultColor: '#059669', defaultSize: 25 },
  { id: 'bench', name: 'Bench', category: 'furniture', iconName: 'users', symbolType: 'rectangle', defaultColor: '#7c2d12', defaultSize: 80 },
  
  // Catering
  { id: 'food_truck', name: 'Food Truck', category: 'catering', iconName: 'truck', symbolType: 'rectangle', defaultColor: '#dc2626', defaultSize: 100 },
  { id: 'grill', name: 'Grill', category: 'catering', iconName: 'flame', symbolType: 'rectangle', defaultColor: '#ea580c', defaultSize: 60 },
  { id: 'cooler', name: 'Cooler', category: 'catering', iconName: 'snowflake', symbolType: 'rectangle', defaultColor: '#0ea5e9', defaultSize: 40 },
  
  // Security
  { id: 'security_post', name: 'Security Post', category: 'security', iconName: 'shield', symbolType: 'circle', defaultColor: '#1f2937', defaultSize: 35 },
  { id: 'barrier', name: 'Barrier', category: 'security', iconName: 'minus', symbolType: 'rectangle', defaultColor: '#374151', defaultSize: 90 },
  
  // Transportation
  { id: 'truck', name: 'Truck', category: 'transportation', iconName: 'truck', symbolType: 'rectangle', defaultColor: '#6b7280', defaultSize: 80 },
  { id: 'trailer', name: 'Trailer', category: 'transportation', iconName: 'package', symbolType: 'rectangle', defaultColor: '#4b5563', defaultSize: 100 },
  
  // Decor
  { id: 'banner', name: 'Banner', category: 'decor', iconName: 'flag', symbolType: 'rectangle', defaultColor: '#ec4899', defaultSize: 60 },
  { id: 'decoration', name: 'Decoration', category: 'decor', iconName: 'sparkles', symbolType: 'circle', defaultColor: '#f59e0b', defaultSize: 30 },
]

// Default layers for new site maps
export const DEFAULT_LAYERS: Omit<MapLayer, 'id' | 'siteMapId' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'Infrastructure',
    layerType: 'infrastructure',
    color: '#3b82f6',
    opacity: 0.8,
    isVisible: true,
    isLocked: false,
    zIndex: 1
  },
  {
    name: 'Power & Utilities',
    layerType: 'power',
    color: '#f59e0b',
    opacity: 0.8,
    isVisible: true,
    isLocked: false,
    zIndex: 2
  },
  {
    name: 'Crew Zones',
    layerType: 'crew_zones',
    color: '#10b981',
    opacity: 0.6,
    isVisible: true,
    isLocked: false,
    zIndex: 3
  },
  {
    name: 'Guest Areas',
    layerType: 'guest_areas',
    color: '#8b5cf6',
    opacity: 0.6,
    isVisible: true,
    isLocked: false,
    zIndex: 4
  },
  {
    name: 'Safety Zones',
    layerType: 'safety_zones',
    color: '#ef4444',
    opacity: 0.7,
    isVisible: true,
    isLocked: false,
    zIndex: 5
  },
  {
    name: 'VIP Areas',
    layerType: 'vip_areas',
    color: '#fbbf24',
    opacity: 0.6,
    isVisible: true,
    isLocked: false,
    zIndex: 6
  },
  {
    name: 'Backstage',
    layerType: 'backstage',
    color: '#6b7280',
    opacity: 0.8,
    isVisible: true,
    isLocked: false,
    zIndex: 7
  }
]

// Real-time Collaboration Types

export interface CollaborationEvent {
  type: 'cursor' | 'selection' | 'edit' | 'presence'
  userId: string
  siteMapId: string
  data: any
  timestamp: string
}

export interface UserPresence {
  userId: string
  siteMapId: string
  cursor?: CanvasPosition
  selection?: string[]
  isActive: boolean
  lastSeen: string
  user?: {
    id: string
    username: string
    fullName: string
    avatar?: string
  }
}
