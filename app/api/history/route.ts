import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

interface SkillData {
  type: number;
  level: number;
  rank: number;
  value: number;
}

interface Snapshot {
  created_at: string;
  stats: SkillData[];
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get('username');

  if (!username) {
    return NextResponse.json({ error: 'Username is required' }, { status: 400 });
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all snapshots for the player, ordered by date
    const { data: snapshots, error } = await supabase
      .from('snapshots')
      .select('created_at, stats')
      .eq('username', username)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }

    console.log(`Found ${snapshots?.length || 0} snapshots for ${username}`);

    if (!snapshots || snapshots.length === 0) {
      console.log(`No snapshots found for ${username}`);
      return NextResponse.json({ history: [], weeklyGain: 0, latestXp: 0 });
    }

    // Get the latest snapshot
    const latestSnapshot = snapshots[snapshots.length - 1];
    const latestXp = latestSnapshot.stats.find((s: SkillData) => s.type === 0)?.value || 0;
    
    // Find snapshot from approximately a week ago
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    const weekOldSnapshot = snapshots.find((snapshot: Snapshot) => 
      new Date(snapshot.created_at) <= oneWeekAgo
    ) || snapshots[0]; // fallback to oldest snapshot if no week-old data

    // Calculate weekly gain
    const weekOldXp = weekOldSnapshot.stats.find((s: SkillData) => s.type === 0)?.value || 0;
    const weeklyGain = Math.floor((latestXp - weekOldXp) / 10); // Convert to actual XP

    console.log('Weekly gain calculation:', {
      username,
      latestXp: Math.floor(latestXp / 10),
      weekOldXp: Math.floor(weekOldXp / 10),
      weeklyGain,
      snapshotCount: snapshots.length,
      oldestDate: snapshots[0].created_at,
      newestDate: latestSnapshot.created_at
    });

    // Transform the data to include historical points
    const history = snapshots.map((snapshot: Snapshot) => {
      try {
        const date = new Date(snapshot.created_at);
        if (isNaN(date.getTime())) {
          console.error('Invalid date in snapshot:', snapshot.created_at);
          return null;
        }
        return {
          date: date.toISOString(),
          xp: Math.floor((snapshot.stats.find((s: SkillData) => s.type === 0)?.value || 0) / 10),
        };
      } catch (err) {
        console.error('Error processing snapshot:', err, snapshot);
        return null;
      }
    }).filter(Boolean) as { date: string; xp: number }[];

    const response = {
      history,
      weeklyGain,
      latestXp: Math.floor(latestXp / 10),
    };

    console.log(`Returning history data for ${username}:`, {
      historyPoints: history.length,
      firstPoint: history[0],
      lastPoint: history[history.length - 1],
      weeklyGain,
      latestXp: Math.floor(latestXp / 10)
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching player history:', error);
    return NextResponse.json({ error: 'Failed to fetch player history' }, { status: 500 });
  }
} 