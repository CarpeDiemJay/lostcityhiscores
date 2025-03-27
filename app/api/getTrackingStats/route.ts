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
    // Get all snapshots ordered by creation date
    const { data: allSnapshots, error: snapshotsError } = await supabase
      .from('snapshots')
      .select('*')
      .order('created_at', { ascending: false });

    if (snapshotsError) throw snapshotsError;

    // Process snapshots to get latest unique players
    const seen = new Set<string>();
    const latestSnapshots = allSnapshots
      ?.filter(snapshot => {
        const username = snapshot.username.toLowerCase();
        if (seen.has(username)) return false;
        seen.add(username);
        return true;
      })
      .slice(0, 5) || [];

    return NextResponse.json({
      totalPlayers: seen.size,
      recentPlayers: latestSnapshots
    });
  } catch (err: any) {
    console.error("Error in getTrackingStats:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
} 