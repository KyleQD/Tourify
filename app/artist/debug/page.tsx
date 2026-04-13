"use client"

import { supabase } from '@/lib/supabase/client'
import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Database, 
  User, 
  Settings,
  RefreshCw,
  Copy,
  ExternalLink
} from "lucide-react"
import { useArtist } from "@/contexts/artist-context"
import { toast } from "sonner"

interface DatabaseCheck {
  name: string
  status: 'success' | 'error' | 'warning'
  message: string
  details?: string
}

export default function ArtistDebugPage() {
  const { user, profile, isLoading } = useArtist()
  const [checks, setChecks] = useState<DatabaseCheck[]>([])
  const [isChecking, setIsChecking] = useState(false)
  const runDatabaseChecks = async () => {
    if (!user) {
      setChecks([{
        name: 'User Authentication',
        status: 'error',
        message: 'No authenticated user found',
        details: 'Please log in to run database checks'
      }])
      return
    }

    setIsChecking(true)
    const newChecks: DatabaseCheck[] = []

    try {
      // Check 1: User Authentication
      newChecks.push({
        name: 'User Authentication',
        status: 'success',
        message: `Authenticated as ${user.email}`,
        details: `User ID: ${user.id}`
      })

      // Check 2: Artist Profile Exists
      try {
        const { data: profileData, error: profileError } = await supabase
          .from('artist_profiles')
          .select('*')
          .eq('user_id', user.id)
          .single()

        if (profileError) {
          if (profileError.code === 'PGRST116') {
            newChecks.push({
              name: 'Artist Profile',
              status: 'warning',
              message: 'No artist profile found',
              details: 'Profile will be created automatically when you first save settings'
            })
          } else {
            newChecks.push({
              name: 'Artist Profile',
              status: 'error',
              message: 'Error loading artist profile',
              details: profileError.message
            })
          }
        } else {
          newChecks.push({
            name: 'Artist Profile',
            status: 'success',
            message: 'Artist profile found',
            details: `Profile ID: ${profileData.id}, Name: ${profileData.artist_name || 'Not set'}`
          })
        }
      } catch (error: any) {
        newChecks.push({
          name: 'Artist Profile',
          status: 'error',
          message: 'Failed to check artist profile',
          details: error.message
        })
      }

      // Check 3: Settings Column Exists
      try {
        const { data: settingsData, error: settingsError } = await supabase
          .from('artist_profiles')
          .select('settings')
          .eq('user_id', user.id)
          .single()

        if (settingsError) {
          if (settingsError.message.includes('column "settings" does not exist')) {
            newChecks.push({
              name: 'Settings Column',
              status: 'error',
              message: 'Settings column missing from artist_profiles table',
              details: 'This is the main issue preventing saves. Run the migration script to fix.'
            })
          } else {
            newChecks.push({
              name: 'Settings Column',
              status: 'warning',
              message: 'Could not check settings column',
              details: settingsError.message
            })
          }
        } else {
          newChecks.push({
            name: 'Settings Column',
            status: 'success',
            message: 'Settings column exists',
            details: `Current settings: ${JSON.stringify(settingsData?.settings || {})}`
          })
        }
      } catch (error: any) {
        newChecks.push({
          name: 'Settings Column',
          status: 'error',
          message: 'Error checking settings column',
          details: error.message
        })
      }

      // Check 4: Database Permissions
      try {
        const { error: permissionError } = await supabase
          .from('artist_profiles')
          .update({ updated_at: new Date().toISOString() })
          .eq('user_id', user.id)

        if (permissionError) {
          if (permissionError.code === 'PGRST116') {
            newChecks.push({
              name: 'Database Permissions',
              status: 'warning',
              message: 'No profile to update (this is normal for new users)',
              details: 'Profile will be created when you first save settings'
            })
          } else {
            newChecks.push({
              name: 'Database Permissions',
              status: 'error',
              message: 'Permission denied for updates',
              details: permissionError.message
            })
          }
        } else {
          newChecks.push({
            name: 'Database Permissions',
            status: 'success',
            message: 'Update permissions working correctly',
            details: 'You can save changes to your artist profile'
          })
        }
      } catch (error: any) {
        newChecks.push({
          name: 'Database Permissions',
          status: 'error',
          message: 'Error checking permissions',
          details: error.message
        })
      }

      // Check 5: Required Columns
      try {
        const { data: columnsData, error: columnsError } = await supabase
          .from('artist_profiles')
          .select('id, user_id, artist_name, bio, genres, social_links, verification_status, account_tier, settings, created_at, updated_at')
          .eq('user_id', user.id)
          .single()

        if (columnsError) {
          if (columnsError.message.includes('column') && columnsError.message.includes('does not exist')) {
            const missingColumn = columnsError.message.match(/column "([^"]+)" does not exist/)?.[1]
            newChecks.push({
              name: 'Required Columns',
              status: 'error',
              message: `Missing column: ${missingColumn}`,
              details: 'Run the migration script to add missing columns'
            })
          } else {
            newChecks.push({
              name: 'Required Columns',
              status: 'warning',
              message: 'Could not verify all columns',
              details: columnsError.message
            })
          }
        } else {
          newChecks.push({
            name: 'Required Columns',
            status: 'success',
            message: 'All required columns present',
            details: 'artist_profiles table has the correct schema'
          })
        }
      } catch (error: any) {
        newChecks.push({
          name: 'Required Columns',
          status: 'error',
          message: 'Error checking table schema',
          details: error.message
        })
      }

    } catch (error: any) {
      newChecks.push({
        name: 'Database Connection',
        status: 'error',
        message: 'Failed to connect to database',
        details: error.message
      })
    }

    setChecks(newChecks)
    setIsChecking(false)
  }

  useEffect(() => {
    if (!isLoading && user) {
      runDatabaseChecks()
    }
  }, [user, isLoading])

  const getStatusIcon = (status: 'success' | 'error' | 'warning') => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-400" />
      case 'error':
        return <XCircle className="h-5 w-5 text-red-400" />
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-400" />
    }
  }

  const getStatusColor = (status: 'success' | 'error' | 'warning') => {
    switch (status) {
      case 'success':
        return 'text-green-400 bg-green-500/10 border-green-500/20'
      case 'error':
        return 'text-red-400 bg-red-500/10 border-red-500/20'
      case 'warning':
        return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20'
    }
  }

  const copyMigrationScript = () => {
    const migrationPath = '/fix_artist_settings_table.sql'
    navigator.clipboard.writeText(migrationPath)
    toast.success('Migration script path copied!')
  }

  const hasErrors = checks.some(check => check.status === 'error')
  const hasWarnings = checks.some(check => check.status === 'warning')

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent flex items-center gap-3">
            <Database className="h-8 w-8 text-purple-400" />
            Artist Profile Debug
          </h1>
          <p className="text-slate-400 mt-2">
            Diagnose issues with saving artist profile settings
          </p>
        </motion.div>

        {/* Status Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <Card className="bg-slate-900/50 border-slate-700/50">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>System Status</span>
                <Button
                  onClick={runDatabaseChecks}
                  disabled={isChecking}
                  size="sm"
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {isChecking ? (
                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Re-run Checks
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <Badge 
                  variant="outline" 
                  className={hasErrors ? 'text-red-400 border-red-500/50' : 'text-green-400 border-green-500/50'}
                >
                  {hasErrors ? 'Issues Found' : 'Healthy'}
                </Badge>
                <Badge variant="outline" className="text-slate-300">
                  {checks.length} checks completed
                </Badge>
                {hasWarnings && (
                  <Badge variant="outline" className="text-yellow-400 border-yellow-500/50">
                    Warnings present
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Checks Results */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-4"
        >
          {checks.map((check, index) => (
            <Card 
              key={check.name} 
              className={`bg-slate-900/50 border-slate-700/50 ${getStatusColor(check.status)} border`}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  {getStatusIcon(check.status)}
                  <div className="flex-1">
                    <h3 className="font-semibold text-white">{check.name}</h3>
                    <p className="text-sm text-slate-300 mt-1">{check.message}</p>
                    {check.details && (
                      <p className="text-xs text-slate-400 mt-2 font-mono bg-slate-800/50 p-2 rounded">
                        {check.details}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </motion.div>

        {/* Action Buttons */}
        {hasErrors && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-8"
          >
            <Card className="bg-red-500/10 border-red-500/20">
              <CardHeader>
                <CardTitle className="text-red-400 flex items-center gap-2">
                  <XCircle className="h-5 w-5" />
                  Issues Found - Action Required
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-slate-300">
                  Your database schema needs to be updated to support artist profile settings.
                </p>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Button
                      onClick={copyMigrationScript}
                      variant="outline"
                      size="sm"
                      className="border-blue-500/50 text-blue-400 hover:bg-blue-500/20"
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copy Migration Path
                    </Button>
                    <span className="text-sm text-slate-400">
                      fix_artist_settings_table.sql
                    </span>
                  </div>

                  <div className="bg-slate-800/50 p-4 rounded-lg">
                    <h4 className="font-semibold text-white mb-2">How to fix:</h4>
                    <ol className="text-sm text-slate-300 space-y-1 list-decimal list-inside">
                      <li>Go to your Supabase Dashboard</li>
                      <li>Navigate to SQL Editor</li>
                      <li>Copy the content from <code className="bg-slate-700 px-1 rounded">fix_artist_settings_table.sql</code></li>
                      <li>Paste and run the migration script</li>
                      <li>Come back here and re-run the checks</li>
                    </ol>
                  </div>

                  <Button
                    asChild
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Open Supabase Dashboard
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Success State */}
        {!hasErrors && checks.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-8"
          >
            <Card className="bg-green-500/10 border-green-500/20">
              <CardContent className="p-6 text-center">
                <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">
                  All Systems Operational
                </h3>
                <p className="text-slate-300 mb-4">
                  Your artist profile settings should save correctly now!
                </p>
                <Button
                  asChild
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <a href="/artist/profile">
                    <Settings className="h-4 w-4 mr-2" />
                    Go to Profile Settings
                  </a>
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  )
} 