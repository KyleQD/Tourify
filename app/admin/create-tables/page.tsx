"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Database, Terminal, CheckCircle, XCircle, Loader2, Copy } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { toast } from "sonner"

export default function CreateTablesPage() {
  const [status, setStatus] = useState<'idle' | 'running' | 'success' | 'error' | 'manual'>('idle')
  const [message, setMessage] = useState("")
  const [logs, setLogs] = useState<string[]>([])
  const [sql, setSql] = useState("")

  const addLog = (msg: string) => {
    setLogs(prev => [...prev, msg])
  }

  const createTables = async () => {
    setStatus('running')
    setMessage("")
    setLogs([])
    setSql("")

    try {
      addLog("Checking if artist_profiles table exists...")
      
      const response = await fetch('/api/migrations/create-tables', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      const data = await response.json()
      
      if (response.status === 400 && data.error === 'Table creation required') {
        addLog("Table does not exist. Manual creation required.")
        setStatus('manual')
        setMessage(data.message)
        setSql(data.sql)
        return
      }
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to check tables')
      }
      
      addLog("Tables already exist")
      setStatus('success')
      setMessage("Database tables already exist!")
    } catch (error: any) {
      console.error("Setup error:", error)
      setStatus('error')
      setMessage(error.message || "An error occurred during database setup")
    }
  }

  const copySqlToClipboard = () => {
    navigator.clipboard.writeText(sql)
    toast.success("SQL copied to clipboard")
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center space-x-2 mb-6">
          <Database className="h-6 w-6 text-purple-500" />
          <h1 className="text-2xl font-bold">Create Database Tables</h1>
        </div>
        
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle>Database Setup</CardTitle>
            <CardDescription>
              Create the necessary database tables for the application
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            {status === 'error' && (
              <Alert variant="destructive" className="mb-4">
                <XCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{message}</AlertDescription>
              </Alert>
            )}
            
            {status === 'success' && (
              <Alert className="mb-4 bg-green-900/20 border-green-900/50 text-green-400">
                <CheckCircle className="h-4 w-4" />
                <AlertTitle>Success</AlertTitle>
                <AlertDescription>{message}</AlertDescription>
              </Alert>
            )}
            
            {status === 'manual' && (
              <Alert className="mb-4 bg-yellow-900/20 border-yellow-900/50 text-yellow-400">
                <AlertTitle>Manual Action Required</AlertTitle>
                <AlertDescription>{message}</AlertDescription>
              </Alert>
            )}
            
            <div className="bg-slate-900 p-4 rounded-md mb-4 font-mono text-sm overflow-auto max-h-60">
              {logs.length === 0 ? (
                <div className="text-slate-500">No logs yet. Click the button below to start.</div>
              ) : (
                logs.map((log, i) => (
                  <div key={i} className="mb-1">
                    <span className="text-slate-500">$</span> {log}
                  </div>
                ))
              )}
            </div>
            
            {status === 'manual' && sql && (
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-sm font-medium">SQL to Run in Supabase Dashboard</h3>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={copySqlToClipboard}
                    className="text-xs"
                  >
                    <Copy className="h-3 w-3 mr-1" />
                    Copy SQL
                  </Button>
                </div>
                <pre className="bg-slate-900 p-4 rounded-md font-mono text-xs overflow-auto max-h-96">
                  {sql}
                </pre>
              </div>
            )}
            
            <div className="text-sm text-slate-300 space-y-4">
              <p>
                This will create the following tables in your Supabase database:
              </p>
              
              <div className="grid grid-cols-1 gap-4">
                <div className="p-3 rounded-md bg-slate-700/50 border border-slate-600">
                  <div className="font-medium mb-1">artist_profiles</div>
                  <div className="text-xs text-slate-400">Stores artist profile information</div>
                </div>
              </div>
            </div>
          </CardContent>
          
          <CardFooter>
            <Button 
              onClick={createTables} 
              disabled={status === 'running'}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {status === 'running' ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Checking Tables...
                </>
              ) : (
                <>
                  <Terminal className="h-4 w-4 mr-2" />
                  Check Tables
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
} 