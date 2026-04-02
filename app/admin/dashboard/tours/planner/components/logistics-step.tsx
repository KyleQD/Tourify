"use client"

import React, { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Truck, 
  Hotel, 
  Settings, 
  Plus, 
  Trash2, 
  Edit3,
  DollarSign,
  Package,
  CheckCircle,
  Plane,
  Train,
  Car,
  MapPin,
  Calendar,
  Clock
} from "lucide-react"
import { formatSafeCurrency } from "@/lib/format/number-format"

interface LogisticsStepProps {
  tourData: {
    transportation: {
      type: string
      details: string
      cost: number
      departure_city?: string
      arrival_city?: string
      departure_date?: string
      departure_time?: string
      arrival_date?: string
      arrival_time?: string
      flight_number?: string
      airline?: string
      vehicle_type?: string
      driver_name?: string
      driver_phone?: string
    }
    accommodation: {
      type: string
      details: string
      cost: number
      hotel_name?: string
      check_in_date?: string
      check_out_date?: string
      check_in_time?: string
      check_out_time?: string
      room_type?: string
      confirmation_number?: string
      contact_phone?: string
      special_requests?: string
    }
    equipment: Array<{
      id: string
      name: string
      quantity: number
      cost: number
    }>
  }
  updateTourData: (updates: any) => void
}

const transportationTypes = [
  "Tour Bus", "Van", "Car Rental", "Flight", "Train", "Private Jet", "Motorcycle"
]

const accommodationTypes = [
  "Hotel", "Motel", "Airbnb", "Tour Bus Bunks", "Camping", "Private Residence", "Backstage"
]

const equipmentCategories = [
  "Sound Equipment", "Lighting", "Instruments", "Stage Equipment", "Backline", "Cables", "Tools"
]

