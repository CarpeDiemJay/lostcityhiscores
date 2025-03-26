interface RankBadgeProps {
  rank: number;
}

export default function RankBadge({ rank }: RankBadgeProps) {
  let badge = '';
  let color = '';

  if (rank === 1) {
    badge = 'Rank 1';
    color = 'from-yellow-300 to-amber-500';
  } else if (rank <= 10) {
    badge = 'Top 10';
    color = 'from-slate-300 to-slate-400';
  } else if (rank <= 50) {
    badge = 'Top 50';
    color = 'from-amber-600 to-amber-700';
  } else if (rank <= 100) {
    badge = 'Top 100';
    color = 'from-emerald-500 to-emerald-600';
  } else if (rank <= 500) {
    badge = 'Top 500';
    color = 'from-sky-500 to-sky-600';
  } else if (rank <= 1000) {
    badge = 'Top 1000';
    color = 'from-violet-500 to-violet-600';
  } else if (rank <= 2000) {
    badge = 'Top 2000';
    color = 'from-rose-500 to-rose-600';
  }

  if (!badge) return null;

  return (
    <div className={`px-3 py-1 bg-gradient-to-r ${color} text-black text-sm font-medium rounded-full shadow-md`}>
      {badge}
    </div>
  );
} 