import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { formatSafeDate } from "@/lib/events/admin-event-normalization"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const vendorId = searchParams.get("vendorId")
    const siteMapId = searchParams.get("siteMapId")
    const status = searchParams.get("status")

    if (!vendorId) {
      return NextResponse.json({ error: "Vendor ID is required" }, { status: 400 })
    }

    // Build query for workflows
    let query = supabase
      .from("equipment_setup_workflows")
      .select(`
        *,
        tasks:equipment_setup_tasks(
          *
        ),
        site_map:site_maps!inner(
          id,
          name,
          created_by
        )
      `)
      .eq("site_map.created_by", vendorId)

    if (siteMapId) {
      query = query.eq("site_map_id", siteMapId)
    }

    if (status && status !== "all") {
      query = query.eq("status", status)
    }

    const { data: workflows, error } = await query.order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching workflows:", error)
      return NextResponse.json({ error: "Failed to fetch workflows" }, { status: 500 })
    }

    // Get workflow templates
    const { data: templates, error: templatesError } = await supabase
      .from("workflow_templates")
      .select("*")
      .eq("vendor_id", vendorId)
      .order("created_at", { ascending: false })

    // Get active executions
    const { data: executions, error: executionsError } = await supabase
      .from("workflow_executions")
      .select(`
        *,
        workflow:equipment_setup_workflows(
          name,
          estimated_duration_minutes
        )
      `)
      .eq("vendor_id", vendorId)
      .in("status", ["running", "paused"])

    return NextResponse.json({
      workflows: workflows || [],
      templates: templates || [],
      executions: executions || []
    })
  } catch (error) {
    console.error("Error in workflows API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const { vendorId, action, data } = body

    if (!vendorId) {
      return NextResponse.json({ error: "Vendor ID is required" }, { status: 400 })
    }

    switch (action) {
      case "create_workflow":
        // Create new workflow
        const { data: newWorkflow, error: createError } = await supabase
          .from("equipment_setup_workflows")
          .insert([{
            site_map_id: data.siteMapId,
            name: data.name,
            description: data.description,
            estimated_duration_minutes: data.estimatedDuration,
            priority: data.priority,
            assigned_team_leader: data.teamLeader,
            team_members: data.teamMembers,
            created_by: vendorId
          }])
          .select()
          .single()

        if (createError) {
          console.error("Error creating workflow:", createError)
          return NextResponse.json({ error: "Failed to create workflow" }, { status: 500 })
        }

        return NextResponse.json({ success: true, workflow: newWorkflow })

      case "start_workflow":
        // Start workflow execution
        const { data: execution, error: startError } = await supabase
          .from("workflow_executions")
          .insert([{
            workflow_id: data.workflowId,
            vendor_id: vendorId,
            status: "running",
            start_time: new Date().toISOString(),
            team_members: data.teamMembers
          }])
          .select()
          .single()

        if (startError) {
          console.error("Error starting workflow:", startError)
          return NextResponse.json({ error: "Failed to start workflow" }, { status: 500 })
        }

        // Update workflow status
        await supabase
          .from("equipment_setup_workflows")
          .update({ 
            status: "in_progress",
            actual_start_time: new Date().toISOString()
          })
          .eq("id", data.workflowId)

        return NextResponse.json({ success: true, execution })

      case "pause_workflow":
        // Pause workflow execution
        const { error: pauseError } = await supabase
          .from("workflow_executions")
          .update({ 
            status: "paused",
            paused_at: new Date().toISOString()
          })
          .eq("id", data.executionId)

        if (pauseError) {
          console.error("Error pausing workflow:", pauseError)
          return NextResponse.json({ error: "Failed to pause workflow" }, { status: 500 })
        }

        return NextResponse.json({ success: true, message: "Workflow paused" })

      case "stop_workflow":
        // Stop workflow execution
        const { error: stopError } = await supabase
          .from("workflow_executions")
          .update({ 
            status: "stopped",
            end_time: new Date().toISOString()
          })
          .eq("id", data.executionId)

        if (stopError) {
          console.error("Error stopping workflow:", stopError)
          return NextResponse.json({ error: "Failed to stop workflow" }, { status: 500 })
        }

        // Update workflow status
        await supabase
          .from("equipment_setup_workflows")
          .update({ 
            status: "cancelled",
            actual_end_time: new Date().toISOString()
          })
          .eq("id", data.workflowId)

        return NextResponse.json({ success: true, message: "Workflow stopped" })

      case "create_from_template":
        // Create workflow from template
        const { data: template, error: templateError } = await supabase
          .from("workflow_templates")
          .select("*")
          .eq("id", data.templateId)
          .single()

        if (templateError) {
          console.error("Error fetching template:", templateError)
          return NextResponse.json({ error: "Template not found" }, { status: 404 })
        }

        const { data: workflowFromTemplate, error: createFromTemplateError } = await supabase
          .from("equipment_setup_workflows")
          .insert([{
            site_map_id: data.siteMapId,
            name: `${template.name} - ${formatSafeDate(new Date().toISOString())}`,
            description: template.description,
            estimated_duration_minutes: template.estimated_duration,
            priority: template.priority,
            assigned_team_leader: data.teamLeader,
            team_members: data.teamMembers,
            created_by: vendorId
          }])
          .select()
          .single()

        if (createFromTemplateError) {
          console.error("Error creating workflow from template:", createFromTemplateError)
          return NextResponse.json({ error: "Failed to create workflow from template" }, { status: 500 })
        }

        // Create tasks from template
        if (template.tasks) {
          const tasks = template.tasks.map((task: any, index: number) => ({
            workflow_id: workflowFromTemplate.id,
            task_name: task.name,
            description: task.description,
            task_type: task.type,
            estimated_duration_minutes: task.duration,
            required_tools: task.tools,
            required_skills: task.skills,
            order_index: index,
            priority: task.priority || 2
          }))

          await supabase
            .from("equipment_setup_tasks")
            .insert(tasks)
        }

        return NextResponse.json({ success: true, workflow: workflowFromTemplate })

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }
  } catch (error) {
    console.error("Error in workflows POST API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
