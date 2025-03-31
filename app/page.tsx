import { Overview } from './components/Overview';

export const metadata = {
  title: 'Lost City Tracker',
  description: 'Track your Lost City progress. Compare stats, track XP gains, and more.',
};

// @ts-ignore - Temporarily disable TypeScript checking to fix build issues
export default function Home(props: any) {
  const username = typeof props.searchParams?.username === 'string' ? props.searchParams.username : '';
  const compareUsername = typeof props.searchParams?.compare === 'string' ? props.searchParams.compare : '';

  return (
    <main className="flex min-h-screen flex-col items-center p-4 md:p-24">
      <a href="/" className="text-4xl font-bold text-blue-400 hover:text-blue-300 transition-colors mb-8">
        Lost City Tracker
      </a>
      <Overview initialUsername={username} initialCompareUsername={compareUsername} />
    </main>
  );
}
