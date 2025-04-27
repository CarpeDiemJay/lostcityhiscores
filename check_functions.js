const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkFunctions() {
  console.log('Testing Supabase functions...');
  
  try {
    console.log('Testing get_distinct_player_count...');
    const { data: countData, error: countError } = await supabase.rpc('get_distinct_player_count');
    
    if (countError) {
      console.error('Error with get_distinct_player_count:', countError);
    } else {
      console.log('Distinct player count:', countData);
    }
    
    console.log('\nTesting get_most_recent_new_player...');
    const { data: playerData, error: playerError } = await supabase.rpc('get_most_recent_new_player');
    
    if (playerError) {
      console.error('Error with get_most_recent_new_player:', playerError);
    } else {
      console.log('Most recent player data:', JSON.stringify(playerData, null, 2));
      
      // Get the first snapshot directly to compare
      const { data: snapData, error: snapError } = await supabase
        .from('snapshots')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1);
        
      console.log('\nFirst snapshot in database:', 
                 snapData && snapData.length > 0 ? 
                 `${snapData[0].username}, created at: ${snapData[0].created_at}` : 
                 'None found');
    }
  } catch (err) {
    console.error('Exception caught:', err);
  }
}

// Run the function
checkFunctions().catch(console.error); 