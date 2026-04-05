import { apiRequest } from "@/lib/api/client"

export interface NotificationItem {
  id: string
  title: string
  content: string
  type: string
  created_at: string
  read_at?: string | null
}

export async function getNotifications() {
  const payload = await apiRequest<{ notifications: NotificationItem[] }>("/api/notifications?limit=25")
  return payload.notifications || []
}

export function markAllNotificationsAsRead() {
  return apiRequest<{ notifications: NotificationItem[] }>("/api/notifications", {
    method: "PATCH",
    body: JSON.stringify({ action: "markAllAsRead" })
  })
}
