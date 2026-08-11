"use client"

import React, { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/components/ui/use-toast"
import { formatDate } from "@/utils"
import { detailSurfacePattern } from "@/components/dashboard/detail-surface-pattern"
import { cn } from "@/lib/utils"
import { Plus, Users, MessageSquare, FileText, Send, CheckCircle2, Clock, AlertCircle, ChevronDown, ChevronUp } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

interface TeamMember {
  id: string
  user_id: string
  name: string
  role: string
  permissions: string[]
  status: "pending" | "active" | "inactive"
  avatar_url?: string
  tasks: TeamTask[]
  last_active: string
  availability: {
    status: "available" | "busy" | "away" | "offline"
    until?: string
    message?: string
  }
  working_hours: {
    start: string
    end: string
    timezone: string
  }
  skills: string[]
}

interface TeamTask {
  id: string
  title: string
  description: string
  assigned_to: string
  due_date: string
  status: "pending" | "in_progress" | "completed" | "overdue"
  priority: "low" | "medium" | "high"
  dependencies: string[]
  blockers: string[]
  estimated_hours: number
  actual_hours: number
  progress: number
  comments: TaskComment[]
}

interface TaskComment {
  id: string
  task_id: string
  user_id: string
  user_name: string
  content: string
  created_at: string
  avatar_url?: string
}

interface TeamMessage {
  id: string
  sender_id: string
  sender_name: string
  content: string
  created_at: string
  avatar_url?: string
  attachments?: {
    name: string
    url: string
    type: string
  }[]
  reactions?: {
    emoji: string
    count: number
    users: string[]
  }[]
}

interface TeamDocument {
  id: string
  name: string
  description: string
  file_url: string
  uploaded_by: string
  uploaded_by_name: string
  created_at: string
  version: number
  last_modified: string
  last_modified_by: string
  last_modified_by_name: string
  file_type: string
  file_size: number
  tags: string[]
  comments: DocumentComment[]
  collaborators: string[]
}

interface DocumentComment {
  id: string
  document_id: string
  user_id: string
  user_name: string
  content: string
  created_at: string
  avatar_url?: string
  replies: DocumentCommentReply[]
}

interface DocumentCommentReply {
  id: string
  comment_id: string
  user_id: string
  user_name: string
  content: string
  created_at: string
  avatar_url?: string
}

interface TeamCollaborationProps {
  eventId: string
  teamMembers: TeamMember[]
  messages: TeamMessage[]
  documents: TeamDocument[]
  onAddMember: (member: Omit<TeamMember, "id" | "status">) => Promise<void>
  onSendMessage: (content: string, attachments?: File[]) => Promise<void>
  onUploadDocument: (document: { name: string; description: string; file: File; tags: string[] }) => Promise<void>
  onAddTask: (task: Omit<TeamTask, "id">) => Promise<void>
  onUpdateTaskStatus: (taskId: string, status: TeamTask["status"]) => Promise<void>
  onAddReaction: (messageId: string, emoji: string) => Promise<void>
  onAddTaskComment: (taskId: string, content: string) => Promise<void>
  onAddDocumentComment: (documentId: string, content: string) => Promise<void>
  onAddDocumentCommentReply: (documentId: string, commentId: string, content: string) => Promise<void>
  onUpdateMemberAvailability: (memberId: string, availability: TeamMember["availability"]) => Promise<void>
  onUpdateTaskProgress: (taskId: string, progress: number) => Promise<void>
  onUpdateTaskHours: (taskId: string, actual_hours: number) => Promise<void>
  onAddTaskDependency: (taskId: string, dependencyId: string) => Promise<void>
  onRemoveTaskDependency: (taskId: string, dependencyId: string) => Promise<void>
}

interface WorkflowTask {
  id: string
  thread_id: string
  title: string
  description: string | null
  assignee_id: string | null
  status: "todo" | "doing" | "done" | "blocked"
  priority: "low" | "medium" | "high" | "critical"
  due_at: string | null
}

interface WorkflowMessage {
  id: string
  thread_id: string
  sender_id: string | null
  body: string
  created_at: string
}

export function TeamCollaboration({ 
  eventId, 
  teamMembers, 
  messages, 
  documents, 
  onAddMember, 
  onSendMessage, 
  onUploadDocument,
  onAddTask,
  onUpdateTaskStatus,
  onAddReaction,
  onAddTaskComment,
  onAddDocumentComment,
  onAddDocumentCommentReply,
  onUpdateMemberAvailability,
  onUpdateTaskProgress,
  onUpdateTaskHours,
  onAddTaskDependency,
  onRemoveTaskDependency
}: TeamCollaborationProps) {
  const { toast } = useToast()
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false)
  const [isDocumentModalOpen, setIsDocumentModalOpen] = useState(false)
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false)
  const [newMessage, setNewMessage] = useState("")
  const [messageAttachments, setMessageAttachments] = useState<File[]>([])
  const [newMember, setNewMember] = useState<Omit<TeamMember, "id" | "status">>({
    user_id: "",
    name: "",
    role: "",
    permissions: [],
    tasks: [],
    last_active: new Date().toISOString(),
    availability: { status: "available" },
    working_hours: { start: "09:00", end: "17:00", timezone: Intl.DateTimeFormat().resolvedOptions().timeZone },
    skills: []
  })
  const [newDocument, setNewDocument] = useState<{ name: string; description: string; file: File | null; tags: string[] }>({
    name: "",
    description: "",
    file: null,
    tags: [],
  })
  const [newTask, setNewTask] = useState<Omit<TeamTask, "id">>({
    title: "",
    description: "",
    assigned_to: "",
    due_date: new Date().toISOString(),
    status: "pending",
    priority: "medium",
    dependencies: [],
    blockers: [],
    estimated_hours: 0,
    actual_hours: 0,
    progress: 0,
    comments: []
  })
  const [expandedMember, setExpandedMember] = useState<string | null>(null)
  const [selectedTask, setSelectedTask] = useState<TeamTask | null>(null)
  const [selectedDocument, setSelectedDocument] = useState<TeamDocument | null>(null)
  const [newTaskComment, setNewTaskComment] = useState("")
  const [newDocumentComment, setNewDocumentComment] = useState("")
  const [newDocumentCommentReply, setNewDocumentCommentReply] = useState("")
  const [replyingToComment, setReplyingToComment] = useState<string | null>(null)
  const [memberAvailability, setMemberAvailability] = useState<TeamMember["availability"]>({
    status: "available",
    until: undefined,
    message: undefined
  })
  const [workflowThreadId, setWorkflowThreadId] = useState<string | null>(null)
  const [workflowTasks, setWorkflowTasks] = useState<WorkflowTask[]>([])
  const [workflowMessages, setWorkflowMessages] = useState<WorkflowMessage[]>([])
  const [isWorkflowSyncing, setIsWorkflowSyncing] = useState(false)

  function buildNoStoreInit(input?: RequestInit): RequestInit {
    return {
      credentials: "include",
      cache: "no-store",
      ...input,
      headers: {
        "content-type": "application/json",
        "cache-control": "no-cache",
        pragma: "no-cache",
        ...(input?.headers || {}),
      },
    }
  }

  useEffect(() => {
    async function syncWorkflow() {
      if (!eventId) return
      setIsWorkflowSyncing(true)
      try {
        const threadResponse = await fetch("/api/workflows/threads", buildNoStoreInit({
          method: "POST",
          body: JSON.stringify({ scope_type: "event", scope_id: eventId, title: "Event workflow" }),
        }))

        if (!threadResponse.ok) return
        const threadPayload = await threadResponse.json()
        const threadId = threadPayload?.thread?.id
        if (!threadId) return
        setWorkflowThreadId(threadId)

        const [tasksResponse, messagesResponse] = await Promise.all([
          fetch(`/api/workflows/threads/${encodeURIComponent(threadId)}/tasks`, buildNoStoreInit()),
          fetch(`/api/workflows/threads/${encodeURIComponent(threadId)}/messages`, buildNoStoreInit()),
        ])

        if (tasksResponse.ok) {
          const tasksPayload = await tasksResponse.json()
          setWorkflowTasks(tasksPayload?.tasks || [])
        }
        if (messagesResponse.ok) {
          const messagesPayload = await messagesResponse.json()
          setWorkflowMessages(messagesPayload?.messages || [])
        }
      } catch (error) {
        console.warn("[team collaboration] workflow sync skipped", error)
      } finally {
        setIsWorkflowSyncing(false)
      }
    }

    syncWorkflow()
  }, [eventId])

  const workflowTaskSummary = useMemo(() => {
    const total = workflowTasks.length
    const blocked = workflowTasks.filter((task) => task.status === "blocked").length
    const done = workflowTasks.filter((task) => task.status === "done").length
    return { total, blocked, done }
  }, [workflowTasks])

  const handleAddMember = async () => {
    try {
      await onAddMember(newMember)
      setIsMemberModalOpen(false)
      setNewMember({
        user_id: "",
        name: "",
        role: "",
        permissions: [],
        tasks: [],
        last_active: new Date().toISOString(),
        availability: { status: "available" },
        working_hours: { start: "09:00", end: "17:00", timezone: Intl.DateTimeFormat().resolvedOptions().timeZone },
        skills: []
      })
      toast({
        title: "Success",
        description: "Team member added successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add team member",
        variant: "destructive",
      })
    }
  }

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return
    try {
      await onSendMessage(newMessage, messageAttachments)
      if (workflowThreadId) {
        await fetch(`/api/workflows/threads/${encodeURIComponent(workflowThreadId)}/messages`, buildNoStoreInit({
          method: "POST",
          body: JSON.stringify({ body: newMessage }),
        }))
      }
      setNewMessage("")
      setMessageAttachments([])
      toast({
        title: "Success",
        description: "Message sent successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      })
    }
  }

  const handleUploadDocument = async () => {
    if (!newDocument.file) return
    try {
      await onUploadDocument({
        name: newDocument.name,
        description: newDocument.description,
        file: newDocument.file,
        tags: newDocument.tags,
      })
      setIsDocumentModalOpen(false)
      setNewDocument({
        name: "",
        description: "",
        file: null,
        tags: [],
      })
      toast({
        title: "Success",
        description: "Document uploaded successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to upload document",
        variant: "destructive",
      })
    }
  }

  const handleAddTask = async () => {
    try {
      await onAddTask(newTask)
      if (workflowThreadId) {
        await fetch(`/api/workflows/threads/${encodeURIComponent(workflowThreadId)}/tasks`, buildNoStoreInit({
          method: "POST",
          body: JSON.stringify({
            title: newTask.title,
            description: newTask.description,
            assignee_id: newTask.assigned_to || undefined,
            due_at: newTask.due_date || undefined,
            priority: newTask.priority,
            status: "todo",
            dependency_task_ids: newTask.dependencies || [],
          }),
        }))
      }
      setIsTaskModalOpen(false)
      setNewTask({
        title: "",
        description: "",
        assigned_to: "",
        due_date: new Date().toISOString(),
        status: "pending",
        priority: "medium",
        dependencies: [],
        blockers: [],
        estimated_hours: 0,
        actual_hours: 0,
        progress: 0,
        comments: []
      })
      toast({
        title: "Success",
        description: "Task added successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add task",
        variant: "destructive",
      })
    }
  }

  const handleUpdateTaskStatus = async (taskId: string, status: TeamTask["status"]) => {
    try {
      await onUpdateTaskStatus(taskId, status)
      toast({
        title: "Success",
        description: "Task status updated successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update task status",
        variant: "destructive",
      })
    }
  }

  const handleAddReaction = async (messageId: string, emoji: string) => {
    try {
      await onAddReaction(messageId, emoji)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add reaction",
        variant: "destructive",
      })
    }
  }

  const handleAddTaskComment = async (taskId: string) => {
    if (!newTaskComment.trim()) return
    try {
      await onAddTaskComment(taskId, newTaskComment)
      setNewTaskComment("")
      toast({
        title: "Success",
        description: "Comment added successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add comment",
        variant: "destructive",
      })
    }
  }

  const handleAddDocumentComment = async (documentId: string) => {
    if (!newDocumentComment.trim()) return
    try {
      await onAddDocumentComment(documentId, newDocumentComment)
      setNewDocumentComment("")
      toast({
        title: "Success",
        description: "Comment added successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add comment",
        variant: "destructive",
      })
    }
  }

  const handleAddDocumentCommentReply = async (documentId: string, commentId: string) => {
    if (!newDocumentCommentReply.trim()) return
    try {
      await onAddDocumentCommentReply(documentId, commentId, newDocumentCommentReply)
      setNewDocumentCommentReply("")
      setReplyingToComment(null)
      toast({
        title: "Success",
        description: "Reply added successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add reply",
        variant: "destructive",
      })
    }
  }

  const handleUpdateAvailability = async (memberId: string) => {
    try {
      await onUpdateMemberAvailability(memberId, memberAvailability)
      toast({
        title: "Success",
        description: "Availability updated successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update availability",
        variant: "destructive",
      })
    }
  }

  const handleUpdateTaskProgress = async (taskId: string, progress: number) => {
    try {
      await onUpdateTaskProgress(taskId, progress)
      toast({
        title: "Success",
        description: "Task progress updated successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update task progress",
        variant: "destructive",
      })
    }
  }

  const handleUpdateTaskHours = async (taskId: string, hours: number) => {
    try {
      await onUpdateTaskHours(taskId, hours)
      toast({
        title: "Success",
        description: "Task hours updated successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update task hours",
        variant: "destructive",
      })
    }
  }

  const handleAddTaskDependency = async (taskId: string, dependencyId: string) => {
    try {
      await onAddTaskDependency(taskId, dependencyId)
      toast({
        title: "Success",
        description: "Task dependency added successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add task dependency",
        variant: "destructive",
      })
    }
  }

  const handleRemoveTaskDependency = async (taskId: string, dependencyId: string) => {
    try {
      await onRemoveTaskDependency(taskId, dependencyId)
      toast({
        title: "Success",
        description: "Task dependency removed successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to remove task dependency",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="members" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="members">Team Members</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="messages">Messages</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="members">
          <Card className="bg-slate-900 border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-slate-300">Team Members</CardTitle>
              <Dialog open={isMemberModalOpen} onOpenChange={setIsMemberModalOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-purple-600 hover:bg-purple-700">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Member
                  </Button>
                </DialogTrigger>
                <DialogContent className={detailSurfacePattern.dialogContent}>
                  <div className={detailSurfacePattern.topAccent} />
                  <DialogHeader>
                    <DialogTitle className={detailSurfacePattern.title}>Add Team Member</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name" className={detailSurfacePattern.label}>Name</Label>
                      <Input
                        id="name"
                        value={newMember.name}
                        onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                        className={detailSurfacePattern.input}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="role" className={detailSurfacePattern.label}>Role</Label>
                      <Select
                        value={newMember.role}
                        onValueChange={(value) => setNewMember({ ...newMember, role: value })}
                      >
                        <SelectTrigger className={detailSurfacePattern.selectTrigger}>
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-white/10">
                          <SelectItem value="manager" className="text-white">Manager</SelectItem>
                          <SelectItem value="staff" className="text-white">Staff</SelectItem>
                          <SelectItem value="volunteer" className="text-white">Volunteer</SelectItem>
                          <SelectItem value="vendor" className="text-white">Vendor</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="permissions" className={detailSurfacePattern.label}>Permissions</Label>
                      <Select
                        value={newMember.permissions[0]}
                        onValueChange={(value) => setNewMember({ ...newMember, permissions: [value] })}
                      >
                        <SelectTrigger className={detailSurfacePattern.selectTrigger}>
                          <SelectValue placeholder="Select permissions" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-white/10">
                          <SelectItem value="admin" className="text-white">Admin</SelectItem>
                          <SelectItem value="editor" className="text-white">Editor</SelectItem>
                          <SelectItem value="viewer" className="text-white">Viewer</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button onClick={handleAddMember} className={cn("w-full", detailSurfacePattern.btnPrimary)}>
                      Add Member
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {teamMembers.map((member) => (
                  <Collapsible
                    key={member.id}
                    open={expandedMember === member.id}
                    onOpenChange={(isOpen) => setExpandedMember(isOpen ? member.id : null)}
                    className="bg-slate-800 rounded-lg"
                  >
                    <div className="flex items-center justify-between p-4">
                      <div className="flex items-center space-x-4">
                        <Avatar>
                          <AvatarImage src={member.avatar_url} />
                          <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium text-white">{member.name}</div>
                          <div className="text-sm text-slate-400">{member.role}</div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          member.status === "active" ? "bg-green-500/20 text-green-500" :
                          member.status === "pending" ? "bg-yellow-500/20 text-yellow-500" :
                          "bg-red-500/20 text-red-500"
                        }`}>
                          {member.status}
                        </span>
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="sm">
                            {expandedMember === member.id ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>
                        </CollapsibleTrigger>
                      </div>
                    </div>
                    <CollapsibleContent>
                      <div className="p-4 border-t border-slate-700">
                        <div className="space-y-4">
                          <div>
                            <h4 className="text-sm font-medium text-slate-300 mb-2">Tasks</h4>
                            <div className="space-y-2">
                              {member.tasks.map((task) => (
                                <div key={task.id} className="flex items-center justify-between p-2 bg-slate-900 rounded">
                                  <div className="space-y-1">
                                    <div className="text-sm text-white">{task.title}</div>
                                    <div className="text-xs text-slate-400">{formatDate(task.due_date)}</div>
                                  </div>
                                  <Badge
                                    variant={
                                      task.status === "completed" ? "default" :
                                      task.status === "in_progress" ? "outline" :
                                      task.status === "overdue" ? "destructive" :
                                      "secondary"
                                    }
                                  >
                                    {task.status}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-slate-300 mb-2">Permissions</h4>
                            <div className="flex flex-wrap gap-2">
                              {member.permissions.map((permission) => (
                                <Badge key={permission} variant="outline" className="border-slate-700">
                                  {permission}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-slate-300 mb-2">Availability</h4>
                            <div className="space-y-2">
                              <Select
                                value={memberAvailability.status}
                                onValueChange={(value) => setMemberAvailability({ ...memberAvailability, status: value as any })}
                              >
                                <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-800 border-slate-700">
                                  <SelectItem value="available" className="text-white">Available</SelectItem>
                                  <SelectItem value="busy" className="text-white">Busy</SelectItem>
                                  <SelectItem value="away" className="text-white">Away</SelectItem>
                                  <SelectItem value="offline" className="text-white">Offline</SelectItem>
                                </SelectContent>
                              </Select>
                              {memberAvailability.status !== "available" && (
                                <div className="space-y-2">
                                  <Input
                                    type="datetime-local"
                                    value={memberAvailability.until}
                                    onChange={(e) => setMemberAvailability({ ...memberAvailability, until: e.target.value })}
                                    className="bg-slate-800 border-slate-700 text-white"
                                  />
                                  <Input
                                    placeholder="Status message"
                                    value={memberAvailability.message}
                                    onChange={(e) => setMemberAvailability({ ...memberAvailability, message: e.target.value })}
                                    className="bg-slate-800 border-slate-700 text-white"
                                  />
                                </div>
                              )}
                              <Button
                                onClick={() => handleUpdateAvailability(member.id)}
                                className="w-full bg-purple-600 hover:bg-purple-700"
                              >
                                Update Availability
                              </Button>
                            </div>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-slate-300 mb-2">Working Hours</h4>
                            <div className="text-sm text-slate-400">
                              {member.working_hours.start} - {member.working_hours.end} ({member.working_hours.timezone})
                            </div>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-slate-300 mb-2">Skills</h4>
                            <div className="flex flex-wrap gap-2">
                              {member.skills.map((skill) => (
                                <Badge key={skill} variant="outline" className="border-slate-700">
                                  {skill}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          <div className="text-sm text-slate-400">
                            Last active: {formatDate(member.last_active)}
                          </div>
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tasks">
          <Card className="bg-slate-900 border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="text-slate-300">Team Tasks</CardTitle>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Badge variant="secondary" className="bg-slate-800 text-slate-200">
                    Workflow thread: {workflowThreadId ? "connected" : "legacy"}
                  </Badge>
                  <Badge variant="secondary" className="bg-slate-800 text-slate-200">
                    {isWorkflowSyncing ? "syncing..." : `${workflowTaskSummary.total} unified tasks`}
                  </Badge>
                  <Badge variant="secondary" className="bg-slate-800 text-slate-200">
                    {workflowTaskSummary.blocked} blocked
                  </Badge>
                </div>
              </div>
              <Dialog open={isTaskModalOpen} onOpenChange={setIsTaskModalOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-purple-600 hover:bg-purple-700">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Task
                  </Button>
                </DialogTrigger>
                <DialogContent className={detailSurfacePattern.dialogContent}>
                  <div className={detailSurfacePattern.topAccent} />
                  <DialogHeader>
                    <DialogTitle className={detailSurfacePattern.title}>Add New Task</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="title" className={detailSurfacePattern.label}>Task Title</Label>
                      <Input
                        id="title"
                        value={newTask.title}
                        onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                        className={detailSurfacePattern.input}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description" className={detailSurfacePattern.label}>Description</Label>
                      <Textarea
                        id="description"
                        value={newTask.description}
                        onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                        className={detailSurfacePattern.textarea}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="assigned_to" className={detailSurfacePattern.label}>Assign To</Label>
                      <Select
                        value={newTask.assigned_to}
                        onValueChange={(value) => setNewTask({ ...newTask, assigned_to: value })}
                      >
                        <SelectTrigger className={detailSurfacePattern.selectTrigger}>
                          <SelectValue placeholder="Select team member" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-white/10">
                          {teamMembers.map((member) => (
                            <SelectItem key={member.id} value={member.id} className="text-white">
                              {member.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="due_date" className={detailSurfacePattern.label}>Due Date</Label>
                      <Input
                        id="due_date"
                        type="date"
                        value={newTask.due_date.split("T")[0]}
                        onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                        className={detailSurfacePattern.input}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="priority" className={detailSurfacePattern.label}>Priority</Label>
                      <Select
                        value={newTask.priority}
                        onValueChange={(value) => setNewTask({ ...newTask, priority: value as any })}
                      >
                        <SelectTrigger className={detailSurfacePattern.selectTrigger}>
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-white/10">
                          <SelectItem value="low" className="text-white">Low</SelectItem>
                          <SelectItem value="medium" className="text-white">Medium</SelectItem>
                          <SelectItem value="high" className="text-white">High</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button onClick={handleAddTask} className={cn("w-full", detailSurfacePattern.btnPrimary)}>
                      Add Task
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {teamMembers.map((member) => (
                  <div key={member.id} className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={member.avatar_url} />
                        <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="font-medium text-white">{member.name}</div>
                    </div>
                    <div className="space-y-2">
                      {member.tasks.map((task) => (
                        <div key={task.id} className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
                          <div className="space-y-1">
                            <div className="font-medium text-white">{task.title}</div>
                            <div className="text-sm text-slate-400">{task.description}</div>
                            <div className="flex items-center space-x-2">
                              <Badge
                                variant={
                                  task.priority === "high" ? "destructive" :
                                  task.priority === "medium" ? "default" :
                                  "secondary"
                                }
                              >
                                {task.priority}
                              </Badge>
                              <div className="text-xs text-slate-400">
                                Due: {formatDate(task.due_date)}
                              </div>
                            </div>
                          </div>
                          <Select
                            value={task.status}
                            onValueChange={(value) => handleUpdateTaskStatus(task.id, value as any)}
                          >
                            <SelectTrigger className="w-[150px] bg-slate-700 border-slate-600 text-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-800 border-slate-700">
                              <SelectItem value="pending" className="text-white">Pending</SelectItem>
                              <SelectItem value="in_progress" className="text-white">In Progress</SelectItem>
                              <SelectItem value="completed" className="text-white">Completed</SelectItem>
                              <SelectItem value="overdue" className="text-white">Overdue</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="messages">
          <Card className="bg-slate-900 border-slate-700">
            <CardHeader>
              <div className="space-y-1">
                <CardTitle className="text-slate-300">Team Messages</CardTitle>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Badge variant="secondary" className="bg-slate-800 text-slate-200">
                    Workflow feed: {workflowThreadId ? "enabled" : "disabled"}
                  </Badge>
                  {workflowMessages.length > 0 ? (
                    <Badge variant="secondary" className="bg-slate-800 text-slate-200">
                      {workflowMessages.length} unified messages
                    </Badge>
                  ) : null}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="h-[400px] overflow-y-auto space-y-4">
                  {messages.map((message) => (
                    <div key={message.id} className="flex items-start space-x-4">
                      <Avatar>
                        <AvatarImage src={message.avatar_url} />
                        <AvatarFallback>{message.sender_name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <div className="font-medium text-white">{message.sender_name}</div>
                          <div className="text-sm text-slate-400">{formatDate(message.created_at)}</div>
                        </div>
                        <div className="text-slate-300">{message.content}</div>
                        {message.attachments && message.attachments.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {message.attachments.map((attachment, index) => (
                              <div
                                key={index}
                                className="flex items-center space-x-2 p-2 bg-slate-800 rounded"
                              >
                                <FileText className="h-4 w-4 text-slate-400" />
                                <a
                                  href={attachment.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm text-slate-300 hover:underline"
                                >
                                  {attachment.name}
                                </a>
                              </div>
                            ))}
                          </div>
                        )}
                        {message.reactions && message.reactions.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {message.reactions.map((reaction, index) => (
                              <Button
                                key={index}
                                variant="outline"
                                size="sm"
                                className="h-6 px-2 border-slate-700"
                                onClick={() => handleAddReaction(message.id, reaction.emoji)}
                              >
                                <span className="mr-1">{reaction.emoji}</span>
                                <span className="text-xs">{reaction.count}</span>
                              </Button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex space-x-2">
                  <div className="flex-1 space-y-2">
                    <Textarea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type your message..."
                      className="bg-slate-800 border-slate-700 text-white"
                    />
                    <div className="flex items-center space-x-2">
                      <Input
                        type="file"
                        multiple
                        onChange={(e) => setMessageAttachments(Array.from(e.target.files || []))}
                        className="bg-slate-800 border-slate-700 text-white"
                      />
                      <Button onClick={handleSendMessage} className="bg-purple-600 hover:bg-purple-700">
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents">
          <Card className="bg-slate-900 border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-slate-300">Team Documents</CardTitle>
              <Dialog open={isDocumentModalOpen} onOpenChange={setIsDocumentModalOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-purple-600 hover:bg-purple-700">
                    <Plus className="mr-2 h-4 w-4" />
                    Upload Document
                  </Button>
                </DialogTrigger>
                <DialogContent className={detailSurfacePattern.dialogContent}>
                  <div className={detailSurfacePattern.topAccent} />
                  <DialogHeader>
                    <DialogTitle className={detailSurfacePattern.title}>Upload Document</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name" className={detailSurfacePattern.label}>Document Name</Label>
                      <Input
                        id="name"
                        value={newDocument.name}
                        onChange={(e) => setNewDocument({ ...newDocument, name: e.target.value })}
                        className={detailSurfacePattern.input}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description" className={detailSurfacePattern.label}>Description</Label>
                      <Textarea
                        id="description"
                        value={newDocument.description}
                        onChange={(e) => setNewDocument({ ...newDocument, description: e.target.value })}
                        className={detailSurfacePattern.textarea}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="file" className={detailSurfacePattern.label}>File</Label>
                      <Input
                        id="file"
                        type="file"
                        onChange={(e) => setNewDocument({ ...newDocument, file: e.target.files?.[0] || null })}
                        className={detailSurfacePattern.input}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tags" className={detailSurfacePattern.label}>Tags</Label>
                      <Input
                        id="tags"
                        value={newDocument.tags.join(", ")}
                        onChange={(e) => setNewDocument({ ...newDocument, tags: e.target.value.split(",").map(tag => tag.trim()) })}
                        placeholder="Enter tags separated by commas"
                        className={detailSurfacePattern.input}
                      />
                    </div>
                    <Button onClick={handleUploadDocument} className={cn("w-full", detailSurfacePattern.btnPrimary)}>
                      Upload Document
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {documents.map((document) => (
                  <div key={document.id} className="flex items-center justify-between p-4 bg-slate-800 rounded-lg">
                    <div className="flex items-center space-x-4">
                      <FileText className="h-6 w-6 text-slate-400" />
                      <div>
                        <div className="font-medium text-white">{document.name}</div>
                        <div className="text-sm text-slate-400">{document.description}</div>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {document.tags.map((tag, index) => (
                            <Badge key={index} variant="outline" className="border-slate-700">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-sm text-slate-400">
                        <div>v{document.version}</div>
                        <div>Last modified by {document.last_modified_by_name}</div>
                        <div>{formatDate(document.last_modified)}</div>
                      </div>
                      <Button variant="outline" size="sm" className="border-slate-700">
                        Download
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
} 