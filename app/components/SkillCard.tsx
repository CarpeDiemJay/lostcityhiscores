interface SkillCardProps {
  name: string;
  icon: string;
  level: number;
  xp: number;
  rank: number;
  xpProgress?: number;
}

export default function SkillCard({ name, icon, level, xp, rank, xpProgress = 0 }: SkillCardProps) {
  return (
    <div className="bg-[#111827]/90 backdrop-blur-sm rounded-lg border border-blue-500/20 p-3 flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <img src={icon} alt={name} className="w-4 h-4" />
        <span className="text-blue-400 text-sm font-medium">{name}</span>
        <span className="text-blue-400 text-sm ml-auto">{level}</span>
      </div>

      {/* XP Progress Bar */}
      <div className="h-1.5 bg-[#1F2937] rounded-full overflow-hidden">
        <div 
          className="h-full bg-blue-500 rounded-full"
          style={{ width: `${xpProgress}%` }}
        />
      </div>

      <div className="flex justify-between text-xs">
        <div className="text-gray-500">
          XP: {xp.toLocaleString()}
        </div>
        <div className="text-gray-500">
          #{rank.toLocaleString()}
        </div>
      </div>
    </div>
  );
} 