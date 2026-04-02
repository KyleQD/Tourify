import type {
  AdminDashboardStats,
  AdminTour,
  AdminEvent,
  AdminTask,
  AdminNotification,
} from '@/types/admin'

const BASE_FETCH_OPTIONS: RequestInit = {
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
}

async function fetchApi<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...BASE_FETCH_OPTIONS, ...options })
  if (!response.ok) throw new Error(`API error: ${response.status}`)
  return response.json()
}

export async function fetchDashboardStats(venueId?: string): Promise<{ stats: AdminDashboardStats }> {
  const params = venueId ? `?venue_id=${venueId}` : ''
  return fetchApi(`/api/admin/dashboard/stats${params}`)
}

export async function fetchTours(): Promise<{ tours: AdminTour[] }> {
  return fetchApi('/api/admin/tours')
}

export async function fetchEvents(): Promise<{ events: AdminEvent[] }> {
  return fetchApi('/api/admin/events')
}

export async function fetchTasks(): Promise<AdminTask[]> {
  const data = await fetchApi<{ tasks?: AdminTask[] }>('/api/admin/tasks')
  return data.tasks || []
}

export async function fetchNotifications(): Promise<AdminNotification[]> {
  const data = await fetchApi<{ notifications?: AdminNotification[] }>('/api/admin/notifications')
  return data.notifications || []
}

export async function updateTask(
  taskId: string,
  updates: Partial<AdminTask>
): Promise<AdminTask> {
  return fetchApi(`/api/admin/tasks/${taskId}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  })
}
