export interface MeasurementPoint {
  x: number
  y: number
  id: string
  label?: string
}

export interface Measurement {
  id: string
  type: 'distance' | 'area' | 'perimeter' | 'angle' | 'clearance'
  points: MeasurementPoint[]
  value: number
  unit: 'meters' | 'feet' | 'inches' | 'centimeters'
  label?: string
  description?: string
  compliance?: ComplianceCheck
  createdAt: string
  updatedAt: string
  createdBy: string
}

export interface ComplianceCheck {
  id: string
  type: 'fire_lane' | 'ada_accessibility' | 'safety_clearance' | 'vendor_spacing' | 'emergency_exit' | 'power_safety'
  status: 'compliant' | 'warning' | 'violation' | 'pending'
  requiredValue: number
  actualValue: number
  unit: string
  regulation: string
  description: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  autoFix?: {
    suggested: boolean
    action: string
    newValue?: number
  }
}

export interface MeasurementTool {
  id: string
  name: string
  icon: React.ComponentType<any>
  type: 'distance' | 'area' | 'perimeter' | 'angle' | 'clearance'
  cursor: string
  minPoints: number
  maxPoints?: number
  description: string
  complianceRules?: ComplianceRule[]
}

export interface ComplianceRule {
  id: string
  name: string
  type: 'fire_lane' | 'ada_accessibility' | 'safety_clearance' | 'vendor_spacing' | 'emergency_exit' | 'power_safety'
  minValue: number
  maxValue?: number
  unit: string
  description: string
  regulation: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  autoCheck: boolean
  required: boolean
}

export interface MeasurementConfig {
  defaultUnit: 'meters' | 'feet' | 'inches' | 'centimeters'
  precision: number
  snapToGrid: boolean
  gridSize: number
  showLabels: boolean
  showCompliance: boolean
  autoCheckCompliance: boolean
  complianceRules: ComplianceRule[]
}

export interface MeasurementCanvasState {
  activeTool: string | null
  currentMeasurement: Partial<Measurement> | null
  isDrawing: boolean
  points: MeasurementPoint[]
  hoverPoint: MeasurementPoint | null
  selectedMeasurement: string | null
  showGrid: boolean
  showMeasurements: boolean
  showCompliance: boolean
}

export interface MeasurementResult {
  measurement: Measurement
  compliance: ComplianceCheck[]
  suggestions: string[]
  warnings: string[]
  errors: string[]
}

// Predefined compliance rules for common event regulations
export const DEFAULT_COMPLIANCE_RULES: ComplianceRule[] = [
  {
    id: 'fire_lane_width',
    name: 'Fire Lane Width',
    type: 'fire_lane',
    minValue: 3.66, // 12 feet in meters
    unit: 'meters',
    description: 'Minimum width for fire lanes as per NFPA standards',
    regulation: 'NFPA 101 - Life Safety Code',
    severity: 'critical',
    autoCheck: true,
    required: true
  },
  {
    id: 'ada_path_width',
    name: 'ADA Accessible Path Width',
    type: 'ada_accessibility',
    minValue: 0.91, // 36 inches in meters
    unit: 'meters',
    description: 'Minimum width for ADA accessible paths',
    regulation: 'ADA Standards for Accessible Design',
    severity: 'high',
    autoCheck: true,
    required: true
  },
  {
    id: 'vendor_spacing',
    name: 'Vendor Booth Spacing',
    type: 'vendor_spacing',
    minValue: 1.52, // 5 feet in meters
    unit: 'meters',
    description: 'Minimum spacing between vendor booths',
    regulation: 'Event Safety Guidelines',
    severity: 'medium',
    autoCheck: true,
    required: false
  },
  {
    id: 'emergency_exit_width',
    name: 'Emergency Exit Width',
    type: 'emergency_exit',
    minValue: 0.91, // 36 inches in meters
    unit: 'meters',
    description: 'Minimum width for emergency exits',
    regulation: 'OSHA Emergency Exit Requirements',
    severity: 'critical',
    autoCheck: true,
    required: true
  },
  {
    id: 'power_safety_distance',
    name: 'Power Safety Distance',
    type: 'power_safety',
    minValue: 1.22, // 4 feet in meters
    unit: 'meters',
    description: 'Minimum safe distance from power sources',
    regulation: 'NEC Electrical Safety Standards',
    severity: 'high',
    autoCheck: true,
    required: true
  },
  {
    id: 'stage_safety_clearance',
    name: 'Stage Safety Clearance',
    type: 'safety_clearance',
    minValue: 3.05, // 10 feet in meters
    unit: 'meters',
    description: 'Minimum clearance around stages for safety',
    regulation: 'Event Safety Standards',
    severity: 'high',
    autoCheck: true,
    required: true
  }
]

