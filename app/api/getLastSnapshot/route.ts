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

  // Grab the most recent snapshot (descending by created_at)
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

  // If none found, return null
  if (!data || data.length === 0) {
    return NextResponse.json({ snapshot: null });
  }

  return NextResponse.json({ snapshot: data[0] });
}
