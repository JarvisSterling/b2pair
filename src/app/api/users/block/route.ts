import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { userId } = await request.json();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  const { error } = await supabase.from("blocks").insert({
    blocker_id: user.id,
    blocked_id: userId,
  });

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ message: "Already blocked" });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(request: Request) {
  const { userId } = await request.json();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await supabase
    .from("blocks")
    .delete()
    .eq("blocker_id", user.id)
    .eq("blocked_id", userId);

  return NextResponse.json({ success: true });
}
