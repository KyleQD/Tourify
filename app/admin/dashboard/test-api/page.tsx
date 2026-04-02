"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function TestAPIPage() {
  const [statsData, setStatsData] = useState<any>(null)
  const [toursData, setToursData] = useState<any>(null)
  const [eventsData, setEventsData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const testAPI = async () => {
    setLoading(true)
    setError(null)
    
    try {
      // Test stats API
      const statsResponse = await fetch('/api/admin/dashboard/stats', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      })
      
      if (statsResponse.ok) {
        const stats = await statsResponse.json()
        setStatsData(stats)
      } else {
        const errorText = await statsResponse.text()
        console.error('Stats API error:', errorText)
        setError(`Stats API failed: ${statsResponse.status} - ${errorText}`)
      }
      
      // Test tours API
      const toursResponse = await fetch('/api/admin/tours', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      })
      
      if (toursResponse.ok) {
        const tours = await toursResponse.json()
        setToursData(tours)
      } else {
        const errorText = await toursResponse.text()
        console.error('Tours API error:', errorText)
        setError(`Tours API failed: ${toursResponse.status} - ${errorText}`)
      }
      
      // Test events API
      const eventsResponse = await fetch('/api/admin/events', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      })
      
      if (eventsResponse.ok) {
        const events = await eventsResponse.json()
        setEventsData(events)
      } else {
        const errorText = await eventsResponse.text()
        console.error('Events API error:', errorText)
        setError(`Events API failed: ${eventsResponse.status} - ${errorText}`)
      }
      
    } catch (err) {
      console.error('API test error:', err)
      setError(`API test error: ${err}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    testAPI()
  }, [])

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">API Test Page</h1>
        <Button onClick={testAPI} disabled={loading}>
          {loading ? 'Testing...' : 'Test APIs'}
        </Button>
      </div>

      {error && (
        <Card className="bg-red-900/50 border-red-700/50">
          <CardContent className="p-4">
            <p className="text-red-400">{error}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-slate-900/50 border-slate-700/50">
          <CardHeader>
            <CardTitle className="text-white">Stats API</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs text-slate-300 overflow-auto max-h-96">
              {statsData ? JSON.stringify(statsData, null, 2) : 'No data'}
            </pre>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-700/50">
          <CardHeader>
            <CardTitle className="text-white">Tours API</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs text-slate-300 overflow-auto max-h-96">
              {toursData ? JSON.stringify(toursData, null, 2) : 'No data'}
            </pre>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-700/50">
          <CardHeader>
            <CardTitle className="text-white">Events API</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs text-slate-300 overflow-auto max-h-96">
              {eventsData ? JSON.stringify(eventsData, null, 2) : 'No data'}
            </pre>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 