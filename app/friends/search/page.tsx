'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Search, Users, MapPin, Filter, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EnhancedFriendSearch } from '@/components/social/enhanced-friend-search'
import { AllUsersDisplay } from '@/components/social/all-users-display'
import { useRouter } from 'next/navigation'

export default function FriendSearchPage() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mb-4 text-white hover:bg-white/10"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          
          <h1 className="text-3xl font-bold text-white mb-2">Find Friends</h1>
          <p className="text-slate-300">
            Connect with people you know and discover new friends
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Search Section */}
          <div className="lg:col-span-2 space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Search className="h-5 w-5 text-purple-400" />
                    Search for Friends
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <EnhancedFriendSearch
                    onFriendSelect={(friend) => {
                      console.log('Selected friend:', friend)
                      // Handle friend selection
                    }}
                    onSendRequest={(friendId) => {
                      console.log('Sent request to:', friendId)
                      // Handle friend request sent
                    }}
                    placeholder="Search by name, username, or location..."
                    className="w-full"
                  />
                </CardContent>
              </Card>
            </motion.div>

            {/* Search Tips */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-white text-lg">Search Tips</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                        <Users className="h-4 w-4 text-purple-400" />
                      </div>
                      <div>
                        <h4 className="text-white font-medium mb-1">Search by Name</h4>
                        <p className="text-slate-300 text-sm">
                          Try searching for full names or partial matches
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                        <MapPin className="h-4 w-4 text-blue-400" />
                      </div>
                      <div>
                        <h4 className="text-white font-medium mb-1">Search by Location</h4>
                        <p className="text-slate-300 text-sm">
                          Find people in your city or nearby areas
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                        <Filter className="h-4 w-4 text-green-400" />
                      </div>
                      <div>
                        <h4 className="text-white font-medium mb-1">Use Filters</h4>
                        <p className="text-slate-300 text-sm">
                          Filter by mutual friends or location
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
                        <Search className="h-4 w-4 text-yellow-400" />
                      </div>
                      <div>
                        <h4 className="text-white font-medium mb-1">Try Different Terms</h4>
                        <p className="text-slate-300 text-sm">
                          Use nicknames, usernames, or common interests
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Suggested Connections */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Users className="h-5 w-5 text-purple-400" />
                    Suggested for You
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <AllUsersDisplay 
                    limit={10}
                    className="bg-transparent border-0 shadow-none"
                  />
                </CardContent>
              </Card>
            </motion.div>

            {/* Quick Stats */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-white text-lg">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    variant="outline"
                    className="w-full justify-start text-white border-slate-600 hover:bg-slate-700"
                    onClick={() => router.push('/friends/requests')}
                  >
                    View Friend Requests
                  </Button>
                  
                  <Button
                    variant="outline"
                    className="w-full justify-start text-white border-slate-600 hover:bg-slate-700"
                    onClick={() => router.push('/friends/connections')}
                  >
                    My Connections
                  </Button>
                  
                  <Button
                    variant="outline"
                    className="w-full justify-start text-white border-slate-600 hover:bg-slate-700"
                    onClick={() => router.push('/discover')}
                  >
                    Discover People
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}
