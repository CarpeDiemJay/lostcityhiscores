import { Overview } from './components/Overview';

export const metadata = {
  title: 'Lost City Tracker',
  description: 'Track your Lost City progress. Compare stats, track XP gains, and more.',
};

// Use the correct Next.js types for App Router
type SearchParams = { [key: string]: string | string[] | undefined };

export default async function Home({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const username = typeof searchParams.username === 'string' ? searchParams.username : '';
  
  return (
    <main className="flex min-h-screen flex-col items-center p-4 md:p-24">
      <a href="/" className="text-4xl font-bold text-blue-400 hover:text-blue-300 transition-colors mb-8">
        Lost City Tracker
      </a>
      <Overview initialUsername={username} />
    </main>
  );
}
