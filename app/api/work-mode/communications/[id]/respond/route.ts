import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import {
  executeServiceRoleJob,
  resolveServiceRoleJobOrgId,
} from "@/lib/supabase/service-role-job";

const responseSchema = z.object({
  source: z.enum(["team_communication", "event_bulletin"]),
  action: z.enum(["mark_read", "acknowledge"]),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const parsed = responseSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid communication response.", code: "validation" },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json(
      { error: "Not authenticated", code: "not_authenticated" },
      { status: 401 },
    );

  const reason = "Apply an authorized worker communication response";
  const orgId = await resolveServiceRoleJobOrgId({
    reason,
    moduleId: "work.communications.response",
    lookup: async (service) => {
      if (parsed.data.source === "team_communication") {
        const { data } = await service
          .from("team_communications")
          .select("org_id, recipients")
          .eq("id", id)
          .maybeSingle();
        if (!data || !data.recipients.includes(user.id)) return null;
        return data.org_id;
      }
      const { data } = await service
        .from("event_bulletins")
        .select("event_id")
        .eq("id", id)
        .maybeSingle();
      if (!data) return null;
      const { data: assignment } = await service
        .from("employment_assignments")
        .select("id")
        .eq("user_id", user.id)
        .in("status", ["confirmed", "active"])
        .or(`event_v2_id.eq.${data.event_id},event_id.eq.${data.event_id}`)
        .limit(1)
        .maybeSingle();
      if (!assignment) return null;
      const { data: event } = await service
        .from("events_v2")
        .select("org_id")
        .eq("id", data.event_id)
        .maybeSingle();
      return event?.org_id || null;
    },
  });
  if (!orgId) {
    return NextResponse.json(
      { error: "Communication not found.", code: "not_found" },
      { status: 404 },
    );
  }

  return executeServiceRoleJob(
    { orgId, reason, moduleId: "work.communications.response" },
    async (service) => {
      const field =
        parsed.data.action === "mark_read" ? "read_by" : "acknowledged_by";
      const query =
        parsed.data.source === "team_communication"
          ? service
              .from("team_communications")
              .select("read_by, acknowledged_by")
              .eq("id", id)
          : service
              .from("event_bulletins")
              .select("read_by, acknowledged_by")
              .eq("id", id);
      const { data: record } = await query.maybeSingle();
      if (!record)
        return NextResponse.json(
          { error: "Communication not found.", code: "not_found" },
          { status: 404 },
        );
      const current = Array.isArray(record[field])
        ? (record[field] as string[])
        : [];
      if (!current.includes(user.id)) current.push(user.id);
      const { error } =
        parsed.data.source === "team_communication"
          ? await service
              .from("team_communications")
              .update({ [field]: current })
              .eq("id", id)
          : await service
              .from("event_bulletins")
              .update({ [field]: current })
              .eq("id", id);
      if (error)
        return NextResponse.json(
          { error: "Unable to save response.", code: "unavailable" },
          { status: 503 },
        );
      return NextResponse.json({ data: { id, action: parsed.data.action } });
    },
  );
}
