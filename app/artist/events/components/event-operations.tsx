"use client"

import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Users, Settings, ClipboardList, AlertTriangle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { formatSafeDate } from "@/lib/events/admin-event-normalization"

export interface StaffMember {
  id: string
  name: string
  role: string
  status: 'confirmed' | 'pending' | 'declined'
  contact: string
}

export interface Task {
  id: string
  title: string
  assigned_to: string
  due_date: string
  status: 'pending' | 'in_progress' | 'completed'
  priority: 'low' | 'medium' | 'high'
}

export interface Equipment {
  id: string
  name: string
  quantity: number
  status: 'available' | 'in_use' | 'maintenance'
}

interface EventOperationsProps {
  staff: StaffMember[]
  tasks: Task[]
  equipment: Equipment[]
  onAddStaff: () => void
  onAddTask: () => void
  onAddEquipment: () => void
}

export function EventOperations({ staff, tasks, equipment, onAddStaff, onAddTask, onAddEquipment }: EventOperationsProps) {
  const confirmedStaff = staff.filter(s => s.status === 'confirmed').length
  const staffProgress = Math.round((confirmedStaff / staff.length) * 100)
  
  const completedTasks = tasks.filter(t => t.status === 'completed').length
  const tasksProgress = Math.round((completedTasks / tasks.length) * 100)
  
  const availableEquipment = equipment.filter(e => e.status === 'available').length
  const equipmentProgress = Math.round((availableEquipment / equipment.length) * 100)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-slate-900/60 border-slate-700/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-slate-100 text-sm">Staff Management</CardTitle>
            <Button size="sm" variant="ghost" onClick={onAddStaff}>
              <Plus className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{confirmedStaff}/{staff.length}</div>
            <div className="text-xs text-slate-400">Staff Confirmed</div>
            <Progress value={staffProgress} className="h-2 mt-2 bg-slate-800" />
            <div className="mt-4 space-y-2">
              {staff.slice(0, 3).map(member => (
                <div key={member.id} className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-white">{member.name}</div>
                    <div className="text-xs text-slate-400">{member.role}</div>
                  </div>
                  <Badge variant={member.status === 'confirmed' ? 'default' : 'secondary'}>
                    {member.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/60 border-slate-700/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-slate-100 text-sm">Tasks</CardTitle>
            <Button size="sm" variant="ghost" onClick={onAddTask}>
              <Plus className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{completedTasks}/{tasks.length}</div>
            <div className="text-xs text-slate-400">Tasks Completed</div>
            <Progress value={tasksProgress} className="h-2 mt-2 bg-slate-800" />
            <div className="mt-4 space-y-2">
              {tasks.slice(0, 3).map(task => (
                <div key={task.id} className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-white">{task.title}</div>
                    <div className="text-xs text-slate-400">Due: {formatSafeDate(task.due_date)}</div>
                  </div>
                  <Badge variant={
                    task.priority === 'high' ? 'destructive' :
                    task.priority === 'medium' ? 'default' : 'secondary'
                  }>
                    {task.priority}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/60 border-slate-700/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-slate-100 text-sm">Equipment</CardTitle>
            <Button size="sm" variant="ghost" onClick={onAddEquipment}>
              <Plus className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{availableEquipment}/{equipment.length}</div>
            <div className="text-xs text-slate-400">Equipment Available</div>
            <Progress value={equipmentProgress} className="h-2 mt-2 bg-slate-800" />
            <div className="mt-4 space-y-2">
              {equipment.slice(0, 3).map(item => (
                <div key={item.id} className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-white">{item.name}</div>
                    <div className="text-xs text-slate-400">Qty: {item.quantity}</div>
                  </div>
                  <Badge variant={
                    item.status === 'available' ? 'default' :
                    item.status === 'in_use' ? 'secondary' : 'destructive'
                  }>
                    {item.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-slate-900/60 border-slate-700/50">
          <CardHeader>
            <CardTitle className="text-slate-100 text-lg">Recent Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {tasks.map(task => (
                <div key={task.id} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                  <div>
                    <div className="text-sm font-medium text-white">{task.title}</div>
                    <div className="text-xs text-slate-400">
                      Assigned to: {task.assigned_to} &middot; Due: {formatSafeDate(task.due_date)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={
                      task.status === 'completed' ? 'default' :
                      task.status === 'in_progress' ? 'secondary' : 'destructive'
                    }>
                      {task.status}
                    </Badge>
                    <Badge variant={
                      task.priority === 'high' ? 'destructive' :
                      task.priority === 'medium' ? 'default' : 'secondary'
                    }>
                      {task.priority}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/60 border-slate-700/50">
          <CardHeader>
            <CardTitle className="text-slate-100 text-lg">Equipment Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {equipment.map(item => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                  <div>
                    <div className="text-sm font-medium text-white">{item.name}</div>
                    <div className="text-xs text-slate-400">Quantity: {item.quantity}</div>
                  </div>
                  <Badge variant={
                    item.status === 'available' ? 'default' :
                    item.status === 'in_use' ? 'secondary' : 'destructive'
                  }>
                    {item.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 