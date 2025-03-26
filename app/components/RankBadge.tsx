interface RankBadgeProps {
  rank: number;
}

export default function RankBadge({ rank }: RankBadgeProps) {
  const getRankBadge = (rank: number): { text: string; color: string } | null => {
    if (rank === 1) return { text: 'Rank 1', color: 'from-purple-500 to-purple-700' };
    if (rank <= 5) return { text: 'Top 5', color: 'from-red-500 to-red-700' };
    if (rank <= 10) return { text: 'Top 10', color: 'from-orange-500 to-orange-700' };
    if (rank <= 25) return { text: 'Top 25', color: 'from-yellow-500 to-yellow-700' };
    if (rank <= 50) return { text: 'Top 50', color: 'from-green-500 to-green-700' };
    if (rank <= 100) return { text: 'Top 100', color: 'from-teal-500 to-teal-700' };
    if (rank <= 250) return { text: 'Top 250', color: 'from-blue-500 to-blue-700' };
    if (rank <= 500) return { text: 'Top 500', color: 'from-indigo-500 to-indigo-700' };
    if (rank <= 1000) return { text: 'Top 1000', color: 'from-violet-500 to-violet-700' };
    if (rank <= 2000) return { text: 'Top 2000', color: 'from-pink-500 to-pink-700' };
    if (rank <= 3000) return { text: 'Top 3000', color: 'from-rose-500 to-rose-700' };
    return null;
  };

  const badge = getRankBadge(rank);
  if (!badge) return null;

  return (
    <div className={`px-3 py-1 rounded-full text-sm font-medium text-white bg-gradient-to-r ${badge.color}`}>
      {badge.text}
    </div>
  );
} 