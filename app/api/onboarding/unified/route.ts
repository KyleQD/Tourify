import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from "next/server"
import { UnifiedOnboardingService } from "@/lib/services/unified-onboarding.service"
import { z } from "zod"

// Validation schemas
const getFlowSchema = z.object({
  flow_type: z.enum(['artist', 'venue', 'staff', 'invitation'])
})

const createFlowSchema = z.object({
  flow_type: z.enum(['artist', 'venue', 'staff', 'invitation']),
  template_id: z.string().optional(),
  metadata: z.record(z.any()).optional()
})

const updateFlowSchema = z.object({
  id: z.string(),
  status: z.enum(['pending', 'in_progress', 'completed', 'failed']).optional(),
  responses: z.record(z.any()).optional(),
  metadata: z.record(z.any()).optional()
})

const completeFlowSchema = z.object({
  id: z.string(),
  responses: z.record(z.any())
})

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const flowType = searchParams.get('flow_type')
    const userId = searchParams.get('user_id')

    if (!flowType) {
      return NextResponse.json(
        { error: "flow_type parameter is required" },
        { status: 400 }
      )
    }

    // Validate input
    const validatedParams = getFlowSchema.parse({ flow_type: flowType })

    // Get user from session
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Use provided userId or current user's id
    const targetUserId = userId || user.id

    // Get user's onboarding flow
    const flow = await UnifiedOnboardingService.getUserOnboardingFlow(targetUserId, validatedParams.flow_type)

    if (!flow) {
      return NextResponse.json(
        { error: "Onboarding flow not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: flow
    })

  } catch (error) {
    console.error('❌ [Unified Onboarding API] GET error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request parameters", details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const action = body.action

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    switch (action) {
      case 'create_flow':
        return await handleCreateFlow(body, user.id)

      case 'update_flow':
        return await handleUpdateFlow(body, user.id)

      case 'complete_flow':
        return await handleCompleteFlow(body, user.id)

      case 'get_or_create_flow':
        return await handleGetOrCreateFlow(body, user.id)

      default:
        return NextResponse.json(
          { error: "Invalid action" },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('❌ [Unified Onboarding API] POST error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request parameters", details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

async function handleCreateFlow(body: any, userId: string) {
  const validatedData = createFlowSchema.parse(body)

  const flow = await UnifiedOnboardingService.createOnboardingFlow({
    user_id: userId,
    flow_type: validatedData.flow_type,
    template_id: validatedData.template_id,
    metadata: validatedData.metadata
  })

  if (!flow) {
    return NextResponse.json(
      { error: "Failed to create onboarding flow" },
      { status: 500 }
    )
  }

  return NextResponse.json({
    success: true,
    data: flow
  })
}

async function handleUpdateFlow(body: any, userId: string) {
  const validatedData = updateFlowSchema.parse(body)

  // Verify the flow belongs to the user
  const existingFlow = await UnifiedOnboardingService.getUserOnboardingFlow(userId, 'artist') // We'll need to get the flow type from the flow ID
  if (!existingFlow || existingFlow.id !== validatedData.id) {
    return NextResponse.json(
      { error: "Flow not found or access denied" },
      { status: 404 }
    )
  }

  const flow = await UnifiedOnboardingService.updateOnboardingFlow(validatedData)

  if (!flow) {
    return NextResponse.json(
      { error: "Failed to update onboarding flow" },
      { status: 500 }
    )
  }

  return NextResponse.json({
    success: true,
    data: flow
  })
}

async function handleCompleteFlow(body: any, userId: string) {
  const validatedData = completeFlowSchema.parse(body)

  // Verify the flow belongs to the user
  const existingFlow = await UnifiedOnboardingService.getUserOnboardingFlow(userId, 'artist') // We'll need to get the flow type from the flow ID
  if (!existingFlow || existingFlow.id !== validatedData.id) {
    return NextResponse.json(
      { error: "Flow not found or access denied" },
      { status: 404 }
    )
  }

  const flow = await UnifiedOnboardingService.completeOnboardingFlow(
    validatedData.id,
    validatedData.responses
  )

  if (!flow) {
    return NextResponse.json(
      { error: "Failed to complete onboarding flow" },
      { status: 500 }
    )
  }

  return NextResponse.json({
    success: true,
    data: flow
  })
}

async function handleGetOrCreateFlow(body: any, userId: string) {
  const { flow_type, template_id } = body

  if (!flow_type) {
    return NextResponse.json(
      { error: "flow_type is required" },
      { status: 400 }
    )
  }

  const flow = await UnifiedOnboardingService.getOrCreateOnboardingFlow(
    userId,
    flow_type,
    template_id
  )

  if (!flow) {
    return NextResponse.json(
      { error: "Failed to get or create onboarding flow" },
      { status: 500 }
    )
  }

  return NextResponse.json({
    success: true,
    data: flow
  })
}
