import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import {
  getWorkModeEvent,
  WorkModeReadError,
} from "@/lib/work-mode/read-model";
import type {
  WorkModeApiResponse,
  WorkModeEventPayload,
} from "@/types/hiring-roster-work-mode";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const { eventId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json<WorkModeApiResponse<WorkModeEventPayload>>(
      {
        error: "Sign in to view this event workspace.",
        code: "not_authenticated",
      },
      { status: 401 },
    );
  }

  try {
    const data = await getWorkModeEvent(supabase, user.id, eventId);
    if (!data) {
      return NextResponse.json<WorkModeApiResponse<WorkModeEventPayload>>(
        {
          error: "Event workspace not found or not available for this worker.",
          code: "not_found",
        },
        { status: 404 },
      );
    }
    return NextResponse.json<WorkModeApiResponse<WorkModeEventPayload>>(
      { data },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    const message =
      error instanceof WorkModeReadError
        ? error.message
        : "This event workspace is temporarily unavailable.";
    return NextResponse.json<WorkModeApiResponse<WorkModeEventPayload>>(
      { error: message, code: "unavailable" },
      { status: 503 },
    );
  }
}
