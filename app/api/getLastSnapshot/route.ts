import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * GET /api/getLastSnapshot?username=...
 * Returns the single latest snapshot for the specified user.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get("username");
  if (!username) {
    return NextResponse.json({ error: "Missing 'username' query param" }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
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

    // If there's no data, return null
    if (!data || data.length === 0) {
      return NextResponse.json({ snapshot: null });
    }

    return NextResponse.json({ snapshot: data[0] });
  } catch (err: any) {
    console.error("Unexpected error in getLastSnapshot:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
