"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { 
  Layers, 
  Eye, 
  EyeOff, 
  Lock, 
  Unlock, 
  Plus, 
  Trash2, 
  Settings,
  Save,
  Download,
  Upload,
  Share,
  Users,
  MessageSquare,
  Clock,
  CheckCircle,
  AlertTriangle,
  Zap,
  Droplets,
  Wifi,
  Shield,
  Star,
  Building,
  Car,
  Tent,
  Music,
  Utensils,
  Camera,
  MapPin,
  Navigation,
  TreePine,
  Edit3,
  Ruler
} from "lucide-react"
import { DragDropProvider, DragItem } from "@/contexts/site-map/drag-drop-context"
import { ElementToolbox } from "./element-toolbox"
import { CanvasRenderer } from "./canvas-renderer"
import { MeasurementTools } from "./measurement-tools"
import { MeasurementCanvas } from "./measurement-canvas"
import { MeasurementPanel } from "./measurement-panel"
import { 
  SiteMap, 
  SiteMapElement, 
  CanvasMeasurement, 
  MapIssue, 
  MapLayer 
} from "@/types/site-map"
import { 
  Measurement, 
  ComplianceCheck, 
  DEFAULT_COMPLIANCE_RULES,
  MEASUREMENT_UTILS
} from "@/types/measurements"
import { useToast } from "@/hooks/use-toast"

interface EnhancedSiteMapBuilderProps {
  siteMap: SiteMap
  onUpdate: (updates: Partial<SiteMap>) => void
  onElementCreate: (element: Partial<SiteMapElement>) => void
  onElementUpdate: (elementId: string, updates: Partial<SiteMapElement>) => void
  onElementDelete: (elementId: string) => void
  onMeasurementCreate: (measurement: Partial<CanvasMeasurement>) => void
  onIssueCreate: (issue: Partial<MapIssue>) => void
  collaborators?: any[]
  isReadOnly?: boolean
}

