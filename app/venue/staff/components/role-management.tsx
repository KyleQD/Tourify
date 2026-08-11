"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import { detailSurfacePattern } from "@/components/dashboard/detail-surface-pattern"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import {
  Shield,
  Plus,
  Edit,
  Trash2,
  Users,
  Settings,
  Eye,
  Lock,
  Unlock,
  Crown,
  UserCheck,
  AlertTriangle,
  CheckCircle,
  Star,
  Award,
  Building2
} from "lucide-react"

interface Role {
  id: string
  name: string
  description: string
  department: string
  level: 'entry' | 'mid' | 'senior' | 'manager' | 'director'
  permissions: {
    [key: string]: boolean
  }
  responsibilities: string[]
  requirements: string[]
  assignedCount: number
  color: string
  isActive: boolean
  salaryRange: {
    min: number
    max: number
  }
  reports_to?: string
}

interface StaffMember {
  id: string
  name: string
  email: string
  avatar?: string
  currentRole: string
  department: string
  hireDate: string
  performance: number
  status: 'active' | 'inactive' | 'on_leave'
}

const PERMISSION_CATEGORIES = {
  'Staff Management': [
    'view_staff',
    'manage_staff',
    'hire_staff',
    'terminate_staff',
    'view_payroll',
    'manage_payroll'
  ],
  'Event Management': [
    'view_events',
    'create_events',
    'edit_events',
    'cancel_events',
    'manage_bookings'
  ],
  'Venue Operations': [
    'access_venue',
    'manage_equipment',
    'view_analytics',
    'manage_settings',
    'emergency_access'
  ],
  'Communications': [
    'send_messages',
    'broadcast_messages',
    'view_reports',
    'manage_notifications'
  ],
  'Financial': [
    'view_finances',
    'manage_finances',
    'process_payments',
    'view_reports'
  ]
}

