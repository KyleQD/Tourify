"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  Users, 
  Search, 
  Filter, 
  MoreHorizontal, 
  Mail, 
  Phone, 
  Calendar,
  Clock,
  CheckCircle,
  XSquare,
  Edit,
  Trash2,
  Download,
  Upload,
  RefreshCw,
  Eye,
  MessageSquare
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { OnboardingKanbanBoard } from "./onboarding-kanban-board"
import { formatSafeDate } from "@/lib/events/admin-event-normalization"

interface OnboardingCandidate {
  id: string
  venue_id: string
  name: string
  email: string
  phone?: string
  position: string
  department: string
  status: 'pending' | 'in_progress' | 'completed' | 'rejected' | 'approved'
  stage: 'invitation' | 'onboarding' | 'review' | 'approved' | 'rejected'
  application_date: string
  avatar_url?: string
  experience_years: number
  skills: string[]
  documents: any[]
  notes: string
  assigned_manager?: string
  start_date?: string
  salary?: number
  employment_type: 'full_time' | 'part_time' | 'contractor' | 'volunteer'
  onboarding_progress: number
  template_id?: string
  invitation_token?: string
  onboarding_responses?: any
  review_notes?: string
  approved_by?: string
  approved_at?: string
  created_at: string
  updated_at: string
  template?: {
    name: string
    description?: string
  }
}

interface EnhancedCandidateManagerProps {
  venueId: string
  onEditCandidate: (candidate: OnboardingCandidate) => void
  onViewCandidate: (candidate: OnboardingCandidate) => void
  onSendMessage: (candidate: OnboardingCandidate) => void
}

