import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get("username");
  if (!username) {
    return NextResponse.json({ error: "Missing username" }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Get the most recent snapshot
  const { data, error } = await supabase
    .from("snapshots")
    .select("*")
    .eq("username", username)
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) {
    console.error("Error fetching last snapshot:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data || data.length === 0) {
    // No previous snapshots
    return NextResponse.json({ snapshot: null });
  }

  return NextResponse.json({ snapshot: data[0] });
}
