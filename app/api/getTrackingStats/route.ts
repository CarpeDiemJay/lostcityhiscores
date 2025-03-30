import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

interface SkillData {
  type: number;
  level: number;
  rank: number;
  value: number;
}

interface Snapshot {
  id: number;
  username: string;
  created_at: string;
  stats: SkillData[];
}

/**
 * GET /api/getTrackingStats
 * Returns:
 * - Total unique players being tracked
 * - List of 5 most recently added players (based on first appearance) with their latest stats
 */
export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Get all snapshots ordered by creation time to find first appearances
    const { data: allSnapshots, error: snapshotsError } = await supabase
      .from('snapshots')
      .select('*')
      .order('created_at', { ascending: true });

    if (snapshotsError) throw snapshotsError;

    // Track first appearance and latest snapshot for each player
    const firstAppearance = new Map<string, { username: string; created_at: string }>();
    const latestSnapshot = new Map<string, Snapshot>();

    allSnapshots?.forEach(snapshot => {
      const lowerUsername = snapshot.username.toLowerCase();
      
      // Track first appearance
      if (!firstAppearance.has(lowerUsername)) {
        firstAppearance.set(lowerUsername, {
          username: snapshot.username,
          created_at: snapshot.created_at
        });
      }

      // Always update latest snapshot
      latestSnapshot.set(lowerUsername, snapshot);
    });

    // Get the 5 most recently added players (based on first appearance)
    // but return their latest stats
    const recentlyAdded = Array.from(firstAppearance.entries())
      .sort((a, b) => new Date(b[1].created_at).getTime() - new Date(a[1].created_at).getTime())
      .slice(0, 5)
      .map(([lowerUsername, firstSearch]) => {
        return latestSnapshot.get(lowerUsername)!;
      });

    return NextResponse.json({
      totalPlayers: firstAppearance.size,
      recentPlayers: recentlyAdded
    });
  } catch (err: any) {
    console.error("Error in getTrackingStats:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
} 