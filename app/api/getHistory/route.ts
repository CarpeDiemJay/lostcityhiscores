import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: Request) {
  // 1. Parse the query string to get "username"
  const { searchParams } = new URL(request.url);
  const username = searchParams.get("username");
  if (!username) {
    return NextResponse.json({ error: "Missing username" }, { status: 400 });
  }

  // 2. Connect to Supabase
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // 3. Query the snapshots table
    const { data, error } = await supabase
      .from("snapshots")
      .select("*")
      .eq("username", username)
      .order("created_at", { ascending: true }); // earliest to latest

    if (error) {
      // If there's an error, return a 500
      console.error("Error fetching snapshots history:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 4. Return the array of snapshots
    // "data" should be an array of rows: { id, username, created_at, stats, ... }
    return NextResponse.json({ snapshots: data });
  } catch (err: any) {
    console.error("Unexpected error in getHistory:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
