import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  try {
    const { username, stats } = await request.json();
    if (!username || !stats) {
      return NextResponse.json({ error: "Missing username or stats" }, { status: 400 });
    }

    // Connect to Supabase with service role key
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Insert a new row into the 'snapshots' table
    const { data, error } = await supabase
      .from("snapshots")
      .insert([{ username, stats }])
      .select("*"); // return inserted row

    if (error) {
      console.error("Supabase insert error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // data should be an array with the inserted row
    return NextResponse.json({ success: true, snapshot: data?.[0] });
  } catch (err: any) {
    console.error("Unexpected error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
