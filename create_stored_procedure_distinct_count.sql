-- Create stored procedure to count distinct players
CREATE OR REPLACE FUNCTION get_distinct_player_count()
RETURNS integer AS $$
  SELECT COUNT(DISTINCT LOWER(username)) 
  FROM snapshots
  WHERE username IS NOT NULL;
$$ LANGUAGE sql; 