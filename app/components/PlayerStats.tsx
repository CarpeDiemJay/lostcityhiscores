interface PlayerStatsProps {
  rank: number;
  combatLevel: number;
  totalLevel: number;
  totalXP: number;
}

export default function PlayerStats({ rank, combatLevel, totalLevel, totalXP }: PlayerStatsProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
      <div className="bg-[#111827]/90 backdrop-blur-sm rounded-xl border border-blue-500/20 p-6">
        <div className="text-blue-400">Rank</div>
        <div className="text-2xl text-white">#{rank.toLocaleString()}</div>
      </div>
      <div className="bg-[#111827]/90 backdrop-blur-sm rounded-xl border border-blue-500/20 p-6">
        <div className="text-blue-400">Combat Level</div>
        <div className="text-2xl text-white">{combatLevel}</div>
      </div>
      <div className="bg-[#111827]/90 backdrop-blur-sm rounded-xl border border-blue-500/20 p-6">
        <div className="text-blue-400">Total Level</div>
        <div className="text-2xl text-white">{totalLevel.toLocaleString()}</div>
      </div>
      <div className="bg-[#111827]/90 backdrop-blur-sm rounded-xl border border-blue-500/20 p-6">
        <div className="text-blue-400">Total XP</div>
        <div className="text-2xl text-white">{totalXP.toLocaleString()}</div>
      </div>
    </div>
  );
} 