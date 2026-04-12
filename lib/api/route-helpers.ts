import { NextRequest, NextResponse } from 'next/server'
import { ZodError, type ZodType } from 'zod'
import { authenticateApiRequest } from '@/lib/auth/api-auth'

export interface ApiErrorShape {
  error: {
    code: string
    message: string
    retryable: boolean
    issues?: unknown
  }
}

interface JsonErrorOptions {
  status: number
  code: string
  message: string
  retryable?: boolean
  issues?: unknown
}

export function jsonError({
  status,
  code,
  message,
  retryable = false,
  issues,
}: JsonErrorOptions) {
  return NextResponse.json<ApiErrorShape>({
    error: {
      code,
      message,
      retryable,
      ...(issues ? { issues } : {}),
    },
  }, { status })
}

export async function readJson<TSchema extends ZodType>(
  request: NextRequest,
  schema: TSchema,
  invalidCode = 'invalid_request',
  invalidMessage = 'Invalid request payload'
): Promise<
  | { success: true; data: TSchema['_output'] }
  | { success: false; response: NextResponse<ApiErrorShape> }
> {
  try {
    const body = await request.json()
    const parsedBody = schema.safeParse(body)
    if (!parsedBody.success) {
      return {
        success: false,
        response: jsonError({
          status: 400,
          code: invalidCode,
          message: invalidMessage,
          retryable: false,
          issues: parsedBody.error.issues,
        }),
      }
    }

    return { success: true, data: parsedBody.data }
  } catch {
    return {
      success: false,
      response: jsonError({
        status: 400,
        code: invalidCode,
        message: invalidMessage,
        retryable: false,
      }),
    }
  }
}

export async function requireApiUser(request: NextRequest) {
  const authResult = await authenticateApiRequest(request)
  if (authResult) return { success: true as const, auth: authResult }

  return {
    success: false as const,
    response: jsonError({
      status: 401,
      code: 'unauthorized',
      message: 'Authentication required',
      retryable: false,
    }),
  }
}

export function fromZodError(error: unknown, fallbackMessage: string) {
  if (!(error instanceof ZodError)) return null

  return jsonError({
    status: 400,
    code: 'invalid_request',
    message: fallbackMessage,
    retryable: false,
    issues: error.issues,
  })
}
