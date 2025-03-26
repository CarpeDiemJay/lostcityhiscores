"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface SkillData {
  type: number;
  level: number;
  rank: number;
  value: number;
}

interface Snapshot {
  id: number;
  username: string;
  created_at: string;
  stats: SkillData[];
}

interface TrackingStats {
  totalPlayers: number;
  recentPlayers: Snapshot[];
}

/** For labeling each skill, color, etc. */
const skillMeta: Record<number, { name: string; icon: string }> = {
  0:  { name: "Overall",     icon: "/ui/Stats_icon.png"      },
  1:  { name: "Attack",      icon: "/ui/Attack_icon.png"     },
  2:  { name: "Defence",     icon: "/ui/Defence_icon.png"    },
  3:  { name: "Strength",    icon: "/ui/Strength_icon.png"   },
  4:  { name: "Hitpoints",   icon: "/ui/Hitpoints_icon.png"  },
};

/** A quick helper to do XP * 10 => real XP. */
function xpValue(s: SkillData) {
  return Math.floor(s.value / 10);
}

/** A quick time-ago function */
function timeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  if (diffMs < 0) return "in the future";

  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHrs = Math.floor((diffMs / (1000 * 60 * 60)) % 24);
  const diffMins = Math.floor((diffMs / (1000 * 60)) % 60);

  const parts: string[] = [];
  if (diffDays > 0) parts.push(`${diffDays}d`);
  if (diffHrs > 0) parts.push(`${diffHrs}h`);
  if (diffMins > 0) parts.push(`${diffMins}m`);

  if (parts.length === 0) {
    return "just now";
  }
  return parts.join(" ") + " ago";
}

export default function TrackingStats() {
  const [stats, setStats] = useState<TrackingStats | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch('/api/getTrackingStats');
        if (!res.ok) {
          throw new Error('Failed to fetch tracking stats');
        }
        const data = await res.json();
        setStats(data);
      } catch (err) {
        console.error('Error fetching tracking stats:', err);
        setError('Failed to load tracking statistics');
      }
    }

    fetchStats();
    // Refresh every 5 minutes
    const interval = setInterval(fetchStats, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  async function handlePlayerClick(username: string, e: React.MouseEvent) {
    e.preventDefault();
    
    try {
      // First fetch latest stats
      const res = await fetch(`/api/getStats?username=${encodeURIComponent(username)}`);
      if (!res.ok) {
        throw new Error('Failed to fetch latest stats');
      }
      const data = await res.json();
      
      // Then save them
      await fetch('/api/saveStats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, stats: data })
      });
      
      // Finally redirect
      window.location.href = `/tracker?username=${encodeURIComponent(username)}`;
    } catch (err) {
      console.error('Error updating player stats:', err);
      // Still redirect even if save fails
      window.location.href = `/tracker?username=${encodeURIComponent(username)}`;
    }
  }

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  if (!stats) {
    return <div>Loading tracking statistics...</div>;
  }

  return (
    <div className="bg-[#2c2f33]/90 backdrop-blur-sm rounded-xl border border-[#c6aa54]/50 p-8 shadow-lg">
      <h2 className="text-2xl font-bold text-[#c6aa54] mb-6">Tracking Statistics</h2>
      
      <div className="mb-6">
        <p className="text-lg">
          Total Players Tracked:{" "}
          <span className="font-bold text-white">{stats.totalPlayers}</span>
        </p>
      </div>

      <div>
        <h3 className="text-xl font-semibold text-[#c6aa54] mb-4">Recently Tracked Players</h3>
        <div className="space-y-4">
          {stats.recentPlayers.map((player) => {
            const overall = player.stats.find(s => s.type === 0);
            if (!overall) return null;

            return (
              <div key={player.id} className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-4 border border-gray-700/50">
                <div className="flex items-center justify-between mb-2">
                  <button 
                    onClick={(e) => handlePlayerClick(player.username, e)}
                    className="text-[#c6aa54] hover:text-[#e9d5a0] font-semibold transition-colors"
                  >
                    {player.username}
                  </button>
                  <span className="text-gray-400 text-sm">
                    {timeAgo(new Date(player.created_at))}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 flex items-center justify-center rounded bg-gray-900/50 p-1">
                    <img
                      src="/ui/Stats_icon.png"
                      alt="Overall"
                      className="w-full h-full"
                    />
                  </div>
                  <span className="text-gray-300">
                    Level {overall.level} ({xpValue(overall).toLocaleString()} XP)
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
} 