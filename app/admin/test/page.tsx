"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function AdminTestPage() {
  const [testResults, setTestResults] = useState<any>({})
  const [isLoading, setIsLoading] = useState(false)

  function buildNoStoreInit(): RequestInit {
    return {
      credentials: 'include',
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
      },
    }
  }

  const testEndpoints = async () => {
    setIsLoading(true)
    const results: any = {}

    // Test each admin endpoint
    const endpoints = [
      '/api/admin/test',
      '/api/admin/logistics/metrics',
      '/api/admin/dashboard/stats',
      '/api/admin/tours',
      '/api/admin/events',
      '/api/admin/notifications'
    ]

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint, buildNoStoreInit())
        
        results[endpoint] = {
          status: response.status,
          statusText: response.statusText,
          ok: response.ok
        }
      } catch (error) {
        results[endpoint] = {
          error: error instanceof Error ? error.message : 'Unknown error',
          ok: false
        }
      }
    }

    setTestResults(results)
    setIsLoading(false)
  }

  useEffect(() => {
    testEndpoints()
  }, [])

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Admin API Test</h1>
      
      <Button 
        onClick={testEndpoints} 
        disabled={isLoading}
        className="mb-6"
      >
        {isLoading ? 'Testing...' : 'Test All Endpoints'}
      </Button>

      <div className="grid gap-4">
        {Object.entries(testResults).map(([endpoint, result]: [string, any]) => (
          <Card key={endpoint}>
            <CardHeader>
              <CardTitle className="text-sm">{endpoint}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-sm ${result.ok ? 'text-green-600' : 'text-red-600'}`}>
                Status: {result.status || 'N/A'} - {result.statusText || result.error || 'Unknown'}
              </div>
              {result.ok && (
                <div className="text-xs text-gray-500 mt-1">
                  ✅ Endpoint is accessible
                </div>
              )}
              {!result.ok && result.status === 401 && (
                <div className="text-xs text-yellow-500 mt-1">
                  ⚠️ Authentication required (expected)
                </div>
              )}
              {!result.ok && result.status === 404 && (
                <div className="text-xs text-red-500 mt-1">
                  ❌ Endpoint not found
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
} 