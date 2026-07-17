import { NextRequest } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { POST } from "../route"

jest.mock("@supabase/supabase-js", () => ({
  createClient: jest.fn(),
}))

describe("POST /api/onboarding/create-account", () => {
  const savedEnv = { ...process.env }
  const signUp = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    process.env = {
      ...savedEnv,
      NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
    }
    ;(createClient as jest.Mock).mockReturnValue({
      auth: { signUp },
    })
    signUp.mockResolvedValue({
      data: {
        user: { id: "user-123", email: "new@example.com" },
        session: null,
      },
      error: null,
    })
  })

  afterEach(() => {
    process.env = { ...savedEnv }
  })

  it("creates invited accounts through Supabase signup and requires email confirmation", async () => {
    const req = new NextRequest("https://demo.tourify.live/api/onboarding/create-account", {
      method: "POST",
      body: JSON.stringify({
        email: "new@example.com",
        password: "password123",
        full_name: "New User",
        account_type: "artist",
        invitation_token: "invite-token",
      }),
    })

    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(201)
    expect(body.success).toBe(true)
    expect(body.needsEmailConfirmation).toBe(true)
    expect(createClient).toHaveBeenCalledWith(
      "https://project.supabase.co",
      "anon-key",
      expect.objectContaining({
        auth: expect.objectContaining({
          autoRefreshToken: false,
          persistSession: false,
        }),
      }),
    )
    expect(signUp).toHaveBeenCalledWith({
      email: "new@example.com",
      password: "password123",
      options: {
        emailRedirectTo:
          "https://demo.tourify.live/auth/callback?type=signup&redirectTo=%2Flogin",
        data: {
          full_name: "New User",
          account_type: "artist",
          invitation_token: "invite-token",
          onboarding_source: "invitation",
        },
      },
    })
  })

  it("accepts invitation form_data payloads", async () => {
    const req = new NextRequest("https://demo.tourify.live/api/onboarding/create-account", {
      method: "POST",
      body: JSON.stringify({
        invitation_token: "invite-token",
        form_data: {
          email: "nested@example.com",
          password: "password123",
          name: "Nested User",
          accountType: "venue",
        },
      }),
    })

    await POST(req)

    expect(signUp).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "nested@example.com",
        password: "password123",
        options: expect.objectContaining({
          data: expect.objectContaining({
            full_name: "Nested User",
            account_type: "venue",
            invitation_token: "invite-token",
          }),
        }),
      }),
    )
  })

  it("rejects missing credentials before creating a Supabase client", async () => {
    const req = new NextRequest("https://demo.tourify.live/api/onboarding/create-account", {
      method: "POST",
      body: JSON.stringify({ email: "new@example.com" }),
    })

    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error).toMatch(/email and password/i)
    expect(createClient).not.toHaveBeenCalled()
  })
})
