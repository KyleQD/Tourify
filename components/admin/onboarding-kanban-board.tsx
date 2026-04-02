"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/hooks/use-toast"
import {
  Users,
  Clock,
  CheckCircle,
  AlertCircle,
  Eye,
  MessageSquare,
  Calendar,
  MapPin,
  Briefcase,
  Star,
  MoreVertical,
  Plus,
  Filter,
  Search,
  ArrowRight,
  ArrowLeft
} from "lucide-react"
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

interface KanbanColumn {
  id: string
  title: string
  status: string
  color: string
  icon: React.ReactNode
  candidates: OnboardingCandidate[]
}

interface OnboardingKanbanBoardProps {
  candidates: OnboardingCandidate[]
  onCandidateClick: (candidate: OnboardingCandidate) => void
  onStatusChange: (candidateId: string, newStatus: string) => void
  loading?: boolean
}

const KANBAN_COLUMNS: Omit<KanbanColumn, 'candidates'>[] = [
  {
    id: 'pending',
    title: 'Pending',
    status: 'pending',
    color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    icon: <Clock className="h-4 w-4" />
  },
  {
    id: 'in_progress',
    title: 'In Progress',
    status: 'in_progress',
    color: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    icon: <ArrowRight className="h-4 w-4" />
  },
  {
    id: 'completed',
    title: 'Completed',
    status: 'completed',
    color: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    icon: <CheckCircle className="h-4 w-4" />
  },
  {
    id: 'review',
    title: 'Review',
    status: 'review',
    color: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    icon: <Eye className="h-4 w-4" />
  },
  {
    id: 'approved',
    title: 'Approved',
    status: 'approved',
    color: 'bg-green-500/20 text-green-400 border-green-500/30',
    icon: <Star className="h-4 w-4" />
  },
  {
    id: 'rejected',
    title: 'Rejected',
    status: 'rejected',
    color: 'bg-red-500/20 text-red-400 border-red-500/30',
    icon: <AlertCircle className="h-4 w-4" />
  }
]

export function OnboardingKanbanBoard({ 
  candidates, 
  onCandidateClick, 
  onStatusChange, 
  loading = false 
}: OnboardingKanbanBoardProps) {
  const { toast } = useToast()
  const [columns, setColumns] = useState<KanbanColumn[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [filterDepartment, setFilterDepartment] = useState("all")

  // Organize candidates into columns
  useEffect(() => {
    const organizedColumns = KANBAN_COLUMNS.map(column => ({
      ...column,
      candidates: candidates.filter(candidate => {
        const matchesSearch = candidate.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             candidate.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             candidate.position.toLowerCase().includes(searchTerm.toLowerCase())
        
        const matchesDepartment = filterDepartment === "all" || candidate.department === filterDepartment
        
        return candidate.status === column.status && matchesSearch && matchesDepartment
      })
    }))
    
    setColumns(organizedColumns)
  }, [candidates, searchTerm, filterDepartment])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500/20 text-yellow-400'
      case 'in_progress': return 'bg-blue-500/20 text-blue-400'
      case 'completed': return 'bg-purple-500/20 text-purple-400'
      case 'review': return 'bg-orange-500/20 text-orange-400'
      case 'approved': return 'bg-green-500/20 text-green-400'
      case 'rejected': return 'bg-red-500/20 text-red-400'
      default: return 'bg-slate-500/20 text-slate-400'
    }
  }

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return 'bg-green-500'
    if (progress >= 60) return 'bg-blue-500'
    if (progress >= 40) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  const handleDragStart = (e: React.DragEvent, candidateId: string) => {
    e.dataTransfer.setData('candidateId', candidateId)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent, targetStatus: string) => {
    e.preventDefault()
    const candidateId = e.dataTransfer.getData('candidateId')
    onStatusChange(candidateId, targetStatus)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-2 text-slate-400">Loading candidates...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search candidates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={filterDepartment}
            onChange={(e) => setFilterDepartment(e.target.value)}
            className="px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Departments</option>
            <option value="Technical">Technical</option>
            <option value="Security">Security</option>
            <option value="Bar Staff">Bar Staff</option>
            <option value="Management">Management</option>
            <option value="General Staff">General Staff</option>
          </select>
        </div>
        
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="border-slate-600">
            {candidates.length} Total
          </Badge>
          <Badge variant="outline" className="border-slate-600">
            {candidates.filter(c => c.status === 'pending').length} Pending
          </Badge>
          <Badge variant="outline" className="border-slate-600">
            {candidates.filter(c => c.status === 'in_progress').length} Active
          </Badge>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 gap-6">
        {columns.map((column) => (
          <div
            key={column.id}
            className="space-y-4"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, column.status)}
          >
            {/* Column Header */}
            <div className={`flex items-center justify-between p-4 rounded-lg border ${column.color}`}>
              <div className="flex items-center space-x-2">
                {column.icon}
                <h3 className="font-semibold">{column.title}</h3>
              </div>
              <Badge className="bg-white/20 text-white">
                {column.candidates.length}
              </Badge>
            </div>

            {/* Column Content */}
            <div className="space-y-3 min-h-[400px]">
              {column.candidates.map((candidate) => (
                <Card
                  key={candidate.id}
                  className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm hover:bg-slate-900/70 transition-all duration-300 cursor-pointer"
                  draggable
                  onDragStart={(e) => handleDragStart(e, candidate.id)}
                  onClick={() => onCandidateClick(candidate)}
                >
                  <CardContent className="p-4">
                    {/* Candidate Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={candidate.avatar_url} />
                          <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-600 text-white text-xs">
                            {candidate.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h4 className="text-sm font-medium text-white truncate max-w-[120px]">
                            {candidate.name}
                          </h4>
                          <p className="text-xs text-slate-400 truncate max-w-[120px]">
                            {candidate.position}
                          </p>
                        </div>
                      </div>
                      <MoreVertical className="h-4 w-4 text-slate-400" />
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-slate-400">Progress</span>
                        <span className="text-xs text-white font-medium">
                          {candidate.onboarding_progress}%
                        </span>
                      </div>
                      <Progress 
                        value={candidate.onboarding_progress} 
                        className="h-2"
                      />
                    </div>

                    {/* Quick Info */}
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2 text-xs">
                        <Briefcase className="h-3 w-3 text-slate-400" />
                        <span className="text-slate-400">{candidate.department}</span>
                      </div>
                      
                      <div className="flex items-center space-x-2 text-xs">
                        <Calendar className="h-3 w-3 text-slate-400" />
                        <span className="text-slate-400">
                          {formatSafeDate(candidate.application_date)}
                        </span>
                      </div>

                      {candidate.start_date && (
                        <div className="flex items-center space-x-2 text-xs">
                          <MapPin className="h-3 w-3 text-slate-400" />
                          <span className="text-slate-400">
                            Start: {formatSafeDate(candidate.start_date)}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-700/50">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 px-2 text-xs hover:bg-slate-800"
                        onClick={(e) => {
                          e.stopPropagation()
                          // Handle message action
                        }}
                      >
                        <MessageSquare className="h-3 w-3 mr-1" />
                        Message
                      </Button>
                      
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 px-2 text-xs hover:bg-slate-800"
                        onClick={(e) => {
                          e.stopPropagation()
                          // Handle view action
                        }}
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        View
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
} 