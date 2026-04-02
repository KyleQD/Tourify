import { NextRequest, NextResponse } from 'next/server'
import { authenticateApiRequest, checkAdminPermissions } from '@/lib/auth/api-auth'
import { formatSafeDate } from '@/lib/events/admin-event-normalization'

// Helper function to get color based on priority and type
function getEventColor(type: string, priority: string = 'medium'): string {
  const priorityColors = {
    low: 'gray',
    medium: 'blue',
    high: 'orange',
    urgent: 'red'
  }
  
  const typeColors = {
    event: 'green',
    tour: 'purple',
    task: 'orange',
    meeting: 'blue',
    deadline: 'red',
    booking: 'yellow',
    payment: 'emerald',
    logistics: 'indigo'
  }
  
  // For urgent items, always use red regardless of type
  if (priority === 'urgent') return 'red'
  
  // For high priority, use orange/red variants
  if (priority === 'high') {
    if (type === 'deadline') return 'red'
    if (type === 'task') return 'orange'
    return 'orange'
  }
  
  // Default to type color for medium/low priority
  return typeColors[type as keyof typeof typeColors] || 'blue'
}

export async function GET(request: NextRequest) {
  try {
    
    const authResult = await authenticateApiRequest(request)
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { user, supabase } = authResult

    // Check admin permissions
    const hasAdminAccess = await checkAdminPermissions(user)
    if (!hasAdminAccess) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const eventType = searchParams.get('type') // tour, event, task, meeting, deadline, booking, payment, logistics
    const status = searchParams.get('status') // upcoming, ongoing, completed, cancelled
    const priority = searchParams.get('priority') // low, medium, high, urgent

    // Calculate date range if not provided
    const defaultStartDate = startDate || new Date().toISOString().split('T')[0]
    const defaultEndDate = endDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    const calendarEvents: any[] = []

    // 1. Fetch Events from events_v2
    try {
      let eventsQuery = supabase
        .from('events_v2')
        .select(`
          id,
          title,
          start_at,
          end_at,
          status,
          capacity,
          created_at,
          created_by,
          venue_id
        `)
        .gte('start_at', defaultStartDate)
        .lte('end_at', defaultEndDate)

      if (status) eventsQuery = eventsQuery.eq('status', status)

      const { data: events, error: eventsError } = await eventsQuery

      if (eventsError) {
        console.error('[Admin Calendar API] Events query error:', eventsError)
      } else {
        events?.forEach((event: any) => {
          const startTime = event.start_at ? new Date(event.start_at) : new Date()
          const endTime = event.end_at ? new Date(event.end_at) : new Date(startTime.getTime() + 2 * 60 * 60000)
          const priority = 'medium'
          const color = getEventColor('event', priority)

          calendarEvents.push({
            id: `event-${event.id}`,
            title: event.title,
            type: 'event',
            start: startTime,
            end: endTime,
            color,
            description: null,
            location: event.venue_id || null,
            status: event.status || 'upcoming',
            priority,
            attendees: [],
            capacity: event.capacity,
            originalData: event
          })
        })
      }
    } catch (error) {
      console.error('[Admin Calendar API] Events fetch error:', error)
    }

    // 2. Fetch Tours (optional; skip if table missing)
    try {
      let toursQuery = supabase
        .from('tours')
        .select(`id, name as title, description, start_date, end_date, status, budget, expenses, revenue, created_at, created_by`)
        .gte('start_date', defaultStartDate)
        .lte('end_date', defaultEndDate)

      if (status) toursQuery = toursQuery.eq('status', status)

      const { data: tours, error: toursError } = await toursQuery

      if (toursError) {
        console.error('[Admin Calendar API] Tours query error:', toursError)
      } else {
        tours?.forEach((tour: any) => {
          const priority = tour.budget && tour.budget > 100000 ? 'high' : 'medium'
          const color = getEventColor('tour', priority)

          calendarEvents.push({
            id: `tour-${tour.id}`,
            title: tour.title,
            type: 'tour',
            start: new Date(tour.start_date),
            end: new Date(tour.end_date),
            color,
            description: tour.description,
            status: tour.status || 'upcoming',
            priority,
            originalData: tour
          })
        })
      }
    } catch (error) {
      console.warn('[Admin Calendar API] Tours table missing or error, skipping')
    }

    // 3. Fetch Tasks (from tasks table; due_at)
    try {
      let tasksQuery = supabase
        .from('tasks')
        .select(`id, title, description, status, priority, due_at, created_at, created_by`)
        .gte('due_at', defaultStartDate)
        .lte('due_at', defaultEndDate)

      if (status) tasksQuery = tasksQuery.eq('status', status)
      if (priority) tasksQuery = tasksQuery.eq('priority', priority)

      const { data: tasks, error: tasksError } = await tasksQuery

      if (tasksError) {
        console.error('[Admin Calendar API] Tasks query error:', tasksError)
      } else {
        tasks?.forEach((task: any) => {
          const color = getEventColor('task', task.priority)

          calendarEvents.push({
            id: `task-${task.id}`,
            title: task.title,
            type: 'task',
            start: new Date(task.due_at),
            end: new Date(task.due_at),
            color,
            description: task.description,
            status: task.status || 'upcoming',
            priority: task.priority || 'medium',
            originalData: task
          })
        })
      }
    } catch (error) {
      console.error('[Admin Calendar API] Tasks fetch error:', error)
    }

    // 4. Fetch Logistics (from staff_shifts)
    try {
      let logisticsQuery = supabase
        .from('staff_shifts')
        .select(`id, venue_id, event_id, staff_member_id, shift_date, start_time, end_time, role_assignment, status, notes, created_at`)
        .gte('shift_date', defaultStartDate)
        .lte('shift_date', defaultEndDate)

      if (status) logisticsQuery = logisticsQuery.eq('status', status)

      const { data: logistics, error: logisticsError } = await logisticsQuery

      if (logisticsError) {
        console.error('[Admin Calendar API] Logistics query error:', logisticsError)
      } else {
        logistics?.forEach((logistic: any) => {
          const color = getEventColor('logistics', 'medium')
          const start = new Date(`${logistic.shift_date}T${logistic.start_time || '09:00:00'}`)
          const end = new Date(`${logistic.shift_date}T${logistic.end_time || '17:00:00'}`)

          calendarEvents.push({
            id: `logistic-${logistic.id}`,
            title: `${logistic.role_assignment || 'Shift'}`,
            type: 'logistics',
            start,
            end,
            color,
            description: logistic.notes,
            status: logistic.status || 'scheduled',
            priority: 'medium',
            originalData: logistic
          })
        })
      }
    } catch (error) {
      console.warn('[Admin Calendar API] staff_shifts missing or error, skipping')
    }

    // Sort events by start date
    calendarEvents.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())

    return NextResponse.json({
      success: true,
      events: calendarEvents,
      total: calendarEvents.length,
      filters: {
        startDate: defaultStartDate,
        endDate: defaultEndDate,
        eventType,
        status,
        priority
      },
      summary: {
        events: calendarEvents.filter(e => e.type === 'event').length,
        tours: calendarEvents.filter(e => e.type === 'tour').length,
        tasks: calendarEvents.filter(e => e.type === 'task').length,
        logistics: calendarEvents.filter(e => e.type === 'logistics').length
      }
    })

  } catch (error) {
    console.error('[Admin Calendar API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('[Admin Calendar API] POST request started')
    
    const authResult = await authenticateApiRequest(request)
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { user, supabase } = authResult

    // Check admin permissions
    const hasAdminAccess = await checkAdminPermissions(user)
    if (!hasAdminAccess) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const { 
      title, 
      type, 
      start, 
      end, 
      description, 
      location, 
      priority,
      event_id,
      attendees = [],
      reminders = [],
      sendNotifications = false,
      enableReminders = false
    } = body

    // Validate required fields
    if (!title || !type || !start) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Resolve org_id from user's profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('current_entity_id')
      .eq('user_id', user.id)
      .maybeSingle()

    const orgId = profile?.current_entity_id ?? null

    let insertData: any = {
      created_by: user.id
    }

    let tableName = 'events_v2'
    
    switch (type) {
      case 'event': {
        const slugBase = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'event'
        const slug = `${slugBase}-${Date.now().toString(36)}`
        tableName = 'events_v2'
        insertData = {
          ...insertData,
          org_id: orgId,
          title,
          slug,
          start_at: new Date(start).toISOString(),
          end_at: new Date(end || new Date(new Date(start).getTime() + 2 * 60 * 60 * 1000)).toISOString(),
          status: 'inquiry',
          settings: { description: description || '', venue_label: location || '' }
        }
        break
      }
      case 'tour':
        tableName = 'tours'
        insertData = {
          ...insertData,
          org_id: orgId,
          name: title,
          slug: `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 48)}-${Date.now().toString(36)}`,
          description,
          start_date: new Date(start).toISOString().split('T')[0],
          end_date: new Date(end || start).toISOString().split('T')[0],
          status: 'planning'
        }
        break
      case 'task':
        if (!event_id) {
          return NextResponse.json({ error: 'event_id is required when creating a task' }, { status: 400 })
        }
        tableName = 'tasks'
        insertData = {
          ...insertData,
          org_id: orgId,
          event_id,
          title,
          description,
          due_at: new Date(start).toISOString(),
          status: 'todo',
          priority: priority || 'medium'
        }
        break
      case 'logistics':
        tableName = 'staff_shifts'
        insertData = {
          ...insertData,
          role_assignment: title,
          shift_date: new Date(start).toISOString().split('T')[0],
          start_time: new Date(start).toTimeString().split(' ')[0],
          end_time: new Date(end || start).toTimeString().split(' ')[0],
          status: 'scheduled',
          notes: description
        }
        break
      default:
        return NextResponse.json({ error: 'Invalid event type. Supported: event, tour, task, logistics' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from(tableName)
      .insert(insertData)
      .select()
      .single()

    if (error) {
      console.error('[Admin Calendar API] Insert error:', error)
      return NextResponse.json({ error: 'Failed to create event' }, { status: 500 })
    }

    // Handle team member notifications if enabled
    if (sendNotifications && attendees.length > 0) {
      try {
        // Create notifications for team members
        const notificationPromises = attendees.map(async (attendeeId: string) => {
          // In a real app, you would fetch the attendee's email from the database
          // For now, we'll use mock data
          const attendeeEmails = {
            '1': 'alex@tourify.com',
            '2': 'sarah@tourify.com', 
            '3': 'michael@tourify.com',
            '4': 'emily@tourify.com'
          }
          
          const attendeeEmail = attendeeEmails[attendeeId as keyof typeof attendeeEmails]
          
          if (attendeeEmail) {
            await supabase
              .from('notifications')
              .insert({
                user_id: attendeeId,
                type: 'event_invitation',
                title: `New Event: ${title}`,
                content: `You have been invited to "${title}" on ${formatSafeDate(start)} at ${new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(new Date(start))}`,
                metadata: {
                  eventId: data.id,
                  eventType: type,
                  location,
                  description
                }
              })
          }
        })
        
        await Promise.all(notificationPromises)
      } catch (notificationError) {
        console.error('[Admin Calendar API] Failed to send notifications:', notificationError)
        // Don't fail the entire request if notifications fail
      }
    }

    // Handle reminders if enabled
    if (enableReminders && reminders.length > 0) {
      try {
        // Create reminder records
        const reminderPromises = reminders.map(async (reminderTime: string) => {
          let reminderDate: Date
          
          // Calculate reminder time based on the reminder type
          switch (reminderTime) {
            case '5min':
              reminderDate = new Date(new Date(start).getTime() - 5 * 60 * 1000)
              break
            case '15min':
              reminderDate = new Date(new Date(start).getTime() - 15 * 60 * 1000)
              break
            case '30min':
              reminderDate = new Date(new Date(start).getTime() - 30 * 60 * 1000)
              break
            case '1hour':
              reminderDate = new Date(new Date(start).getTime() - 60 * 60 * 1000)
              break
            case '1day':
              reminderDate = new Date(new Date(start).getTime() - 24 * 60 * 60 * 1000)
              break
            case '1week':
              reminderDate = new Date(new Date(start).getTime() - 7 * 24 * 60 * 60 * 1000)
              break
            default:
              reminderDate = new Date(new Date(start).getTime() - 15 * 60 * 1000) // Default to 15 min
          }
          
          // Create reminder record
          await supabase
            .from('notifications')
            .insert({
              user_id: user.id,
              type: 'event_reminder',
              title: `Reminder: ${title}`,
              content: `Your event "${title}" is starting soon!`,
              metadata: {
                eventId: data.id,
                eventType: type,
                reminderTime,
                scheduledFor: reminderDate.toISOString()
              }
            })
        })
        
        await Promise.all(reminderPromises)
      } catch (reminderError) {
        console.error('[Admin Calendar API] Failed to create reminders:', reminderError)
        // Don't fail the entire request if reminders fail
      }
    }

    const color = getEventColor(type, priority)

    return NextResponse.json({
      success: true,
      event: {
        id: `${type}-${data.id}`,
        title,
        type,
        start: new Date(start),
        end: new Date(end || start),
        color,
        description,
        location,
        priority,
        status: 'upcoming',
        attendees,
        reminders: enableReminders ? reminders : [],
        originalData: data
      }
    })

  } catch (error) {
    console.error('[Admin Calendar API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 