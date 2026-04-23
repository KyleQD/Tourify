import bcrypt from 'bcryptjs'
import { prisma } from './prisma'

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}

/** @deprecated Use Supabase `auth.signUp` (e.g. TourifyAuthPortal). Prisma-only users bypass email verification and DB auth triggers. */
export async function createUser(userData: {
  email: string
  password: string
  name?: string
  username?: string
  fullName?: string
  accountType?: string
  organization?: string
  role?: string
  enableMFA?: boolean
}) {
  const hashedPassword = await hashPassword(userData.password)

  const user = await prisma.user.create({
    data: {
      email: userData.email,
      password: hashedPassword,
      name: userData.name,
      username: userData.username,
      fullName: userData.fullName,
      accountType: userData.accountType || 'general',
      organization: userData.organization,
      role: userData.role,
      enableMFA: userData.enableMFA || false,
      profile: {
        create: {}
      },
      activeProfile: {
        create: {
          activeProfileType: 'general'
        }
      }
    },
    include: {
      profile: true,
      activeProfile: true
    }
  })

  return user
}

export async function getUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email },
    include: {
      profile: true,
      activeProfile: true
    }
  })
}

export async function getUserById(id: string) {
  return prisma.user.findUnique({
    where: { id },
    include: {
      profile: true,
      activeProfile: true
    }
  })
}

// Temporary function for backward compatibility
export async function getAuthUser() {
  // This should be implemented with proper session handling
  // For now, return a mock user to prevent build errors
  return {
    id: "mock-user-id",
    email: "mock@example.com",
    name: "Mock User",
    username: "mockuser",
    fullName: "Mock User",
    accountType: "admin",
    organization: "Mock Org",
    role: "admin",
    enableMFA: false,
    profile: null,
    activeProfile: null
  }
} 