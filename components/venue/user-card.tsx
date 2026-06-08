"use client"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { User } from "@/lib/venue/types"
import { MapPin, UserPlus, MessageCircle, UserCheck, UserX } from "lucide-react"
import { motion } from "framer-motion"
import Link from "next/link"
import { useSocial } from "@/contexts/social-context"
import { useAuth } from "@/contexts/auth-context"

interface UserCardProps {
  user: User
  isConnected?: boolean
  isPending?: boolean
  onConnect?: () => void
  onMessage?: () => void
  onViewProfile?: () => void
}

export function UserCard({
  user,
  isConnected = false,
  isPending = false,
  onConnect,
  onMessage,
  onViewProfile,
}: UserCardProps) {
  const { } = useSocial()
  const { user: currentUser } = useAuth()

  const handleConnect = async () => {
    if (onConnect) {
      onConnect()
    } else {
      // Mock sendConnectionRequest for now
      console.log("Sending connection request to:", user.id)
    }
  }

  const handleMessage = () => {
    if (onMessage) {
      onMessage()
    }
  }

  const isCurrentUser = currentUser?.id === user.id

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ scale: 1.02 }}
    >
      <Card className="overflow-hidden bg-gray-900 text-white border-gray-800">
        <CardContent className="p-4">
          <div className="flex items-center space-x-4">
            <Avatar className="h-12 w-12 border-2 border-purple-500">
              <AvatarImage src={user.avatar} alt={user.fullName} />
              <AvatarFallback>
                {user.fullName
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <div className="flex items-center">
                <h3 className="text-md font-semibold truncate">{user.fullName}</h3>
                {user.isOnline && <span className="ml-2 h-2 w-2 rounded-full bg-green-500" title="Online"></span>}
              </div>

              <p className="text-xs text-gray-400">@{user.username}</p>

              <div className="flex items-center mt-1">
                <Badge variant="secondary" className="text-xs bg-gray-800">
                  {user.title}
                </Badge>

                <div className="ml-2 flex items-center text-xs text-gray-500">
                  <MapPin className="h-3 w-3 mr-1" />
                  {user.location}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-3 flex space-x-2">
            <Link href={`/profile/${user.username}`} className="flex-1">
              <Button
                variant="outline"
                className="w-full text-xs border-gray-700 hover:bg-gray-800"
                onClick={onViewProfile}
              >
                View Profile
              </Button>
            </Link>

            {!isCurrentUser && (
              <>
                {isConnected ? (
                  <Button variant="ghost" size="icon" className="text-green-400" disabled>
                    <UserCheck className="h-4 w-4" />
                  </Button>
                ) : isPending ? (
                  <Button variant="ghost" size="icon" className="text-yellow-400" disabled>
                    <UserX className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button variant="ghost" size="icon" className="text-purple-400" onClick={handleConnect}>
                    <UserPlus className="h-4 w-4" />
                  </Button>
                )}

                <Button variant="ghost" size="icon" className="text-blue-400" onClick={handleMessage}>
                  <MessageCircle className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
