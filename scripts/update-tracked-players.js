const { createClient } = require('@supabase/supabase-js');
const pLimit = require('p-limit');

// More detailed debug logging
console.log('Environment variables detailed check:');
console.log('Process env keys:', Object.keys(process.env));
console.log('NEXT_PUBLIC_SUPABASE_URL type:', typeof process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log('NEXT_PUBLIC_SUPABASE_URL length:', process.env.NEXT_PUBLIC_SUPABASE_URL?.length);
console.log('SUPABASE_SERVICE_ROLE_KEY type:', typeof process.env.SUPABASE_SERVICE_ROLE_KEY);
console.log('SUPABASE_SERVICE_ROLE_KEY length:', process.env.SUPABASE_SERVICE_ROLE_KEY?.length);

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Constants
const RATE_LIMIT = 1; // Reduced to 1 concurrent request
const RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 10000; // Increased to 10 seconds
const REQUEST_TIMEOUT = 10000; // 10 seconds
const BANNED_THRESHOLD = 30; // Days before considering account inactive
const MIN_UPDATE_INTERVAL = 30; // Minutes between updates for the same player

// Metrics
let metrics = {
  totalPlayers: 0,
  successfulUpdates: 0,
  failedUpdates: 0,
  skippedPlayers: 0,
  totalXpGained: 0,
  startTime: Date.now(),
  mostRecentNewPlayer: null  // Track the most recently added new player
};

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'User-Agent': 'Lost City Hiscores Tracker (GitHub Actions)',
        'Accept': 'application/json',
        ...options.headers
      },
      signal: controller.signal
    });
    return response;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchPlayerStats(username, attempt = 1) {
  const url = `https://2004.lostcity.rs/api/hiscores/player/${encodeURIComponent(username)}`;
  console.log(`Fetching stats for ${username} (attempt ${attempt}/${RETRY_ATTEMPTS})`);
  
  try {
    const response = await fetchWithTimeout(url);
    console.log(`Response status for ${username}: ${response.status}`);

    if (response.status === 404) {
      console.log(`Player not found: ${username}`);
      return null;
    }
    
    if (!response.ok) {
      if (attempt < RETRY_ATTEMPTS) {
        console.log(`Failed with ${response.status}, retrying in ${RETRY_DELAY/1000}s...`);
        await sleep(RETRY_DELAY);
        return fetchPlayerStats(username, attempt + 1);
      }
      throw new Error(`Failed after ${RETRY_ATTEMPTS} attempts: ${response.status}`);
    }
    
    const stats = await response.json();
    if (!Array.isArray(stats)) {
      throw new Error('Invalid response format: expected array');
    }
    
    return stats;
  } catch (error) {
    if (error.name === 'AbortError') {
      if (attempt < RETRY_ATTEMPTS) {
        console.log(`Request timed out, retrying...`);
        await sleep(RETRY_DELAY);
        return fetchPlayerStats(username, attempt + 1);
      }
      throw new Error(`Request timed out after ${RETRY_ATTEMPTS} attempts`);
    }
    throw error;
  }
}

async function shouldUpdatePlayer(username) {
  // Check last update time
  const { data: lastSnapshot } = await supabase
    .from('snapshots')
    .select('created_at, stats')
    .eq('username', username)
    .order('created_at', { ascending: false })
    .limit(1);

  if (!lastSnapshot?.length) return true;

  const lastUpdate = new Date(lastSnapshot[0].created_at);
  const minutesSinceUpdate = (Date.now() - lastUpdate.getTime()) / (1000 * 60);
  
  // If it's been less than MIN_UPDATE_INTERVAL minutes, skip
  if (minutesSinceUpdate < MIN_UPDATE_INTERVAL) {
    console.log(`${username} updated recently, skipping...`);
    metrics.skippedPlayers++;
    return false;
  }

  // Check if account might be inactive
  const daysSinceUpdate = minutesSinceUpdate / (24 * 60);
  if (daysSinceUpdate > BANNED_THRESHOLD) {
    const { data: recentSnapshots } = await supabase
      .from('snapshots')
      .select('stats')
      .eq('username', username)
      .order('created_at', { ascending: false })
      .limit(2);

    if (recentSnapshots?.length >= 2) {
      const noXpGain = JSON.stringify(recentSnapshots[0].stats) === JSON.stringify(recentSnapshots[1].stats);
      if (noXpGain) {
        console.log(`${username} appears inactive, skipping...`);
        metrics.skippedPlayers++;
        return false;
      }
    }
  }

  return true;
}

async function calculateXpGained(username, newStats) {
  const { data: lastSnapshot } = await supabase
    .from('snapshots')
    .select('stats')
    .eq('username', username)
    .order('created_at', { ascending: false })
    .limit(1);

  if (!lastSnapshot?.length) return 0;

  const oldOverall = lastSnapshot[0].stats.find(s => s.type === 0)?.value || 0;
  const newOverall = newStats.find(s => s.type === 0)?.value || 0;
  return Math.max(0, newOverall - oldOverall);
}

