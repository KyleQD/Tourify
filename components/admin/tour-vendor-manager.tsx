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
import { Plus, Edit, Trash2, CheckCircle, Clock, XCircle, Truck, Mail, Phone, DollarSign, Building2 } from "lucide-react"
import { toast } from "sonner"
import { formatSafeCurrency } from "@/lib/format/number-format"

interface TourVendor {
  id: string
  name: string
  type: string
  contact_name: string
  contact_email: string
  contact_phone?: string
  status: 'confirmed' | 'pending' | 'declined'
  services: string[]
  contract_amount?: number
  payment_status: 'paid' | 'partial' | 'pending'
  notes?: string
}

interface TourVendorManagerProps {
  tourId: string
  vendors: TourVendor[]
  onVendorsUpdate: (vendors: TourVendor[]) => void
}

export function TourVendorManager({ tourId, vendors, onVendorsUpdate }: TourVendorManagerProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedVendor, setSelectedVendor] = useState<TourVendor | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [filterStatus, setFilterStatus] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')

  const [formData, setFormData] = useState({
    name: '',
    type: '',
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    status: 'pending' as const,
    services: [] as string[],
    contract_amount: 0,
    payment_status: 'pending' as const,
    notes: ''
  })

  const resetForm = () => {
    setFormData({
      name: '',
      type: '',
      contact_name: '',
      contact_email: '',
      contact_phone: '',
      status: 'pending',
      services: [],
      contract_amount: 0,
      payment_status: 'pending',
      notes: ''
    })
  }

  const handleAddVendor = () => {
    resetForm()
    setIsAddDialogOpen(true)
  }

  const handleEditVendor = (vendor: TourVendor) => {
    setSelectedVendor(vendor)
    setFormData({
      name: vendor.name,
      type: vendor.type,
      contact_name: vendor.contact_name,
      contact_email: vendor.contact_email,
      contact_phone: vendor.contact_phone || '',
      status: vendor.status as "pending",
      services: vendor.services,
      contract_amount: vendor.contract_amount || 0,
      payment_status: vendor.payment_status as "pending",
      notes: vendor.notes || ''
    })
    setIsEditDialogOpen(true)
  }

  const handleDeleteVendor = (vendor: TourVendor) => {
    setSelectedVendor(vendor)
    setIsDeleteDialogOpen(true)
  }

  const handleSubmit = async (isEdit: boolean = false) => {
    setIsSubmitting(true)
    try {
      const url = isEdit 
        ? `/api/tours/${tourId}/vendors/${selectedVendor?.id}`
        : `/api/tours/${tourId}/vendors`
      
      const method = isEdit ? 'PATCH' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        throw new Error('Failed to save vendor')
      }

      const result = await response.json()
      
      if (isEdit) {
        const updatedVendors = vendors.map(vendor => 
          vendor.id === selectedVendor?.id ? result.vendor : vendor
        )
        onVendorsUpdate(updatedVendors)
        toast.success('Vendor updated successfully')
      } else {
        const newVendors = [...vendors, result.vendor]
        onVendorsUpdate(newVendors)
        toast.success('Vendor added successfully')
      }

      setIsAddDialogOpen(false)
      setIsEditDialogOpen(false)
      resetForm()
    } catch (error) {
      console.error('Error saving vendor:', error)
      toast.error('Failed to save vendor')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!selectedVendor) return

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/tours/${tourId}/vendors/${selectedVendor.id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to delete vendor')
      }

      const updatedVendors = vendors.filter(vendor => vendor.id !== selectedVendor.id)
      onVendorsUpdate(updatedVendors)
      toast.success('Vendor removed successfully')
      setIsDeleteDialogOpen(false)
    } catch (error) {
      console.error('Error deleting vendor:', error)
      toast.error('Failed to delete vendor')
    } finally {
      setIsSubmitting(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-500/20 text-green-400'
      case 'pending': return 'bg-yellow-500/20 text-yellow-400'
      case 'declined': return 'bg-red-500/20 text-red-400'
      default: return 'bg-slate-500/20 text-slate-400'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed': return <CheckCircle className="h-4 w-4" />
      case 'pending': return <Clock className="h-4 w-4" />
      case 'declined': return <XCircle className="h-4 w-4" />
      default: return <Clock className="h-4 w-4" />
    }
  }

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-500/20 text-green-400'
      case 'partial': return 'bg-yellow-500/20 text-yellow-400'
      case 'pending': return 'bg-red-500/20 text-red-400'
      default: return 'bg-slate-500/20 text-slate-400'
    }
  }

  const filteredVendors = vendors.filter(vendor => {
    const matchesStatus = filterStatus === 'all' || vendor.status === filterStatus
    const matchesSearch = vendor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         vendor.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         vendor.contact_name.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesStatus && matchesSearch
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Tour Vendors</h2>
          <p className="text-slate-400">Manage vendors and services for this tour</p>
        </div>
        <Button onClick={handleAddVendor} className="bg-purple-600 hover:bg-purple-700">
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
            className="bg-slate-800/50 border-slate-700 text-white"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40 bg-slate-800/50 border-slate-700 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="declined">Declined</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Vendors Grid */}
      <div className="grid gap-4">
        {filteredVendors.map((vendor) => (
          <Card key={vendor.id} className="bg-slate-900/50 border-slate-700/50 hover:bg-slate-900/70 transition-colors">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center">
                    <Truck className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-white">{vendor.name}</h4>
                    <p className="text-sm text-slate-400">{vendor.type}</p>
                    <div className="flex items-center space-x-4 mt-1">
                      <div className="flex items-center space-x-1">
                        <Building2 className="h-3 w-3 text-slate-500" />
                        <span className="text-xs text-slate-500">{vendor.contact_name}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Mail className="h-3 w-3 text-slate-500" />
                        <span className="text-xs text-slate-500">{vendor.contact_email}</span>
                      </div>
                      {vendor.contact_phone && (
                        <div className="flex items-center space-x-1">
                          <Phone className="h-3 w-3 text-slate-500" />
                          <span className="text-xs text-slate-500">{vendor.contact_phone}</span>
                        </div>
                      )}
                      {vendor.contract_amount && (
                        <div className="flex items-center space-x-1">
                          <DollarSign className="h-3 w-3 text-slate-500" />
                          <span className="text-xs text-slate-500">{formatSafeCurrency(vendor.contract_amount)}</span>
                        </div>
                      )}
                    </div>
                    {vendor.services.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {vendor.services.map((service, index) => (
                          <Badge key={index} variant="outline" className="text-xs bg-slate-800/50 border-slate-600 text-slate-300">
                            {service}
                          </Badge>
                        ))}
                      </div>
                    )}
                    {vendor.notes && (
                      <p className="text-xs text-slate-500 mt-1">{vendor.notes}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="flex flex-col items-end space-y-1">
                    <Badge className={getStatusColor(vendor.status)}>
                      {getStatusIcon(vendor.status)}
                      <span className="ml-1 capitalize">{vendor.status}</span>
                    </Badge>
                    <Badge className={getPaymentStatusColor(vendor.payment_status)}>
                      <span className="capitalize">{vendor.payment_status}</span>
                    </Badge>
                  </div>
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
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredVendors.length === 0 && (
        <Card className="bg-slate-900/50 border-slate-700/50">
          <CardContent className="p-12 text-center">
            <Truck className="h-16 w-16 text-slate-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No Vendors Found</h3>
            <p className="text-slate-400 mb-6">
              {searchTerm || filterStatus !== 'all' 
                ? 'No vendors match your current filters'
                : 'Get started by adding your first vendor to this tour'
              }
            </p>
            <Button onClick={handleAddVendor} className="bg-purple-600 hover:bg-purple-700">
              <Plus className="mr-2 h-4 w-4" />
              Add First Vendor
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Add Vendor Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-md bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">Add Vendor</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-300">Vendor Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
              <div>
                <Label className="text-slate-300">Type</Label>
                <Input
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
            </div>
            
            <div>
              <Label className="text-slate-300">Contact Name</Label>
              <Input
                value={formData.contact_name}
                onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>

            <div>
              <Label className="text-slate-300">Contact Email</Label>
              <Input
                type="email"
                value={formData.contact_email}
                onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>

            <div>
              <Label className="text-slate-300">Contact Phone (Optional)</Label>
              <Input
                value={formData.contact_phone}
                onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-300">Status</Label>
                <Select value={formData.status} onValueChange={(value: any) => setFormData({ ...formData, status: value })}>
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="declined">Declined</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-slate-300">Payment Status</Label>
                <Select value={formData.payment_status} onValueChange={(value: any) => setFormData({ ...formData, payment_status: value })}>
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="partial">Partial</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-slate-300">Contract Amount</Label>
              <Input
                type="number"
                value={formData.contract_amount}
                onChange={(e) => setFormData({ ...formData, contract_amount: parseFloat(e.target.value) || 0 })}
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>

            <div>
              <Label className="text-slate-300">Services (comma-separated)</Label>
              <Input
                value={formData.services.join(', ')}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  services: e.target.value.split(',').map(s => s.trim()).filter(s => s.length > 0)
                })}
                className="bg-slate-700 border-slate-600 text-white"
                placeholder="Transportation, Catering, Equipment"
              />
            </div>

            <div>
              <Label className="text-slate-300">Notes (Optional)</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="bg-slate-700 border-slate-600 text-white"
                rows={3}
              />
            </div>

            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setIsAddDialogOpen(false)}
                className="border-slate-600 text-slate-300"
              >
                Cancel
              </Button>
              <Button
                onClick={() => handleSubmit(false)}
                disabled={isSubmitting}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {isSubmitting ? 'Adding...' : 'Add Vendor'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Vendor Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">Edit Vendor</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-300">Vendor Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
              <div>
                <Label className="text-slate-300">Type</Label>
                <Input
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
            </div>
            
            <div>
              <Label className="text-slate-300">Contact Name</Label>
              <Input
                value={formData.contact_name}
                onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>

            <div>
              <Label className="text-slate-300">Contact Email</Label>
              <Input
                type="email"
                value={formData.contact_email}
                onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>

            <div>
              <Label className="text-slate-300">Contact Phone (Optional)</Label>
              <Input
                value={formData.contact_phone}
                onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-300">Status</Label>
                <Select value={formData.status} onValueChange={(value: any) => setFormData({ ...formData, status: value })}>
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="declined">Declined</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-slate-300">Payment Status</Label>
                <Select value={formData.payment_status} onValueChange={(value: any) => setFormData({ ...formData, payment_status: value })}>
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="partial">Partial</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-slate-300">Contract Amount</Label>
              <Input
                type="number"
                value={formData.contract_amount}
                onChange={(e) => setFormData({ ...formData, contract_amount: parseFloat(e.target.value) || 0 })}
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>

            <div>
              <Label className="text-slate-300">Services (comma-separated)</Label>
              <Input
                value={formData.services.join(', ')}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  services: e.target.value.split(',').map(s => s.trim()).filter(s => s.length > 0)
                })}
                className="bg-slate-700 border-slate-600 text-white"
                placeholder="Transportation, Catering, Equipment"
              />
            </div>

            <div>
              <Label className="text-slate-300">Notes (Optional)</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="bg-slate-700 border-slate-600 text-white"
                rows={3}
              />
            </div>

            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
                className="border-slate-600 text-slate-300"
              >
                Cancel
              </Button>
              <Button
                onClick={() => handleSubmit(true)}
                disabled={isSubmitting}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {isSubmitting ? 'Updating...' : 'Update Vendor'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="bg-slate-800 border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Remove Vendor</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-300">
              Are you sure you want to remove "{selectedVendor?.name}" from the tour vendors? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-600 text-slate-300">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isSubmitting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isSubmitting ? 'Removing...' : 'Remove Vendor'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
} 