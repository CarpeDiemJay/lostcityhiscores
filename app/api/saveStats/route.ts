import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  try {
    // 1. Parse the request body
    const { username, stats } = await request.json();
    if (!username || !stats) {
      return NextResponse.json({ error: "Missing username or stats" }, { status: 400 });
    }

    // 2. Create a Supabase client using the service role key (server-side)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 3. Insert a row into the "snapshots" table
    const { data, error } = await supabase
      .from("snapshots")
      .insert([{ username, stats }]);

    if (error) {
      console.error("Supabase insert error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    console.error("Unexpected error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
