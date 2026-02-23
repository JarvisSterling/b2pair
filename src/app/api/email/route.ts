import { NextResponse } from "next/server";

/**
 * Email template system for B2Pair.
 * In production, integrate with Resend, SendGrid, or Postmark.
 * For now, generates HTML templates that can be sent via any provider.
 */

interface EmailData {
  to: string;
  template: "welcome" | "meeting_request" | "meeting_accepted" | "meeting_reminder" | "match_notification";
  data: Record<string, string>;
}

const BRAND = {
  name: "B2Pair",
  color: "#18181b",
  bg: "#fafafa",
  accent: "#18181b",
  url: process.env.NEXT_PUBLIC_APP_URL || "https://b2pair.com",
};

function baseLayout(content: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:${BRAND.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <div style="max-width:560px;margin:40px auto;padding:0 20px">
    <div style="text-align:center;margin-bottom:32px">
      <span style="font-size:20px;font-weight:700;color:${BRAND.color}">B2Pair</span>
    </div>
    <div style="background:#fff;border-radius:12px;border:1px solid #e4e4e7;padding:32px">
      ${content}
    </div>
    <div style="text-align:center;margin-top:24px;color:#a1a1aa;font-size:12px">
      <p>&copy; ${new Date().getFullYear()} B2Pair. All rights reserved.</p>
      <p><a href="${BRAND.url}" style="color:#71717a">b2pair.com</a></p>
    </div>
  </div>
</body>
</html>`;
}

function button(text: string, url: string): string {
  return `<a href="${url}" style="display:inline-block;background:${BRAND.accent};color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;margin-top:16px">${text}</a>`;
}

const templates: Record<string, (data: Record<string, string>) => { subject: string; html: string }> = {
  welcome: (data) => ({
    subject: "Welcome to B2Pair!",
    html: baseLayout(`
      <h1 style="margin:0 0 8px;font-size:22px;color:${BRAND.color}">Welcome, ${data.name}!</h1>
      <p style="color:#52525b;line-height:1.6;margin:0 0 16px">
        Your account is ready. B2Pair uses AI to match you with the right people at events,
        so you spend less time searching and more time connecting.
      </p>
      <p style="color:#52525b;line-height:1.6;margin:0 0 16px">
        Complete your profile to get better matches. The more we know about your expertise
        and interests, the smarter our recommendations get.
      </p>
      ${button("Complete Your Profile", `${BRAND.url}/dashboard/profile`)}
    `),
  }),

  meeting_request: (data) => ({
    subject: `Meeting request from ${data.requesterName}`,
    html: baseLayout(`
      <h1 style="margin:0 0 8px;font-size:22px;color:${BRAND.color}">New Meeting Request</h1>
      <p style="color:#52525b;line-height:1.6;margin:0 0 16px">
        <strong>${data.requesterName}</strong>${data.requesterTitle ? ` (${data.requesterTitle})` : ""}
        wants to meet with you at <strong>${data.eventName}</strong>.
      </p>
      ${data.note ? `<div style="background:#fafafa;border-radius:8px;padding:16px;margin:0 0 16px;border-left:3px solid ${BRAND.accent}"><p style="margin:0;color:#52525b;font-style:italic">"${data.note}"</p></div>` : ""}
      <p style="color:#52525b;line-height:1.6;margin:0 0 8px">
        <strong>Duration:</strong> ${data.duration || "30"} minutes<br>
        ${data.time ? `<strong>Proposed time:</strong> ${data.time}` : ""}
      </p>
      ${button("View Request", `${BRAND.url}/dashboard/meetings`)}
    `),
  }),

  meeting_accepted: (data) => ({
    subject: `${data.accepterName} accepted your meeting`,
    html: baseLayout(`
      <h1 style="margin:0 0 8px;font-size:22px;color:${BRAND.color}">Meeting Confirmed! ✓</h1>
      <p style="color:#52525b;line-height:1.6;margin:0 0 16px">
        <strong>${data.accepterName}</strong> accepted your meeting request
        at <strong>${data.eventName}</strong>.
      </p>
      ${data.time ? `<p style="color:#52525b;line-height:1.6;margin:0 0 16px"><strong>When:</strong> ${data.time}</p>` : ""}
      ${button("View Meeting", `${BRAND.url}/dashboard/meetings`)}
    `),
  }),

  meeting_reminder: (data) => ({
    subject: `Reminder: Meeting with ${data.otherName} ${data.timeLabel}`,
    html: baseLayout(`
      <h1 style="margin:0 0 8px;font-size:22px;color:${BRAND.color}">Meeting ${data.timeLabel}</h1>
      <p style="color:#52525b;line-height:1.6;margin:0 0 16px">
        Your meeting with <strong>${data.otherName}</strong> is coming up ${data.timeLabel}.
      </p>
      <div style="background:#fafafa;border-radius:8px;padding:16px;margin:0 0 16px">
        <p style="margin:0 0 4px;color:#18181b"><strong>Time:</strong> ${data.time}</p>
        <p style="margin:0 0 4px;color:#18181b"><strong>Duration:</strong> ${data.duration} min</p>
        ${data.location ? `<p style="margin:0;color:#18181b"><strong>Location:</strong> ${data.location}</p>` : ""}
      </div>
      ${button("Open Meetings", `${BRAND.url}/dashboard/meetings`)}
    `),
  }),

  match_notification: (data) => ({
    subject: `New match: ${data.matchName}`,
    html: baseLayout(`
      <h1 style="margin:0 0 8px;font-size:22px;color:${BRAND.color}">New Match Found!</h1>
      <p style="color:#52525b;line-height:1.6;margin:0 0 16px">
        Our AI found a strong match for you at <strong>${data.eventName}</strong>.
      </p>
      <div style="background:#fafafa;border-radius:8px;padding:16px;margin:0 0 16px">
        <p style="margin:0 0 4px;font-size:16px;font-weight:600;color:${BRAND.color}">${data.matchName}</p>
        ${data.matchTitle ? `<p style="margin:0 0 8px;color:#71717a">${data.matchTitle}</p>` : ""}
        <p style="margin:0;color:${BRAND.accent};font-weight:600">${data.score}% match</p>
        ${data.reason ? `<p style="margin:4px 0 0;color:#52525b;font-size:13px">${data.reason}</p>` : ""}
      </div>
      ${button("View Match", `${BRAND.url}/dashboard/matches`)}
    `),
  }),
};

export async function POST(request: Request) {
  const body: EmailData = await request.json();

  const generator = templates[body.template];
  if (!generator) {
    return NextResponse.json({ error: "Unknown template" }, { status: 400 });
  }

  const { subject, html } = generator(body.data);

  // In production: send via Resend/SendGrid
  // For now, return the generated email
  return NextResponse.json({ to: body.to, subject, html });
}
