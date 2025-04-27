/**
 * Script to apply stored procedures to Supabase database
 * 
 * Usage:
 * Run with: node apply_stored_procedures.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Use environment variables for Supabase credentials
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

// Stored procedures to apply
const storedProcedures = [
  // Get most recent new player
  `
  CREATE OR REPLACE FUNCTION get_most_recent_new_player()
  RETURNS SETOF snapshots AS $$
    WITH first_entries AS (
      SELECT DISTINCT ON (LOWER(username)) *
      FROM snapshots
      ORDER BY LOWER(username), created_at ASC
    )
    SELECT *
    FROM first_entries
    ORDER BY created_at DESC
    LIMIT 1;
  $$ LANGUAGE sql;
  `,
  
  // Get distinct player count
  `
  CREATE OR REPLACE FUNCTION get_distinct_player_count()
  RETURNS integer AS $$
    SELECT COUNT(DISTINCT LOWER(username)) 
    FROM snapshots
    WHERE username IS NOT NULL;
  $$ LANGUAGE sql;
  `
];

async function applyStoredProcedures() {
  console.log('Applying stored procedures to Supabase...');
  
  for (const [index, procedure] of storedProcedures.entries()) {
    try {
      console.log(`\nApplying procedure ${index + 1}/${storedProcedures.length}...`);
      const { error } = await supabase.rpc('exec_sql', { sql: procedure });
      
      if (error) {
        console.error(`Error applying procedure ${index + 1}:`, error);
      } else {
        console.log(`Successfully applied procedure ${index + 1}`);
      }
    } catch (err) {
      console.error(`Exception applying procedure ${index + 1}:`, err);
    }
  }
  
  console.log('\nFinished applying stored procedures');
}

// Execute the function
applyStoredProcedures(); 