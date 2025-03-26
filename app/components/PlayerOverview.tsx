import RankBadge from './RankBadge';
import TrackButton from './TrackButton';
import { timeAgo } from '../utils/timeAgo';

interface PlayerOverviewProps {
  username: string;
  rank: number;
  combatLevel: number;
  totalLevel: number;
  totalXp: number;
  lastUpdated: string | null;
  onTrack?: () => void;
  isTracking?: boolean;
  rankBadge?: string | null;
}

export default function PlayerOverview({
  username,
  rank,
  combatLevel,
  totalLevel,
  totalXp,
  lastUpdated,
  onTrack,
  isTracking,
  rankBadge
}: PlayerOverviewProps) {
  return (
    <div className="bg-[#2c2f33]/90 backdrop-blur-sm rounded-xl border border-[#c6aa54]/50 p-4 sm:p-8 mb-8 shadow-lg">
      <div className="flex flex-col sm:flex-row justify-between items-start gap-6 mb-8">
        <div>
          <div className="flex flex-wrap items-center gap-4 mb-3">
            <h2 className="text-3xl font-bold text-[#c6aa54]">{username}</h2>
            {rankBadge && (
              <span className="px-3 py-1 bg-[#c6aa54]/20 text-[#c6aa54] text-sm font-medium rounded-full">
                {rankBadge}
              </span>
            )}
            {isTracking ? (
              <span className="px-3 py-1 bg-green-500/20 text-green-400 text-sm font-medium rounded-full">
                Tracked
              </span>
            ) : onTrack && (
              <TrackButton onClick={onTrack} />
            )}
          </div>
          {lastUpdated && (
            <p className="text-sm text-gray-400">
              Last updated {timeAgo(new Date(lastUpdated))}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-4 sm:p-6 border border-gray-700/50">
          <p className="text-sm text-[#c6aa54] font-medium mb-2">Rank</p>
          <p className="text-2xl sm:text-3xl font-bold">#{rank.toLocaleString()}</p>
        </div>
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-4 sm:p-6 border border-gray-700/50">
          <p className="text-sm text-[#c6aa54] font-medium mb-2">Combat Level</p>
          <p className="text-2xl sm:text-3xl font-bold">{combatLevel}</p>
        </div>
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-4 sm:p-6 border border-gray-700/50">
          <p className="text-sm text-[#c6aa54] font-medium mb-2">Total Level</p>
          <p className="text-2xl sm:text-3xl font-bold">{totalLevel}</p>
        </div>
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-4 sm:p-6 border border-gray-700/50">
          <p className="text-sm text-[#c6aa54] font-medium mb-2">Total XP</p>
          <p className="text-2xl sm:text-3xl font-bold">{totalXp.toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
} 