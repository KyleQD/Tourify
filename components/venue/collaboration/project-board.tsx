"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd"
import { Plus, MoreHorizontal, CheckCircle2, Clock, AlertCircle } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useToast } from "@/hooks/use-toast"
import { motion, AnimatePresence } from "framer-motion"
import type { Event, EventTask } from "./project-card"

interface EventBoardProps {
  event: Event
  onTaskUpdate: (taskId: string, updates: Partial<EventTask>) => void
  onTaskCreate: (task: Omit<EventTask, "id">) => void
  onTaskDelete: (taskId: string) => void
}

export function EventBoard({ event, onTaskUpdate, onTaskCreate, onTaskDelete }: EventBoardProps) {
  const { toast } = useToast()
  const [tasks, setTasks] = useState<EventTask[]>([])
  const [newTaskTitle, setNewTaskTitle] = useState("")
  const [newTaskStatus, setNewTaskStatus] = useState<EventTask["status"]>("todo")

  // Initialize tasks from event
  useEffect(() => {
    setTasks(event.tasks)
  }, [event.tasks])

  // Handle drag and drop
  const handleDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result

    // If dropped outside a droppable area
    if (!destination) return

    // If dropped in the same place
    if (destination.droppableId === source.droppableId && destination.index === source.index) return

    // Find the task
    const task = tasks.find((t) => t.id === draggableId)
    if (!task) return

    // Create a new array without the dragged task
    const newTasks = tasks.filter((t) => t.id !== draggableId)

    // Create an updated task with the new status
    const updatedTask = {
      ...task,
      status: destination.droppableId as EventTask["status"],
    }

    // Insert the task at the new position
    newTasks.splice(destination.index, 0, updatedTask)

    // Update state
    setTasks(newTasks)

    // Call the update callback
    onTaskUpdate(draggableId, { status: destination.droppableId as EventTask["status"] })

    toast({
      title: "Task updated",
      description: `"${task.title}" moved to ${destination.droppableId.replace("-", " ")}`,
    })
  }

  // Create a new task
  const handleCreateTask = () => {
    if (!newTaskTitle.trim()) return

    const newTask = {
      title: newTaskTitle,
      status: newTaskStatus,
      assigneeId: event.organizer.id, // Default to event organizer
    }

    onTaskCreate(newTask)
    setNewTaskTitle("")
  }

  // Delete a task
  const handleDeleteTask = (taskId: string) => {
    onTaskDelete(taskId)

    toast({
      title: "Task deleted",
      description: "The task has been removed from the event",
    })
  }

  // Get member by ID
  const getMemberById = (id: string) => {
    if (event.organizer.id === id) return event.organizer
    return event.performers.find((m) => m.id === id)
  }

  // Get tasks by status
  const getTasksByStatus = (status: EventTask["status"]) => {
    return tasks.filter((task) => task.status === status)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Event Tasks</h2>
        <div className="flex space-x-2">
          <Input
            placeholder="New task title..."
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            className="bg-gray-800 border-gray-700 text-white"
          />
          <select
            value={newTaskStatus}
            onChange={(e) => setNewTaskStatus(e.target.value as EventTask["status"])}
            className="bg-gray-800 border-gray-700 text-white rounded-md px-3"
          >
            <option value="todo">To Do</option>
            <option value="in-progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>
          <Button
            onClick={handleCreateTask}
            disabled={!newTaskTitle.trim()}
            className="bg-purple-600 hover:bg-purple-700"
          >
            <Plus className="h-4 w-4 mr-2" /> Add Task
          </Button>
        </div>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* To Do Column */}
          <div>
            <Card className="bg-gray-900 text-white border-gray-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-md flex items-center">
                  <AlertCircle className="h-4 w-4 mr-2 text-gray-400" />
                  To Do ({getTasksByStatus("todo").length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Droppable droppableId="todo">
                  {(provided) => (
                    <div {...provided.droppableProps} ref={provided.innerRef} className="min-h-[200px]">
                      <AnimatePresence>
                        {getTasksByStatus("todo").map((task, index) => (
                          <Draggable key={task.id} draggableId={task.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={`p-3 mb-2 rounded-md ${snapshot.isDragging ? "bg-gray-700" : "bg-gray-800"}`}
                              >
                                <div className="flex justify-between items-start">
                                  <h3 className="font-medium">{task.title}</h3>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-6 w-6">
                                        <MoreHorizontal className="h-3 w-3" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent className="bg-gray-900 border-gray-700 text-white">
                                      <DropdownMenuItem
                                        onClick={() => handleDeleteTask(task.id)}
                                        className="text-red-500 cursor-pointer"
                                      >
                                        Delete Task
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>

                                {task.assigneeId && (
                                  <div className="mt-2 flex items-center">
                                    {getMemberById(task.assigneeId) ? (
                                      <Avatar className="h-6 w-6">
                                        <AvatarImage
                                          src={getMemberById(task.assigneeId)?.avatar || "/placeholder.svg"}
                                          alt={getMemberById(task.assigneeId)?.name}
                                        />
                                        <AvatarFallback>
                                          {getMemberById(task.assigneeId)?.name.charAt(0)}
                                        </AvatarFallback>
                                      </Avatar>
                                    ) : (
                                      <div className="h-6 w-6 rounded-full bg-gray-700"></div>
                                    )}
                                    <span className="ml-2 text-xs text-gray-400">
                                      {getMemberById(task.assigneeId)?.name || "Unassigned"}
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}
                          </Draggable>
                        ))}
                      </AnimatePresence>
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </CardContent>
            </Card>
          </div>

          {/* In Progress Column */}
          <div>
            <Card className="bg-gray-900 text-white border-gray-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-md flex items-center">
                  <Clock className="h-4 w-4 mr-2 text-blue-400" />
                  In Progress ({getTasksByStatus("in-progress").length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Droppable droppableId="in-progress">
                  {(provided) => (
                    <div {...provided.droppableProps} ref={provided.innerRef} className="min-h-[200px]">
                      <AnimatePresence>
                        {getTasksByStatus("in-progress").map((task, index) => (
                          <Draggable key={task.id} draggableId={task.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={`p-3 mb-2 rounded-md ${snapshot.isDragging ? "bg-gray-700" : "bg-gray-800"}`}
                              >
                                <div className="flex justify-between items-start">
                                  <h3 className="font-medium">{task.title}</h3>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-6 w-6">
                                        <MoreHorizontal className="h-3 w-3" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent className="bg-gray-900 border-gray-700 text-white">
                                      <DropdownMenuItem
                                        onClick={() => handleDeleteTask(task.id)}
                                        className="text-red-500 cursor-pointer"
                                      >
                                        Delete Task
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>

                                {task.assigneeId && (
                                  <div className="mt-2 flex items-center">
                                    {getMemberById(task.assigneeId) ? (
                                      <Avatar className="h-6 w-6">
                                        <AvatarImage
                                          src={getMemberById(task.assigneeId)?.avatar || "/placeholder.svg"}
                                          alt={getMemberById(task.assigneeId)?.name}
                                        />
                                        <AvatarFallback>
                                          {getMemberById(task.assigneeId)?.name.charAt(0)}
                                        </AvatarFallback>
                                      </Avatar>
                                    ) : (
                                      <div className="h-6 w-6 rounded-full bg-gray-700"></div>
                                    )}
                                    <span className="ml-2 text-xs text-gray-400">
                                      {getMemberById(task.assigneeId)?.name || "Unassigned"}
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}
                          </Draggable>
                        ))}
                      </AnimatePresence>
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </CardContent>
            </Card>
          </div>

          {/* Completed Column */}
          <div>
            <Card className="bg-gray-900 text-white border-gray-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-md flex items-center">
                  <CheckCircle2 className="h-4 w-4 mr-2 text-green-400" />
                  Completed ({getTasksByStatus("completed").length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Droppable droppableId="completed">
                  {(provided) => (
                    <div {...provided.droppableProps} ref={provided.innerRef} className="min-h-[200px]">
                      <AnimatePresence>
                        {getTasksByStatus("completed").map((task, index) => (
                          <Draggable key={task.id} draggableId={task.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={`p-3 mb-2 rounded-md ${snapshot.isDragging ? "bg-gray-700" : "bg-gray-800"}`}
                              >
                                <div className="flex justify-between items-start">
                                  <h3 className="font-medium">{task.title}</h3>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-6 w-6">
                                        <MoreHorizontal className="h-3 w-3" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent className="bg-gray-900 border-gray-700 text-white">
                                      <DropdownMenuItem
                                        onClick={() => handleDeleteTask(task.id)}
                                        className="text-red-500 cursor-pointer"
                                      >
                                        Delete Task
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>

                                {task.assigneeId && (
                                  <div className="mt-2 flex items-center">
                                    {getMemberById(task.assigneeId) ? (
                                      <Avatar className="h-6 w-6">
                                        <AvatarImage
                                          src={getMemberById(task.assigneeId)?.avatar || "/placeholder.svg"}
                                          alt={getMemberById(task.assigneeId)?.name}
                                        />
                                        <AvatarFallback>
                                          {getMemberById(task.assigneeId)?.name.charAt(0)}
                                        </AvatarFallback>
                                      </Avatar>
                                    ) : (
                                      <div className="h-6 w-6 rounded-full bg-gray-700"></div>
                                    )}
                                    <span className="ml-2 text-xs text-gray-400">
                                      {getMemberById(task.assigneeId)?.name || "Unassigned"}
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}
                          </Draggable>
                        ))}
                      </AnimatePresence>
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </CardContent>
            </Card>
          </div>
        </div>
      </DragDropContext>
    </div>
  )
}