export default function RoleManagement() {
  const { toast } = useToast()
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)
  const [showCreateRole, setShowCreateRole] = useState(false)
  const [showAssignRole, setShowAssignRole] = useState(false)
  const [selectedStaff, setSelectedStaff] = useState<string[]>([])

  // Mock data for roles
  const [roles, setRoles] = useState<Role[]>([
    {
      id: "role-1",
      name: "Venue Manager",
      description: "Overall venue operations and staff management",
      department: "Management",
      level: "manager",
      permissions: {
        view_staff: true,
        manage_staff: true,
        hire_staff: true,
        terminate_staff: true,
        view_events: true,
        create_events: true,
        edit_events: true,
        manage_equipment: true,
        view_analytics: true,
        manage_settings: true,
        send_messages: true,
        broadcast_messages: true,
        view_finances: true,
        manage_finances: true
      },
      responsibilities: [
        "Oversee daily venue operations",
        "Manage staff schedules and performance",
        "Handle client relationships",
        "Ensure safety and compliance"
      ],
      requirements: [
        "5+ years management experience",
        "Strong leadership skills",
        "Event management knowledge"
      ],
      assignedCount: 2,
      color: "from-purple-500 to-pink-500",
      isActive: true,
      salaryRange: { min: 80000, max: 120000 },
      reports_to: "owner"
    },
    {
      id: "role-2",
      name: "Technical Lead",
      description: "Lead technical operations and equipment management",
      department: "Technical",
      level: "senior",
      permissions: {
        view_staff: true,
        manage_staff: false,
        view_events: true,
        edit_events: true,
        manage_equipment: true,
        view_analytics: true,
        send_messages: true,
        emergency_access: true
      },
      responsibilities: [
        "Oversee sound and lighting systems",
        "Train technical staff",
        "Equipment maintenance",
        "Technical troubleshooting"
      ],
      requirements: [
        "Advanced technical certification",
        "3+ years experience",
        "Team leadership skills"
      ],
      assignedCount: 1,
      color: "from-blue-500 to-cyan-500",
      isActive: true,
      salaryRange: { min: 65000, max: 90000 },
      reports_to: "role-1"
    },
    {
      id: "role-3",
      name: "Security Supervisor",
      description: "Manage security operations and staff",
      department: "Security",
      level: "senior",
      permissions: {
        view_staff: true,
        view_events: true,
        manage_equipment: true,
        send_messages: true,
        emergency_access: true,
        access_venue: true
      },
      responsibilities: [
        "Supervise security team",
        "Develop security protocols",
        "Handle incidents",
        "Coordinate with law enforcement"
      ],
      requirements: [
        "Security certification",
        "Emergency response training",
        "Leadership experience"
      ],
      assignedCount: 1,
      color: "from-red-500 to-orange-500",
      isActive: true,
      salaryRange: { min: 55000, max: 75000 },
      reports_to: "role-1"
    },
    {
      id: "role-4",
      name: "Sound Engineer",
      description: "Audio system operation and maintenance",
      department: "Technical",
      level: "mid",
      permissions: {
        view_events: true,
        manage_equipment: true,
        send_messages: true,
        access_venue: true
      },
      responsibilities: [
        "Operate sound systems",
        "Audio mixing and recording",
        "Equipment setup",
        "Quality assurance"
      ],
      requirements: [
        "Audio engineering degree/certification",
        "Pro Tools proficiency",
        "Live sound experience"
      ],
      assignedCount: 3,
      color: "from-green-500 to-teal-500",
      isActive: true,
      salaryRange: { min: 45000, max: 65000 },
      reports_to: "role-2"
    }
  ])

  // Mock data for staff members
  const [staffMembers] = useState<StaffMember[]>([
    {
      id: "staff-1",
      name: "Alex Chen",
      email: "alex.chen@venue.com",
      currentRole: "role-1",
      department: "Management",
      hireDate: "2023-01-15",
      performance: 98,
      status: "active"
    },
    {
      id: "staff-2",
      name: "Maya Rodriguez",
      email: "maya.rodriguez@venue.com",
      currentRole: "role-2",
      department: "Technical",
      hireDate: "2023-03-10",
      performance: 95,
      status: "active"
    },
    {
      id: "staff-3",
      name: "Jordan Kim",
      email: "jordan.kim@venue.com",
      currentRole: "role-4",
      department: "Technical",
      hireDate: "2023-06-01",
      performance: 92,
      status: "active"
    }
  ])

  const [newRole, setNewRole] = useState<Partial<Role>>({
    name: "",
    description: "",
    department: "",
    level: "entry",
    permissions: {},
    responsibilities: [""],
    requirements: [""],
    color: "from-gray-500 to-gray-600",
    isActive: true,
    salaryRange: { min: 0, max: 0 }
  })

  const getRoleLevelColor = (level: string) => {
    switch (level) {
      case 'director': return 'text-purple-400'
      case 'manager': return 'text-blue-400'
      case 'senior': return 'text-green-400'
      case 'mid': return 'text-yellow-400'
      case 'entry': return 'text-gray-400'
      default: return 'text-gray-400'
    }
  }

  const getRoleLevelIcon = (level: string) => {
    switch (level) {
      case 'director': return Crown
      case 'manager': return Star
      case 'senior': return Award
      case 'mid': return UserCheck
      case 'entry': return Users
      default: return Users
    }
  }

  const handleCreateRole = () => {
    const role: Role = {
      ...newRole as Role,
      id: `role-${Date.now()}`,
      assignedCount: 0
    }
    
    setRoles(prev => [...prev, role])
    setShowCreateRole(false)
    setNewRole({
      name: "",
      description: "",
      department: "",
      level: "entry",
      permissions: {},
      responsibilities: [""],
      requirements: [""],
      color: "from-gray-500 to-gray-600",
      isActive: true,
      salaryRange: { min: 0, max: 0 }
    })
    
    toast({
      title: "Role Created",
      description: `Role "${role.name}" has been created successfully`,
    })
  }

  const handleAssignRole = (roleId: string, staffIds: string[]) => {
    // Update staff roles
    toast({
      title: "Roles Assigned",
      description: `Successfully assigned role to ${staffIds.length} staff member(s)`,
    })
    setShowAssignRole(false)
    setSelectedStaff([])
  }

  const handleToggleRoleStatus = (roleId: string) => {
    setRoles(prev => prev.map(role => 
      role.id === roleId ? { ...role, isActive: !role.isActive } : role
    ))
    
    const role = roles.find(r => r.id === roleId)
    toast({
      title: role?.isActive ? "Role Deactivated" : "Role Activated",
      description: `Role "${role?.name}" has been ${role?.isActive ? 'deactivated' : 'activated'}`,
    })
  }

  const getPermissionCount = (permissions: Record<string, boolean>) => {
    return Object.values(permissions).filter(Boolean).length
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Role Management
          </h1>
          <p className="text-slate-400 mt-1">Manage roles, permissions, and staff assignments</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button 
            variant="outline" 
            onClick={() => setShowAssignRole(true)}
            className={detailSurfacePattern.input}
          >
            <UserCheck className="h-4 w-4 mr-2" />
            Assign Roles
          </Button>
          <Button onClick={() => setShowCreateRole(true)} className="bg-gradient-to-r from-purple-500 to-pink-600">
            <Plus className="h-4 w-4 mr-2" />
            Create Role
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { 
            label: "Total Roles", 
            value: roles.length, 
            icon: Shield, 
            color: "from-purple-500 to-pink-500" 
          },
          { 
            label: "Active Roles", 
            value: roles.filter(r => r.isActive).length, 
            icon: CheckCircle, 
            color: "from-green-500 to-emerald-500" 
          },
          { 
            label: "Assigned Staff", 
            value: roles.reduce((sum, r) => sum + r.assignedCount, 0), 
            icon: Users, 
            color: "from-blue-500 to-cyan-500" 
          },
          { 
            label: "Departments", 
            value: new Set(roles.map(r => r.department)).size, 
            icon: Building2, 
            color: "from-orange-500 to-red-500" 
          }
        ].map((stat, i) => (
          <Card key={i} className={detailSurfacePattern.panel}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wider">{stat.label}</p>
                  <p className="text-2xl font-bold text-white">{stat.value}</p>
                </div>
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-r ${stat.color} flex items-center justify-center`}>
                  <stat.icon className="h-5 w-5 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Roles Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {roles.map((role) => {
          const LevelIcon = getRoleLevelIcon(role.level)
          
          return (
            <Card key={role.id} className={cn(detailSurfacePattern.panel, "transition-all hover:bg-white/[0.06]")}>
              <CardContent className="p-6">
                {/* Role Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className={`w-12 h-12 rounded-lg bg-gradient-to-r ${role.color} flex items-center justify-center`}>
                      <LevelIcon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-white font-semibold">{role.name}</h3>
                      <p className="text-slate-400 text-sm">{role.department}</p>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge variant="outline" className={`text-xs ${getRoleLevelColor(role.level)} border-current`}>
                          {role.level}
                        </Badge>
                        <Badge variant="outline" className={cn("text-xs", detailSurfacePattern.badgeOutline)}>
                          {role.assignedCount} assigned
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={role.isActive}
                      onCheckedChange={() => handleToggleRoleStatus(role.id)}
                    />
                    {role.isActive ? (
                      <CheckCircle className="h-4 w-4 text-green-400" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-yellow-400" />
                    )}
                  </div>
                </div>

                {/* Role Description */}
                <p className="text-slate-300 text-sm mb-4 line-clamp-2">
                  {role.description}
                </p>

                {/* Permissions Summary */}
                <div className="mb-4">
                  <div className="text-xs text-slate-400 mb-2">Permissions</div>
                  <div className="flex items-center space-x-2">
                    <div className="flex-1 bg-slate-700 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ 
                          width: `${(getPermissionCount(role.permissions) / Object.keys(PERMISSION_CATEGORIES).reduce((sum, cat) => sum + (PERMISSION_CATEGORIES[cat as keyof typeof PERMISSION_CATEGORIES]?.length || 0), 0)) * 100}%` 
                        }}
                      ></div>
                    </div>
                    <span className="text-xs text-blue-400 font-medium">
                      {getPermissionCount(role.permissions)} permissions
                    </span>
                  </div>
                </div>

                {/* Salary Range */}
                <div className="mb-4">
                  <div className="text-xs text-slate-400 mb-1">Salary Range</div>
                  <div className="text-green-400 font-semibold text-sm">
                    ${role.salaryRange.min.toLocaleString()} - ${role.salaryRange.max.toLocaleString()}
                  </div>
                </div>

                {/* Responsibilities Preview */}
                <div className="mb-4">
                  <div className="text-xs text-slate-400 mb-2">Key Responsibilities</div>
                  <div className="space-y-1">
                    {role.responsibilities.slice(0, 2).map((resp, i) => (
                      <div key={i} className="text-xs text-slate-300 flex items-start space-x-2">
                        <div className="w-1 h-1 bg-blue-400 rounded-full mt-1.5 flex-shrink-0"></div>
                        <span className="line-clamp-1">{resp}</span>
                      </div>
                    ))}
                    {role.responsibilities.length > 2 && (
                      <div className="text-xs text-slate-400">+{role.responsibilities.length - 2} more</div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-between">
                  <div className="flex space-x-2">
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0 hover:bg-slate-700/50">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0 hover:bg-slate-700/50">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0 hover:bg-slate-700/50 text-red-400">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <Button 
                    size="sm" 
                    onClick={() => setSelectedRole(role)}
                    className={detailSurfacePattern.btnPrimary}
                  >
                    <Settings className="h-4 w-4 mr-1" />
                    Configure
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Create Role Dialog */}
      <Dialog open={showCreateRole} onOpenChange={setShowCreateRole}>
        <DialogContent className={cn("max-w-4xl max-h-[90vh] overflow-y-auto", detailSurfacePattern.dialogContent)}>
          <div className={detailSurfacePattern.topAccent} />
          <DialogHeader>
            <DialogTitle className={detailSurfacePattern.title}>Create New Role</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="role-name" className={detailSurfacePattern.label}>Role Name</Label>
                <Input
                  id="role-name"
                  value={newRole.name}
                  onChange={(e) => setNewRole({ ...newRole, name: e.target.value })}
                  className={detailSurfacePattern.input}
                />
              </div>
              <div>
                <Label htmlFor="department" className={detailSurfacePattern.label}>Department</Label>
                <Select value={newRole.department} onValueChange={(value) => setNewRole({ ...newRole, department: value })}>
                  <SelectTrigger className={detailSurfacePattern.selectTrigger}>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-white/10">
                    <SelectItem value="Management">Management</SelectItem>
                    <SelectItem value="Technical">Technical</SelectItem>
                    <SelectItem value="Security">Security</SelectItem>
                    <SelectItem value="Service">Service</SelectItem>
                    <SelectItem value="Operations">Operations</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="description" className={detailSurfacePattern.label}>Description</Label>
              <Input
                id="description"
                value={newRole.description}
                onChange={(e) => setNewRole({ ...newRole, description: e.target.value })}
                className={detailSurfacePattern.input}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="level" className={detailSurfacePattern.label}>Level</Label>
                <Select value={newRole.level} onValueChange={(value) => setNewRole({ ...newRole, level: value as any })}>
                  <SelectTrigger className={detailSurfacePattern.selectTrigger}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-white/10">
                    <SelectItem value="entry">Entry Level</SelectItem>
                    <SelectItem value="mid">Mid Level</SelectItem>
                    <SelectItem value="senior">Senior Level</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="director">Director</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="min-salary" className={detailSurfacePattern.label}>Min Salary</Label>
                <Input
                  id="min-salary"
                  type="number"
                  value={newRole.salaryRange?.min || ''}
                  onChange={(e) => setNewRole({ 
                    ...newRole, 
                    salaryRange: { ...newRole.salaryRange!, min: parseInt(e.target.value) || 0 }
                  })}
                  className={detailSurfacePattern.input}
                />
              </div>
              <div>
                <Label htmlFor="max-salary" className={detailSurfacePattern.label}>Max Salary</Label>
                <Input
                  id="max-salary"
                  type="number"
                  value={newRole.salaryRange?.max || ''}
                  onChange={(e) => setNewRole({ 
                    ...newRole, 
                    salaryRange: { ...newRole.salaryRange!, max: parseInt(e.target.value) || 0 }
                  })}
                  className={detailSurfacePattern.input}
                />
              </div>
            </div>

            {/* Permissions */}
            <div>
              <Label className={cn("text-base font-semibold", detailSurfacePattern.label)}>Permissions</Label>
              <div className="mt-3 space-y-4">
                {Object.entries(PERMISSION_CATEGORIES).map(([category, permissions]) => (
                  <div key={category}>
                    <div className={cn("mb-2 text-sm font-medium", detailSurfacePattern.label)}>{category}</div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {permissions.map((permission) => (
                        <div key={permission} className="flex items-center space-x-2">
                          <Checkbox
                            id={permission}
                            checked={newRole.permissions?.[permission] || false}
                            onCheckedChange={(checked) => setNewRole({
                              ...newRole,
                              permissions: {
                                ...newRole.permissions,
                                [permission]: checked as boolean
                              }
                            })}
                          />
                          <Label 
                            htmlFor={permission} 
                            className={cn("cursor-pointer text-sm capitalize", detailSurfacePattern.label)}
                          >
                            {permission.replace('_', ' ')}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <Button variant="outline" onClick={() => setShowCreateRole(false)} className={detailSurfacePattern.btnOutline}>
                Cancel
              </Button>
              <Button onClick={handleCreateRole} className={detailSurfacePattern.btnPrimary}>
                Create Role
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Assign Role Dialog */}
      <Dialog open={showAssignRole} onOpenChange={setShowAssignRole}>
        <DialogContent className={cn("max-w-2xl", detailSurfacePattern.dialogContent)}>
          <div className={detailSurfacePattern.topAccent} />
          <DialogHeader>
            <DialogTitle className={detailSurfacePattern.title}>Assign Roles to Staff</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div>
              <Label className={detailSurfacePattern.label}>Select Role</Label>
              <Select>
                <SelectTrigger className={detailSurfacePattern.selectTrigger}>
                  <SelectValue placeholder="Choose a role to assign" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-white/10">
                  {roles.filter(r => r.isActive).map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.name} - {role.department}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className={detailSurfacePattern.label}>Select Staff Members</Label>
              <div className="mt-2 space-y-2 max-h-60 overflow-y-auto">
                {staffMembers.map((staff) => (
                  <div key={staff.id} className={cn("flex items-center space-x-3", detailSurfacePattern.listRow)}>
                    <Checkbox
                      checked={selectedStaff.includes(staff.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedStaff([...selectedStaff, staff.id])
                        } else {
                          setSelectedStaff(selectedStaff.filter(id => id !== staff.id))
                        }
                      }}
                    />
                    <Avatar className={cn("h-8 w-8", detailSurfacePattern.avatarRing)}>
                      <AvatarImage src={staff.avatar} />
                      <AvatarFallback className={cn(detailSurfacePattern.avatarFallback, "text-xs")}>
                        {staff.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className={cn("font-medium", detailSurfacePattern.title)}>{staff.name}</div>
                      <div className={detailSurfacePattern.subtleText}>
                        Current: {roles.find(r => r.id === staff.currentRole)?.name} - {staff.department}
                      </div>
                    </div>
                    <Badge variant="outline" className={cn("text-xs", detailSurfacePattern.badgeOutline)}>
                      {staff.performance}% performance
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <Button variant="outline" onClick={() => setShowAssignRole(false)} className={detailSurfacePattern.btnOutline}>
                Cancel
              </Button>
              <Button 
                onClick={() => handleAssignRole("", selectedStaff)}
                disabled={selectedStaff.length === 0}
                className={detailSurfacePattern.btnPrimary}
              >
                Assign Role ({selectedStaff.length} selected)
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
} 