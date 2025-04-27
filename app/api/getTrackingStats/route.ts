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
  
  console.log('Env check: NEXT_PUBLIC_SUPABASE_URL exists:', !!supabaseUrl);
  console.log('Env check: SUPABASE_SERVICE_ROLE_KEY exists:', !!supabaseServiceKey);
  
  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json({ error: "Missing environment variables" }, { status: 500 });
  }
  
  console.log('Creating supabase client...');
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  try {
    // First get a count of total rows
    console.log('Getting total record count...');
    const { count, error: countError } = await supabase
      .from('snapshots')
      .select('*', { count: 'exact', head: true });
      
    if (countError) {
      console.error('Error getting record count:', countError);
      return NextResponse.json({ error: countError.message }, { status: 500 });
    }
    
    if (!count) {
      console.log('No records found');
      return NextResponse.json({ 
        totalPlayers: 0, 
        recentPlayers: [] 
      });
    }
    
    console.log(`Total records in database: ${count}`);
    
    // Process all records in pages
    const pageSize = 1000; // Supabase limit
    const totalPages = Math.ceil(count / pageSize);
    
    console.log(`Will process ${totalPages} pages of data...`);
    
    // Track unique usernames and first appearances
    const uniqueUsernames = new Set<string>();
    const firstAppearance = new Map<string, {username: string, created_at: number}>();
    
    // Process each page of data
    for (let i = 0; i < totalPages; i++) {
      const from = i * pageSize;
      const to = from + pageSize - 1;
      
      console.log(`Processing page ${i+1}/${totalPages} (records ${from}-${to})...`);
      
      const { data: pageData, error: pageError } = await supabase
        .from('snapshots')
        .select('username, created_at')
        .range(from, to);
        
      if (pageError) {
        console.error(`Error fetching page ${i+1}:`, pageError);
        continue; // Skip this page on error, but continue processing
      }
      
      if (!pageData || pageData.length === 0) {
        console.log(`No data found on page ${i+1}`);
        continue;
      }
      
      console.log(`Processing ${pageData.length} records from page ${i+1}...`);
      
      // Process the data
      pageData.forEach(snapshot => {
        if (!snapshot.username) return;
        
        // Add to unique usernames
        uniqueUsernames.add(snapshot.username);
        
        // Track first appearance
        const createdAt = new Date(snapshot.created_at).getTime();
        
        if (!firstAppearance.has(snapshot.username)) {
          firstAppearance.set(snapshot.username, {
            username: snapshot.username,
            created_at: createdAt
          });
        } else {
          // Update if this is an earlier appearance
          const existing = firstAppearance.get(snapshot.username)!;
          if (createdAt < existing.created_at) {
            firstAppearance.set(snapshot.username, {
              username: snapshot.username,
              created_at: createdAt
            });
          }
        }
      });
      
      console.log(`After page ${i+1}: Found ${uniqueUsernames.size} unique players so far`);
    }
    
    const totalPlayers = uniqueUsernames.size;
    console.log(`Final count: ${totalPlayers} unique players in database`);
    
    // Find the most recently added player (newest first appearance)
    const playersArray = Array.from(firstAppearance.values())
      .sort((a, b) => b.created_at - a.created_at);
      
    if (playersArray.length === 0) {
      console.log('No player data available after processing');
      return NextResponse.json({ 
        totalPlayers, 
        recentPlayers: [] 
      });
    }
    
    // The newest player is the one with the most recent first appearance
    const newestPlayer = playersArray[0].username;
    console.log(`Most recently added player: ${newestPlayer}`);
    
    // Get the first snapshot for this player (instead of latest)
    const { data: playerData, error: playerError } = await supabase
      .from('snapshots')
      .select('*')
      .eq('username', newestPlayer)
      .order('created_at', { ascending: true })  // Changed to ascending to get the first snapshot
      .limit(1);
      
    if (playerError) {
      console.error('Error fetching player data:', playerError);
      return NextResponse.json({ error: playerError.message }, { status: 500 });
    }
    
    return NextResponse.json({
      totalPlayers,
      recentPlayers: playerData
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (err: any) {
    console.error("Error in getTrackingStats:", err);
    return NextResponse.json({ error: err.message || "Unknown error" }, { status: 500 });
  }
} 