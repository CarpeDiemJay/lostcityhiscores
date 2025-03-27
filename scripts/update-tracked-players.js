const { createClient } = require('@supabase/supabase-js');
const pLimit = require('p-limit');

// Debug: Check if environment variables are set
console.log('Supabase URL defined:', !!process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log('Service Role Key defined:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Constants
const RATE_LIMIT = 2; // Number of concurrent requests
const RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 5000; // 5 seconds
const REQUEST_TIMEOUT = 10000; // 10 seconds
const BANNED_THRESHOLD = 30; // Days before considering account inactive

// Metrics
let metrics = {
  totalPlayers: 0,
  successfulUpdates: 0,
  failedUpdates: 0,
  skippedPlayers: 0,
  totalXpGained: 0,
  startTime: Date.now(),
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
    .select('created_at')
    .eq('username', username)
    .order('created_at', { ascending: false })
    .limit(1);

  if (!lastSnapshot?.length) return true;

  const lastUpdate = new Date(lastSnapshot[0].created_at);
  const hoursSinceUpdate = (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60);

  // Check if account might be banned/inactive
  if (hoursSinceUpdate > BANNED_THRESHOLD * 24) {
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
        
        // Calculate XP gained
        const xpGained = await calculateXpGained(username, stats);
        metrics.totalXpGained += xpGained;

        // Save new snapshot
        const { error: saveError } = await supabase
          .from('snapshots')
          .insert([{ username, stats }]);
          
        if (saveError) {
          console.error(`Error saving ${username}:`, saveError);
          metrics.failedUpdates++;
          return;
        }
        
        console.log(`Successfully updated ${username} (+${xpGained} XP)`);
        metrics.successfulUpdates++;
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