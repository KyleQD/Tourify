'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  Ruler, 
  Square, 
  Triangle, 
  Compass, 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Info,
  Trash2,
  Edit,
  Copy,
  Download,
  Filter,
  Search
} from 'lucide-react'
import { 
  Measurement, 
  ComplianceCheck,
  MEASUREMENT_UTILS
} from '@/types/measurements'

interface MeasurementPanelProps {
  measurements: Measurement[]
  onMeasurementUpdate: (id: string, updates: Partial<Measurement>) => void
  onMeasurementDelete: (id: string) => void
  onMeasurementSelect: (id: string) => void
  selectedMeasurement: string | null
  className?: string
}

export function MeasurementPanel({
  measurements,
  onMeasurementUpdate,
  onMeasurementDelete,
  onMeasurementSelect,
  selectedMeasurement,
  className
}: MeasurementPanelProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [filterCompliance, setFilterCompliance] = useState<string>('all')

  // Get measurement type icon
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'distance': return <Ruler className="h-4 w-4" />
      case 'area': return <Square className="h-4 w-4" />
      case 'perimeter': return <Square className="h-4 w-4" />
      case 'angle': return <Compass className="h-4 w-4" />
      case 'clearance': return <Shield className="h-4 w-4" />
      default: return <Info className="h-4 w-4" />
    }
  }

  // Get compliance status icon
  const getComplianceIcon = (compliance?: ComplianceCheck) => {
    if (!compliance) {
      return <Info className="h-4 w-4 text-gray-500" />
    }

    if (compliance.status === 'violation') {
      return <XCircle className="h-4 w-4 text-red-500" />
    } else if (compliance.status === 'warning') {
      return <AlertTriangle className="h-4 w-4 text-yellow-500" />
    } else if (compliance.status === 'compliant') {
      return <CheckCircle className="h-4 w-4 text-green-500" />
    } else {
      return <Info className="h-4 w-4 text-gray-500" />
    }
  }

  // Get compliance status color
  const getComplianceColor = (compliance?: ComplianceCheck) => {
    if (!compliance) {
      return 'bg-gray-100 text-gray-700 border-gray-200'
    }

    if (compliance.status === 'violation') {
      return 'bg-red-100 text-red-700 border-red-200'
    } else if (compliance.status === 'warning') {
      return 'bg-yellow-100 text-yellow-700 border-yellow-200'
    } else if (compliance.status === 'compliant') {
      return 'bg-green-100 text-green-700 border-green-200'
    } else {
      return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  // Filter measurements
  const filteredMeasurements = measurements.filter(measurement => {
    const matchesSearch = measurement.label?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         measurement.type.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesType = filterType === 'all' || measurement.type === filterType
    
    let matchesCompliance = true
    if (filterCompliance !== 'all') {
      if (!measurement.compliance) {
        matchesCompliance = filterCompliance === 'none'
      } else {
        const hasViolations = measurement.compliance.status === 'violation'
        const hasWarnings = measurement.compliance.status === 'warning'
        const isCompliant = measurement.compliance.status === 'compliant'
        
        switch (filterCompliance) {
          case 'compliant':
            matchesCompliance = isCompliant
            break
          case 'warnings':
            matchesCompliance = hasWarnings
            break
          case 'violations':
            matchesCompliance = hasViolations
            break
          case 'issues':
            matchesCompliance = hasViolations || hasWarnings
            break
        }
      }
    }
    
    return matchesSearch && matchesType && matchesCompliance
  })

  // Get measurement statistics
  const stats = {
    total: measurements.length,
    compliant: measurements.filter(m => 
      !m.compliance || m.compliance.status === 'compliant'
    ).length,
    warnings: measurements.filter(m => 
      m.compliance && m.compliance.status === 'warning'
    ).length,
    violations: measurements.filter(m => 
      m.compliance && m.compliance.status === 'violation'
    ).length
  }

  return (
    <div className={`w-full h-full bg-transparent ${className}`}>
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Ruler className="h-5 w-5 text-green-600" />
            </div>
            <h3 className="font-bold text-slate-900 text-lg">Measurements</h3>
          </div>
          <Badge variant="secondary" className="bg-green-100 text-green-700">
            {measurements.length}
          </Badge>
        </div>

        {/* Search and Filters */}
        <div className="space-y-3 mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search measurements..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white/80 border-slate-200 focus:bg-white"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs text-slate-600 mb-1 block">Type</Label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full text-xs border border-slate-200 rounded-md px-2 py-1 bg-white"
              >
                <option value="all">All Types</option>
                <option value="distance">Distance</option>
                <option value="area">Area</option>
                <option value="perimeter">Perimeter</option>
                <option value="angle">Angle</option>
                <option value="clearance">Clearance</option>
              </select>
            </div>
            
            <div>
              <Label className="text-xs text-slate-600 mb-1 block">Compliance</Label>
              <select
                value={filterCompliance}
                onChange={(e) => setFilterCompliance(e.target.value)}
                className="w-full text-xs border border-slate-200 rounded-md px-2 py-1 bg-white"
              >
                <option value="all">All</option>
                <option value="compliant">Compliant</option>
                <option value="warnings">Warnings</option>
                <option value="violations">Violations</option>
                <option value="issues">Issues</option>
                <option value="none">No Rules</option>
              </select>
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="bg-white/60 rounded-lg p-3 border border-slate-200/50">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <div>
                <div className="text-sm font-semibold text-slate-900">{stats.compliant}</div>
                <div className="text-xs text-slate-600">Compliant</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white/60 rounded-lg p-3 border border-slate-200/50">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              <div>
                <div className="text-sm font-semibold text-slate-900">{stats.warnings}</div>
                <div className="text-xs text-slate-600">Warnings</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white/60 rounded-lg p-3 border border-slate-200/50">
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-500" />
              <div>
                <div className="text-sm font-semibold text-slate-900">{stats.violations}</div>
                <div className="text-xs text-slate-600">Violations</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white/60 rounded-lg p-3 border border-slate-200/50">
            <div className="flex items-center gap-2">
              <Ruler className="h-4 w-4 text-blue-500" />
              <div>
                <div className="text-sm font-semibold text-slate-900">{stats.total}</div>
                <div className="text-xs text-slate-600">Total</div>
              </div>
            </div>
          </div>
        </div>

        {/* Measurements List */}
        <ScrollArea className="h-64">
          <div className="space-y-2 pr-2">
            {filteredMeasurements.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <Ruler className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No measurements found</p>
                <p className="text-xs">Create measurements using the tools</p>
              </div>
            ) : (
              filteredMeasurements.map((measurement) => {
                const isSelected = selectedMeasurement === measurement.id
                
                return (
                  <Card
                    key={measurement.id}
                    className={`cursor-pointer transition-all duration-200 ${
                      isSelected 
                        ? 'bg-blue-50 border-blue-200 shadow-sm' 
                        : 'hover:bg-slate-50 border-slate-200'
                    }`}
                    onClick={() => onMeasurementSelect(measurement.id)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start gap-3">
                        <div className="flex items-center gap-2 mt-1">
                          {getTypeIcon(measurement.type)}
                          {getComplianceIcon(measurement.compliance)}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h5 className="text-sm font-medium text-slate-900 truncate">
                              {measurement.label || `${measurement.type} ${measurements.indexOf(measurement) + 1}`}
                            </h5>
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${getComplianceColor(measurement.compliance)}`}
                            >
                              {measurement.type}
                            </Badge>
                          </div>
                          
                          <div className="text-sm font-semibold text-slate-900 mb-1">
                            {MEASUREMENT_UTILS.formatValue(measurement.value, measurement.unit, 2)}
                          </div>
                          
                          {measurement.compliance && (
                            <div className="space-y-1">
                              <div key={measurement.compliance.id} className="text-xs">
                                  <div className={`flex items-center gap-1 ${
                                    measurement.compliance.status === 'violation' ? 'text-red-600' :
                                    measurement.compliance.status === 'warning' ? 'text-yellow-600' :
                                    'text-green-600'
                                  }`}>
                                    {measurement.compliance.status === 'violation' && <XCircle className="h-3 w-3" />}
                                    {measurement.compliance.status === 'warning' && <AlertTriangle className="h-3 w-3" />}
                                    {measurement.compliance.status === 'compliant' && <CheckCircle className="h-3 w-3" />}
                                    <span className="font-medium">{measurement.compliance.type.replace('_', ' ')}</span>
                                  </div>
                                  <div className="text-slate-500 ml-4">
                                    {measurement.compliance.actualValue.toFixed(2)}{measurement.compliance.unit} / {measurement.compliance.requiredValue}{measurement.compliance.unit}
                                  </div>
                                </div>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              onMeasurementUpdate(measurement.id, { 
                                label: `${measurement.label || measurement.type} (Copy)`
                              })
                            }}
                            className="h-6 w-6 p-0 hover:bg-slate-100"
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              onMeasurementDelete(measurement.id)
                            }}
                            className="h-6 w-6 p-0 hover:bg-red-100 hover:text-red-600"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })
            )}
          </div>
        </ScrollArea>

        {/* Actions */}
        <div className="mt-4 space-y-2">
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start"
            onClick={() => {
              // Export measurements functionality
              const dataStr = JSON.stringify(measurements, null, 2)
              const dataBlob = new Blob([dataStr], { type: 'application/json' })
              const url = URL.createObjectURL(dataBlob)
              const link = document.createElement('a')
              link.href = url
              link.download = 'measurements.json'
              link.click()
              URL.revokeObjectURL(url)
            }}
          >
            <Download className="h-4 w-4 mr-2" />
            Export Measurements
          </Button>
        </div>
      </div>
    </div>
  )
}
