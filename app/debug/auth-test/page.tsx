"use client"

import { useState } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function AuthTestPage() {
  const { signIn, user, session, loading } = useAuth()
  const [email, setEmail] = useState('kyle.o.daley@gmail.com')
  const [password, setPassword] = useState('')
  const [testResult, setTestResult] = useState<string | null>(null)
  const [isTestingConnection, setIsTestingConnection] = useState(false)
  const [isTestingAuth, setIsTestingAuth] = useState(false)

  const testConnection = async () => {
    setIsTestingConnection(true)
    setTestResult(null)
    
    try {
      console.log('Testing Supabase connection...')
      
      // Test basic connection
      const { data, error } = await supabase.auth.getSession()
      
      if (error) {
        setTestResult(`Connection Error: ${error.message}`)
      } else {
        setTestResult(`Connection Success: ${data ? 'Session data received' : 'No session'}`)
      }
      
      // Test API endpoint
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/`, {
        headers: {
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`
        }
      })
      
      console.log('API Response Status:', response.status)
      
    } catch (err: any) {
      setTestResult(`Connection Failed: ${err.message}`)
    } finally {
      setIsTestingConnection(false)
    }
  }

  const testAuth = async () => {
    if (!email || !password) {
      setTestResult('Please enter email and password')
      return
    }

    setIsTestingAuth(true)
    setTestResult(null)
    
    try {
      console.log('Testing authentication...')
      const result = await signIn(email, password)
      
      if (result.error) {
        setTestResult(`Auth Error: ${result.error.message}`)
      } else {
        setTestResult('Auth Success: User signed in')
      }
    } catch (err: any) {
      setTestResult(`Auth Failed: ${err.message}`)
    } finally {
      setIsTestingAuth(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold">Authentication Debug</h1>
        
        {/* Connection Status */}
        <Card>
          <CardHeader>
            <CardTitle>Connection Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <strong>Supabase URL:</strong> {process.env.NEXT_PUBLIC_SUPABASE_URL || 'Not set'}
              </div>
              <div>
                <strong>Anon Key:</strong> {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set' : 'Not set'}
              </div>
              <div>
                <strong>Current User:</strong> {user ? user.email : 'None'}
              </div>
              <div>
                <strong>Session:</strong> {session ? 'Active' : 'None'}
              </div>
              <div>
                <strong>Loading:</strong> {loading ? 'Yes' : 'No'}
              </div>
            </div>
            
            <Button 
              onClick={testConnection} 
              disabled={isTestingConnection}
              className="w-full"
            >
              {isTestingConnection ? 'Testing Connection...' : 'Test Connection'}
            </Button>
          </CardContent>
        </Card>

        {/* Authentication Test */}
        <Card>
          <CardHeader>
            <CardTitle>Authentication Test</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Input
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
              />
              <Input
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
              />
            </div>
            
            <Button 
              onClick={testAuth} 
              disabled={isTestingAuth || loading}
              className="w-full"
            >
              {isTestingAuth ? 'Testing Auth...' : 'Test Sign In'}
            </Button>
          </CardContent>
        </Card>

        {/* Test Results */}
        {testResult && (
          <Card>
            <CardHeader>
              <CardTitle>Test Results</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-gray-200 p-4 rounded text-sm overflow-auto">
                {testResult}
              </pre>
            </CardContent>
          </Card>
        )}

        {/* Console Logs */}
        <Card>
          <CardHeader>
            <CardTitle>Instructions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm space-y-2">
              <p>1. Open browser developer tools (F12)</p>
              <p>2. Go to the Console tab</p>
              <p>3. Test the connection and authentication</p>
              <p>4. Check console logs for detailed error messages</p>
              <p>5. Try signing in with your actual credentials</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 