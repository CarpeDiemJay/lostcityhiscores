require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function tryFetchWithUsername(username) {
  const url = `https://services.runescape.com/m=hiscore_oldschool/index_lite.ws?player=${encodeURIComponent(username)}`;
  console.log(`Trying URL: ${url}`);
  
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Lost City Hiscores Tracker (contact@lostcityhiscores.com)',
      'Accept': 'text/plain'
    }
  });
  
  if (!response.ok) {
    console.log(`Failed with ${username}: ${response.status}`);
    return null;
  }
  
  const text = await response.text();
  if (!text.includes(',')) {
    console.log(`Invalid response format for ${username}`);
    return null;
  }
  
  return text;
}

async function fetchPlayerStats(username) {
  try {
    // Try different username formats
    const formats = [
      username,                              // Original
      username.toLowerCase(),                // Lowercase
      username.replace(/ /g, '_'),          // Spaces to underscores
      username.toLowerCase().replace(/ /g, '_'), // Lowercase + underscores
      username.replace(/\s+/g, ''),         // Remove spaces
      username.toLowerCase().replace(/\s+/g, '') // Lowercase + remove spaces
    ];
    
    console.log(`\nTrying different formats for "${username}":`);
    
    let successText = null;
    for (const format of formats) {
      const result = await tryFetchWithUsername(format);
      if (result) {
        console.log(`Success with format: "${format}"`);
        successText = result;
        break;
      }
      // Wait a bit between attempts
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    if (!successText) {
      throw new Error(`Failed to fetch stats for ${username} (tried ${formats.length} formats)`);
    }
    
    const lines = successText.trim().split('\n');
    console.log(`Parsed ${lines.length} skill lines`);
    
    // Parse the CSV-like response into our stats format
    const stats = lines.map((line, index) => {
      const [rank, level, xp] = line.split(',').map(Number);
      return {
        type: index,
        rank,
        level,
        value: Math.floor(xp * 10) // We store XP * 10 in our DB
      };
    });
    
    return stats;
  } catch (error) {
    console.error(`Error fetching ${username}:`, error);
    return null;
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
    console.log(`Found ${uniqueUsernames.length} players to update`);
    
    // Update each player
    for (const username of uniqueUsernames) {
      console.log(`\nProcessing player: ${username}`);
      const stats = await fetchPlayerStats(username);
      if (!stats) {
        console.log('Skipping player due to fetch error');
        continue;
      }
      
      // Save new snapshot
      const { error: saveError } = await supabase
        .from('snapshots')
        .insert([{ username, stats }]);
        
      if (saveError) {
        console.error(`Error saving ${username}:`, saveError);
        continue;
      }
      
      console.log(`Successfully updated ${username}`);
      
      // Sleep 2 seconds between requests to be nice to the API
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    console.log('\nUpdate complete!');
  } catch (error) {
    console.error('Error in updateAllPlayers:', error);
    process.exit(1);
  }
}

// Run the update
updateAllPlayers(); 