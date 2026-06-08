"use client"

// Enhanced WebSocket hook with more realistic functionality
import { useEffect, useState, useCallback } from "react"
import { useAuth } from "@/context/auth"
import { useToast } from "@/hooks/use-toast"
import { getSocketInstance, SOCKET_EVENTS } from "./socket-service"
import { useSocial } from "@/contexts/social-context"

export function useSocket() {
  const [isConnected, setIsConnected] = useState(false)
  const [lastMessage, setLastMessage] = useState<any>(null)
  const [lastNotification, setLastNotification] = useState<any>(null)
  const [onlineUsers, setOnlineUsers] = useState<string[]>([])
  const [typingUsers, setTypingUsers] = useState<Record<string, boolean>>({})
  const { user } = useAuth()
  const { toast } = useToast()
  const { updateUserStatus } = useSocial()

  // Get socket instance
  const socket = getSocketInstance()

  // Connect to WebSocket
  const connect = useCallback(async () => {
    if (!user) return

    try {
      await socket.connect(user.id)
      setIsConnected(true)

      // Get initial online users
      setOnlineUsers(socket.getOnlineUsers())

      toast({
        title: "Connected",
        description: "Real-time updates are now enabled",
      })

      return () => {
        socket.disconnect()
        setIsConnected(false)
      }
    } catch (error) {
      console.error("Error connecting to WebSocket:", error)
      toast({
        title: "Connection Error",
        description: "Failed to connect to real-time service",
        variant: "destructive",
      })
    }
  }, [user, toast])

  // Handle connection events
  useEffect(() => {
    if (!user) {
      setIsConnected(false)
      return
    }

    const handleConnect = () => {
      setIsConnected(true)
    }

    const handleDisconnect = () => {
      setIsConnected(false)
    }

    const handleMessage = (event: any) => {
      setLastMessage(event.data)
    }

    const handleNotification = (event: any) => {
      setLastNotification(event.data)

      toast({
        title: event.data.title || "New Notification",
        description: event.data.message || "",
      })
    }

    const handleUserStatus = (event: any) => {
      if (event.data.onlineUsers) {
        setOnlineUsers(event.data.onlineUsers)
      } else if (event.data.userId && event.data.status) {
        const { userId, status } = event.data
        updateUserStatus(userId, status === "online" ? "online" : "offline")

        if (status === "online") {
          setOnlineUsers((prev) => [...prev, userId])
        } else {
          setOnlineUsers((prev) => prev.filter((id) => id !== userId))
        }
      }
    }

    const handleTyping = (event: any) => {
      const { conversationId, userId, isTyping } = event.data

      setTypingUsers((prev) => ({
        ...prev,
        [userId]: isTyping,
      }))

      // Auto-clear typing indicator after 3 seconds
      if (isTyping) {
        setTimeout(() => {
          setTypingUsers((prev) => ({
            ...prev,
            [userId]: false,
          }))
        }, 3000)
      }
    }

    // Add event listeners
    socket.addEventListener(SOCKET_EVENTS.CONNECT, handleConnect)
    socket.addEventListener(SOCKET_EVENTS.DISCONNECT, handleDisconnect)
    socket.addEventListener(SOCKET_EVENTS.MESSAGE, handleMessage)
    socket.addEventListener(SOCKET_EVENTS.NOTIFICATION, handleNotification)
    socket.addEventListener(SOCKET_EVENTS.USER_STATUS, handleUserStatus)
    socket.addEventListener(SOCKET_EVENTS.TYPING, handleTyping)

    // Connect to WebSocket
    const cleanupPromise = connect()

    // Clean up event listeners
    return () => {
      socket.removeEventListener(SOCKET_EVENTS.CONNECT, handleConnect)
      socket.removeEventListener(SOCKET_EVENTS.DISCONNECT, handleDisconnect)
      socket.removeEventListener(SOCKET_EVENTS.MESSAGE, handleMessage)
      socket.removeEventListener(SOCKET_EVENTS.NOTIFICATION, handleNotification)
      socket.removeEventListener(SOCKET_EVENTS.USER_STATUS, handleUserStatus)
      socket.removeEventListener(SOCKET_EVENTS.TYPING, handleTyping)

      if (cleanupPromise) {
        cleanupPromise.then(cleanup => {
          if (cleanup) {
            cleanup()
          }
        })
      }
    }
  }, [user, connect, toast, updateUserStatus])

  // Send message through WebSocket
  const sendMessage = useCallback(
    (data: any) => {
      if (!isConnected) {
        console.error("WebSocket not connected")
        return false
      }

      try {
        socket.send(
          JSON.stringify({
            type: "message",
            data,
          }),
        )
        return true
      } catch (error) {
        console.error("Error sending message:", error)
        return false
      }
    },
    [isConnected],
  )

  // Send typing indicator
  const sendTypingIndicator = useCallback(
    (conversationId: string, isTyping: boolean) => {
      if (!isConnected || !user) {
        return false
      }

      try {
        socket.send(
          JSON.stringify({
            type: "typing",
            data: {
              conversationId,
              userId: user.id,
              isTyping,
            },
          }),
        )
        return true
      } catch (error) {
        console.error("Error sending typing indicator:", error)
        return false
      }
    },
    [isConnected, user],
  )

  // Send read receipt
  const sendReadReceipt = useCallback(
    (messageId: string) => {
      if (!isConnected) {
        return false
      }

      try {
        socket.send(
          JSON.stringify({
            type: "read_receipt",
            data: {
              messageId,
            },
          }),
        )
        return true
      } catch (error) {
        console.error("Error sending read receipt:", error)
        return false
      }
    },
    [isConnected],
  )

  // Simulate receiving a notification (for demo purposes)
  const simulateNotification = useCallback((title: string, message: string) => {
    socket.simulateNotification(title, message)
  }, [])

  // Simulate user status change (for demo purposes)
  const simulateUserStatusChange = useCallback((userId: string, isOnline: boolean) => {
    socket.simulateUserStatusChange(userId, isOnline)
  }, [])

  // Check if a user is typing
  const isUserTyping = useCallback(
    (userId: string) => {
      return typingUsers[userId] || false
    },
    [typingUsers],
  )

  return {
    isConnected,
    lastMessage,
    lastNotification,
    onlineUsers,
    typingUsers,
    sendMessage,
    sendTypingIndicator,
    sendReadReceipt,
    simulateNotification,
    simulateUserStatusChange,
    isUserTyping,
  }
}
