import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * GET /api/getHistory?username=...
 * Returns all snapshots for the specified user, sorted by created_at ascending.
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
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching snapshot history:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ snapshots: data });
  } catch (err: any) {
    console.error("Unexpected error in getHistory:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
