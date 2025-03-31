-- Create the stored procedure
CREATE OR REPLACE FUNCTION get_most_recent_new_player()
RETURNS SETOF snapshots AS $$
  WITH first_entries AS (
    SELECT DISTINCT ON (username) *
    FROM snapshots
    ORDER BY username, created_at ASC
  )
  SELECT *
  FROM first_entries
  ORDER BY created_at DESC
  LIMIT 1;
$$ LANGUAGE sql; 