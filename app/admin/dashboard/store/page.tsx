"use client"

import { useState, useCallback, useEffect } from "react"
import Link from "next/link"
import { Store, Plus, Edit, Trash2, RefreshCw, Package, AlertTriangle } from "lucide-react"
import { AdminPageHeader } from "../components/admin-page-header"
import { AdminFilterBar } from "../components/admin-filter-bar"
import { AdminEmptyState } from "../components/admin-empty-state"
import { AdminStatCard } from "../components/admin-stat-card"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { toast } from "sonner"

interface Listing {
  id: string
  title: string
  description?: string
  price: number
  category: string
  product_type: string
  status: string
  inventory_count?: number
  images?: string[]
  created_at: string
}

const STATUS_COLORS: Record<string, string> = {
  published: 'bg-green-500/20 text-green-400',
  draft: 'bg-yellow-500/20 text-yellow-400',
  archived: 'bg-slate-500/20 text-slate-400',
}

const LOW_STOCK_THRESHOLD = 10

export default function StorePage() {
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showDialog, setShowDialog] = useState(false)
  const [editingListing, setEditingListing] = useState<Listing | null>(null)
  const [deleteListing, setDeleteListing] = useState<Listing | null>(null)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    title: '', description: '', price: '0', category: 'merch',
    product_type: 'physical', status: 'draft', inventory_count: '0',
  })

  const fetchListings = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.set('status', statusFilter)
      params.set('limit', '50')
      const res = await fetch(`/api/admin/store?${params}`, { credentials: 'include' })
      if (res.ok) { const d = await res.json(); setListings(d.listings || []); setTotal(d.total || 0) }
    } finally { setLoading(false) }
  }, [statusFilter])

  useEffect(() => { void fetchListings() }, [fetchListings])

  const filtered = listings.filter(l =>
    !search || (l.title || '').toLowerCase().includes(search.toLowerCase())
  )

  function openCreate() {
    setEditingListing(null)
    setForm({ title: '', description: '', price: '0', category: 'merch', product_type: 'physical', status: 'draft', inventory_count: '0' })
    setShowDialog(true)
  }

  function openEdit(l: Listing) {
    setEditingListing(l)
    setForm({ title: l.title, description: l.description || '', price: String(l.price), category: l.category, product_type: l.product_type, status: l.status, inventory_count: String(l.inventory_count || 0) })
    setShowDialog(true)
  }

  async function save() {
    if (!form.title.trim()) { toast.error('Title is required'); return }
    setSaving(true)
    try {
      const body = { ...form, price: Number(form.price), inventory_count: Number(form.inventory_count) }
      const isEdit = !!editingListing
      const res = await fetch('/api/admin/store', {
        method: isEdit ? 'PATCH' : 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isEdit ? { id: editingListing.id, ...body } : body),
      })
      if (!res.ok) throw new Error(await res.text())
      toast.success(isEdit ? 'Listing updated' : 'Listing created')
      setShowDialog(false)
      void fetchListings()
    } catch (err: any) { toast.error(err.message || 'Failed to save') } finally { setSaving(false) }
  }

  async function confirmDelete() {
    if (!deleteListing) return
    try {
      const res = await fetch('/api/admin/store', { method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: deleteListing.id, delete: true }) })
      if (!res.ok) throw new Error(await res.text())
      toast.success('Listing removed')
      setDeleteListing(null)
      void fetchListings()
    } catch (err: any) { toast.error(err.message || 'Failed'); setDeleteListing(null) }
  }

  const publishedCount = listings.filter(l => l.status === 'published').length
  const lowStockCount = listings.filter(l => (l.inventory_count || 0) < LOW_STOCK_THRESHOLD && l.status === 'published').length

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Store"
        subtitle="Manage your merch store listings"
        icon={Store}
        actions={
          <>
            <Button asChild variant="outline" className="border-slate-600 text-slate-200">
              <Link href="/admin/dashboard/inventory">Inventory</Link>
            </Button>
            <Button onClick={openCreate} className="bg-gradient-to-r from-purple-600 to-blue-600 text-white border-0">
              <Plus className="h-4 w-4 mr-2" />
              Add Product
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <AdminStatCard title="Total Listings" value={total} icon={Store} color="purple" isLoading={loading} />
        <AdminStatCard title="Published" value={publishedCount} icon={Package} color="green" isLoading={loading} />
        <AdminStatCard title="Low Stock" value={lowStockCount} icon={AlertTriangle} color="orange" isLoading={loading} />
        <AdminStatCard title="Drafts" value={listings.filter(l => l.status === 'draft').length} icon={Store} color="blue" isLoading={loading} />
      </div>

      <AdminFilterBar
        searchPlaceholder="Search listings..."
        searchValue={search}
        onSearchChange={setSearch}
        statusOptions={[
          { value: 'all', label: 'All Status' },
          { value: 'published', label: 'Published' },
          { value: 'draft', label: 'Draft' },
          { value: 'archived', label: 'Archived' },
        ]}
        statusValue={statusFilter}
        onStatusChange={setStatusFilter}
      />

      {loading ? (
        <div className="flex items-center justify-center py-12"><RefreshCw className="h-5 w-5 animate-spin text-purple-400" /></div>
      ) : filtered.length === 0 ? (
        <AdminEmptyState icon={Store} title="No listings yet" description="Add your first product listing." action={{ label: 'Add Product', onClick: openCreate }} />
      ) : (
        <div className="space-y-2">
          {filtered.map(l => (
            <Card key={l.id} className="bg-slate-900/60 border-slate-700/50 rounded-sm">
              <CardContent className="flex items-center justify-between py-3 px-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-white text-sm font-medium truncate">{l.title}</p>
                    {(l.inventory_count || 0) < LOW_STOCK_THRESHOLD && l.status === 'published' && (
                      <Badge className="bg-orange-500/20 text-orange-400 text-xs shrink-0">Low Stock</Badge>
                    )}
                  </div>
                  <p className="text-slate-400 text-xs">{l.category} · {l.inventory_count || 0} in stock</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-white text-sm font-semibold">${Number(l.price).toFixed(2)}</span>
                  <Badge className={STATUS_COLORS[l.status] || 'bg-slate-700 text-slate-300'}>{l.status}</Badge>
                  <button onClick={() => openEdit(l)} className="text-slate-400 hover:text-white p-1"><Edit className="h-3.5 w-3.5" /></button>
                  <button onClick={() => setDeleteListing(l)} className="text-slate-400 hover:text-red-400 p-1"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="bg-slate-900 border-slate-700 sm:max-w-md">
          <DialogHeader><DialogTitle className="text-white">{editingListing ? 'Edit Listing' : 'Add Product'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-slate-300">Title *</Label><Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} className="bg-slate-800/50 border-slate-700/50 text-white text-sm" /></div>
            <div><Label className="text-slate-300">Description</Label><Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} className="bg-slate-800/50 border-slate-700/50 text-white text-sm min-h-[60px]" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-slate-300">Price ($)</Label><Input type="number" min="0" step="0.01" value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))} className="bg-slate-800/50 border-slate-700/50 text-white text-sm" /></div>
              <div><Label className="text-slate-300">Inventory</Label><Input type="number" min="0" value={form.inventory_count} onChange={e => setForm(p => ({ ...p, inventory_count: e.target.value }))} className="bg-slate-800/50 border-slate-700/50 text-white text-sm" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-slate-300">Category</Label>
                <Select value={form.category} onValueChange={v => setForm(p => ({ ...p, category: v }))}>
                  <SelectTrigger className="bg-slate-800/50 border-slate-700/50 text-white text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-700 text-white">
                    {['merch','digital','bundle','experience'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label className="text-slate-300">Status</Label>
                <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v }))}>
                  <SelectTrigger className="bg-slate-800/50 border-slate-700/50 text-white text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-700 text-white">
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowDialog(false)} className="border-slate-700 text-slate-300">Cancel</Button>
            <Button onClick={save} disabled={saving} className="bg-gradient-to-r from-purple-600 to-blue-600 text-white border-0">
              {saving ? 'Saving...' : editingListing ? 'Save Changes' : 'Create Listing'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteListing} onOpenChange={() => setDeleteListing(null)}>
        <AlertDialogContent className="bg-slate-900 border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Remove Listing?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Remove &ldquo;{deleteListing?.title}&rdquo;? If it has orders, it will be archived instead of deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-700 text-slate-300">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700 text-white border-0">Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
