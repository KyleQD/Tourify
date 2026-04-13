"use client"

/** Venue subtree uses the same Supabase session as the rest of the app (root layout already provides AuthProvider). */
export { AuthProvider, useAuth } from "@/contexts/auth-context"
