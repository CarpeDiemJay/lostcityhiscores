This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

# Lost City High Scores Tracker

## Database Setup

Two stored procedures are required for this application to function correctly:

### 1. Get Most Recent New Player

This procedure returns the most recently added new player (not just the most recent snapshot).

```sql
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
```

### 2. Get Distinct Player Count

This procedure returns the total count of unique players tracked in the system.

```sql
CREATE OR REPLACE FUNCTION get_distinct_player_count()
RETURNS integer AS $$
  SELECT COUNT(DISTINCT LOWER(username)) 
  FROM snapshots
  WHERE username IS NOT NULL;
$$ LANGUAGE sql;
```

To apply these procedures:
1. Open your Supabase project
2. Go to the SQL Editor
3. Paste and execute each SQL statement

## Query Logic Explanation

1. **Total Players Count**: We use case-insensitive (`LOWER()`) distinct player count to account for variations in username capitalization.

2. **Latest Player**: We show the most recently added new player (not just the most recent snapshot). This ensures we display new players joining the tracking system rather than showing the same player who is frequently updating.