export default function EnhancedCandidateManager({
  venueId,
  onEditCandidate,
  onViewCandidate,
  onSendMessage
}: EnhancedCandidateManagerProps) {
  const { toast } = useToast()
  const [candidates, setCandidates] = useState<OnboardingCandidate[]>([])
  const [filteredCandidates, setFilteredCandidates] = useState<OnboardingCandidate[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list')
  const [selectedCandidates, setSelectedCandidates] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [positionFilter, setPositionFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<string>('created_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  useEffect(() => {
    fetchCandidates()
  }, [venueId])

  useEffect(() => {
    filterAndSortCandidates()
  }, [candidates, searchTerm, statusFilter, positionFilter, sortBy, sortOrder])

  async function fetchCandidates() {
    setLoading(true)
    try {
      const response = await fetch(`/api/admin/onboarding/candidates?venue_id=${venueId}`)
      if (response.ok) {
        const data = await response.json()
        setCandidates(data.data || [])
      }
    } catch (error) {
      console.error("Error fetching candidates:", error)
      toast({
        title: "Error",
        description: "Failed to fetch candidates",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  function filterAndSortCandidates() {
    let filtered = [...candidates]

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(candidate =>
        candidate.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        candidate.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        candidate.position.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(candidate => candidate.status === statusFilter)
    }

    // Apply position filter
    if (positionFilter !== 'all') {
      filtered = filtered.filter(candidate => candidate.position === positionFilter)
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue = a[sortBy as keyof OnboardingCandidate]
      let bValue = b[sortBy as keyof OnboardingCandidate]

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        aValue = aValue.toLowerCase()
        bValue = bValue.toLowerCase()
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1
      return 0
    })

    setFilteredCandidates(filtered)
  }

  function handleStatusChange(candidateId: string, newStatus: string) {
    updateCandidateStatus(candidateId, newStatus)
  }

  async function updateCandidateStatus(candidateId: string, newStatus: string) {
    try {
      const response = await fetch('/api/admin/onboarding/update-status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidate_id: candidateId, status: newStatus })
      })

      if (response.ok) {
        setCandidates(prev => prev.map(c => 
          c.id === candidateId ? { ...c, status: newStatus as any } : c
        ))
        toast({
          title: "Success",
          description: "Candidate status updated successfully"
        })
      }
    } catch (error) {
      console.error("Error updating candidate status:", error)
      toast({
        title: "Error",
        description: "Failed to update candidate status",
        variant: "destructive"
      })
    }
  }

  function handleBulkAction(action: string) {
    if (selectedCandidates.length === 0) {
      toast({
        title: "No Selection",
        description: "Please select candidates to perform bulk actions",
        variant: "destructive"
      })
      return
    }

    switch (action) {
      case 'approve':
        selectedCandidates.forEach(id => updateCandidateStatus(id, 'approved'))
        break
      case 'reject':
        selectedCandidates.forEach(id => updateCandidateStatus(id, 'rejected'))
        break
      case 'delete':
        // Implement bulk delete
        break
    }

    setSelectedCandidates([])
  }

  function handleSelectAll() {
    if (selectedCandidates.length === filteredCandidates.length) {
      setSelectedCandidates([])
    } else {
      setSelectedCandidates(filteredCandidates.map(c => c.id))
    }
  }

  function handleSelectCandidate(candidateId: string) {
    setSelectedCandidates(prev => 
      prev.includes(candidateId) 
        ? prev.filter(id => id !== candidateId)
        : [...prev, candidateId]
    )
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'pending': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
      case 'in_progress': return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
      case 'completed': return 'bg-purple-500/20 text-purple-400 border-purple-500/30'
      case 'approved': return 'bg-green-500/20 text-green-400 border-green-500/30'
      case 'rejected': return 'bg-red-500/20 text-red-400 border-red-500/30'
      default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30'
    }
  }

  function getStatusIcon(status: string) {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />
      case 'in_progress': return <Users className="h-4 w-4" />
      case 'completed': return <CheckCircle className="h-4 w-4" />
      case 'approved': return <CheckCircle className="h-4 w-4" />
      case 'rejected': return <XSquare className="h-4 w-4" />
      default: return <Clock className="h-4 w-4" />
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <Card key={i} className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm animate-pulse">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="h-12 w-12 bg-slate-800 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-slate-800 rounded w-1/4"></div>
                  <div className="h-3 bg-slate-800 rounded w-1/2"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (viewMode === 'kanban') {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold text-white">Candidates ({filteredCandidates.length})</h3>
            <p className="text-slate-400">Manage onboarding candidates</p>
          </div>
          <Button
            variant="outline"
            onClick={() => setViewMode('list')}
            className="border-slate-600 hover:bg-slate-800"
          >
            <Users className="h-4 w-4 mr-2" />
            List View
          </Button>
        </div>
                            <OnboardingKanbanBoard 
                      candidates={filteredCandidates}
                      onStatusChange={handleStatusChange}
                      onCandidateClick={onViewCandidate}
                    />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-lg font-semibold text-white">Candidates ({filteredCandidates.length})</h3>
          <p className="text-slate-400">Manage onboarding candidates</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setViewMode('kanban')}
            className="border-slate-600 hover:bg-slate-800"
          >
            <Filter className="h-4 w-4 mr-2" />
            Kanban View
          </Button>
          <Button
            onClick={fetchCandidates}
            variant="outline"
            className="border-slate-600 hover:bg-slate-800"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters and Search */}
      <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search candidates..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-slate-800 border-slate-600 text-white placeholder:text-slate-400"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-600">
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>

            <Select value={positionFilter} onValueChange={setPositionFilter}>
              <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                <SelectValue placeholder="Position" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-600">
                <SelectItem value="all">All Positions</SelectItem>
                {Array.from(new Set(candidates.map(c => c.position))).map(position => (
                  <SelectItem key={position} value={position}>{position}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-600">
                <SelectItem value="created_at">Date Created</SelectItem>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="position">Position</SelectItem>
                <SelectItem value="status">Status</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="border-slate-600 hover:bg-slate-800"
            >
              {sortOrder === 'asc' ? '↑' : '↓'} Sort
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedCandidates.length > 0 && (
        <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-white">
                  {selectedCandidates.length} candidate(s) selected
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAll}
                  className="border-slate-600 hover:bg-slate-800"
                >
                  Select All
                </Button>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => handleBulkAction('approve')}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleBulkAction('reject')}
                >
                  <XSquare className="h-4 w-4 mr-2" />
                  Reject
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Candidates List */}
      <div className="space-y-4">
        {filteredCandidates.length === 0 ? (
          <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
            <CardContent className="p-8 text-center">
              <Users className="h-12 w-12 text-slate-500 mx-auto mb-4" />
              <p className="text-slate-400">No candidates found</p>
            </CardContent>
          </Card>
        ) : (
          filteredCandidates.map((candidate) => (
            <Card key={candidate.id} className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm hover:bg-slate-800/50 transition-colors">
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <Checkbox
                    checked={selectedCandidates.includes(candidate.id)}
                    onCheckedChange={() => handleSelectCandidate(candidate.id)}
                    className="border-slate-600"
                  />
                  
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={candidate.avatar_url} />
                    <AvatarFallback className="bg-slate-700 text-white">
                      {candidate.name?.charAt(0)?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-white font-medium truncate">{candidate.name}</h4>
                        <p className="text-slate-400 text-sm truncate">{candidate.position}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getStatusColor(candidate.status)}>
                          {getStatusIcon(candidate.status)}
                          <span className="ml-1 capitalize">{candidate.status.replace('_', ' ')}</span>
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 mt-2 text-sm text-slate-400">
                      <div className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        <span className="truncate">{candidate.email}</span>
                      </div>
                      {candidate.phone && (
                        <div className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          <span>{candidate.phone}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>{formatSafeDate(candidate.created_at)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onViewCandidate(candidate)}
                      className="border-slate-600 hover:bg-slate-800"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onSendMessage(candidate)}
                      className="border-slate-600 hover:bg-slate-800"
                    >
                      <MessageSquare className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onEditCandidate(candidate)}
                      className="border-slate-600 hover:bg-slate-800"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
} 