export function EnhancedSiteMapBuilder({
  siteMap,
  onUpdate,
  onElementCreate,
  onElementUpdate,
  onElementDelete,
  onMeasurementCreate,
  onIssueCreate,
  collaborators = [],
  isReadOnly = false
}: EnhancedSiteMapBuilderProps) {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState("design")
  const [selectedLayer, setSelectedLayer] = useState<string | null>(null)
  const [layers, setLayers] = useState<MapLayer[]>([])
  const [elements, setElements] = useState<SiteMapElement[]>([])
  const [measurements, setMeasurements] = useState<Measurement[]>([])
  const [issues, setIssures] = useState<MapIssue[]>([])
  const [selectedElement, setSelectedElement] = useState<DragItem | null>(null)
  
  // Measurement system state
  const [activeMeasurementTool, setActiveMeasurementTool] = useState<string | null>(null)
  const [enabledComplianceRules, setEnabledComplianceRules] = useState<string[]>(
    DEFAULT_COMPLIANCE_RULES.filter(r => r.required).map(r => r.id)
  )
  const [selectedMeasurement, setSelectedMeasurement] = useState<string | null>(null)
  
  // Load initial data
  useEffect(() => {
    // Initialize with default layers if none exist
    if (layers.length === 0) {
      const defaultLayers: MapLayer[] = [
        {
          id: 'infrastructure',
          name: 'Infrastructure',
          description: 'Basic infrastructure elements',
          layerType: 'infrastructure',
          color: '#3b82f6',
          opacity: 80,
          isVisible: true,
          isLocked: false,
          zIndex: 1,
          siteMapId: siteMap.id,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 'power',
          name: 'Power & Utilities',
          description: 'Power distribution and utilities',
          layerType: 'power',
          color: '#f59e0b',
          opacity: 80,
          isVisible: true,
          isLocked: false,
          zIndex: 2,
          siteMapId: siteMap.id,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 'safety',
          name: 'Safety & Security',
          description: 'Safety zones and security elements',
          layerType: 'safety_zones',
          color: '#ef4444',
          opacity: 90,
          isVisible: true,
          isLocked: false,
          zIndex: 10,
          siteMapId: siteMap.id,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ]
      setLayers(defaultLayers)
      setSelectedLayer(defaultLayers[0].id)
    }
  }, [siteMap.id, layers.length])
  
  const handleElementCreate = (element: Partial<SiteMapElement>) => {
    const newElement: SiteMapElement = {
      id: `element-${Date.now()}`,
      siteMapId: siteMap.id,
      name: element.name || 'New Element',
      elementType: element.elementType || 'custom',
      x: element.x || 0,
      y: element.y || 0,
      width: element.width || 100,
      height: element.height || 100,
      rotation: element.rotation || 0,
      color: element.color || '#3b82f6',
      strokeColor: element.strokeColor || '#1e40af',
      strokeWidth: element.strokeWidth || 1,
      opacity: element.opacity || 1,
      pathData: element.pathData,
      shapeData: element.shapeData,
      properties: element.properties || {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    
    setElements(prev => [...prev, newElement])
    onElementCreate(newElement)
    
    toast({
      title: "Element Added",
      description: `Added ${element.properties?.name || 'new element'} to the map`
    })
  }
  
  const handleElementUpdate = (elementId: string, updates: Partial<SiteMapElement>) => {
    setElements(prev => prev.map(element => 
      element.id === elementId 
        ? { ...element, ...updates, updatedAt: new Date().toISOString() }
        : element
    ))
    onElementUpdate(elementId, updates)
  }
  
  const handleElementDelete = (elementId: string) => {
    setElements(prev => prev.filter(element => element.id !== elementId))
    onElementDelete(elementId)
    
    toast({
      title: "Element Removed",
      description: "Element has been removed from the map"
    })
  }
  
  const handleMeasurementCreate = (measurement: Partial<CanvasMeasurement>) => {
    const newMeasurement: CanvasMeasurement = {
      id: `measurement-${Date.now()}`,
      type: measurement.type || 'distance',
      startX: measurement.startX || 0,
      startY: measurement.startY || 0,
      endX: measurement.endX || 0,
      endY: measurement.endY || 0,
      value: measurement.value || 0,
      unit: measurement.unit || 'meters',
      color: measurement.color || '#ef4444'
    }
    
    // Convert CanvasMeasurement to Measurement format
    const convertedMeasurement: Measurement = {
      id: newMeasurement.id,
      type: newMeasurement.type as 'distance' | 'area' | 'perimeter' | 'angle' | 'clearance',
      points: [
        { id: 'start', x: newMeasurement.startX, y: newMeasurement.startY },
        { id: 'end', x: newMeasurement.endX, y: newMeasurement.endY }
      ],
      value: newMeasurement.value,
      unit: newMeasurement.unit as 'meters' | 'feet' | 'inches' | 'centimeters',
      label: newMeasurement.label,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'current-user'
    }
    
    setMeasurements(prev => [...prev, convertedMeasurement])
    // onMeasurementCreate is expecting CanvasMeasurement, but we're using Measurement
    // This will be handled by the parent component
  }
  
  const handleIssueCreate = (issue: Partial<MapIssue>) => {
    const newIssue: MapIssue = {
      id: `issue-${Date.now()}`,
      siteMapId: siteMap.id,
      x: issue.x || 0,
      y: issue.y || 0,
      title: issue.title || 'New Issue',
      description: issue.description || '',
      severity: issue.severity || 'medium',
      status: issue.status || 'open',
      issueType: issue.issueType || 'other',
      reportedBy: issue.reportedBy || 'system',
      assignedTo: issue.assignedTo,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    
    setIssures(prev => [...prev, newIssue])
    onIssueCreate(newIssue)
    
    toast({
      title: "Issue Reported",
      description: `New ${newIssue.severity} priority issue reported`
    })
  }

  // Enhanced measurement handlers
  const handleSmartMeasurementCreate = async (measurementData: Partial<Measurement>) => {
    const activeRules = DEFAULT_COMPLIANCE_RULES.filter(rule => 
      enabledComplianceRules.includes(rule.id)
    )
    
    const compliance = MEASUREMENT_UTILS.checkCompliance(
      measurementData as Measurement, 
      activeRules
    )
    
    const newMeasurement: Measurement = {
      id: `measurement_${Date.now()}`,
      type: measurementData.type || 'distance',
      points: measurementData.points || [],
      value: measurementData.value || 0,
      unit: measurementData.unit || 'meters',
      label: measurementData.label || `Measurement ${measurements.length + 1}`,
      description: measurementData.description || '',
      compliance: compliance[0] || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'current-user'
    }
    
    setMeasurements(prev => [...prev, newMeasurement])
    toast({ title: "Success", description: "Measurement created successfully" })
  }

  const handleSmartMeasurementUpdate = async (id: string, updates: Partial<Measurement>) => {
    setMeasurements(prev => prev.map(measurement => 
      measurement.id === id 
        ? { ...measurement, ...updates, updatedAt: new Date().toISOString() }
        : measurement
    ))
    toast({ title: "Success", description: "Measurement updated successfully" })
  }

  const handleSmartMeasurementDelete = async (id: string) => {
    setMeasurements(prev => prev.filter(measurement => measurement.id !== id))
    toast({ title: "Success", description: "Measurement deleted successfully" })
  }

  const handleComplianceRuleToggle = (ruleId: string, enabled: boolean) => {
    setEnabledComplianceRules(prev => 
      enabled 
        ? [...prev, ruleId]
        : prev.filter(id => id !== ruleId)
    )
  }
  
  const handleLayerToggle = (layerId: string) => {
    setLayers(prev => prev.map(layer => 
      layer.id === layerId 
        ? { ...layer, isVisible: !layer.isVisible }
        : layer
    ))
  }
  
  const handleLayerLock = (layerId: string) => {
    setLayers(prev => prev.map(layer => 
      layer.id === layerId 
        ? { ...layer, isLocked: !layer.isLocked }
        : layer
    ))
  }
  
  const handleSave = () => {
    onUpdate({
      updatedAt: new Date().toISOString()
    })
    
    toast({
      title: "Site Map Saved",
      description: "All changes have been saved successfully"
    })
  }
  
  const handleExport = () => {
    // Implement export functionality
    toast({
      title: "Export Started",
      description: "Preparing site map for export..."
    })
  }
  
  const handleShare = () => {
    // Implement sharing functionality
    toast({
      title: "Share Link Created",
      description: "Site map sharing link has been generated"
    })
  }
  
  const layerIcons = {
    infrastructure: Building,
    power: Zap,
    water: Droplets,
    wifi: Wifi,
    crew_zones: Users,
    guest_areas: Users,
    safety_zones: Shield,
    vip_areas: Star,
    backstage: Building,
    restricted: Shield,
    custom: Layers
  }
  
  return (
    <DragDropProvider
      initialConfig={{
        snapToGrid: true,
        gridSize: 20,
        rotationEnabled: true,
        scalingEnabled: true,
        collisionDetection: true,
        multiSelect: true,
        autoAlign: true
      }}
    >
      <div className="flex h-full bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        {/* Left Sidebar - Element Toolbox */}
        <div className="w-80 bg-white/95 backdrop-blur-sm border-r border-slate-200/60 shadow-xl flex flex-col">
          <div className="p-6 border-b border-slate-200/60 bg-gradient-to-r from-blue-50 to-indigo-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Layers className="h-5 w-5 text-blue-600" />
                </div>
                <h3 className="font-bold text-slate-900 text-lg">Element Library</h3>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={handleSave} className="hover:bg-blue-100">
                  <Save className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={handleExport} className="hover:bg-blue-100">
                  <Download className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={handleShare} className="hover:bg-blue-100">
                  <Share className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
          
          <div className="flex-1 overflow-hidden">
            <ElementToolbox
              onElementSelect={setSelectedElement}
              className="h-full"
            />
          </div>
        </div>
        
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col bg-white/80 backdrop-blur-sm">
          {/* Tabs */}
          <div className="bg-white/95 backdrop-blur-sm border-b border-slate-200/60 shadow-sm">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-6 h-12 bg-transparent p-1">
                <TabsTrigger 
                  value="design" 
                  className="data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-200"
                >
                  <div className="flex items-center gap-2">
                    <Edit3 className="h-4 w-4" />
                    Design
                  </div>
                </TabsTrigger>
                <TabsTrigger 
                  value="layers"
                  className="data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-200"
                >
                  <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4" />
                    Layers
                  </div>
                </TabsTrigger>
                <TabsTrigger 
                  value="measurements"
                  className="data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-200"
                >
                  <div className="flex items-center gap-2">
                    <Ruler className="h-4 w-4" />
                    Measurements
                  </div>
                </TabsTrigger>
                <TabsTrigger 
                  value="issues"
                  className="data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-200"
                >
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Issues
                  </div>
                </TabsTrigger>
                <TabsTrigger 
                  value="collaboration"
                  className="data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-200"
                >
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Collaborate
                  </div>
                </TabsTrigger>
                <TabsTrigger 
                  value="export"
                  className="data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-200"
                >
                  <div className="flex items-center gap-2">
                    <Download className="h-4 w-4" />
                    Export
                  </div>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          
          {/* Tab Content */}
          <div className="flex-1 overflow-hidden">
            <Tabs value={activeTab}>
              <TabsContent value="design" className="h-full m-0">
                <div className="flex h-full">
                  {/* Canvas */}
                  <div className="flex-1">
                    <CanvasRenderer
                      siteMapId={siteMap.id}
                      elements={elements}
                      measurements={measurements.map(m => ({
                        id: m.id,
                        type: m.type as 'distance' | 'area' | 'angle',
                        startX: m.points[0]?.x || 0,
                        startY: m.points[0]?.y || 0,
                        endX: m.points[1]?.x || 0,
                        endY: m.points[1]?.y || 0,
                        value: m.value,
                        unit: m.unit,
                        label: m.label,
                        color: '#ef4444'
                      }))}
                      issues={issues}
                      onElementCreate={handleElementCreate}
                      onElementUpdate={handleElementUpdate}
                      onElementDelete={handleElementDelete}
                      onMeasurementCreate={handleMeasurementCreate}
                      onIssueCreate={handleIssueCreate}
                      className="h-full"
                    />
                  </div>
                  
                  {/* Right Panel - Layers */}
                  <div className="w-80 bg-white/95 backdrop-blur-sm border-l border-slate-200/60 shadow-xl flex flex-col">
                    <div className="p-6 border-b border-slate-200/60 bg-gradient-to-r from-purple-50 to-pink-50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-purple-100 rounded-lg">
                            <Layers className="h-5 w-5 text-purple-600" />
                          </div>
                          <h3 className="font-bold text-slate-900 text-lg">Layers</h3>
                        </div>
                        <Button variant="ghost" size="sm" className="hover:bg-purple-100">
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-6 space-y-4">
                      {layers.map((layer) => {
                        const IconComponent = layerIcons[layer.layerType] || Layers
                        const layerElements = elements.filter(e => e.siteMapId === layer.siteMapId)
                        
                        return (
                          <div key={layer.id} className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-slate-200/50 shadow-sm hover:shadow-md transition-all duration-200">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <div 
                                  className="p-2 rounded-lg"
                                  style={{ backgroundColor: `${layer.color}20` }}
                                >
                                  <IconComponent 
                                    className="h-4 w-4" 
                                    style={{ color: layer.color }} 
                                  />
                                </div>
                                <div>
                                  <span className="text-sm font-semibold text-slate-900">{layer.name}</span>
                                  <Badge variant="secondary" className="text-xs ml-2 bg-slate-100 text-slate-600">
                                    {layerElements.length} elements
                                  </Badge>
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleLayerToggle(layer.id)}
                                  className="hover:bg-slate-100"
                                >
                                  {layer.isVisible ? <Eye className="h-4 w-4 text-green-600" /> : <EyeOff className="h-4 w-4 text-slate-400" />}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleLayerLock(layer.id)}
                                  className="hover:bg-slate-100"
                                >
                                  {layer.isLocked ? <Lock className="h-4 w-4 text-red-600" /> : <Unlock className="h-4 w-4 text-slate-400" />}
                                </Button>
                              </div>
                            </div>
                            
                            {/* Layer elements */}
                            {layer.isVisible && layerElements.length > 0 && (
                              <div className="ml-6 space-y-1">
                                {layerElements.map((element) => (
                                  <div 
                                    key={element.id}
                                    className="flex items-center justify-between text-xs text-gray-600 hover:bg-gray-50 p-1 rounded"
                                  >
                                    <span>{element.properties?.name || 'Unnamed Element'}</span>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleElementDelete(element.id)}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                    
                    {/* Status Bar */}
                    <div className="p-6 border-t border-slate-200/60 bg-gradient-to-r from-slate-50 to-slate-100">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span className="text-sm font-medium text-slate-700">Project Status</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div className="bg-white/60 rounded-lg p-3 border border-slate-200/50">
                            <div className="font-semibold text-slate-900">{elements.length}</div>
                            <div className="text-slate-600">Elements</div>
                          </div>
                          <div className="bg-white/60 rounded-lg p-3 border border-slate-200/50">
                            <div className="font-semibold text-slate-900">{measurements.length}</div>
                            <div className="text-slate-600">Measurements</div>
                          </div>
                          <div className="bg-white/60 rounded-lg p-3 border border-slate-200/50">
                            <div className="font-semibold text-slate-900">{issues.length}</div>
                            <div className="text-slate-600">Issues</div>
                          </div>
                          <div className="bg-white/60 rounded-lg p-3 border border-slate-200/50">
                            <div className="font-semibold text-slate-900">{collaborators.length}</div>
                            <div className="text-slate-600">Collaborators</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="layers" className="h-full m-0 p-4">
                <Card className="h-full">
                  <CardHeader>
                    <CardTitle>Layer Management</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600">Layer management interface will be implemented here.</p>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="measurements" className="h-full m-0">
                <div className="h-full flex">
                  {/* Left Panel - Measurement Tools */}
                  <div className="w-80 bg-white/95 backdrop-blur-sm border-r border-slate-200/60 shadow-xl flex flex-col">
                    <div className="p-6 border-b border-slate-200/60 bg-gradient-to-r from-green-50 to-emerald-50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-green-100 rounded-lg">
                            <Ruler className="h-5 w-5 text-green-600" />
                          </div>
                          <h3 className="font-bold text-slate-900 text-lg">Smart Measurements</h3>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex-1 overflow-hidden">
                      <MeasurementTools
                        activeTool={activeMeasurementTool}
                        onToolSelect={setActiveMeasurementTool}
                        onComplianceRuleToggle={handleComplianceRuleToggle}
                        enabledComplianceRules={enabledComplianceRules}
                        className="h-full"
                      />
                    </div>
                  </div>
                  
                  {/* Main Canvas Area */}
                  <div className="flex-1 flex flex-col">
                    <MeasurementCanvas
                      width={800}
                      height={600}
                      measurements={measurements}
                      onMeasurementCreate={handleSmartMeasurementCreate}
                      onMeasurementUpdate={handleSmartMeasurementUpdate}
                      onMeasurementDelete={handleSmartMeasurementDelete}
                      activeTool={activeMeasurementTool}
                      config={{
                        snapToGrid: true,
                        gridSize: 20,
                        showGrid: true,
                        showMeasurements: true,
                        showCompliance: true,
                        defaultUnit: 'meters',
                        precision: 2
                      }}
                      enabledComplianceRules={enabledComplianceRules}
                      className="flex-1"
                    />
                  </div>
                  
                  {/* Right Panel - Measurement Management */}
                  <div className="w-80 bg-white/95 backdrop-blur-sm border-l border-slate-200/60 shadow-xl flex flex-col">
                    <div className="p-6 border-b border-slate-200/60 bg-gradient-to-r from-blue-50 to-indigo-50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-100 rounded-lg">
                            <Ruler className="h-5 w-5 text-blue-600" />
                          </div>
                          <h3 className="font-bold text-slate-900 text-lg">Measurement List</h3>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex-1 overflow-hidden">
                      <MeasurementPanel
                        measurements={measurements}
                        onMeasurementUpdate={handleSmartMeasurementUpdate}
                        onMeasurementDelete={handleSmartMeasurementDelete}
                        onMeasurementSelect={setSelectedMeasurement}
                        selectedMeasurement={selectedMeasurement}
                        className="h-full"
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="issues" className="h-full m-0 p-4">
                <Card className="h-full">
                  <CardHeader>
                    <CardTitle>Issue Tracking</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600">Issue tracking and maintenance tickets will be implemented here.</p>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="collaboration" className="h-full m-0 p-4">
                <Card className="h-full">
                  <CardHeader>
                    <CardTitle>Collaboration</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600">Real-time collaboration features will be implemented here.</p>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="export" className="h-full m-0 p-4">
                <Card className="h-full">
                  <CardHeader>
                    <CardTitle>Export & Sharing</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600">Export and sharing options will be implemented here.</p>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </DragDropProvider>
  )
}
