'use client'

import React, { useState } from 'react'
import { 
  useEnhancedAccounts, 
  useAccountDiscovery, 
  useAccountPosts, 
  useAccountFollowing,
  useAccountAnalytics,
  useTrendingAccounts 
} from '@/hooks/use-enhanced-accounts'
import { Account } from '@/lib/services/enhanced-account.service'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Search, 
  Users, 
  TrendingUp, 
  BarChart3, 
  MessageSquare, 
  Heart, 
  Share2,
  UserPlus,
  UserMinus,
  Verified
} from 'lucide-react'
import { formatSafeDate } from '@/lib/events/admin-event-normalization'

export function EnhancedAccountDemo() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null)
  
  // Enhanced account management
  const { 
    accounts, 
    currentAccount, 
    loading: accountsLoading,
    switchAccount,
    createAccount
  } = useEnhancedAccounts()

  // Account discovery
  const {
    results: searchResults,
    loading: searchLoading,
    searchAccounts,
    loadMore: loadMoreSearch,
    clearResults
  } = useAccountDiscovery()

  // Account posts
  const {
    posts,
    loading: postsLoading,
    createPost,
    loadMore: loadMorePosts,
    hasMore: hasMorePosts
  } = useAccountPosts(selectedAccount?.id || null)

  // Following functionality
  const {
    loading: followLoading,
    followAccount,
    unfollowAccount,
    checkIsFollowing
  } = useAccountFollowing()

  // Analytics
  const {
    analytics,
    loading: analyticsLoading
  } = useAccountAnalytics(selectedAccount?.id || null)

  // Trending accounts
  const {
    trendingAccounts,
    loading: trendingLoading
  } = useTrendingAccounts()

  // Handle search
  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      clearResults()
      return
    }
    
    await searchAccounts(searchTerm, ['artist', 'venue', 'primary'])
  }

  // Handle account selection
  const handleAccountSelect = (account: Account) => {
    setSelectedAccount(account)
  }

  // Handle post creation
  const handleCreatePost = async (content: string) => {
    if (!selectedAccount) return
    
    await createPost(content, {
      type: 'text',
      visibility: 'public'
    })
  }

  if (accountsLoading) {
    return <div className="p-4">Loading accounts...</div>
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Account Switcher */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Your Accounts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {accounts.map((account) => (
              <div
                key={account.id}
                className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                  currentAccount?.id === account.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => switchAccount(account.id)}
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={account.avatar_url || ''} />
                    <AvatarFallback>
                      {account.display_name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm truncate">
                        {account.display_name}
                      </p>
                      {account.is_verified && (
                        <Verified className="h-4 w-4 text-blue-500" />
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {account.account_type}
                      </Badge>
                      <p className="text-xs text-gray-500">
                        {account.follower_count} followers
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Search & Discovery */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Discover Accounts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 mb-4">
              <Input
                placeholder="Search accounts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
              <Button onClick={handleSearch} disabled={searchLoading}>
                {searchLoading ? 'Searching...' : 'Search'}
              </Button>
            </div>
            
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {searchResults.accounts.map((account) => (
                <div
                  key={account.id}
                  className="p-3 rounded-lg border hover:border-gray-300 cursor-pointer"
                  onClick={() => handleAccountSelect(account)}
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={account.avatar_url || ''} />
                      <AvatarFallback>
                        {account.display_name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm truncate">
                          {account.display_name}
                        </p>
                        {account.is_verified && (
                          <Verified className="h-3 w-3 text-blue-500" />
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {account.account_type}
                        </Badge>
                        <p className="text-xs text-gray-500">
                          {account.follower_count} followers
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {searchResults.hasMore && (
              <Button
                variant="outline"
                onClick={() => loadMoreSearch(searchTerm)}
                disabled={searchLoading}
                className="w-full mt-3"
              >
                Load More
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Trending Accounts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Trending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {trendingAccounts.map((account) => (
                <div
                  key={account.id}
                  className="p-3 rounded-lg border hover:border-gray-300 cursor-pointer"
                  onClick={() => handleAccountSelect(account)}
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={account.avatar_url || ''} />
                      <AvatarFallback>
                        {account.display_name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm truncate">
                          {account.display_name}
                        </p>
                        {account.is_verified && (
                          <Verified className="h-3 w-3 text-blue-500" />
                        )}
                      </div>
                      <p className="text-xs text-gray-500">
                        {Math.round(account.engagement_score)} engagement
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Selected Account Details */}
      {selectedAccount && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={selectedAccount.avatar_url || ''} />
                  <AvatarFallback>
                    {selectedAccount.display_name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-2xl font-bold">
                      {selectedAccount.display_name}
                    </h2>
                    {selectedAccount.is_verified && (
                      <Verified className="h-6 w-6 text-blue-500" />
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span>{selectedAccount.follower_count} followers</span>
                    <span>{selectedAccount.following_count} following</span>
                    <span>{selectedAccount.post_count} posts</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => followAccount(selectedAccount.id)}
                  disabled={followLoading}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Follow
                </Button>
                <Button
                  variant="outline"
                  onClick={() => unfollowAccount(selectedAccount.id)}
                  disabled={followLoading}
                >
                  <UserMinus className="h-4 w-4 mr-2" />
                  Unfollow
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="posts" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="posts">Posts</TabsTrigger>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
              </TabsList>
              
              <TabsContent value="posts" className="space-y-4">
                {/* Post Creator (if it's user's account) */}
                {currentAccount?.id === selectedAccount.id && (
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={currentAccount.avatar_url || ''} />
                          <AvatarFallback>
                            {currentAccount.display_name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <Input
                            placeholder="What's on your mind?"
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                handleCreatePost(e.currentTarget.value)
                                e.currentTarget.value = ''
                              }
                            }}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Posts Feed */}
                <div className="space-y-4">
                  {posts.map((post) => (
                    <Card key={post.id}>
                      <CardContent className="pt-6">
                        <div className="flex gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={post.account.avatar_url || ''} />
                            <AvatarFallback>
                              {post.account.display_name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium">
                                {post.account.display_name}
                              </p>
                              {post.account.is_verified && (
                                <Verified className="h-4 w-4 text-blue-500" />
                              )}
                              <Badge variant="outline" className="text-xs">
                                {post.account.account_type}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-500 mb-2">
                              {formatSafeDate(post.created_at)}
                            </p>
                            <p className="mb-3">{post.content}</p>
                            <div className="flex items-center gap-4 text-sm text-gray-500">
                              <button className="flex items-center gap-1 hover:text-red-500">
                                <Heart className="h-4 w-4" />
                                {post.likes_count}
                              </button>
                              <button className="flex items-center gap-1 hover:text-blue-500">
                                <MessageSquare className="h-4 w-4" />
                                {post.comments_count}
                              </button>
                              <button className="flex items-center gap-1 hover:text-green-500">
                                <Share2 className="h-4 w-4" />
                                {post.shares_count}
                              </button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {hasMorePosts && (
                  <Button
                    variant="outline"
                    onClick={loadMorePosts}
                    disabled={postsLoading}
                    className="w-full"
                  >
                    {postsLoading ? 'Loading...' : 'Load More Posts'}
                  </Button>
                )}
              </TabsContent>
              
              <TabsContent value="analytics" className="space-y-4">
                {analytics && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-2">
                          <BarChart3 className="h-5 w-5 text-blue-500" />
                          <div>
                            <p className="text-sm text-gray-500">Total Posts</p>
                            <p className="text-2xl font-bold">
                              {analytics.totalPosts}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-2">
                          <Heart className="h-5 w-5 text-red-500" />
                          <div>
                            <p className="text-sm text-gray-500">Total Likes</p>
                            <p className="text-2xl font-bold">
                              {analytics.totalLikes}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="h-5 w-5 text-blue-500" />
                          <div>
                            <p className="text-sm text-gray-500">Total Comments</p>
                            <p className="text-2xl font-bold">
                              {analytics.totalComments}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-5 w-5 text-green-500" />
                          <div>
                            <p className="text-sm text-gray-500">Engagement Rate</p>
                            <p className="text-2xl font-bold">
                              {analytics.engagementRate.toFixed(1)}%
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  )
} 