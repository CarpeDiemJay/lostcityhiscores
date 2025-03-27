import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

interface SkillData {
  type: number;
  level: number;
  rank: number;
  value: number;
}

const BANNED_THRESHOLD = 30; // Days before considering account inactive
const MIN_UPDATE_INTERVAL = 30; // Minutes between updates for the same player

/**
 * POST /api/saveStats
 * Expects { username: string, stats: SkillData[] } in the JSON body.
 * Inserts a new row into the "snapshots" table if needed.
 */
export async function POST(request: Request) {
  try {
    const { username, stats } = await request.json();

    if (!username || !stats) {
      return NextResponse.json({ error: "Missing 'username' or 'stats' in request body" }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check last update time
    const { data: lastSnapshot } = await supabase
      .from("snapshots")
      .select("*")
      .eq("username", username)
      .order("created_at", { ascending: false })
      .limit(1);

    if (lastSnapshot?.length) {
      const lastUpdate = new Date(lastSnapshot[0].created_at);
      const minutesSinceUpdate = (Date.now() - lastUpdate.getTime()) / (1000 * 60);
      
      // If it's been less than MIN_UPDATE_INTERVAL minutes, return the existing snapshot
      if (minutesSinceUpdate < MIN_UPDATE_INTERVAL) {
        return NextResponse.json({ 
          success: true, 
          snapshot: lastSnapshot[0],
          message: "Using recent snapshot" 
        });
      }

      // Check if account might be inactive
      const daysSinceUpdate = minutesSinceUpdate / (24 * 60);
      if (daysSinceUpdate > BANNED_THRESHOLD) {
        const { data: recentSnapshots } = await supabase
          .from("snapshots")
          .select("stats")
          .eq("username", username)
          .order("created_at", { ascending: false })
          .limit(2);

        if (recentSnapshots && recentSnapshots.length >= 2) {
          const noXpGain = JSON.stringify(recentSnapshots[0].stats) === JSON.stringify(recentSnapshots[1].stats);
          if (noXpGain) {
            return NextResponse.json({ 
              success: true, 
              snapshot: lastSnapshot[0],
              message: "Account appears inactive" 
            });
          }
        }
      }

      // Calculate XP gained
      const oldOverall = lastSnapshot[0].stats.find((s: SkillData) => s.type === 0)?.value || 0;
      const newOverall = stats.find((s: SkillData) => s.type === 0)?.value || 0;
      
      // If no XP gained, return existing snapshot
      if (newOverall <= oldOverall) {
        return NextResponse.json({ 
          success: true, 
          snapshot: lastSnapshot[0],
          message: "No XP gained" 
        });
      }
    }

    // Insert a new snapshot
    const { data, error } = await supabase
      .from("snapshots")
      .insert([{ username, stats }])
      .select("*");

    if (error) {
      console.error("Supabase insert error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      snapshot: data?.[0],
      message: "New snapshot created" 
    });
  } catch (err: any) {
    console.error("Unexpected error in saveStats:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