export function LogisticsStep({ tourData, updateTourData }: LogisticsStepProps) {
  const [isAddingEquipment, setIsAddingEquipment] = useState(false)
  const [editingEquipment, setEditingEquipment] = useState<string | null>(null)
  const [newEquipment, setNewEquipment] = useState({
    name: "",
    quantity: 1,
    cost: 0
  })

  const handleTransportationChange = (field: string, value: string | number) => {
    updateTourData({
      transportation: { ...tourData.transportation, [field]: value }
    })
  }

  const handleAccommodationChange = (field: string, value: string | number) => {
    updateTourData({
      accommodation: { ...tourData.accommodation, [field]: value }
    })
  }

  const handleAddEquipment = () => {
    if (newEquipment.name) {
      const equipment = {
        id: Date.now().toString(),
        ...newEquipment
      }
      updateTourData({
        equipment: [...tourData.equipment, equipment]
      })
      setNewEquipment({ name: "", quantity: 1, cost: 0 })
      setIsAddingEquipment(false)
    }
  }

  const handleUpdateEquipment = (equipmentId: string, updates: any) => {
    const updatedEquipment = tourData.equipment.map(item =>
      item.id === equipmentId ? { ...item, ...updates } : item
    )
    updateTourData({ equipment: updatedEquipment })
    setEditingEquipment(null)
  }

  const handleRemoveEquipment = (equipmentId: string) => {
    const updatedEquipment = tourData.equipment.filter(item => item.id !== equipmentId)
    updateTourData({ equipment: updatedEquipment })
  }

  const totalLogisticsCost = 
    tourData.transportation.cost + 
    tourData.accommodation.cost + 
    tourData.equipment.reduce((sum, item) => sum + item.cost, 0)

  // Get transportation icon based on type
  const getTransportationIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'flight': return <Plane className="h-4 w-4" />
      case 'train': return <Train className="h-4 w-4" />
      case 'car rental':
      case 'van':
      case 'motorcycle': return <Car className="h-4 w-4" />
      default: return <Truck className="h-4 w-4" />
    }
  }

  // Render dynamic transportation fields based on type
  const renderTransportationDetails = () => {
    const type = tourData.transportation.type.toLowerCase()
    
    if (type === 'flight') {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div className="space-y-2">
            <Label className="text-white text-sm">Airline</Label>
            <Input
              placeholder="e.g., Delta, United"
              value={tourData.transportation.airline || ''}
              onChange={(e) => handleTransportationChange("airline", e.target.value)}
              className="bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-500"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-white text-sm">Flight Number</Label>
            <Input
              placeholder="e.g., DL1234"
              value={tourData.transportation.flight_number || ''}
              onChange={(e) => handleTransportationChange("flight_number", e.target.value)}
              className="bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-500"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-white text-sm">Departure City</Label>
            <Input
              placeholder="e.g., Los Angeles"
              value={tourData.transportation.departure_city || ''}
              onChange={(e) => handleTransportationChange("departure_city", e.target.value)}
              className="bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-500"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-white text-sm">Arrival City</Label>
            <Input
              placeholder="e.g., New York"
              value={tourData.transportation.arrival_city || ''}
              onChange={(e) => handleTransportationChange("arrival_city", e.target.value)}
              className="bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-500"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-white text-sm">Departure Date</Label>
            <Input
              type="date"
              value={tourData.transportation.departure_date || ''}
              onChange={(e) => handleTransportationChange("departure_date", e.target.value)}
              className="bg-slate-800/50 border-slate-600 text-white"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-white text-sm">Departure Time</Label>
            <Input
              type="time"
              value={tourData.transportation.departure_time || ''}
              onChange={(e) => handleTransportationChange("departure_time", e.target.value)}
              className="bg-slate-800/50 border-slate-600 text-white"
            />
          </div>
        </div>
      )
    } else if (type === 'train') {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div className="space-y-2">
            <Label className="text-white text-sm">Departure City</Label>
            <Input
              placeholder="e.g., Los Angeles"
              value={tourData.transportation.departure_city || ''}
              onChange={(e) => handleTransportationChange("departure_city", e.target.value)}
              className="bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-500"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-white text-sm">Arrival City</Label>
            <Input
              placeholder="e.g., New York"
              value={tourData.transportation.arrival_city || ''}
              onChange={(e) => handleTransportationChange("arrival_city", e.target.value)}
              className="bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-500"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-white text-sm">Departure Date</Label>
            <Input
              type="date"
              value={tourData.transportation.departure_date || ''}
              onChange={(e) => handleTransportationChange("departure_date", e.target.value)}
              className="bg-slate-800/50 border-slate-600 text-white"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-white text-sm">Departure Time</Label>
            <Input
              type="time"
              value={tourData.transportation.departure_time || ''}
              onChange={(e) => handleTransportationChange("departure_time", e.target.value)}
              className="bg-slate-800/50 border-slate-600 text-white"
            />
          </div>
        </div>
      )
    } else if (['van', 'car rental', 'motorcycle'].includes(type)) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div className="space-y-2">
            <Label className="text-white text-sm">Vehicle Type</Label>
            <Input
              placeholder="e.g., SUV, Sedan, Motorcycle"
              value={tourData.transportation.vehicle_type || ''}
              onChange={(e) => handleTransportationChange("vehicle_type", e.target.value)}
              className="bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-500"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-white text-sm">Driver Name</Label>
            <Input
              placeholder="e.g., John Smith"
              value={tourData.transportation.driver_name || ''}
              onChange={(e) => handleTransportationChange("driver_name", e.target.value)}
              className="bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-500"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-white text-sm">Driver Phone</Label>
            <Input
              placeholder="e.g., (555) 123-4567"
              value={tourData.transportation.driver_phone || ''}
              onChange={(e) => handleTransportationChange("driver_phone", e.target.value)}
              className="bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-500"
            />
          </div>
        </div>
      )
    }
    
    return null
  }

  // Render dynamic accommodation fields based on type
  const renderAccommodationDetails = () => {
    const type = tourData.accommodation.type.toLowerCase()
    
    if (['hotel', 'motel'].includes(type)) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div className="space-y-2">
            <Label className="text-white text-sm">Hotel Name</Label>
            <Input
              placeholder="e.g., Marriott Downtown"
              value={tourData.accommodation.hotel_name || ''}
              onChange={(e) => handleAccommodationChange("hotel_name", e.target.value)}
              className="bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-500"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-white text-sm">Room Type</Label>
            <Input
              placeholder="e.g., Standard, Suite, Deluxe"
              value={tourData.accommodation.room_type || ''}
              onChange={(e) => handleAccommodationChange("room_type", e.target.value)}
              className="bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-500"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-white text-sm">Check-in Date</Label>
            <Input
              type="date"
              value={tourData.accommodation.check_in_date || ''}
              onChange={(e) => handleAccommodationChange("check_in_date", e.target.value)}
              className="bg-slate-800/50 border-slate-600 text-white"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-white text-sm">Check-out Date</Label>
            <Input
              type="date"
              value={tourData.accommodation.check_out_date || ''}
              onChange={(e) => handleAccommodationChange("check_out_date", e.target.value)}
              className="bg-slate-800/50 border-slate-600 text-white"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-white text-sm">Check-in Time</Label>
            <Input
              type="time"
              value={tourData.accommodation.check_in_time || ''}
              onChange={(e) => handleAccommodationChange("check_in_time", e.target.value)}
              className="bg-slate-800/50 border-slate-600 text-white"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-white text-sm">Confirmation Number</Label>
            <Input
              placeholder="e.g., ABC123456"
              value={tourData.accommodation.confirmation_number || ''}
              onChange={(e) => handleAccommodationChange("confirmation_number", e.target.value)}
              className="bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-500"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-white text-sm">Contact Phone</Label>
            <Input
              placeholder="e.g., (555) 123-4567"
              value={tourData.accommodation.contact_phone || ''}
              onChange={(e) => handleAccommodationChange("contact_phone", e.target.value)}
              className="bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-500"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label className="text-white text-sm">Special Requests</Label>
            <Textarea
              placeholder="e.g., Accessible room, late check-in, etc."
              value={tourData.accommodation.special_requests || ''}
              onChange={(e) => handleAccommodationChange("special_requests", e.target.value)}
              className="bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-500 min-h-[80px]"
            />
          </div>
        </div>
      )
    }
    
    return null
  }

  return (
    <div className="space-y-8">
      {/* Transportation */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          {getTransportationIcon(tourData.transportation.type)}
          <h3 className="text-lg font-semibold text-white">Transportation</h3>
        </div>
        
        <Card className="p-6 bg-slate-900/30 border-slate-700">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-white text-sm">Transportation Type</Label>
              <select
                value={tourData.transportation.type}
                onChange={(e) => handleTransportationChange("type", e.target.value)}
                className="w-full bg-slate-800/50 border border-slate-600 text-white rounded-md px-3 py-2"
              >
                <option value="">Select type...</option>
                {transportationTypes.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label className="text-white text-sm">Cost ($)</Label>
              <Input
                type="number"
                placeholder="Enter cost..."
                value={tourData.transportation.cost || ''}
                onChange={(e) => handleTransportationChange("cost", parseFloat(e.target.value) || 0)}
                className="bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-500"
              />
            </div>
          </div>
          
          {/* Dynamic transportation details */}
          {renderTransportationDetails()}
          
          <div className="space-y-2 mt-4">
            <Label className="text-white text-sm">Additional Details</Label>
            <Textarea
              placeholder="Enter additional transportation details, requirements, or special arrangements..."
              value={tourData.transportation.details}
              onChange={(e) => handleTransportationChange("details", e.target.value)}
              className="bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-500 min-h-[80px]"
            />
          </div>
        </Card>
      </div>

      {/* Accommodation */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Hotel className="w-5 h-5 text-green-400" />
          <h3 className="text-lg font-semibold text-white">Accommodation</h3>
        </div>
        
        <Card className="p-6 bg-slate-900/30 border-slate-700">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-white text-sm">Accommodation Type</Label>
              <select
                value={tourData.accommodation.type}
                onChange={(e) => handleAccommodationChange("type", e.target.value)}
                className="w-full bg-slate-800/50 border border-slate-600 text-white rounded-md px-3 py-2"
              >
                <option value="">Select type...</option>
                {accommodationTypes.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label className="text-white text-sm">Cost ($)</Label>
              <Input
                type="number"
                placeholder="Enter cost..."
                value={tourData.accommodation.cost || ''}
                onChange={(e) => handleAccommodationChange("cost", parseFloat(e.target.value) || 0)}
                className="bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-500"
              />
            </div>
          </div>
          
          {/* Dynamic accommodation details */}
          {renderAccommodationDetails()}
          
          <div className="space-y-2 mt-4">
            <Label className="text-white text-sm">Additional Details</Label>
            <Textarea
              placeholder="Enter additional accommodation details, requirements, or special arrangements..."
              value={tourData.accommodation.details}
              onChange={(e) => handleAccommodationChange("details", e.target.value)}
              className="bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-500 min-h-[80px]"
            />
          </div>
        </Card>
      </div>

      {/* Equipment */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Settings className="w-5 h-5 text-purple-400" />
            <h3 className="text-lg font-semibold text-white">Equipment & Gear</h3>
          </div>
          <Button
            onClick={() => setIsAddingEquipment(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            <Plus className="w-4 w-4" />
            Add Equipment
          </Button>
        </div>

        {/* Add Equipment Form */}
        {isAddingEquipment && (
          <Card className="p-6 bg-slate-900/30 border-slate-700">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-white text-sm">Equipment Name *</Label>
                <Input
                  placeholder="Enter equipment name..."
                  value={newEquipment.name}
                  onChange={(e) => setNewEquipment({ ...newEquipment, name: e.target.value })}
                  className="bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-500"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-white text-sm">Quantity</Label>
                <Input
                  type="number"
                  placeholder="1"
                  value={newEquipment.quantity}
                  onChange={(e) => setNewEquipment({ ...newEquipment, quantity: parseInt(e.target.value) || 1 })}
                  className="bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-500"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-white text-sm">Cost ($)</Label>
                <Input
                  type="number"
                  placeholder="Enter cost..."
                  value={newEquipment.cost || ''}
                  onChange={(e) => setNewEquipment({ ...newEquipment, cost: parseFloat(e.target.value) || 0 })}
                  className="bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-500"
                />
              </div>
            </div>
            <div className="flex space-x-2 mt-4">
              <Button
                onClick={handleAddEquipment}
                disabled={!newEquipment.name}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                Add Equipment
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsAddingEquipment(false)}
                className="border-slate-600 text-slate-300 hover:bg-slate-800"
              >
                Cancel
              </Button>
            </div>
          </Card>
        )}

        {/* Equipment List */}
        <div className="space-y-3">
          {tourData.equipment.map((item) => (
            <Card key={item.id} className="p-4 bg-slate-900/30 border-slate-700">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <Package className="w-4 h-4 text-purple-400" />
                    <h4 className="font-medium text-white">{item.name}</h4>
                    <Badge variant="secondary" className="text-xs">
                      Qty: {item.quantity}
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-slate-400">
                    <DollarSign className="w-3 h-3" />
                    <span>{formatSafeCurrency(item.cost)}</span>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingEquipment(item.id)}
                    className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                  >
                    <Edit3 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveEquipment(item.id)}
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Quick Equipment Suggestions */}
        <div className="space-y-4">
          <h4 className="text-white font-medium">Common Equipment</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {equipmentCategories.map((category) => (
              <Card
                key={category}
                className="p-3 bg-slate-900/30 border-slate-700 hover:border-purple-500/40 cursor-pointer transition-colors"
                onClick={() => {
                  setNewEquipment({
                    name: category,
                    quantity: 1,
                    cost: 0
                  })
                  setIsAddingEquipment(true)
                }}
              >
                <div className="space-y-1">
                  <div className="font-medium text-white">{category}</div>
                  <div className="text-sm text-slate-400">Click to add</div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Cost Summary */}
      <Card className="p-6 bg-slate-900/30 border-slate-700">
        <div className="flex items-center space-x-2 mb-4">
          <DollarSign className="w-5 h-5 text-green-400" />
          <h4 className="text-lg font-semibold text-white">Logistics Cost Summary</h4>
        </div>
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Transportation:</span>
            <span className="text-white">{formatSafeCurrency(tourData.transportation.cost)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Accommodation:</span>
            <span className="text-white">{formatSafeCurrency(tourData.accommodation.cost)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Equipment:</span>
            <span className="text-white">{formatSafeCurrency(tourData.equipment.reduce((sum, item) => sum + item.cost, 0))}</span>
          </div>
          <div className="border-t border-slate-700 pt-3">
            <div className="flex justify-between font-semibold">
              <span className="text-white">Total Logistics Cost:</span>
              <span className="text-green-400">{formatSafeCurrency(totalLogisticsCost)}</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Empty State */}
      {!tourData.transportation.type && !tourData.accommodation.type && tourData.equipment.length === 0 && !isAddingEquipment && (
        <Card className="p-12 bg-slate-900/30 border-slate-700 border-dashed">
          <div className="text-center">
            <Truck className="w-12 h-12 text-slate-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No Logistics Planned</h3>
            <p className="text-slate-400 mb-4">
              Plan transportation, accommodation, and equipment for your tour
            </p>
            <div className="flex justify-center space-x-2">
              <Button
                onClick={() => handleTransportationChange("type", "Tour Bus")}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Truck className="w-4 h-4 mr-2" />
                Add Transportation
              </Button>
              <Button
                onClick={() => handleAccommodationChange("type", "Hotel")}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <Hotel className="w-4 h-4 mr-2" />
                Add Accommodation
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Validation Status */}
      <div className="flex items-center space-x-2 text-sm">
        {tourData.transportation.type && tourData.accommodation.type ? (
          <>
            <CheckCircle className="w-4 h-4 text-green-400" />
            <span className="text-green-400">Logistics planning completed</span>
          </>
        ) : (
          <>
            <div className="w-4 h-4 rounded-full border-2 border-slate-600" />
            <span className="text-slate-400">Complete transportation and accommodation to continue</span>
          </>
        )}
      </div>
    </div>
  )
} 