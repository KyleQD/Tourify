"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Award, ThumbsUp, Users, Search, Loader2, CheckCircle, Star,
  Shield, Crown, Send, Gift, Sparkles,
} from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"
import type { Badge as BadgeType, EndorsementCategory } from "@/types/achievements"

interface TeamMember {
  id: string
  user_id?: string
  name?: string
  email?: string
  role?: string
  profiles?: {
    id: string
    full_name?: string
    email?: string
    avatar_url?: string
  }
}

interface TeamBadgeEndorsementPanelProps {
  venueId?: string
  className?: string
}

const ENDORSEMENT_CATEGORIES: { value: EndorsementCategory; label: string }[] = [
  { value: "technical", label: "Technical" },
  { value: "creative", label: "Creative" },
  { value: "business", label: "Business" },
  { value: "interpersonal", label: "Interpersonal" },
  { value: "leadership", label: "Leadership" },
  { value: "specialized", label: "Specialized" },
]

const COMMON_SKILLS = [
  "Sound Engineering", "Stage Management", "Crowd Control", "Event Planning",
  "Lighting Design", "Bartending", "Customer Service", "Team Leadership",
  "Equipment Maintenance", "Safety Protocol", "Communication", "Problem Solving",
  "Time Management", "Attention to Detail", "Live Production", "Hospitality",
]

