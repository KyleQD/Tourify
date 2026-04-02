"use client"

import React, { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { 
  MapPin, 
  Navigation, 
  Satellite, 
  Activity, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Truck,
  Package,
  Zap,
  Wifi,
  WifiOff,
  Battery,
  Signal,
  RefreshCw,
  Play,
  Pause,
  Square,
  Settings,
  Eye,
  Filter,
  Search,
  Download,
  Upload,
  Bell,
  BellOff,
  Map,
  Layers,
  Target,
  TrendingUp,
  BarChart3
} from "lucide-react"
import { EquipmentInstance } from "@/types/site-map"
import { useToast } from "@/hooks/use-toast"

interface RealTimeEquipmentTrackerProps {
  vendorId: string
  siteMapId?: string
}

interface EquipmentTrackingData {
  id: string
  equipmentId: string
  equipmentName: string
  latitude: number
  longitude: number
  accuracy: number
  batteryLevel: number
  signalStrength: number
  isOnline: boolean
  lastUpdate: string
  speed?: number
  heading?: number
  status: 'moving' | 'stationary' | 'offline'
  temperature?: number
  humidity?: number
  vibration?: boolean
}

interface TrackingAlert {
  id: string
  equipmentId: string
  type: 'low_battery' | 'signal_loss' | 'geofence_breach' | 'maintenance_due' | 'temperature_alert'
  severity: 'low' | 'medium' | 'high' | 'critical'
  message: string
  timestamp: string
  isRead: boolean
  equipmentName: string
}

interface Geofence {
  id: string
  name: string
  type: 'site' | 'warehouse' | 'transport' | 'custom'
  center: { lat: number; lng: number }
  radius: number
  isActive: boolean
  equipmentCount: number
}

export function RealTimeEquipmentTracker({ vendorId, siteMapId }: RealTimeEquipmentTrackerProps) {
  const { toast } = useToast()
  const [trackingData, setTrackingData] = useState<EquipmentTrackingData[]>([])
  const [alerts, setAlerts] = useState<TrackingAlert[]>([])
  const [geofences, setGeofences] = useState<Geofence[]>([])
  const [selectedEquipment, setSelectedEquipment] = useState<EquipmentTrackingData | null>(null)
  const [isTrackingActive, setIsTrackingActive] = useState(true)
  const [isLoading, setIsLoading] = useState(true)
  const [mapView, setMapView] = useState<'satellite' | 'roadmap'>('roadmap')
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'online' | 'offline' | 'moving' | 'stationary'>('all')
  const intervalRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    loadTrackingData()
    startRealTimeTracking()
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [vendorId, siteMapId])

  const loadTrackingData = async () => {
    setIsLoading(true)
    try {
      // Mock data - replace with actual API calls
      const mockTrackingData: EquipmentTrackingData[] = [
        {
          id: 'track-1',
          equipmentId: 'equip-1',
          equipmentName: 'Main Stage Speaker System',
          latitude: 33.6803 + (Math.random() - 0.5) * 0.01,
          longitude: -116.1731 + (Math.random() - 0.5) * 0.01,
          accuracy: 5,
          batteryLevel: 85,
          signalStrength: 4,
          isOnline: true,
          lastUpdate: new Date().toISOString(),
          speed: 0,
          heading: 180,
          status: 'stationary',
          temperature: 22,
          humidity: 45,
          vibration: false
        },
        {
          id: 'track-2',
          equipmentId: 'equip-2',
          equipmentName: 'LED Lighting Rig',
          latitude: 33.6803 + (Math.random() - 0.5) * 0.01,
          longitude: -116.1731 + (Math.random() - 0.5) * 0.01,
          accuracy: 3,
          batteryLevel: 92,
          signalStrength: 5,
          isOnline: true,
          lastUpdate: new Date().toISOString(),
          speed: 0,
          heading: 90,
          status: 'stationary',
          temperature: 24,
          humidity: 42,
          vibration: false
        },
        {
          id: 'track-3',
          equipmentId: 'equip-3',
          equipmentName: 'Generator 500kW',
          latitude: 33.6803 + (Math.random() - 0.5) * 0.01,
          longitude: -116.1731 + (Math.random() - 0.5) * 0.01,
          accuracy: 8,
          batteryLevel: 45,
          signalStrength: 2,
          isOnline: true,
          lastUpdate: new Date(Date.now() - 300000).toISOString(),
          speed: 0,
          heading: 270,
          status: 'stationary',
          temperature: 28,
          humidity: 38,
          vibration: true
        },
        {
          id: 'track-4',
          equipmentId: 'equip-4',
          equipmentName: 'Bell Tent Set (Transport)',
          latitude: 33.6803 + (Math.random() - 0.5) * 0.01,
          longitude: -116.1731 + (Math.random() - 0.5) * 0.01,
          accuracy: 12,
          batteryLevel: 78,
          signalStrength: 3,
          isOnline: false,
          lastUpdate: new Date(Date.now() - 1800000).toISOString(),
          speed: 65,
          heading: 45,
          status: 'moving',
          temperature: 26,
          humidity: 50,
          vibration: true
        }
      ]

      const mockAlerts: TrackingAlert[] = [
        {
          id: 'alert-1',
          equipmentId: 'equip-3',
          type: 'low_battery',
          severity: 'medium',
          message: 'Generator battery level is low (45%)',
          timestamp: new Date(Date.now() - 600000).toISOString(),
          isRead: false,
          equipmentName: 'Generator 500kW'
        },
        {
          id: 'alert-2',
          equipmentId: 'equip-4',
          type: 'signal_loss',
          severity: 'high',
          message: 'Bell Tent Set lost GPS signal',
          timestamp: new Date(Date.now() - 1200000).toISOString(),
          isRead: false,
          equipmentName: 'Bell Tent Set (Transport)'
        },
        {
          id: 'alert-3',
          equipmentId: 'equip-3',
          type: 'temperature_alert',
          severity: 'low',
          message: 'Generator operating temperature is elevated',
          timestamp: new Date(Date.now() - 1800000).toISOString(),
          isRead: true,
          equipmentName: 'Generator 500kW'
        }
      ]

      const mockGeofences: Geofence[] = [
        {
          id: 'geo-1',
          name: 'Coachella Festival Grounds',
          type: 'site',
          center: { lat: 33.6803, lng: -116.1731 },
          radius: 1000,
          isActive: true,
          equipmentCount: 3
        },
        {
          id: 'geo-2',
          name: 'Main Warehouse',
          type: 'warehouse',
          center: { lat: 33.6750, lng: -116.1650 },
          radius: 200,
          isActive: true,
          equipmentCount: 0
        },
        {
          id: 'geo-3',
          name: 'Transport Route',
          type: 'transport',
          center: { lat: 33.6850, lng: -116.1800 },
          radius: 500,
          isActive: true,
          equipmentCount: 1
        }
      ]

      setTrackingData(mockTrackingData)
      setAlerts(mockAlerts)
      setGeofences(mockGeofences)
    } catch (error) {
      console.error('Error loading tracking data:', error)
      toast({
        title: "Error",
        description: "Failed to load tracking data",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const startRealTimeTracking = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }

    intervalRef.current = setInterval(() => {
      if (isTrackingActive) {
        // Simulate real-time updates
        setTrackingData(prev => prev.map(item => ({
          ...item,
          latitude: item.latitude + (Math.random() - 0.5) * 0.0001,
          longitude: item.longitude + (Math.random() - 0.5) * 0.0001,
          batteryLevel: Math.max(0, item.batteryLevel - (Math.random() * 0.5)),
          lastUpdate: new Date().toISOString(),
          temperature: item.temperature ? item.temperature + (Math.random() - 0.5) * 2 : undefined
        })))
      }
    }, 5000) // Update every 5 seconds
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'moving': return 'bg-blue-100 text-blue-800'
      case 'stationary': return 'bg-green-100 text-green-800'
      case 'offline': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'moving': return <Navigation className="h-4 w-4" />
      case 'stationary': return <MapPin className="h-4 w-4" />
      case 'offline': return <WifiOff className="h-4 w-4" />
      default: return <Clock className="h-4 w-4" />
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return 'bg-green-100 text-green-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'high': return 'bg-orange-100 text-orange-800'
      case 'critical': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getSignalIcon = (strength: number, isOnline: boolean) => {
    if (!isOnline) return <WifiOff className="h-4 w-4 text-red-500" />
    
    switch (strength) {
      case 5: return <Signal className="h-4 w-4 text-green-500" />
      case 4: return <Signal className="h-4 w-4 text-green-500" />
      case 3: return <Signal className="h-4 w-4 text-yellow-500" />
      case 2: return <Signal className="h-4 w-4 text-orange-500" />
      case 1: return <Signal className="h-4 w-4 text-red-500" />
      default: return <WifiOff className="h-4 w-4 text-red-500" />
    }
  }

  const getBatteryIcon = (level: number) => {
    if (level > 75) return <Battery className="h-4 w-4 text-green-500" />
    if (level > 50) return <Battery className="h-4 w-4 text-yellow-500" />
    if (level > 25) return <Battery className="h-4 w-4 text-orange-500" />
    return <Battery className="h-4 w-4 text-red-500" />
  }

  const filteredTrackingData = trackingData.filter(item => {
    switch (selectedFilter) {
      case 'online': return item.isOnline
      case 'offline': return !item.isOnline
      case 'moving': return item.status === 'moving'
      case 'stationary': return item.status === 'stationary'
      default: return true
    }
  })

  const unreadAlerts = alerts.filter(alert => !alert.isRead)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading real-time tracking data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Real-Time Equipment Tracking</h3>
          <p className="text-sm text-gray-600">
            Monitor equipment location, status, and performance in real-time
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={isTrackingActive ? "default" : "outline"} className="flex items-center gap-1">
            <Activity className="h-3 w-3" />
            {isTrackingActive ? "Tracking Active" : "Tracking Paused"}
          </Badge>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setIsTrackingActive(!isTrackingActive)}
          >
            {isTrackingActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          <Button variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Alerts Banner */}
      {unreadAlerts.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
                <span className="font-medium text-orange-800">
                  {unreadAlerts.length} unread alert{unreadAlerts.length > 1 ? 's' : ''}
                </span>
              </div>
              <Button variant="outline" size="sm" className="text-orange-800 border-orange-300">
                View All Alerts
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Equipment List */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Equipment Status</CardTitle>
                <div className="flex items-center gap-2">
                  <select
                    value={selectedFilter}
                    onChange={(e) => setSelectedFilter(e.target.value as any)}
                    className="px-3 py-1 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="all">All Equipment</option>
                    <option value="online">Online</option>
                    <option value="offline">Offline</option>
                    <option value="moving">Moving</option>
                    <option value="stationary">Stationary</option>
                  </select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {filteredTrackingData.map((item) => (
                <div 
                  key={item.id} 
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
                  onClick={() => setSelectedEquipment(item)}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(item.status)}
                      <div>
                        <h4 className="font-medium">{item.equipmentName}</h4>
                        <div className="flex items-center gap-3 text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            {getSignalIcon(item.signalStrength, item.isOnline)}
                            {item.signalStrength}/5 bars
                          </span>
                          <span className="flex items-center gap-1">
                            {getBatteryIcon(item.batteryLevel)}
                            {item.batteryLevel}%
                          </span>
                          {item.temperature && (
                            <span>{item.temperature}°C</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <Badge className={getStatusColor(item.status)}>
                      {item.status}
                    </Badge>
                    
                    <div className="text-right text-sm">
                      <p className="font-medium">
                        {item.latitude.toFixed(6)}, {item.longitude.toFixed(6)}
                      </p>
                      <p className="text-gray-600">
                        Updated {new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(new Date(item.lastUpdate))}
                      </p>
                    </div>
                    
                    <Button variant="ghost" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Alerts and Geofences */}
        <div className="space-y-4">
          {/* Recent Alerts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Recent Alerts
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {alerts.slice(0, 5).map((alert) => (
                <div key={alert.id} className={`p-3 rounded-lg border-l-4 ${
                  alert.severity === 'critical' ? 'border-red-500 bg-red-50' :
                  alert.severity === 'high' ? 'border-orange-500 bg-orange-50' :
                  alert.severity === 'medium' ? 'border-yellow-500 bg-yellow-50' :
                  'border-green-500 bg-green-50'
                }`}>
                  <div className="flex items-center justify-between mb-1">
                    <Badge className={getSeverityColor(alert.severity)} variant="outline">
                      {alert.severity}
                    </Badge>
                    {!alert.isRead && (
                      <div className="w-2 h-2 bg-red-500 rounded-full" />
                    )}
                  </div>
                  <p className="text-sm font-medium">{alert.equipmentName}</p>
                  <p className="text-xs text-gray-600">{alert.message}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(new Date(alert.timestamp))}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Geofences */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Geofences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {geofences.map((geofence) => (
                <div key={geofence.id} className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-sm">{geofence.name}</h4>
                    <Badge variant={geofence.isActive ? "default" : "outline"}>
                      {geofence.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-600">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {geofence.radius}m radius
                    </span>
                    <span className="flex items-center gap-1">
                      <Package className="h-3 w-3" />
                      {geofence.equipmentCount} equipment
                    </span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Tracking Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Tracking Statistics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Total Equipment</span>
                <span className="font-bold">{trackingData.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Online</span>
                <span className="font-bold text-green-600">
                  {trackingData.filter(item => item.isOnline).length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Moving</span>
                <span className="font-bold text-blue-600">
                  {trackingData.filter(item => item.status === 'moving').length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Active Alerts</span>
                <span className="font-bold text-orange-600">
                  {unreadAlerts.length}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Equipment Details Dialog */}
      {selectedEquipment && (
        <Dialog open={!!selectedEquipment} onOpenChange={() => setSelectedEquipment(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {getStatusIcon(selectedEquipment.status)}
                {selectedEquipment.equipmentName}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">Location Information</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Latitude:</span>
                      <span>{selectedEquipment.latitude.toFixed(6)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Longitude:</span>
                      <span>{selectedEquipment.longitude.toFixed(6)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Accuracy:</span>
                      <span>±{selectedEquipment.accuracy}m</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Last Update:</span>
                      <span>{new Intl.DateTimeFormat("en-US", {
                        year: "numeric",
                        month: "numeric",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      }).format(new Date(selectedEquipment.lastUpdate))}</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Device Status</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Battery Level:</span>
                      <span className="flex items-center gap-1">
                        {getBatteryIcon(selectedEquipment.batteryLevel)}
                        {selectedEquipment.batteryLevel}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Signal Strength:</span>
                      <span className="flex items-center gap-1">
                        {getSignalIcon(selectedEquipment.signalStrength, selectedEquipment.isOnline)}
                        {selectedEquipment.signalStrength}/5
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Status:</span>
                      <Badge className={getStatusColor(selectedEquipment.status)}>
                        {selectedEquipment.status}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Online:</span>
                      <Badge variant={selectedEquipment.isOnline ? "default" : "destructive"}>
                        {selectedEquipment.isOnline ? "Yes" : "No"}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
              
              {selectedEquipment.temperature && (
                <div>
                  <h4 className="font-medium mb-2">Environmental Data</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex justify-between">
                      <span>Temperature:</span>
                      <span>{selectedEquipment.temperature}°C</span>
                    </div>
                    {selectedEquipment.humidity && (
                      <div className="flex justify-between">
                        <span>Humidity:</span>
                        <span>{selectedEquipment.humidity}%</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>Vibration:</span>
                      <span>{selectedEquipment.vibration ? "Detected" : "None"}</span>
                    </div>
                  </div>
                </div>
              )}
              
              {selectedEquipment.speed && selectedEquipment.speed > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Movement Data</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex justify-between">
                      <span>Speed:</span>
                      <span>{selectedEquipment.speed} km/h</span>
                    </div>
                    {selectedEquipment.heading && (
                      <div className="flex justify-between">
                        <span>Heading:</span>
                        <span>{selectedEquipment.heading}°</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
