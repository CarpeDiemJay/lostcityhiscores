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
 * - List of 5 most recently tracked players with their latest stats
 */
export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // First get all unique usernames with their first search time
    const { data: uniqueUsers, error: uniqueError } = await supabase
      .from('snapshots')
      .select('username, created_at')
      .order('created_at', { ascending: true });

    if (uniqueError) throw uniqueError;

    // Create a map of lowercase username to their first occurrence details
    const firstSearches = new Map<string, { username: string; created_at: string }>();
    uniqueUsers?.forEach(snapshot => {
      const lowerUsername = snapshot.username.toLowerCase();
      if (!firstSearches.has(lowerUsername)) {
        firstSearches.set(lowerUsername, {
          username: snapshot.username, // Keep original casing
          created_at: snapshot.created_at
        });
      }
    });

    // Get the latest snapshot for each unique username
    const { data: latestSnapshots, error: snapshotsError } = await supabase
      .from('snapshots')
      .select('*')
      .order('created_at', { ascending: false });

    if (snapshotsError) throw snapshotsError;

    // Create a map of lowercase username to their latest snapshot
    const latestByUsername = new Map<string, Snapshot>();
    latestSnapshots?.forEach(snapshot => {
      const lowerUsername = snapshot.username.toLowerCase();
      if (!latestByUsername.has(lowerUsername)) {
        latestByUsername.set(lowerUsername, snapshot);
      }
    });

    // Combine the data: use latest stats but sort by first search time
    const combinedSnapshots = Array.from(firstSearches.entries())
      .sort((a, b) => new Date(b[1].created_at).getTime() - new Date(a[1].created_at).getTime())
      .slice(0, 5)
      .map(([lowerUsername, firstSearch]) => {
        const latestSnapshot = latestByUsername.get(lowerUsername);
        return {
          ...latestSnapshot,
          username: firstSearch.username // Use the original casing from first search
        };
      });

    return NextResponse.json({
      totalPlayers: firstSearches.size,
      recentPlayers: combinedSnapshots
    });
  } catch (err: any) {
    console.error("Error in getTrackingStats:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
} 