async function savePlayerStats(username, stats) {
  try {
    // Check if this is a new player
    const { data: existingSnapshots, error: checkError } = await supabase
      .from('snapshots')
      .select('count')
      .eq('username', username);

    const isNewPlayer = !existingSnapshots || existingSnapshots.length === 0;

    // Check last update time and apply restrictions for automated updates
    const { data: lastSnapshot } = await supabase
      .from('snapshots')
      .select('*')
      .eq('username', username)
      .order('created_at', { ascending: false })
      .limit(1);

    if (lastSnapshot?.length) {
      const lastUpdate = new Date(lastSnapshot[0].created_at);
      const minutesSinceUpdate = (Date.now() - lastUpdate.getTime()) / (1000 * 60);
      
      // If it's been less than MIN_UPDATE_INTERVAL minutes, return the existing snapshot
      if (minutesSinceUpdate < MIN_UPDATE_INTERVAL) {
        return { 
          success: true, 
          snapshot: lastSnapshot[0],
          message: "Using recent snapshot",
          isNewPlayer: false
        };
      }

      // Calculate XP gained
      const oldOverall = lastSnapshot[0].stats.find(s => s.type === 0)?.value || 0;
      const newOverall = stats.find(s => s.type === 0)?.value || 0;
      
      // If no XP gained, return existing snapshot
      if (newOverall <= oldOverall) {
        return { 
          success: true, 
          snapshot: lastSnapshot[0],
          message: "No XP gained",
          isNewPlayer: false
        };
      }
    }

    // Insert new snapshot
    const { data, error } = await supabase
      .from('snapshots')
      .insert([{ username, stats }])
      .select('*');

    if (error) {
      console.error("Supabase insert error:", error);
      throw error;
    }

    // If this is a new player, update our metrics
    if (isNewPlayer) {
      metrics.mostRecentNewPlayer = {
        username,
        stats,
        timestamp: new Date()
      };
    }

    return { 
      success: true, 
      snapshot: data?.[0],
      message: "New snapshot created",
      isNewPlayer
    };
  } catch (error) {
    console.error(`Error saving stats for ${username}:`, error);
    throw error;
  }
}

async function updateAllPlayers() {
  try {
    // Get list of unique usernames from snapshots table
    const { data: players, error: fetchError } = await supabase
      .from('snapshots')
      .select('username')
      .order('created_at', { ascending: false });
      
    if (fetchError) throw fetchError;
    
    // Get unique usernames (latest snapshot first)
    const uniqueUsernames = [...new Set(players.map(p => p.username))];
    metrics.totalPlayers = uniqueUsernames.length;
    console.log(`Found ${uniqueUsernames.length} players to update`);
    
    // Create a rate limiter
    const limit = pLimit(RATE_LIMIT);
    
    // Process players concurrently with rate limiting
    const updatePromises = uniqueUsernames.map(username => limit(async () => {
      try {
        // Check if we should update this player
        if (!await shouldUpdatePlayer(username)) {
          return;
        }

        console.log(`\nProcessing player: ${username}`);
        const stats = await fetchPlayerStats(username);
        if (!stats) {
          console.log('Failed to fetch stats');
          metrics.failedUpdates++;
          return;
        }
        
        // Save stats using the API endpoint
        const result = await savePlayerStats(username, stats);
        console.log(`Save result for ${username}:`, result);

        if (result.message === "New snapshot created") {
          metrics.successfulUpdates++;
          // Calculate XP gained from the result
          const oldOverall = result.snapshot?.stats?.find(s => s.type === 0)?.value || 0;
          const newOverall = stats.find(s => s.type === 0)?.value || 0;
          const xpGained = Math.max(0, newOverall - oldOverall);
          metrics.totalXpGained += xpGained;
          console.log(`Successfully updated ${username} (+${xpGained} XP)`);
          
          if (result.isNewPlayer) {
            console.log(`New player added: ${username}`);
          }
        } else {
          metrics.skippedPlayers++;
          console.log(`Skipped ${username}: ${result.message}`);
        }
      } catch (error) {
        console.error(`Error processing ${username}:`, error);
        metrics.failedUpdates++;
      }
    }));
    
    // Wait for all updates to complete
    await Promise.all(updatePromises);
    
    // Log final metrics
    const duration = (Date.now() - metrics.startTime) / 1000;
    console.log('\nUpdate complete!');
    console.log('Metrics:');
    console.log(`- Duration: ${duration.toFixed(1)}s`);
    console.log(`- Total players: ${metrics.totalPlayers}`);
    console.log(`- Successful updates: ${metrics.successfulUpdates}`);
    console.log(`- Failed updates: ${metrics.failedUpdates}`);
    console.log(`- Skipped players: ${metrics.skippedPlayers}`);
    console.log(`- Total XP gained: ${metrics.totalXpGained.toLocaleString()}`);
    if (metrics.mostRecentNewPlayer) {
      console.log(`- Most recent new player: ${metrics.mostRecentNewPlayer.username} (added ${metrics.mostRecentNewPlayer.timestamp.toISOString()})`);
    }
    
    // Exit with error if success rate is too low
    const successRate = metrics.successfulUpdates / (metrics.totalPlayers - metrics.skippedPlayers);
    if (successRate < 0.8) {
      throw new Error(`Success rate too low: ${(successRate * 100).toFixed(1)}%`);
    }
  } catch (error) {
    console.error('Error in updateAllPlayers:', error);
    process.exit(1);
  }
}

// Run the update
updateAllPlayers(); 