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
    // Get all unique usernames with their latest update time
    const { data: uniqueUsers, error: uniqueError } = await supabase
      .from('snapshots')
      .select('username, created_at')
      .order('created_at', { ascending: false });

    if (uniqueError) throw uniqueError;

    // Create a map of lowercase username to their latest update details
    const latestUpdates = new Map<string, { username: string; created_at: string }>();
    uniqueUsers?.forEach(snapshot => {
      const lowerUsername = snapshot.username.toLowerCase();
      if (!latestUpdates.has(lowerUsername)) {
        latestUpdates.set(lowerUsername, {
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

    // Combine the data: use latest stats and sort by most recent update time
    const combinedSnapshots = Array.from(latestByUsername.values())
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5);

    return NextResponse.json({
      totalPlayers: latestUpdates.size,
      recentPlayers: combinedSnapshots
    });
  } catch (err: any) {
    console.error("Error in getTrackingStats:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
} 