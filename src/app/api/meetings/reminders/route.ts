import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/meetings/reminders
 * Send notification reminders for upcoming meetings.
 * Designed to be called by a cron job every 15 minutes.
 * Sends reminders 1 hour and 15 minutes before meetings.
 */
export async function GET(request: Request) {
  // Verify cron secret if configured
  const authHeader = request.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const in15min = new Date(now.getTime() + 15 * 60 * 1000);
  const in1hour = new Date(now.getTime() + 60 * 60 * 1000);
  const in1hour15 = new Date(now.getTime() + 75 * 60 * 1000);

  // Find meetings starting in ~15 minutes (window: 15-30min)
  const { data: soonMeetings } = await supabaseAdmin
    .from("meetings")
    .select(`
      id, start_time, duration_minutes, meeting_type, location,
      requester_id, recipient_id
    `)
    .eq("status", "accepted")
    .gte("start_time", in15min.toISOString())
    .lt("start_time", new Date(in15min.getTime() + 15 * 60 * 1000).toISOString());

  // Find meetings starting in ~1 hour (window: 60-75min)
  const { data: upcomingMeetings } = await supabaseAdmin
    .from("meetings")
    .select(`
      id, start_time, duration_minutes, meeting_type, location,
      requester_id, recipient_id
    `)
    .eq("status", "accepted")
    .gte("start_time", in1hour.toISOString())
    .lt("start_time", in1hour15.toISOString());

  const allMeetings = [
    ...(soonMeetings || []).map((m) => ({ ...m, reminderType: "15min" as const })),
    ...(upcomingMeetings || []).map((m) => ({ ...m, reminderType: "1hour" as const })),
  ];

  if (!allMeetings.length) {
    return NextResponse.json({ reminders: 0 });
  }

  // Get participant names
  const participantIds = new Set<string>();
  for (const m of allMeetings) {
    participantIds.add(m.requester_id);
    participantIds.add(m.recipient_id);
  }

  const { data: participants } = await supabaseAdmin
    .from("participants")
    .select("id, user_id, profiles!inner(full_name)")
    .in("id", [...participantIds]);

  const pMap = new Map((participants || []).map((p: any) => [p.id, p]));

  // Create notifications
  const notifications: {
    user_id: string;
    type: string;
    title: string;
    body: string;
    link: string;
  }[] = [];

  for (const meeting of allMeetings) {
    const requester = pMap.get(meeting.requester_id) as any;
    const recipient = pMap.get(meeting.recipient_id) as any;
    if (!requester || !recipient) continue;

    const startTime = new Date(meeting.start_time);
    const timeStr = startTime.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });

    const timeLabel = meeting.reminderType === "15min" ? "in 15 minutes" : "in 1 hour";
    const locationStr = meeting.location ? ` at ${meeting.location}` : "";

    // Notify requester
    notifications.push({
      user_id: requester.user_id,
      type: "meeting_reminder",
      title: `Meeting with ${recipient.profiles.full_name} ${timeLabel}`,
      body: `${timeStr}${locationStr} · ${meeting.duration_minutes}min`,
      link: "/dashboard/meetings",
    });

    // Notify recipient
    notifications.push({
      user_id: recipient.user_id,
      type: "meeting_reminder",
      title: `Meeting with ${requester.profiles.full_name} ${timeLabel}`,
      body: `${timeStr}${locationStr} · ${meeting.duration_minutes}min`,
      link: "/dashboard/meetings",
    });
  }

  if (notifications.length > 0) {
    await supabaseAdmin.from("notifications").insert(notifications);
  }

  return NextResponse.json({
    reminders: notifications.length,
    meetings: allMeetings.length,
  });
}
