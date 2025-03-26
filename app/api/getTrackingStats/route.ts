import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * GET /api/getTrackingStats
 * Returns:
 * - Total unique players being tracked
 * - List of 5 most recently tracked players with their latest stats
 */
export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Get unique player count
    const { data: uniquePlayers, error: countError } = await supabase
      .from('snapshots')
      .select('username')
      .order('created_at', { ascending: false });

    if (countError) throw countError;

    // Get unique usernames (latest snapshot first)
    const uniqueUsernames = [...new Set(uniquePlayers.map(p => p.username))];
    
    // Get most recent 5 players with their latest stats
    const recentPlayers = [];
    for (const username of uniqueUsernames.slice(0, 5)) {
      const { data: snapshots, error: playerError } = await supabase
        .from('snapshots')
        .select('*')
        .eq('username', username)
        .order('created_at', { ascending: false })
        .limit(1);

      if (playerError) continue;
      if (snapshots && snapshots.length > 0) {
        recentPlayers.push(snapshots[0]);
      }
    }

    return NextResponse.json({
      totalPlayers: uniqueUsernames.length,
      recentPlayers
    });
  } catch (err: any) {
    console.error("Error in getTrackingStats:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
} 