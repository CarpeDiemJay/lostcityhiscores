import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * POST /api/saveStats
 * Expects { username: string, stats: SkillData[] } in the JSON body.
 * Inserts a new row into the "snapshots" table.
 */
export async function POST(request: Request) {
  try {
    const { username, stats } = await request.json();

    if (!username || !stats) {
      return NextResponse.json({ error: "Missing 'username' or 'stats' in request body" }, { status: 400 });
    }

    // Normalize username to lowercase
    const normalizedUsername = username.toLowerCase();

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Insert a new snapshot
    const { data, error } = await supabase
      .from("snapshots")
      .insert([{ username: normalizedUsername, stats }])
      .select("*");

    if (error) {
      console.error("Supabase insert error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, snapshot: data?.[0] });
  } catch (err: any) {
    console.error("Unexpected error in saveStats:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