export function TeamBadgeEndorsementPanel({ venueId, className }: TeamBadgeEndorsementPanelProps) {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState("give-badge")
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [availableBadges, setAvailableBadges] = useState<BadgeType[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [memberSearch, setMemberSearch] = useState("")

  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null)
  const [showGrantDialog, setShowGrantDialog] = useState(false)
  const [showEndorseDialog, setShowEndorseDialog] = useState(false)

  const [selectedBadgeId, setSelectedBadgeId] = useState("")
  const [grantReason, setGrantReason] = useState("")
  const [isGranting, setIsGranting] = useState(false)

  const [endorseSkill, setEndorseSkill] = useState("")
  const [endorseLevel, setEndorseLevel] = useState("3")
  const [endorseComment, setEndorseComment] = useState("")
  const [endorseCategory, setEndorseCategory] = useState<EndorsementCategory>("technical")
  const [isEndorsing, setIsEndorsing] = useState(false)

  useEffect(() => {
    loadData()
  }, [venueId])

  async function loadData() {
    setIsLoading(true)
    try {
      const [membersRes, badgesRes] = await Promise.all([
        fetch(venueId ? `/api/admin/team-members?venue_id=${venueId}` : "/api/admin/team-members", { credentials: "include" }),
        fetch("/api/badges", { credentials: "include" }),
      ])
      const [membersData, badgesData] = await Promise.all([membersRes.json(), badgesRes.json()])
      setTeamMembers(membersData?.members || [])
      setAvailableBadges(badgesData?.badges || [])
    } catch (error) {
      console.error("Failed to load data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const filteredMembers = teamMembers.filter(m => {
    const q = memberSearch.toLowerCase()
    if (!q) return true
    const name = (m.profiles?.full_name || m.name || "").toLowerCase()
    const email = (m.profiles?.email || m.email || "").toLowerCase()
    return name.includes(q) || email.includes(q)
  })

  const selectedMember = teamMembers.find(m => (m.user_id || m.profiles?.id || m.id) === selectedMemberId)

  function getMemberDisplayName(m: TeamMember) {
    return m.profiles?.full_name || m.name || m.email || "Team member"
  }

  function getMemberUserId(m: TeamMember) {
    return m.user_id || m.profiles?.id || m.id
  }

  function openGrantBadge(memberId: string) {
    setSelectedMemberId(memberId)
    setSelectedBadgeId("")
    setGrantReason("")
    setShowGrantDialog(true)
  }

  function openEndorse(memberId: string) {
    setSelectedMemberId(memberId)
    setEndorseSkill("")
    setEndorseLevel("3")
    setEndorseComment("")
    setEndorseCategory("technical")
    setShowEndorseDialog(true)
  }

  async function handleGrantBadge() {
    if (!selectedMemberId || !selectedBadgeId) return
    if (!grantReason.trim()) {
      toast({
        title: "Reason required",
        description: "Add a short reason so the badge stays meaningful.",
        variant: "destructive",
      })
      return
    }
    setIsGranting(true)
    try {
      const res = await fetch("/api/badges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          badge_id: selectedBadgeId,
          user_id: selectedMemberId,
          granted_reason: grantReason.trim(),
        }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      const badgeName = availableBadges.find(b => b.id === selectedBadgeId)?.name || "badge"
      toast({ title: "Badge awarded!", description: `"${badgeName}" has been awarded to ${getMemberDisplayName(selectedMember!)}.` })
      setShowGrantDialog(false)
    } catch (error) {
      toast({ title: "Failed to award badge", description: error instanceof Error ? error.message : "Please try again.", variant: "destructive" })
    } finally {
      setIsGranting(false)
    }
  }

  const selectedBadgePreview = availableBadges.find((badge) => badge.id === selectedBadgeId)

  async function handleEndorse() {
    if (!selectedMemberId || !endorseSkill.trim()) return
    setIsEndorsing(true)
    try {
      const res = await fetch("/api/endorsements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          endorsee_id: selectedMemberId,
          skill: endorseSkill.trim(),
          level: Number(endorseLevel),
          comment: endorseComment || undefined,
          category: endorseCategory,
        }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      toast({ title: "Endorsement sent!", description: `You endorsed ${getMemberDisplayName(selectedMember!)} for "${endorseSkill}".` })
      setShowEndorseDialog(false)
    } catch (error) {
      toast({ title: "Failed to endorse", description: error instanceof Error ? error.message : "Please try again.", variant: "destructive" })
    } finally {
      setIsEndorsing(false)
    }
  }

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-8 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-purple-400 mr-2" />
          <span className="text-slate-400">Loading team data...</span>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card className={cn("border-slate-700 bg-slate-900/50", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Sparkles className="h-5 w-5 text-purple-400" />
            Recognize Your Team
          </CardTitle>
          <p className="text-sm text-slate-400">Award badges and endorse skills for your team and staff members. They'll appear on their profiles.</p>
        </CardHeader>
        <CardContent>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <Input placeholder="Search team members..." value={memberSearch} onChange={e => setMemberSearch(e.target.value)}
              className="pl-9 bg-slate-800 border-slate-700" />
          </div>

          {filteredMembers.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-10 w-10 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400">{memberSearch ? "No team members match your search." : "No team members found. Hire staff through the Jobs tab first."}</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {filteredMembers.map(member => {
                const userId = getMemberUserId(member)
                return (
                  <div key={member.id} className="flex items-center justify-between rounded-lg border border-slate-700/60 bg-slate-800/40 p-3 hover:bg-slate-800/70 transition-colors">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={member.profiles?.avatar_url} />
                        <AvatarFallback className="bg-purple-600/20 text-purple-300 text-sm">
                          {(member.profiles?.full_name || member.name || "?").charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium text-white">{getMemberDisplayName(member)}</p>
                        <p className="text-xs text-slate-400">{member.role || "Team member"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" className="border-purple-600/50 text-purple-300 hover:bg-purple-600/20 h-8"
                        onClick={() => openGrantBadge(userId)}>
                        <Award className="h-3.5 w-3.5 mr-1" />Badge
                      </Button>
                      <Button size="sm" variant="outline" className="border-blue-600/50 text-blue-300 hover:bg-blue-600/20 h-8"
                        onClick={() => openEndorse(userId)}>
                        <ThumbsUp className="h-3.5 w-3.5 mr-1" />Endorse
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Grant Badge Dialog */}
      <Dialog open={showGrantDialog} onOpenChange={setShowGrantDialog}>
        <DialogContent className="bg-slate-900 border-slate-700 max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <Gift className="h-5 w-5 text-purple-400" />
              Award Badge to {selectedMember ? getMemberDisplayName(selectedMember) : ""}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Select Badge</Label>
              <Select value={selectedBadgeId} onValueChange={setSelectedBadgeId}>
                <SelectTrigger className="bg-slate-800 border-slate-700">
                  <SelectValue placeholder="Choose a badge to award" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {availableBadges.map(badge => (
                    <SelectItem key={badge.id} value={badge.id}>
                      <span className="flex items-center gap-2">
                        <Award className="h-3.5 w-3.5" />
                        {badge.name}
                        <Badge variant="outline" className="text-[10px] ml-1 capitalize">{badge.category}</Badge>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedBadgePreview && (
                <div className="rounded-lg border border-slate-700 bg-slate-800/60 p-3">
                  <p className="text-sm font-medium text-white">{selectedBadgePreview.name}</p>
                  <p className="mt-1 text-xs text-slate-400">{selectedBadgePreview.description}</p>
                  <div className="mt-2 flex gap-2">
                    <Badge variant="outline" className="text-[10px] capitalize">{selectedBadgePreview.category}</Badge>
                    <Badge variant="outline" className="text-[10px] capitalize">{selectedBadgePreview.rarity}</Badge>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Reason (required)</Label>
              <Textarea placeholder="Why are you awarding this badge? e.g., 'Outstanding performance at Summer Fest 2026'"
                value={grantReason} onChange={e => setGrantReason(e.target.value)}
                className="bg-slate-800 border-slate-700 resize-none" rows={3} />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" className="border-slate-700" onClick={() => setShowGrantDialog(false)}>Cancel</Button>
              <Button
                onClick={handleGrantBadge}
                disabled={!selectedBadgeId || !grantReason.trim() || isGranting}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {isGranting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Award className="h-4 w-4 mr-2" />}
                Award Badge
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Endorse Dialog */}
      <Dialog open={showEndorseDialog} onOpenChange={setShowEndorseDialog}>
        <DialogContent className="bg-slate-900 border-slate-700 max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <ThumbsUp className="h-5 w-5 text-blue-400" />
              Endorse {selectedMember ? getMemberDisplayName(selectedMember) : ""}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Skill</Label>
              <Input placeholder="e.g., Sound Engineering" value={endorseSkill} onChange={e => setEndorseSkill(e.target.value)}
                className="bg-slate-800 border-slate-700" />
              <div className="flex flex-wrap gap-1">
                {COMMON_SKILLS.filter(s => !endorseSkill || s.toLowerCase().includes(endorseSkill.toLowerCase())).slice(0, 8).map(skill => (
                  <Button key={skill} type="button" size="sm" variant="outline"
                    className="h-6 text-xs border-slate-700 text-slate-300 hover:bg-slate-700"
                    onClick={() => setEndorseSkill(skill)}>
                    {skill}
                  </Button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Skill Level (1-5)</Label>
                <Select value={endorseLevel} onValueChange={setEndorseLevel}>
                  <SelectTrigger className="bg-slate-800 border-slate-700"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 - Beginner</SelectItem>
                    <SelectItem value="2">2 - Basic</SelectItem>
                    <SelectItem value="3">3 - Competent</SelectItem>
                    <SelectItem value="4">4 - Proficient</SelectItem>
                    <SelectItem value="5">5 - Expert</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Category</Label>
                <Select value={endorseCategory} onValueChange={v => setEndorseCategory(v as EndorsementCategory)}>
                  <SelectTrigger className="bg-slate-800 border-slate-700"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ENDORSEMENT_CATEGORIES.map(c => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Comment (optional)</Label>
              <Textarea placeholder="Share context about this endorsement..."
                value={endorseComment} onChange={e => setEndorseComment(e.target.value)}
                className="bg-slate-800 border-slate-700 resize-none" rows={3} />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" className="border-slate-700" onClick={() => setShowEndorseDialog(false)}>Cancel</Button>
              <Button onClick={handleEndorse} disabled={!endorseSkill.trim() || isEndorsing} className="bg-blue-600 hover:bg-blue-700">
                {isEndorsing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ThumbsUp className="h-4 w-4 mr-2" />}
                Endorse
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
