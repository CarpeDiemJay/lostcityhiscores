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
 * - The most recently added player with their latest stats
 */
export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    console.log('Fetching tracking stats...');

    // Get all usernames using pagination to bypass the 1000 row limit
    let allUsernames: string[] = [];
    let page = 0;
    const pageSize = 1000;
    
    while (true) {
      const { data, error } = await supabase
        .from('snapshots')
        .select('username')
        .range(page * pageSize, (page + 1) * pageSize - 1)
        .throwOnError();

      if (error) {
        console.error('Error getting player data:', error);
        throw error;
      }

      if (!data || data.length === 0) break;

      allUsernames = allUsernames.concat(data.map(row => row.username));
      if (data.length < pageSize) break;
      page++;
    }

    // Count unique usernames (case insensitive)
    const uniqueUsernames = new Set(allUsernames.map(username => username.toLowerCase()));
    const totalPlayers = uniqueUsernames.size;
    console.log('Total unique players:', totalPlayers);
    console.log('Unique usernames:', Array.from(uniqueUsernames).sort());
    console.log('Total snapshots:', allUsernames.length);

    // Get the most recent snapshot
    const { data: latestData, error: latestError } = await supabase
      .from('snapshots')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .throwOnError();

    if (latestError) throw latestError;

    return NextResponse.json({
      totalPlayers,
      recentPlayers: latestData || []
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (err: any) {
    console.error("Error in getTrackingStats:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
} 