"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Music, Database, Terminal, CheckCircle, XCircle, Loader2 } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

// SQL to create onboarding table
const onboardingTableSQL = `
-- Create the onboarding table to store user onboarding responses
CREATE TABLE IF NOT EXISTS onboarding (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT,
  purpose TEXT,
  on_tour BOOLEAN,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Add RLS policies to secure the onboarding table
ALTER TABLE onboarding ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to view and edit only their own onboarding data
CREATE POLICY "Users can view their own onboarding data" 
  ON onboarding FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own onboarding data" 
  ON onboarding FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own onboarding data" 
  ON onboarding FOR UPDATE 
  USING (auth.uid() = user_id);
`

// SQL to create or update profiles table
const profilesTableSQL = `
-- Create profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  updated_at TIMESTAMP WITH TIME ZONE,
  username TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  website TEXT,
  role TEXT
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Public profiles are viewable by everyone" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Add role column if it doesn't exist
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT;
`

// SQL to add profile trigger
const profileTriggerSQL = `
-- Function to create profile after signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile after signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
`

export default function SetupPage() {
  const [status, setStatus] = useState<'idle' | 'running' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState("")
  const [logs, setLogs] = useState<string[]>([])

  const addLog = (msg: string) => {
    setLogs(prev => [...prev, msg])
  }

  const runMigrations = async () => {
    setStatus('running')
    setMessage("")
    setLogs([])

    try {
      // Check if tables exist
      addLog("Checking existing tables...")
      
      let onboardingExists = false
      let profilesExists = false
      
      try {
        const { error: onboardingError } = await supabase
          .from('onboarding')
          .select('id')
          .limit(1)
          
        onboardingExists = !onboardingError
        addLog(`Onboarding table check: ${onboardingExists ? 'exists' : 'does not exist'}`)
      } catch (err) {
        addLog("Error checking onboarding table")
      }
      
      try {
        const { error: profilesError } = await supabase
          .from('profiles')
          .select('id')
          .limit(1)
          
        profilesExists = !profilesError
        addLog(`Profiles table check: ${profilesExists ? 'exists' : 'does not exist'}`)
      } catch (err) {
        addLog("Error checking profiles table")
      }
      
      // Create tables
      addLog("Creating or updating profiles table...")
      const { error: profilesError } = await supabase.rpc('exec_sql', { 
        sql: profilesTableSQL 
      })
      
      if (profilesError) {
        addLog(`Error creating profiles table: ${profilesError.message}`)
        throw profilesError
      }
      addLog("Profiles table created or updated successfully")
      
      addLog("Setting up profile trigger...")
      const { error: triggerError } = await supabase.rpc('exec_sql', { 
        sql: profileTriggerSQL 
      })
      
      if (triggerError) {
        addLog(`Error creating profile trigger: ${triggerError.message}`)
        throw triggerError
      }
      addLog("Profile trigger created successfully")
      
      addLog("Creating onboarding table...")
      const { error: onboardingError } = await supabase.rpc('exec_sql', { 
        sql: onboardingTableSQL 
      })
      
      if (onboardingError) {
        addLog(`Error creating onboarding table: ${onboardingError.message}`)
        throw onboardingError
      }
      addLog("Onboarding table created successfully")
      
      setStatus('success')
      setMessage("Database setup completed successfully!")
    } catch (error: any) {
      console.error("Setup error:", error)
      setStatus('error')
      setMessage(error.message || "An error occurred during database setup")
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-950 to-slate-900 p-4">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[url('/placeholder.svg?height=800&width=1200')] bg-cover bg-center opacity-10"></div>
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-950/80 to-slate-900/80"></div>
      </div>

      <Card className="w-full max-w-2xl bg-slate-900/70 border-slate-700/50 backdrop-blur-sm">
        <CardHeader className="space-y-1 flex flex-col items-center text-center">
          <div className="flex items-center space-x-2 mb-4">
            <Music className="h-8 w-8 text-purple-500" />
            <span className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
              TOURIFY
            </span>
          </div>
          <CardTitle className="text-2xl text-white">Database Setup</CardTitle>
          <CardDescription className="text-slate-400">
            Create the required tables for the application
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          {status === 'success' && (
            <Alert className="bg-green-900/20 border-green-900/50">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <AlertTitle className="text-green-500">Success</AlertTitle>
              <AlertDescription className="text-green-400">
                {message}
              </AlertDescription>
            </Alert>
          )}
          
          {status === 'error' && (
            <Alert className="bg-red-900/20 border-red-900/50">
              <XCircle className="h-4 w-4 text-red-500" />
              <AlertTitle className="text-red-500">Error</AlertTitle>
              <AlertDescription className="text-red-400">
                {message}
              </AlertDescription>
            </Alert>
          )}
          
          <div className="bg-slate-800/50 rounded-lg p-4 space-y-2">
            <div className="flex items-center space-x-2">
              <Database className="h-5 w-5 text-purple-500" />
              <span className="text-slate-200 font-medium">Required Database Tables</span>
            </div>
            <ul className="list-disc list-inside text-sm text-slate-300 ml-2">
              <li>Profiles - Stores user profile information</li>
              <li>Onboarding - Stores responses from the onboarding flow</li>
            </ul>
          </div>
          
          {logs.length > 0 && (
            <div className="bg-black/30 rounded-lg p-4 border border-slate-700/50">
              <div className="flex items-center space-x-2 mb-2">
                <Terminal className="h-4 w-4 text-slate-400" />
                <span className="text-slate-400 text-sm font-mono">Setup Logs</span>
              </div>
              <div className="font-mono text-xs text-slate-300 max-h-40 overflow-y-auto">
                {logs.map((log, i) => (
                  <div key={i} className="mb-1">&gt; {log}</div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button 
            onClick={runMigrations} 
            disabled={status === 'running'}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {status === 'running' ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Running Migrations...
              </>
            ) : status === 'success' ? (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Setup Complete
              </>
            ) : (
              <>
                <Database className="mr-2 h-4 w-4" />
                Run Database Setup
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
} 