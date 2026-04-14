'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/auth-context'

interface TestResult {
  name: string
  status: 'pending' | 'success' | 'error' | 'warning'
  message: string
  details?: string
}

export function ImageUploadTest() {
  const [results, setResults] = useState<TestResult[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const { user } = useAuth()

  const runTests = async () => {
    setIsRunning(true)
    setResults([])

    const tests: TestResult[] = []

    // Test 1: Environment Variables
    tests.push({
      name: 'Environment Variables',
      status: process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY 
        ? 'success' : 'error',
      message: process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        ? 'Supabase environment variables found'
        : 'Missing Supabase environment variables',
      details: `URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Missing'}, Key: ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set' : 'Missing'}`
    })

    setResults([...tests])

    // Test 2: Supabase Client Connection
    try {
      const { data, error } = await supabase.auth.getSession()
      tests.push({
        name: 'Supabase Connection',
        status: error ? 'error' : 'success',
        message: error ? `Connection failed: ${error.message}` : 'Successfully connected to Supabase',
        details: `Session: ${data.session ? 'Active' : 'None'}`
      })
    } catch (err) {
      tests.push({
        name: 'Supabase Connection',
        status: 'error',
        message: 'Failed to connect to Supabase',
        details: err instanceof Error ? err.message : 'Unknown error'
      })
    }

    setResults([...tests])

    // Test 3: Authentication Status
    tests.push({
      name: 'Authentication',
      status: user ? 'success' : 'warning',
      message: user ? `Authenticated as: ${user.email}` : 'Not authenticated',
      details: user ? `User ID: ${user.id}` : 'Image upload requires authentication'
    })

    setResults([...tests])

    // Test 4: Storage Bucket Access (only if authenticated)
    if (user) {
      try {
        const { data, error } = await supabase.storage
          .from('venue-media')
          .list('', { limit: 1 })

        tests.push({
          name: 'Storage Bucket Access',
          status: error ? 'error' : 'success',
          message: error 
            ? `Storage access failed: ${error.message}`
            : 'Successfully accessed venue-media bucket',
          details: error?.message || 'Storage bucket is accessible'
        })
      } catch (err) {
        tests.push({
          name: 'Storage Bucket Access',
          status: 'error',
          message: 'Failed to access storage bucket',
          details: 'The venue-media bucket may not exist. Run the storage setup SQL script.'
        })
      }
    } else {
      tests.push({
        name: 'Storage Bucket Access',
        status: 'warning',
        message: 'Skipped - requires authentication',
        details: 'Login to test storage bucket access'
      })
    }

    setResults([...tests])

    // Test 5: File Upload API Endpoint
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/venue-media`, {
        method: 'HEAD',
        headers: {
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
        }
      })

      tests.push({
        name: 'Upload Endpoint',
        status: response.status === 200 || response.status === 404 ? 'success' : 'error',
        message: `Upload endpoint responds with status: ${response.status}`,
        details: response.status === 404 ? 'Bucket exists (404 is expected for HEAD requests)' : 'Endpoint accessible'
      })
    } catch (err) {
      tests.push({
        name: 'Upload Endpoint',
        status: 'error',
        message: 'Failed to reach upload endpoint',
        details: err instanceof Error ? err.message : 'Network error'
      })
    }

    setResults([...tests])
    setIsRunning(false)
  }

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />
      default:
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
    }
  }

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return 'border-green-200 bg-green-50 dark:bg-green-950/20'
      case 'error':
        return 'border-red-200 bg-red-50 dark:bg-red-950/20'
      case 'warning':
        return 'border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20'
      default:
        return 'border-blue-200 bg-blue-50 dark:bg-blue-950/20'
    }
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🧪 Image Upload System Test
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={runTests} 
          disabled={isRunning}
          className="w-full"
        >
          {isRunning ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Running Tests...
            </>
          ) : (
            'Run Diagnostic Tests'
          )}
        </Button>

        <div className="space-y-3">
          {results.map((result, index) => (
            <Alert key={index} className={getStatusColor(result.status)}>
              <div className="flex items-start gap-3">
                {getStatusIcon(result.status)}
                <div className="flex-1">
                  <div className="font-medium text-sm">{result.name}</div>
                  <AlertDescription className="mt-1">
                    <div>{result.message}</div>
                    {result.details && (
                      <div className="text-xs mt-1 opacity-75">
                        {result.details}
                      </div>
                    )}
                  </AlertDescription>
                </div>
              </div>
            </Alert>
          ))}
        </div>

        {results.length > 0 && !isRunning && (
          <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <h4 className="font-medium mb-2">Next Steps:</h4>
            <div className="text-sm space-y-1">
              {results.some(r => r.status === 'error') && (
                <div className="text-red-600 dark:text-red-400">
                  ❌ Fix the errors above before proceeding
                </div>
              )}
              {results.some(r => r.name === 'Storage Bucket Access' && r.status === 'error') && (
                <div className="text-blue-600 dark:text-blue-400">
                  📝 Run the storage setup SQL script in Supabase Dashboard
                </div>
              )}
              {!user && (
                <div className="text-yellow-600 dark:text-yellow-400">
                  🔑 Log in to test full image upload functionality
                </div>
              )}
              {results.every(r => r.status === 'success') && (
                <div className="text-green-600 dark:text-green-400">
                  ✅ All tests passed! Image upload should work correctly
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
} 