import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from "next/server"
import { UnifiedOnboardingService } from "@/lib/services/unified-onboarding.service"
import { z } from "zod"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/database.types"

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
  status: z.enum(['in_progress', 'completed', 'abandoned']).optional(),
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

    const [flow, template] = await Promise.all([
      UnifiedOnboardingService.getUserOnboardingFlow(
        user.id,
        validatedParams.flow_type,
        supabase,
      ),
      UnifiedOnboardingService.getTemplateByFlowType(
        validatedParams.flow_type,
        supabase,
      ),
    ])

    return NextResponse.json({
      success: true,
      data: { flow, template }
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
        return await handleCreateFlow(body, user.id, supabase)

      case 'update_flow':
        return await handleUpdateFlow(body, user.id, supabase)

      case 'complete_flow':
        return await handleCompleteFlow(body, user.id, supabase)

      case 'get_or_create_flow':
        return await handleGetOrCreateFlow(body, user.id, supabase)

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

async function handleCreateFlow(body: any, userId: string, supabase: SupabaseClient<Database>) {
  const validatedData = createFlowSchema.parse(body)

  const flow = await UnifiedOnboardingService.createOnboardingFlow({
    user_id: userId,
    flow_type: validatedData.flow_type,
    template_id: validatedData.template_id,
    metadata: validatedData.metadata
  }, supabase)

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

async function handleUpdateFlow(body: any, userId: string, supabase: SupabaseClient<Database>) {
  const validatedData = updateFlowSchema.parse(body)

  // Verify the flow belongs to the user
  const existingFlow = await UnifiedOnboardingService.getUserOnboardingFlowById(
    userId,
    validatedData.id,
    supabase,
  )
  if (!existingFlow) {
    return NextResponse.json(
      { error: "Flow not found or access denied" },
      { status: 404 }
    )
  }

  const flow = await UnifiedOnboardingService.updateOnboardingFlow(
    {
      ...validatedData,
      metadata: validatedData.metadata
        ? { ...(existingFlow.metadata || {}), ...validatedData.metadata }
        : undefined,
    },
    supabase,
    userId,
  )

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

async function handleCompleteFlow(body: any, userId: string, supabase: SupabaseClient<Database>) {
  const validatedData = completeFlowSchema.parse(body)

  // Verify the flow belongs to the user
  const existingFlow = await UnifiedOnboardingService.getUserOnboardingFlowById(
    userId,
    validatedData.id,
    supabase,
  )
  if (!existingFlow) {
    return NextResponse.json(
      { error: "Flow not found or access denied" },
      { status: 404 }
    )
  }

  const flow = await UnifiedOnboardingService.completeOnboardingFlow(
    validatedData.id,
    validatedData.responses,
    supabase,
    userId,
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

async function handleGetOrCreateFlow(body: any, userId: string, supabase: SupabaseClient<Database>) {
  const { flow_type, template_id } = createFlowSchema.parse(body)

  const flow = await UnifiedOnboardingService.getOrCreateOnboardingFlow(
    userId,
    flow_type,
    template_id,
    supabase,
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
