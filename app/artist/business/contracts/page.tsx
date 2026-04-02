"use client"

import { useState, useEffect, useCallback } from "react"
import { useArtist } from "@/contexts/artist-context"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { format, addDays, isAfter, isBefore } from "date-fns"
import { formatSafeCurrency } from "@/lib/format/number-format"
import {
  FileText,
  Plus,
  Edit,
  Trash2,
  AlertCircle,
  CheckCircle,
  Clock,
  DollarSign,
  Calendar,
  User,
  ArrowLeft,
  Search,
  MoreHorizontal,
  Eye,
  Send,
  Mic2,
  Building2,
  Camera,
  Video,
  Shirt,
  Disc3,
  Users,
  Guitar,
  Film,
  Briefcase,
  type LucideIcon,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { dashboardCreatePattern } from "@/components/dashboard/dashboard-create-pattern"
import {
  CONTRACT_TEMPLATES,
  buildContractTermsFromTemplate,
  defaultTitleForTemplate,
  getContractTemplateById,
  type ContractTemplate,
} from "@/lib/artist/contract-templates"
import { createContractAction, updateContractAction } from "@/app/lib/actions/contracts.actions"
import { resolveCounterpartyAction, sendContractAction } from "@/app/lib/actions/contract-workflow.actions"

const TEMPLATE_ICONS: Record<ContractTemplate["iconName"], LucideIcon> = {
  Mic2,
  Building2,
  Camera,
  Video,
  Shirt,
  Disc3,
  Users,
  Guitar,
  Film,
  Briefcase,
}

interface ContractMetadata {
  templateVariables?: Record<string, string>
  signatures?: Record<string, unknown>
}

interface Contract {
  id?: string
  user_id?: string
  title: string
  type: "performance" | "licensing" | "recording" | "management" | "publishing" | "endorsement" | "other"
  client_name: string
  client_email?: string
  client_company?: string
  amount: number
  currency: string
  start_date: string
  end_date?: string
  status: "draft" | "sent" | "signed" | "expired" | "cancelled"
  terms?: string
  notes?: string
  document_url?: string
  created_at?: string
  updated_at?: string
  counterparty_user_id?: string | null
  template_id?: string | null
  metadata?: ContractMetadata | null
  sent_at?: string | null
}

const CONTRACT_TYPES = [
  { value: "performance", label: "Performance Agreement", description: "Live show contracts" },
  { value: "licensing", label: "Licensing Deal", description: "Music licensing agreements" },
  { value: "recording", label: "Recording Contract", description: "Studio and recording agreements" },
  { value: "management", label: "Management Agreement", description: "Artist management contracts" },
  { value: "publishing", label: "Publishing Deal", description: "Music publishing agreements" },
  { value: "endorsement", label: "Endorsement Deal", description: "Brand partnerships and sponsorships" },
  { value: "other", label: "Other", description: "Custom contract types" },
]

const CURRENCIES = ["USD", "EUR", "GBP", "CAD", "AUD"]

const emptyForm = (): Contract => ({
  title: "",
  type: "performance",
  client_name: "",
  client_email: "",
  client_company: "",
  amount: 0,
  currency: "USD",
  start_date: new Date().toISOString().split("T")[0],
  end_date: "",
  status: "draft",
  terms: "",
  notes: "",
})

export default function ContractsPage() {
  const { user } = useArtist()
  const supabase = createClientComponentClient()

  const [contracts, setContracts] = useState<Contract[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingContract, setEditingContract] = useState<Contract | null>(null)
  const [deleteContractId, setDeleteContractId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")

  const [formData, setFormData] = useState<Contract>(emptyForm())
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null)
  const [templateVarValues, setTemplateVarValues] = useState<Record<string, string>>({})
  const [counterpartyUsername, setCounterpartyUsername] = useState("")
  const [counterpartyResolved, setCounterpartyResolved] = useState<{
    userId: string
    username: string | null
    displayName: string | null
  } | null>(null)
  const [counterpartyLookupLoading, setCounterpartyLookupLoading] = useState(false)

  const [isSubmitting, setIsSubmitting] = useState(false)

  const resetModalExtras = useCallback(() => {
    setActiveTemplateId(null)
    setTemplateVarValues({})
    setCounterpartyUsername("")
    setCounterpartyResolved(null)
  }, [])

  const loadContracts = async () => {
    if (!user) return

    try {
      setIsLoading(true)
      setLoadError(null)

      const { data, error } = await supabase
        .from("artist_contracts")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })

      if (error) {
        setContracts([])
        setLoadError(error.message)
        toast.error("Failed to load contracts")
        return
      }

      setContracts((Array.isArray(data) ? data : []) as unknown as Contract[])
    } catch (e) {
      console.error("Error loading contracts:", e)
      setContracts([])
      setLoadError("Unexpected error")
      toast.error("Failed to load contracts")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (user) loadContracts()
  }, [user])

  useEffect(() => {
    if (!activeTemplateId) return
    const tpl = getContractTemplateById(activeTemplateId)
    if (!tpl) return
    setFormData((prev) => ({
      ...prev,
      terms: buildContractTermsFromTemplate(tpl, templateVarValues),
    }))
  }, [templateVarValues, activeTemplateId])

  useEffect(() => {
    if (!showCreateModal || !editingContract?.counterparty_user_id) return
    let cancelled = false
    ;(async () => {
      const { data } = await supabase
        .from("profiles")
        .select("username, full_name")
        .eq("id", editingContract.counterparty_user_id!)
        .maybeSingle()
      if (cancelled) return
      if (data?.username) setCounterpartyUsername(data.username)
      setCounterpartyResolved({
        userId: editingContract.counterparty_user_id!,
        username: data?.username ?? null,
        displayName: data?.full_name ?? null,
      })
    })()
    return () => {
      cancelled = true
    }
  }, [showCreateModal, editingContract?.counterparty_user_id, editingContract?.id, supabase])

  const openBlankModal = () => {
    setEditingContract(null)
    resetModalExtras()
    setFormData(emptyForm())
    setShowCreateModal(true)
  }

  const openTemplateModal = (tplId: string) => {
    const tpl = getContractTemplateById(tplId)
    if (!tpl) return
    setEditingContract(null)
    const vars = Object.fromEntries(tpl.variables.map((v) => [v.key, ""]))
    setTemplateVarValues(vars)
    setActiveTemplateId(tplId)
    setCounterpartyUsername("")
    setCounterpartyResolved(null)
    setFormData({
      ...emptyForm(),
      type: tpl.dbType,
      title: defaultTitleForTemplate(tpl, vars),
      terms: buildContractTermsFromTemplate(tpl, vars),
      status: "draft",
    })
    setShowCreateModal(true)
  }

  const openEditModal = (c: Contract) => {
    setEditingContract(c)
    setActiveTemplateId(c.template_id ?? null)
    const meta = (c.metadata ?? {}) as ContractMetadata
    const tv =
      meta.templateVariables && typeof meta.templateVariables === "object"
        ? { ...meta.templateVariables }
        : {}
    setTemplateVarValues(tv)
    setFormData({ ...c })
    setCounterpartyUsername("")
    setCounterpartyResolved(
      c.counterparty_user_id
        ? { userId: c.counterparty_user_id, username: null, displayName: null }
        : null
    )
    setShowCreateModal(true)
  }

  const handleDialogOpenChange = (open: boolean) => {
    setShowCreateModal(open)
    if (!open) {
      setEditingContract(null)
      resetModalExtras()
    }
  }

  const buildMetadataPayload = (): Record<string, unknown> => {
    const prev = (editingContract?.metadata ?? {}) as Record<string, unknown>
    const next: Record<string, unknown> = { ...prev }
    if (activeTemplateId) next.templateVariables = { ...templateVarValues }
    return next
  }

  const persistContract = async (): Promise<string | null> => {
    if (!user) {
      toast.error("Not signed in")
      return null
    }

    const clientName =
      formData.client_name.trim() ||
      counterpartyResolved?.displayName?.trim() ||
      counterpartyUsername.trim() ||
      ""
    if (!formData.title.trim() || !clientName) {
      toast.error("Add a title and client / counterparty name")
      return null
    }

    const metadata = buildMetadataPayload()
    const counterpartyId = counterpartyResolved?.userId ?? editingContract?.counterparty_user_id ?? null

    const payload = {
      title: formData.title.trim(),
      type: formData.type,
      client_name: clientName,
      client_email: formData.client_email || "",
      client_company: formData.client_company || "",
      amount: formData.amount,
      currency: formData.currency,
      start_date: formData.start_date,
      end_date: formData.end_date || "",
      status: editingContract ? editingContract.status : "draft",
      terms: formData.terms || "",
      notes: formData.notes || "",
      document_url: formData.document_url || "",
      counterparty_user_id: counterpartyId,
      template_id: activeTemplateId || null,
      metadata,
    }

    if (editingContract?.id) {
      const res = await updateContractAction({ ...payload, id: editingContract.id })
      if (!res?.data?.success) {
        toast.error((res?.data as { error?: string })?.error || (res as { serverError?: string })?.serverError || "Update failed")
        return null
      }
      return editingContract.id
    }

    const res = await createContractAction(payload)
    if (!res?.data?.success) {
      toast.error((res?.data as { error?: string })?.error || (res as { serverError?: string })?.serverError || "Create failed")
      return null
    }
    const row = (res.data as { data?: { id: string } }).data
    return row?.id ?? null
  }

  const handleSaveDraft = async () => {
    try {
      setIsSubmitting(true)
      const id = await persistContract()
      if (!id) return
      await loadContracts()
      toast.success(editingContract ? "Draft updated" : "Draft saved")
      setShowCreateModal(false)
      setEditingContract(null)
      resetModalExtras()
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSendForSignature = async () => {
    if (!counterpartyResolved?.userId) {
      toast.error("Look up a valid Tourify username for the counterparty before sending")
      return
    }
    try {
      setIsSubmitting(true)
      const id = await persistContract()
      if (!id) return

      const sendRes = await sendContractAction({ contractId: id })
      if (!sendRes?.data?.success) {
        toast.error(
          (sendRes?.data as { error?: string })?.error ||
            (sendRes as { serverError?: string })?.serverError ||
            "Send failed"
        )
        return
      }

      await loadContracts()
      const emailSent = (sendRes?.data as { emailSent?: boolean })?.emailSent
      if (emailSent === false) {
        toast.success("Contract sent in-app — email could not be delivered (check RESEND_API_KEY / sender domain).")
      } else {
        toast.success("Contract sent — your counterparty was emailed and notified in Tourify.")
      }
      setShowCreateModal(false)
      setEditingContract(null)
      resetModalExtras()
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleLookupCounterparty = async () => {
    const u = counterpartyUsername.trim()
    if (!u) {
      toast.error("Enter a username")
      return
    }
    setCounterpartyLookupLoading(true)
    try {
      const res = await resolveCounterpartyAction({ username: u })
      if (!res?.data?.success) {
        toast.error(
          (res?.data as { error?: string })?.error ||
            (res as { serverError?: string })?.serverError ||
            "Lookup failed"
        )
        setCounterpartyResolved(null)
        return
      }
      const d = (res.data as { data?: { userId: string; username: string | null; displayName: string | null } }).data
      if (!d) {
        toast.error("Lookup failed")
        return
      }
      setCounterpartyResolved(d)
      toast.success(`Linked @${d.username ?? u}`)
    } finally {
      setCounterpartyLookupLoading(false)
    }
  }

  const handleDeleteContract = async (contractId: string) => {
    try {
      const { error } = await supabase
        .from("artist_contracts")
        .delete()
        .eq("id", contractId)
        .eq("user_id", user?.id || "")
      if (error) throw error
      await loadContracts()
      toast.success("Contract deleted")
    } catch (error) {
      console.error("Error deleting contract:", error)
      toast.error("Failed to delete contract")
    } finally {
      setDeleteContractId(null)
    }
  }

  const handleSendFromList = async (contractId: string) => {
    const sendRes = await sendContractAction({ contractId })
    if (!sendRes?.data?.success) {
      toast.error(
        (sendRes?.data as { error?: string })?.error ||
          (sendRes as { serverError?: string })?.serverError ||
          "Send failed"
      )
      return
    }
    await loadContracts()
    const emailSent = (sendRes?.data as { emailSent?: boolean })?.emailSent
    if (emailSent === false) {
      toast.success("Sent — email delivery unavailable; counterparty still has an in-app notification.")
    } else {
      toast.success("Contract sent — counterparty was emailed.")
    }
  }

  const getStatusColor = (status: Contract["status"]) => {
    switch (status) {
      case "draft":
        return "bg-gray-600/20 text-gray-300 border-gray-500/30"
      case "sent":
        return "bg-blue-600/20 text-blue-300 border-blue-500/30"
      case "signed":
        return "bg-green-600/20 text-green-300 border-green-500/30"
      case "expired":
        return "bg-yellow-600/20 text-yellow-300 border-yellow-500/30"
      case "cancelled":
        return "bg-red-600/20 text-red-300 border-red-500/30"
      default:
        return "bg-gray-600/20 text-gray-300 border-gray-500/30"
    }
  }

  const getStatusIcon = (status: Contract["status"]) => {
    switch (status) {
      case "draft":
        return <Edit className="h-4 w-4" />
      case "sent":
        return <Send className="h-4 w-4" />
      case "signed":
        return <CheckCircle className="h-4 w-4" />
      case "expired":
        return <AlertCircle className="h-4 w-4" />
      case "cancelled":
        return <AlertCircle className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  const filteredContracts = contracts.filter((contract) => {
    const matchesSearch =
      contract.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contract.client_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (contract.client_company && contract.client_company.toLowerCase().includes(searchQuery.toLowerCase()))

    const matchesStatus = statusFilter === "all" || contract.status === statusFilter
    const matchesType = typeFilter === "all" || contract.type === typeFilter

    return matchesSearch && matchesStatus && matchesType
  })

  const getContractStats = () => {
    const now = new Date()
    return {
      total: contracts.length,
      active: contracts.filter((c) => c.status === "signed").length,
      pending: contracts.filter((c) => c.status === "sent").length,
      totalValue: contracts.filter((c) => c.status === "signed").reduce((sum, c) => sum + c.amount, 0),
      expiringSoon: contracts.filter(
        (c) =>
          c.end_date &&
          c.status === "signed" &&
          isAfter(new Date(c.end_date), now) &&
          isBefore(new Date(c.end_date), addDays(now, 30))
      ).length,
    }
  }

  const stats = getContractStats()
  const termsReadOnly = Boolean(editingContract && editingContract.status !== "draft")
  const activeTpl = activeTemplateId ? getContractTemplateById(activeTemplateId) : undefined

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-700 rounded w-1/3" />
          <div className="grid gap-4 md:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-slate-700 rounded" />
            ))}
          </div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-slate-700 rounded" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div
        className={cn(
          dashboardCreatePattern.shell,
          "flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
        )}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <Link href="/artist/business">
            <Button variant="ghost" size="sm" className={cn(dashboardCreatePattern.btnOutline, "text-slate-300")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Business
            </Button>
          </Link>
          <div className="hidden sm:block h-8 w-px bg-slate-700" />
          <div className="flex items-center gap-3">
            <div className={dashboardCreatePattern.headerIcon}>
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Contracts & Legal</h1>
              <p className={dashboardCreatePattern.subtleText}>Templates, send for signature, and in-app signing</p>
            </div>
          </div>
        </div>
        <Button onClick={openBlankModal} className={dashboardCreatePattern.btnPrimary}>
          <Plus className="h-4 w-4 mr-2" />
          New Contract
        </Button>
      </div>

      {loadError && (
        <p className="text-sm text-amber-400/90">
          Could not refresh contracts ({loadError}). Fix your connection or permissions and reload.
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: "Total Contracts", value: stats.total, icon: FileText, color: "text-purple-400" },
          { label: "Active", value: stats.active, icon: CheckCircle, color: "text-emerald-400" },
          { label: "Pending", value: stats.pending, icon: Clock, color: "text-blue-400" },
          { label: "Total Value", value: formatSafeCurrency(stats.totalValue), icon: DollarSign, color: "text-amber-400" },
          { label: "Expiring Soon", value: stats.expiringSoon, icon: AlertCircle, color: "text-orange-400" },
        ].map((k) => (
          <Card key={k.label} className={cn(dashboardCreatePattern.panel, "border-slate-700/50")}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">{k.label}</p>
                  <p className="text-2xl font-bold text-white">{k.value}</p>
                </div>
                <k.icon className={cn("h-8 w-8", k.color)} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className={cn(dashboardCreatePattern.panel, "border-slate-700/50")}>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <Input
                placeholder="Search contracts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={cn("pl-10", dashboardCreatePattern.input)}
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className={cn("w-40", dashboardCreatePattern.selectTrigger)}>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="signed">Signed</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className={cn("w-44", dashboardCreatePattern.selectTrigger)}>
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {CONTRACT_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {filteredContracts.length === 0 ? (
        <div className="space-y-6">
          <Card className={cn(dashboardCreatePattern.panel, "border-slate-700/50")}>
            <CardContent className="p-10 sm:p-12 text-center">
              <FileText className="h-12 w-12 text-slate-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">
                {contracts.length === 0 ? "No contracts yet" : "No contracts match your filters"}
              </h3>
              <p className="text-slate-400 mb-6 max-w-lg mx-auto">
                {contracts.length === 0
                  ? "Start from a template or a blank draft. Counterparties need a Tourify account to receive and sign in-app."
                  : "Try adjusting your search or filter criteria."}
              </p>
              {contracts.length === 0 && (
                <Button onClick={openBlankModal} className={dashboardCreatePattern.btnPrimary}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create your first contract
                </Button>
              )}
            </CardContent>
          </Card>

          {contracts.length === 0 && (
            <div className="space-y-3">
              <p className="text-xs text-slate-500 px-1">
                Not legal advice — have counsel review before you rely on any template.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {CONTRACT_TEMPLATES.map((tpl) => {
                  const Icon = TEMPLATE_ICONS[tpl.iconName]
                  return (
                    <Card
                      key={tpl.id}
                      className={cn(
                        dashboardCreatePattern.panel,
                        "border-slate-700/50 transition-colors hover:border-purple-500/40"
                      )}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-start gap-3">
                          <div className={dashboardCreatePattern.headerIcon}>
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-base text-white leading-snug">{tpl.title}</CardTitle>
                            <p className="text-sm text-slate-400 mt-1">{tpl.shortDescription}</p>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className={cn(dashboardCreatePattern.btnOutline, "w-full")}
                          onClick={() => openTemplateModal(tpl.id)}
                        >
                          Use template
                        </Button>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredContracts.map((contract) => (
            <Card
              key={contract.id}
              className={cn(
                dashboardCreatePattern.panel,
                "border-slate-700/50 group hover:border-purple-500/40 transition-all duration-200"
              )}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-3 mb-3">
                      <h3 className="text-xl font-semibold text-white group-hover:text-purple-200 transition-colors">
                        {contract.title}
                      </h3>
                      <Badge variant="secondary" className={getStatusColor(contract.status)}>
                        <div className="flex items-center gap-1">
                          {getStatusIcon(contract.status)}
                          {contract.status}
                        </div>
                      </Badge>
                      <Badge
                        variant="outline"
                        className="bg-blue-500/10 text-blue-200 border-blue-500/30"
                      >
                        {CONTRACT_TYPES.find((t) => t.value === contract.type)?.label}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mb-4">
                      <div className="flex items-center gap-2 text-slate-300">
                        <User className="h-4 w-4 text-blue-400 shrink-0" />
                        <div>
                          <span className="font-medium">{contract.client_name}</span>
                          {contract.client_company && (
                            <div className="text-slate-500">{contract.client_company}</div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-slate-300">
                        <DollarSign className="h-4 w-4 text-emerald-400 shrink-0" />
                        <span className="font-medium">
                          {contract.currency} {formatSafeCurrency(contract.amount).replace("$", "")}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-slate-300">
                        <Calendar className="h-4 w-4 text-purple-400 shrink-0" />
                        <div>
                          <span>{format(new Date(contract.start_date), "MMM d, yyyy")}</span>
                          {contract.end_date && (
                            <div className="text-slate-500">
                              to {format(new Date(contract.end_date), "MMM d, yyyy")}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {contract.terms && (
                      <p className="text-slate-400 text-sm mb-3 line-clamp-2">{contract.terms}</p>
                    )}

                    {contract.notes && (
                      <div className="text-xs text-slate-500 bg-slate-950/40 p-2 rounded-xl border border-slate-700/50">
                        <strong>Notes:</strong> {contract.notes}
                      </div>
                    )}
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white shrink-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-slate-900 border-slate-700">
                      <DropdownMenuItem
                        onClick={() => openEditModal(contract)}
                        className="text-slate-200 focus:bg-slate-800"
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>

                      <DropdownMenuItem asChild className="text-slate-200 focus:bg-slate-800">
                        <Link href={`/contracts/${contract.id}`} className="flex items-center cursor-pointer">
                          <Eye className="h-4 w-4 mr-2" />
                          Review & sign
                        </Link>
                      </DropdownMenuItem>

                      {contract.status === "draft" && (
                        <DropdownMenuItem
                          onClick={() => handleSendFromList(contract.id!)}
                          className="text-slate-200 focus:bg-slate-800"
                        >
                          <Send className="h-4 w-4 mr-2" />
                          Send for signature
                        </DropdownMenuItem>
                      )}

                      <DropdownMenuSeparator className="bg-slate-700" />
                      <DropdownMenuItem
                        onClick={() => setDeleteContractId(contract.id!)}
                        className="text-red-400 focus:text-red-300 focus:bg-slate-800"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showCreateModal} onOpenChange={handleDialogOpenChange}>
        <DialogContent
          className={cn(dashboardCreatePattern.modalContent, "max-w-4xl max-h-[90vh] overflow-y-auto border")}
        >
          <DialogHeader>
            <DialogTitle className="text-white">
              {editingContract ? "Edit contract" : "New contract"}
            </DialogTitle>
          </DialogHeader>

          <p className="text-xs text-slate-500 -mt-2">
            Not legal advice. Templates are plain-language drafts for discussion; have a qualified attorney review
            before you rely on them.
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className={cn(dashboardCreatePattern.panel, "space-y-4")}>
              <h3 className="text-sm font-semibold text-white">Contract</h3>

              <div className={dashboardCreatePattern.fieldGroup}>
                <Label className="text-slate-300">Title *</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                  className={dashboardCreatePattern.input}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className={dashboardCreatePattern.fieldGroup}>
                  <Label className="text-slate-300">Type</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, type: value as Contract["type"] }))}
                    disabled={termsReadOnly}
                  >
                    <SelectTrigger className={dashboardCreatePattern.selectTrigger}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CONTRACT_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className={dashboardCreatePattern.fieldGroup}>
                  <Label className="text-slate-300">Status</Label>
                  <Input
                    readOnly
                    value={editingContract?.status ?? "draft"}
                    className={cn(dashboardCreatePattern.input, "opacity-80")}
                  />
                </div>
              </div>

              {activeTpl && !termsReadOnly && (
                <div className="space-y-3 rounded-xl border border-slate-700/60 bg-slate-950/40 p-4">
                  <p className="text-xs font-medium text-slate-400">Template variables</p>
                  {activeTpl.variables.map((v) => (
                    <div key={v.key} className={dashboardCreatePattern.fieldGroup}>
                      <Label className="text-slate-300 text-xs">{v.label}</Label>
                      {v.input === "textarea" ? (
                        <Textarea
                          value={templateVarValues[v.key] ?? ""}
                          onChange={(e) =>
                            setTemplateVarValues((prev) => ({ ...prev, [v.key]: e.target.value }))
                          }
                          placeholder={v.placeholder}
                          className={cn(dashboardCreatePattern.input, "min-h-[72px]")}
                        />
                      ) : (
                        <Input
                          type={v.input === "number" ? "number" : v.input === "date" ? "date" : "text"}
                          value={templateVarValues[v.key] ?? ""}
                          onChange={(e) =>
                            setTemplateVarValues((prev) => ({ ...prev, [v.key]: e.target.value }))
                          }
                          placeholder={v.placeholder}
                          className={dashboardCreatePattern.input}
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className={dashboardCreatePattern.fieldGroup}>
                <Label className="text-slate-300">Terms</Label>
                <Textarea
                  value={formData.terms || ""}
                  onChange={(e) => setFormData((prev) => ({ ...prev, terms: e.target.value }))}
                  readOnly={termsReadOnly}
                  className={cn(dashboardCreatePattern.input, "min-h-[140px]")}
                />
              </div>

              <div className={dashboardCreatePattern.fieldGroup}>
                <Label className="text-slate-300">Internal notes</Label>
                <Textarea
                  value={formData.notes || ""}
                  onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                  className={cn(dashboardCreatePattern.input, "min-h-[80px]")}
                />
              </div>
            </div>

            <div className={cn(dashboardCreatePattern.panel, "space-y-4")}>
              <h3 className="text-sm font-semibold text-white">Client & counterparty</h3>

              <div className={dashboardCreatePattern.fieldGroup}>
                <Label className="text-slate-300">Counterparty Tourify username * (to send)</Label>
                <div className="flex gap-2">
                  <Input
                    value={counterpartyUsername}
                    onChange={(e) => setCounterpartyUsername(e.target.value)}
                    placeholder="@handle without @"
                    disabled={termsReadOnly}
                    className={dashboardCreatePattern.input}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    disabled={termsReadOnly || counterpartyLookupLoading}
                    onClick={handleLookupCounterparty}
                    className={dashboardCreatePattern.btnOutline}
                  >
                    {counterpartyLookupLoading ? "…" : "Look up"}
                  </Button>
                </div>
                {counterpartyResolved && (
                  <p className="text-xs text-emerald-400/90">
                    Linked to account
                    {counterpartyResolved.username ? ` @${counterpartyResolved.username}` : ""}
                    {counterpartyResolved.displayName ? ` (${counterpartyResolved.displayName})` : ""}
                  </p>
                )}
              </div>

              <div className={dashboardCreatePattern.fieldGroup}>
                <Label className="text-slate-300">Client display name *</Label>
                <Input
                  value={formData.client_name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, client_name: e.target.value }))}
                  placeholder="Shown on the agreement"
                  className={dashboardCreatePattern.input}
                />
              </div>

              <div className={dashboardCreatePattern.fieldGroup}>
                <Label className="text-slate-300">Client email</Label>
                <Input
                  type="email"
                  value={formData.client_email || ""}
                  onChange={(e) => setFormData((prev) => ({ ...prev, client_email: e.target.value }))}
                  className={dashboardCreatePattern.input}
                />
              </div>

              <div className={dashboardCreatePattern.fieldGroup}>
                <Label className="text-slate-300">Company</Label>
                <Input
                  value={formData.client_company || ""}
                  onChange={(e) => setFormData((prev) => ({ ...prev, client_company: e.target.value }))}
                  className={dashboardCreatePattern.input}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className={dashboardCreatePattern.fieldGroup}>
                  <Label className="text-slate-300">Currency</Label>
                  <Select
                    value={formData.currency}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, currency: value }))}
                  >
                    <SelectTrigger className={dashboardCreatePattern.selectTrigger}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map((currency) => (
                        <SelectItem key={currency} value={currency}>
                          {currency}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className={dashboardCreatePattern.fieldGroup}>
                  <Label className="text-slate-300">Amount</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.amount || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))
                    }
                    className={dashboardCreatePattern.input}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className={dashboardCreatePattern.fieldGroup}>
                  <Label className="text-slate-300">Start date *</Label>
                  <Input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData((prev) => ({ ...prev, start_date: e.target.value }))}
                    className={dashboardCreatePattern.input}
                  />
                </div>
                <div className={dashboardCreatePattern.fieldGroup}>
                  <Label className="text-slate-300">End date</Label>
                  <Input
                    type="date"
                    value={formData.end_date || ""}
                    onChange={(e) => setFormData((prev) => ({ ...prev, end_date: e.target.value }))}
                    className={dashboardCreatePattern.input}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className={cn(dashboardCreatePattern.footer, "rounded-b-2xl")}>
            <Button
              variant="outline"
              onClick={() => handleDialogOpenChange(false)}
              disabled={isSubmitting}
              className={dashboardCreatePattern.btnOutline}
            >
              Cancel
            </Button>
            <div className="flex flex-wrap gap-2 justify-end">
              <Button
                onClick={handleSaveDraft}
                disabled={isSubmitting}
                className={dashboardCreatePattern.btnOutline}
              >
                {isSubmitting ? "Saving…" : editingContract?.status === "draft" ? "Save draft" : "Save changes"}
              </Button>
              <Button
                onClick={handleSendForSignature}
                disabled={isSubmitting || (editingContract != null && editingContract.status !== "draft")}
                className={dashboardCreatePattern.btnPrimary}
              >
                {isSubmitting ? "Sending…" : "Send for signature"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteContractId} onOpenChange={() => setDeleteContractId(null)}>
        <AlertDialogContent className="bg-slate-900 border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete contract</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className={dashboardCreatePattern.btnOutline}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteContractId && handleDeleteContract(deleteContractId)}
              className="rounded-xl bg-red-600 text-white hover:bg-red-500"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
