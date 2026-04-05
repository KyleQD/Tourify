import { NextAuthOptions, getServerSession } from "next-auth"

/**
 * @deprecated Tourify auth runtime is now Supabase-only.
 * This legacy NextAuth export is intentionally isolated to prevent
 * split auth behavior if old endpoints import it.
 */
export const authOptions: NextAuthOptions = {
  providers: [],
  callbacks: {
    async signIn() {
      return false
    },
    async session({ session }) {
      if (session.user) {
        ;(session.user as any).isPro = false
      }
      return session
    },
  },
  pages: {
    signIn: "/login",
    error: "/auth/error",
  },
  session: {
    strategy: "jwt",
  },
}

export async function getSession() {
  return await getServerSession(authOptions)
} 