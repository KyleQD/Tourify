"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Plus, Edit, Trash2, CheckCircle, Clock, XCircle, Truck, Mail, Phone, Calendar, MapPin, Clock4, Building2, User } from "lucide-react"
import { toast } from "sonner"

interface Vendor {
  id: string
  name: string
  type: string
  contact_name: string
  contact_email: string
  contact_phone?: string
  status: 'confirmed' | 'pending' | 'declined'
  arrival_time?: string
  departure_time?: string
  requirements?: string
  notes?: string
  created_at?: string
  updated_at?: string
}

interface EventVendorManagerProps {
  eventId: string
  vendors: Vendor[]
  onVendorsUpdate: (vendors: Vendor[]) => void
}

export function EventVendorManager({ eventId, vendors, onVendorsUpdate }: EventVendorManagerProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    type: '',
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    status: 'pending' as Vendor['status'],
    arrival_time: '',
    departure_time: '',
    requirements: '',
    notes: ''
  })

  const vendorTypes = [
    'Audio Equipment',
    'Lighting',
    'Food & Beverage',
    'Security',
    'Transportation',
    'Photography',
    'Video Production',
    'Stage Equipment',
    'Merchandise',
    'Other'
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-500/20 text-green-400'
      case 'pending': return 'bg-yellow-500/20 text-yellow-400'
      case 'declined': return 'bg-red-500/20 text-red-400'
      default: return 'bg-slate-500/20 text-slate-400'
    }
  }

  const filteredVendors = vendors.filter(vendor => {
    const matchesStatus = filterStatus === 'all' || vendor.status === filterStatus
    const matchesSearch = vendor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         vendor.contact_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         vendor.type.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesStatus && matchesSearch
  })

  const handleCreateVendor = () => {
    setFormData({
      name: '',
      type: '',
      contact_name: '',
      contact_email: '',
      contact_phone: '',
      status: 'pending',
      arrival_time: '',
      departure_time: '',
      requirements: '',
      notes: ''
    })
    setIsCreateDialogOpen(true)
  }

  const handleEditVendor = (vendor: Vendor) => {
    setSelectedVendor(vendor)
    setFormData({
      name: vendor.name,
      type: vendor.type,
      contact_name: vendor.contact_name,
      contact_email: vendor.contact_email,
      contact_phone: vendor.contact_phone || '',
      status: vendor.status,
      arrival_time: vendor.arrival_time || '',
      departure_time: vendor.departure_time || '',
      requirements: vendor.requirements || '',
      notes: vendor.notes || ''
    })
    setIsEditDialogOpen(true)
  }

  const handleDeleteVendor = (vendor: Vendor) => {
    setSelectedVendor(vendor)
    setIsDeleteDialogOpen(true)
  }

  const createVendorPayload = () => {
    const noteParts = [
      formData.contact_name ? `Contact: ${formData.contact_name}` : '',
      formData.requirements || '',
      formData.notes || '',
    ].filter(Boolean)

    return {
      vendor_name: formData.name,
      service_type: formData.type,
      contact_email: formData.contact_email || undefined,
      contact_phone: formData.contact_phone || undefined,
      status: formData.status === 'declined' ? 'declined' : formData.status === 'confirmed' ? 'confirmed' : 'pending',
      notes: noteParts.join('\n') || undefined,
    }
  }

  const presentVendor = (row: any): Vendor => ({
    id: row.id,
    name: row.vendor_name || row.name || '',
    type: row.service_type || row.type || '',
    contact_name: row.contact_name || (typeof row.notes === 'string' && row.notes.startsWith('Contact: ')
      ? row.notes.replace(/^Contact:\s*/, '').split('\n')[0]
      : '') || '',
    contact_email: row.contact_email || '',
    contact_phone: row.contact_phone || undefined,
    status: row.status === 'confirmed' ? 'confirmed' : row.status === 'declined' ? 'declined' : 'pending',
    arrival_time: row.arrival_time,
    departure_time: row.departure_time,
    requirements: row.requirements,
    notes: row.notes,
    created_at: row.created_at,
    updated_at: row.updated_at,
  })

  const handleSaveVendor = async () => {
    if (!formData.name || !formData.type || !formData.contact_name || !formData.contact_email) {
      toast.error("Please fill in all required fields")
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(`/api/events/${eventId}/vendors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createVendorPayload())
      })

      if (!response.ok) throw new Error('Failed to create vendor')

      const newVendor = await response.json()
      onVendorsUpdate([...vendors, presentVendor(newVendor.vendor)])
      setIsCreateDialogOpen(false)
      toast.success("Vendor added successfully")
    } catch (error) {
      toast.error("Failed to add vendor")
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdateVendor = async () => {
    if (!selectedVendor || !formData.name || !formData.type || !formData.contact_name || !formData.contact_email) {
      toast.error("Please fill in all required fields")
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(`/api/events/${eventId}/vendors/${selectedVendor.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createVendorPayload())
      })

      if (!response.ok) throw new Error('Failed to update vendor')

      const updatedVendor = await response.json()
      onVendorsUpdate(vendors.map(v => v.id === selectedVendor.id ? presentVendor(updatedVendor.vendor) : v))
      setIsEditDialogOpen(false)
      setSelectedVendor(null)
      toast.success("Vendor updated successfully")
    } catch (error) {
      toast.error("Failed to update vendor")
    } finally {
      setIsLoading(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!selectedVendor) return

    setIsLoading(true)
    try {
      const response = await fetch(`/api/events/${eventId}/vendors/${selectedVendor.id}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Failed to delete vendor')

      onVendorsUpdate(vendors.filter(v => v.id !== selectedVendor.id))
      setIsDeleteDialogOpen(false)
      setSelectedVendor(null)
      toast.success("Vendor removed successfully")
    } catch (error) {
      toast.error("Failed to remove vendor")
    } finally {
      setIsLoading(false)
    }
  }

  const handleStatusChange = async (vendorId: string, newStatus: Vendor['status']) => {
    try {
      const response = await fetch(`/api/events/${eventId}/vendors/${vendorId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })

      if (!response.ok) throw new Error('Failed to update vendor status')

      const updatedVendor = await response.json()
      onVendorsUpdate(vendors.map(v => v.id === vendorId ? updatedVendor.vendor : v))
      toast.success("Vendor status updated")
    } catch (error) {
      toast.error("Failed to update vendor status")
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Event Vendors</h2>
          <p className="text-slate-400">Manage vendors and suppliers for this event</p>
        </div>
        <Button onClick={handleCreateVendor} className="bg-purple-600 hover:bg-purple-700">
          <Plus className="mr-2 h-4 w-4" />
          Add Vendor
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-4">
        <div className="flex-1">
          <Input
            placeholder="Search vendors..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-slate-800 border-slate-700 text-white"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-48 bg-slate-800 border-slate-700">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-700">
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="declined">Declined</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Vendors Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredVendors.map((vendor) => (
          <Card key={vendor.id} className="bg-slate-900/50 border-slate-700/50">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-purple-500/20 rounded-lg">
                    <Building2 className="h-5 w-5 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">{vendor.name}</h3>
                    <p className="text-sm text-slate-400">{vendor.type}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge className={getStatusColor(vendor.status)}>
                    {vendor.status}
                  </Badge>
                  <Select
                    value={vendor.status}
                    onValueChange={(value: Vendor['status']) => handleStatusChange(vendor.id, value)}
                  >
                    <SelectTrigger className="w-8 h-8 p-0 bg-transparent border-none">
                      <Edit className="h-3 w-3 text-slate-400" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="declined">Declined</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center space-x-2 text-sm">
                  <User className="h-4 w-4 text-slate-400" />
                  <span className="text-slate-300">{vendor.contact_name}</span>
                </div>
                <div className="flex items-center space-x-2 text-sm">
                  <Mail className="h-4 w-4 text-slate-400" />
                  <span className="text-slate-300">{vendor.contact_email}</span>
                </div>
                {vendor.contact_phone && (
                  <div className="flex items-center space-x-2 text-sm">
                    <Phone className="h-4 w-4 text-slate-400" />
                    <span className="text-slate-300">{vendor.contact_phone}</span>
                  </div>
                )}
                {vendor.arrival_time && (
                  <div className="flex items-center space-x-2 text-sm">
                    <Clock4 className="h-4 w-4 text-slate-400" />
                    <span className="text-slate-300">Arrives: {vendor.arrival_time}</span>
                  </div>
                )}
              </div>

              {vendor.requirements && (
                <div className="mt-4 p-3 bg-slate-800/50 rounded-lg">
                  <p className="text-sm text-slate-300">{vendor.requirements}</p>
                </div>
              )}

              <div className="flex items-center justify-end space-x-2 mt-4 pt-4 border-t border-slate-700">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEditVendor(vendor)}
                  className="text-slate-400 hover:text-white"
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteVendor(vendor)}
                  className="text-red-400 hover:text-red-300"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredVendors.length === 0 && (
        <Card className="bg-slate-900/50 border-slate-700/50">
          <CardContent className="p-12 text-center">
            <Building2 className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">No vendors found</h3>
            <p className="text-slate-400 mb-4">
              {searchTerm || filterStatus !== 'all' 
                ? 'Try adjusting your search or filter criteria'
                : 'Get started by adding your first vendor'
              }
            </p>
            {!searchTerm && filterStatus === 'all' && (
              <Button onClick={handleCreateVendor} className="bg-purple-600 hover:bg-purple-700">
                <Plus className="mr-2 h-4 w-4" />
                Add Vendor
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Create Vendor Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="bg-slate-800 border-slate-700 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">Add Vendor</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="vendor-name" className="text-slate-300">Vendor Name *</Label>
                <Input
                  id="vendor-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
              <div>
                <Label htmlFor="vendor-type" className="text-slate-300">Vendor Type *</Label>
                <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                  <SelectTrigger className="bg-slate-700 border-slate-600">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    {vendorTypes.map((type) => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="contact-name" className="text-slate-300">Contact Name *</Label>
                <Input
                  id="contact-name"
                  value={formData.contact_name}
                  onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
              <div>
                <Label htmlFor="contact-email" className="text-slate-300">Contact Email *</Label>
                <Input
                  id="contact-email"
                  type="email"
                  value={formData.contact_email}
                  onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="contact-phone" className="text-slate-300">Contact Phone</Label>
                <Input
                  id="contact-phone"
                  value={formData.contact_phone}
                  onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
              <div>
                <Label htmlFor="status" className="text-slate-300">Status</Label>
                <Select value={formData.status} onValueChange={(value: Vendor['status']) => setFormData({ ...formData, status: value })}>
                  <SelectTrigger className="bg-slate-700 border-slate-600">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="declined">Declined</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="arrival-time" className="text-slate-300">Arrival Time</Label>
                <Input
                  id="arrival-time"
                  type="time"
                  value={formData.arrival_time}
                  onChange={(e) => setFormData({ ...formData, arrival_time: e.target.value })}
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
              <div>
                <Label htmlFor="departure-time" className="text-slate-300">Departure Time</Label>
                <Input
                  id="departure-time"
                  type="time"
                  value={formData.departure_time}
                  onChange={(e) => setFormData({ ...formData, departure_time: e.target.value })}
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="requirements" className="text-slate-300">Requirements</Label>
              <Textarea
                id="requirements"
                value={formData.requirements}
                onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                className="bg-slate-700 border-slate-600 text-white"
                rows={3}
                placeholder="Describe any specific requirements or needs..."
              />
            </div>
            <div>
              <Label htmlFor="notes" className="text-slate-300">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="bg-slate-700 border-slate-600 text-white"
                rows={2}
                placeholder="Additional notes..."
              />
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)} className="border-slate-600 text-slate-300">
              Cancel
            </Button>
            <Button onClick={handleSaveVendor} disabled={isLoading} className="bg-purple-600 hover:bg-purple-700">
              {isLoading ? 'Adding...' : 'Add Vendor'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Vendor Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="bg-slate-800 border-slate-700 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">Edit Vendor</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-vendor-name" className="text-slate-300">Vendor Name *</Label>
                <Input
                  id="edit-vendor-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
              <div>
                <Label htmlFor="edit-vendor-type" className="text-slate-300">Vendor Type *</Label>
                <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                  <SelectTrigger className="bg-slate-700 border-slate-600">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    {vendorTypes.map((type) => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-contact-name" className="text-slate-300">Contact Name *</Label>
                <Input
                  id="edit-contact-name"
                  value={formData.contact_name}
                  onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
              <div>
                <Label htmlFor="edit-contact-email" className="text-slate-300">Contact Email *</Label>
                <Input
                  id="edit-contact-email"
                  type="email"
                  value={formData.contact_email}
                  onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-contact-phone" className="text-slate-300">Contact Phone</Label>
                <Input
                  id="edit-contact-phone"
                  value={formData.contact_phone}
                  onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
              <div>
                <Label htmlFor="edit-status" className="text-slate-300">Status</Label>
                <Select value={formData.status} onValueChange={(value: Vendor['status']) => setFormData({ ...formData, status: value })}>
                  <SelectTrigger className="bg-slate-700 border-slate-600">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="declined">Declined</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-arrival-time" className="text-slate-300">Arrival Time</Label>
                <Input
                  id="edit-arrival-time"
                  type="time"
                  value={formData.arrival_time}
                  onChange={(e) => setFormData({ ...formData, arrival_time: e.target.value })}
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
              <div>
                <Label htmlFor="edit-departure-time" className="text-slate-300">Departure Time</Label>
                <Input
                  id="edit-departure-time"
                  type="time"
                  value={formData.departure_time}
                  onChange={(e) => setFormData({ ...formData, departure_time: e.target.value })}
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="edit-requirements" className="text-slate-300">Requirements</Label>
              <Textarea
                id="edit-requirements"
                value={formData.requirements}
                onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                className="bg-slate-700 border-slate-600 text-white"
                rows={3}
                placeholder="Describe any specific requirements or needs..."
              />
            </div>
            <div>
              <Label htmlFor="edit-notes" className="text-slate-300">Notes</Label>
              <Textarea
                id="edit-notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="bg-slate-700 border-slate-600 text-white"
                rows={2}
                placeholder="Additional notes..."
              />
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} className="border-slate-600 text-slate-300">
              Cancel
            </Button>
            <Button onClick={handleUpdateVendor} disabled={isLoading} className="bg-purple-600 hover:bg-purple-700">
              {isLoading ? 'Updating...' : 'Update Vendor'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="bg-slate-800 border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Remove Vendor</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Are you sure you want to remove {selectedVendor?.name}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDelete}
              disabled={isLoading}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isLoading ? 'Removing...' : 'Remove Vendor'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
} 