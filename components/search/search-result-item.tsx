"use client"

import { motion } from 'framer-motion'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { 
  User, 
  Music, 
  Building2, 
  Verified,
  ArrowRight,
  MapPin,
  Users
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SearchResult } from '@/hooks/use-enhanced-search'

interface SearchResultItemProps {
  result: SearchResult
  index: number
  isSelected: boolean
  onSelect: (result: SearchResult) => void
}

export function SearchResultItem({ 
  result, 
  index, 
  isSelected, 
  onSelect 
}: SearchResultItemProps) {
  
  const getAccountIcon = (accountType: string) => {
    switch (accountType) {
      case 'artist':
        return <Music className="h-4 w-4 text-purple-500" />
      case 'venue':
        return <Building2 className="h-4 w-4 text-blue-500" />
      case 'organization':
        return <Building2 className="h-4 w-4 text-amber-500" />
      default:
        return <User className="h-4 w-4 text-gray-500" />
    }
  }

  const getAccountTypeLabel = (accountType: string) => {
    switch (accountType) {
      case 'artist':
        return 'Artist'
      case 'venue':
        return 'Venue'
      case 'organization':
        return (result as any).subtype === 'band' ? 'Band' : 'Organization'
      default:
        return 'User'
    }
  }

  const getDisplayName = (result: SearchResult) => {
    if (result.account_type === 'artist') {
      return result.profile_data?.artist_name || result.profile_data?.stage_name || result.username
    }
    if (result.account_type === 'venue') {
      return result.profile_data?.venue_name || result.profile_data?.name || result.username
    }
    if (result.account_type === 'organization') {
      return result.profile_data?.organization_name || (result as any).display_name || result.username
    }
    return result.profile_data?.name || result.profile_data?.full_name || result.username
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2, delay: index * 0.05 }}
      className={cn(
        "cursor-pointer p-3 m-1 rounded-xl transition-all duration-200 border border-transparent group hover:shadow-md",
        isSelected && "bg-purple-50 border-purple-200 shadow-sm ring-2 ring-purple-200/50",
        !isSelected && "hover:bg-muted/50"
      )}
      onClick={() => onSelect(result)}
    >
      <div className="flex items-center gap-3 w-full">
        <div className="relative flex-shrink-0">
          <Avatar className="h-14 w-14 rounded-xl ring-2 ring-transparent group-hover:ring-purple-200 transition-all">
            <AvatarImage 
              src={result.avatar_url} 
              alt={getDisplayName(result)}
              className="object-cover"
            />
            <AvatarFallback className="rounded-xl bg-gradient-to-br from-purple-100 to-pink-100 text-purple-700 font-semibold text-sm">
              {getDisplayName(result).slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          
          {/* Account type indicator */}
          <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-background rounded-full border-2 border-background flex items-center justify-center shadow-sm">
            {getAccountIcon(result.account_type)}
          </div>
        </div>
        
        <div className="flex-1 min-w-0 space-y-1">
          {/* Name and verification */}
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-sm truncate text-foreground group-hover:text-purple-700 transition-colors">
              {getDisplayName(result)}
            </h4>
            {result.verified && (
              <Verified className="h-4 w-4 text-blue-500 fill-current flex-shrink-0" />
            )}
            {(result as any).is_demo && (
              <Badge variant="outline" className="text-xs px-1.5 py-0.5 h-5 bg-orange-50 text-orange-600 border-orange-200">
                Demo
              </Badge>
            )}
          </div>
          
          {/* Username and account type */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">@{result.username}</span>
            <Badge 
              variant="secondary" 
              className={cn(
                "text-xs px-2 py-0.5 h-5 font-medium",
                result.account_type === 'artist' && "bg-purple-100 text-purple-700 border-purple-200",
                result.account_type === 'venue' && "bg-blue-100 text-blue-700 border-blue-200",
                result.account_type === 'organization' && "bg-amber-100 text-amber-700 border-amber-200",
                result.account_type === 'general' && "bg-gray-100 text-gray-700 border-gray-200"
              )}
            >
              {getAccountTypeLabel(result.account_type)}
            </Badge>
          </div>
          
          {/* Bio */}
          {result.bio && (
            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
              {result.bio}
            </p>
          )}
          
          {/* Location and stats */}
          <div className="flex items-center justify-between">
            {result.location && (
              <div className="flex items-center gap-1">
                <MapPin className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground truncate max-w-[120px]">
                  {result.location}
                </span>
              </div>
            )}
            
            {result.stats && result.stats.followers !== undefined && result.stats.followers > 0 && (
              <div className="flex items-center gap-1">
                <Users className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  {result.stats.followers.toLocaleString()} followers
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
    </motion.div>
  )
}