// Measurement tools configuration
export const MEASUREMENT_TOOLS: MeasurementTool[] = [
  {
    id: 'distance',
    name: 'Distance',
    icon: () => null, // Will be set with actual icons
    type: 'distance',
    cursor: 'crosshair',
    minPoints: 2,
    description: 'Measure distance between two points',
    complianceRules: [
      DEFAULT_COMPLIANCE_RULES.find(r => r.id === 'fire_lane_width'),
      DEFAULT_COMPLIANCE_RULES.find(r => r.id === 'ada_path_width')
    ].filter((r): r is ComplianceRule => r !== undefined)
  },
  {
    id: 'area',
    name: 'Area',
    icon: () => null,
    type: 'area',
    cursor: 'crosshair',
    minPoints: 3,
    description: 'Measure area of a polygon',
    complianceRules: [
      DEFAULT_COMPLIANCE_RULES.find(r => r.id === 'vendor_spacing')
    ].filter((r): r is ComplianceRule => r !== undefined)
  },
  {
    id: 'clearance',
    name: 'Clearance',
    icon: () => null,
    type: 'clearance',
    cursor: 'crosshair',
    minPoints: 2,
    description: 'Check clearance for safety compliance',
    complianceRules: [
      DEFAULT_COMPLIANCE_RULES.find(r => r.id === 'stage_safety_clearance'),
      DEFAULT_COMPLIANCE_RULES.find(r => r.id === 'power_safety_distance')
    ].filter((r): r is ComplianceRule => r !== undefined)
  },
  {
    id: 'perimeter',
    name: 'Perimeter',
    icon: () => null,
    type: 'perimeter',
    cursor: 'crosshair',
    minPoints: 3,
    description: 'Measure perimeter of a shape'
  },
  {
    id: 'angle',
    name: 'Angle',
    icon: () => null,
    type: 'angle',
    cursor: 'crosshair',
    minPoints: 3,
    description: 'Measure angle between three points'
  }
]

// Utility functions for measurements
export const MEASUREMENT_UTILS = {
  // Convert between units
  convertUnits: (value: number, fromUnit: string, toUnit: string): number => {
    const conversions: Record<string, Record<string, number>> = {
      meters: {
        feet: 3.28084,
        inches: 39.3701,
        centimeters: 100
      },
      feet: {
        meters: 0.3048,
        inches: 12,
        centimeters: 30.48
      },
      inches: {
        meters: 0.0254,
        feet: 0.0833333,
        centimeters: 2.54
      },
      centimeters: {
        meters: 0.01,
        feet: 0.0328084,
        inches: 0.393701
      }
    }
    
    return value * (conversions[fromUnit]?.[toUnit] || 1)
  },

  // Calculate distance between two points
  calculateDistance: (point1: MeasurementPoint, point2: MeasurementPoint): number => {
    const dx = point2.x - point1.x
    const dy = point2.y - point1.y
    return Math.sqrt(dx * dx + dy * dy)
  },

  // Calculate area of polygon (using shoelace formula)
  calculateArea: (points: MeasurementPoint[]): number => {
    if (points.length < 3) return 0
    
    let area = 0
    for (let i = 0; i < points.length; i++) {
      const j = (i + 1) % points.length
      area += points[i].x * points[j].y
      area -= points[j].x * points[i].y
    }
    return Math.abs(area) / 2
  },

  // Calculate perimeter of polygon
  calculatePerimeter: (points: MeasurementPoint[]): number => {
    if (points.length < 2) return 0
    
    let perimeter = 0
    for (let i = 0; i < points.length; i++) {
      const j = (i + 1) % points.length
      perimeter += MEASUREMENT_UTILS.calculateDistance(points[i], points[j])
    }
    return perimeter
  },

  // Calculate angle between three points
  calculateAngle: (point1: MeasurementPoint, vertex: MeasurementPoint, point2: MeasurementPoint): number => {
    const a = MEASUREMENT_UTILS.calculateDistance(vertex, point1)
    const b = MEASUREMENT_UTILS.calculateDistance(vertex, point2)
    const c = MEASUREMENT_UTILS.calculateDistance(point1, point2)
    
    const angle = Math.acos((a * a + b * b - c * c) / (2 * a * b))
    return (angle * 180) / Math.PI
  },

  // Check compliance against rules
  checkCompliance: (measurement: Measurement, rules: ComplianceRule[]): ComplianceCheck[] => {
    const checks: ComplianceCheck[] = []
    
    rules.forEach(rule => {
      let actualValue = measurement.value
      
      // Convert to rule's unit if needed
      if (rule.unit !== measurement.unit) {
        actualValue = MEASUREMENT_UTILS.convertUnits(measurement.value, measurement.unit, rule.unit)
      }
      
      let status: 'compliant' | 'warning' | 'violation' | 'pending' = 'compliant'
      let severity = rule.severity
      
      if (actualValue < rule.minValue) {
        status = rule.severity === 'critical' ? 'violation' : 'warning'
      } else if (rule.maxValue && actualValue > rule.maxValue) {
        status = rule.severity === 'critical' ? 'violation' : 'warning'
      }
      
      checks.push({
        id: `${measurement.id}-${rule.id}`,
        type: rule.type,
        status,
        requiredValue: rule.minValue,
        actualValue,
        unit: rule.unit,
        regulation: rule.regulation,
        description: rule.description,
        severity,
        autoFix: status !== 'compliant' ? {
          suggested: true,
          action: actualValue < rule.minValue 
            ? `Increase to at least ${rule.minValue}${rule.unit}`
            : `Reduce to at most ${rule.maxValue}${rule.unit}`,
          newValue: actualValue < rule.minValue ? rule.minValue : rule.maxValue
        } : undefined
      })
    })
    
    return checks
  },

  // Format measurement value for display
  formatValue: (value: number, unit: string, precision: number = 2): string => {
    return `${value.toFixed(precision)} ${unit}`
  },

  // Get measurement type icon
  getTypeIcon: (type: string) => {
    // Will be implemented with actual icon components
    return null
  }
}
