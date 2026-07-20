"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Star, ThumbsUp, MessageCircle } from "lucide-react"
import { Input } from "@/components/ui/input"
import { toast } from "@/components/ui/use-toast"

interface EndorsementModalProps {
  endorseeId: string
  endorseeName: string
  endorseeAvatar?: string
  skillName?: string
  jobId?: string
  eventId?: string
  collaborationId?: string
  projectId?: string
  trigger?: React.ReactNode
  onEndorsementCreated?: () => void
}

const skillCategories = [
  { value: 'technical', label: 'Technical', color: 'bg-blue-500' },
  { value: 'creative', label: 'Creative', color: 'bg-purple-500' },
  { value: 'business', label: 'Business', color: 'bg-green-500' },
  { value: 'interpersonal', label: 'Interpersonal', color: 'bg-orange-500' },
  { value: 'leadership', label: 'Leadership', color: 'bg-red-500' },
  { value: 'specialized', label: 'Specialized', color: 'bg-indigo-500' }
]

const skillLevels = [
  { value: 1, label: 'Beginner', description: 'Basic understanding and skills' },
  { value: 2, label: 'Intermediate', description: 'Good working knowledge' },
  { value: 3, label: 'Advanced', description: 'Strong expertise and experience' },
  { value: 4, label: 'Expert', description: 'Deep knowledge and mastery' },
  { value: 5, label: 'Master', description: 'Exceptional skill and leadership' }
]

export function EndorsementModal({ 
  endorseeId, 
  endorseeName, 
  endorseeAvatar,
  skillName: initialSkillName = '',
  jobId,
  eventId,
  collaborationId,
  projectId,
  trigger,
  onEndorsementCreated 
}: EndorsementModalProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [level, setLevel] = useState<number>(3)
  const [category, setCategory] = useState<string>('')
  const [skillName, setSkillName] = useState(initialSkillName)
  const [comment, setComment] = useState('')
  const hasWorkContext = !!(jobId || eventId || collaborationId || projectId)

  const handleSubmit = async () => {
    if (!category) {
      toast({
        title: "Category Required",
        description: "Please select a skill category",
        variant: "destructive"
      })
      return
    }

    if (!skillName.trim()) {
      toast({
        title: "Skill required",
        description: "Enter the skill you are endorsing",
        variant: "destructive"
      })
      return
    }

    try {
      setLoading(true)

      const response = await fetch('/api/endorsements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          endorsee_id: endorseeId,
          skill: skillName.trim(),
          level,
          comment: comment.trim() || undefined,
          category,
          job_id: jobId,
          event_id: eventId,
          collaboration_id: collaborationId,
          project_id: projectId,
        }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to create endorsement')
      }

      toast({
        title: hasWorkContext ? "Verified endorsement sent" : "Endorsement created",
        description: `Successfully endorsed ${endorseeName} for ${skillName.trim()}`,
      })

      setOpen(false)
      setLevel(3)
      setCategory('')
      setComment('')
      if (!initialSkillName) setSkillName('')
      onEndorsementCreated?.()
    } catch (error) {
      console.error('Error creating endorsement:', error)
      toast({
        title: "Error",
        description: "Failed to create endorsement. Please try again.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const renderStars = (level: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-5 w-5 cursor-pointer transition-colors ${
          i < level ? "text-yellow-400 fill-current" : "text-gray-300"
        }`}
        onClick={() => setLevel(i + 1)}
      />
    ))
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="flex items-center gap-2">
            <ThumbsUp className="h-4 w-4" />
            Endorse
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={endorseeAvatar} />
              <AvatarFallback>{endorseeName.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <div>Endorse {endorseeName}</div>
              <div className="text-sm font-normal text-muted-foreground">
                {skillName ? `for ${skillName}` : 'for a skill you observed'}
              </div>
            </div>
          </DialogTitle>
          <DialogDescription>
            Share your experience working with {endorseeName}.
            {hasWorkContext
              ? ' Because you share verified work context, this endorsement can count as verified.'
              : ' Linking a shared job or event makes endorsements more credible.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {!initialSkillName && (
            <div className="space-y-2">
              <Label htmlFor="skill">Skill</Label>
              <Input
                id="skill"
                value={skillName}
                onChange={(e) => setSkillName(e.target.value)}
                placeholder="e.g. Stage Management"
              />
            </div>
          )}

          {/* Skill Category */}
          <div className="space-y-2">
            <Label htmlFor="category">Skill Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {skillCategories.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${cat.color}`} />
                      {cat.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Skill Level */}
          <div className="space-y-3">
            <Label>Skill Level</Label>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {renderStars(level)}
                <span className="text-sm font-medium ml-2">
                  {skillLevels.find(l => l.value === level)?.label}
                </span>
              </div>
              <p className="text-sm text-gray-600">
                {skillLevels.find(l => l.value === level)?.description}
              </p>
            </div>
          </div>

          {/* Comment */}
          <div className="space-y-2">
            <Label htmlFor="comment" className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              Comment (Optional)
            </Label>
            <Textarea
              id="comment"
              placeholder="Share your experience working with this person..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
            />
            <p className="text-xs text-gray-500">
              Your comment will be visible to {endorseeName} and may appear on their profile.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading || !category}
              className="flex-1"
            >
              {loading ? "Creating..." : "Endorse"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 