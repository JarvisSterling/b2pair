import { NextResponse } from "next/server";

/**
 * DEPRECATED: Old sponsors API. Use /api/events/[eventId]/companies, /sponsors, /exhibitors instead.
 * Kept temporarily for backward compatibility during migration.
 */
export async function GET() {
  return NextResponse.json(
    { error: "This endpoint is deprecated. Use /api/events/[eventId]/sponsors or /exhibitors" },
    { status: 410 }
  );
}

export async function POST() {
  return NextResponse.json(
    { error: "This endpoint is deprecated. Use /api/events/[eventId]/companies" },
    { status: 410 }
  );
}

export async function PATCH() {
  return NextResponse.json(
    { error: "This endpoint is deprecated. Use /api/events/[eventId]/companies/[companyId]" },
    { status: 410 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: "This endpoint is deprecated." },
    { status: 410 }
  );
}
