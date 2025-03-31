import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

interface SkillData {
  type: number;
  level: number;
  rank: number;
  value: number;
}

interface Snapshot {
  id: string;
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
    
    // Get all usernames with pagination to handle potential >1000 record limits
    const allUsernames: string[] = [];
    const pageSize = 1000;
    let hasMore = true;
    let currentPage = 0;
    
    while (hasMore) {
      const { data, error } = await supabase
        .from('snapshots')
        .select('username')
        .range(currentPage * pageSize, (currentPage + 1) * pageSize - 1);
        
      if (error) throw error;
      
      if (!data || data.length === 0) {
        hasMore = false;
      } else {
        // Extract usernames and add to collection (convert to lowercase)
        data.forEach(item => allUsernames.push(item.username.toLowerCase()));
        currentPage++;
      }
    }
    
    // Count unique usernames (already converted to lowercase above)
    const uniqueCount = new Set(allUsernames).size;
    console.log(`Total records processed: ${allUsernames.length}, Unique players: ${uniqueCount}`);
    
    // You'll need to create this stored procedure in your Supabase instance
    // using the exact SQL query you've verified works
    const { data: newestPlayer, error: newestPlayerError } = await supabase
      .rpc('get_most_recent_new_player');

    if (newestPlayerError) {
      console.error("Error fetching newest player:", newestPlayerError);
      
      // Fallback to getting the most recent snapshot if stored procedure fails
      const { data: latestPlayer, error: latestPlayerError } = await supabase
        .from('snapshots')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1);
        
      if (latestPlayerError) throw latestPlayerError;
      
      return NextResponse.json({
        totalPlayers: uniqueCount,
        recentPlayers: latestPlayer
      }, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
    }

    // Ensure we return an array
    const playerArray = Array.isArray(newestPlayer) ? newestPlayer : [newestPlayer];

    return NextResponse.json({
      totalPlayers: uniqueCount,
      recentPlayers: playerArray
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