import { NextRequest, NextResponse } from "next/server"

/**
 * Legacy Prisma/bcrypt signup is removed. All accounts must be created via Supabase Auth
 * (e.g. `/login` Sign Up tab) so email verification, sessions, and `auth.users` triggers stay consistent.
 */
export async function POST(_request: NextRequest) {
  return NextResponse.json(
    {
      error:
        "This signup endpoint is deprecated. Create an account at /login (Sign Up tab) for email verification and a unified profile.",
      deprecated: true,
      migrateTo: "/login?tab=signup",
    },
    { status: 410 },
  )
}
