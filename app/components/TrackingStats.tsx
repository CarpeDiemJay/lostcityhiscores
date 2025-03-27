"use client";

import React, { useState, useEffect } from 'react';
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

  const diffMins = Math.floor(diffMs / (1000 * 60));
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  
  const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffHrs < 24) return `${diffHrs}h ago`;
  
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return `${diffDays}d ago`;
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

  if (error) {
    return <div className="text-red-400">{error}</div>;
  }

  if (!stats) {
    return <div className="text-gray-400">Loading tracking statistics...</div>;
  }

  // Get the most recent player
  const latestPlayer = stats.recentPlayers[0];
  const latestPlayerStats = latestPlayer?.stats.find(s => s.type === 0);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-7xl mx-auto">
      <div className="bg-[#111827]/90 backdrop-blur-sm rounded-lg p-4 border border-blue-500/20 flex flex-col items-center justify-center">
        <div className="text-3xl font-bold text-blue-400">{stats.totalPlayers}</div>
        <div className="text-sm text-gray-400">Players Tracked</div>
      </div>

      {latestPlayer && (
        <>
          <div className="bg-[#111827]/90 backdrop-blur-sm rounded-lg p-4 border border-blue-500/20 flex flex-col items-center justify-center">
            <div className="text-sm text-gray-400">Latest Player</div>
            <Link 
              href={`/tracker?username=${encodeURIComponent(latestPlayer.username)}`}
              className="text-lg font-semibold text-blue-400 hover:text-blue-300 transition-colors"
            >
              {latestPlayer.username}
            </Link>
            <div className="text-xs text-gray-500 mt-1">
              {timeAgo(new Date(latestPlayer.created_at))}
            </div>
          </div>

          <div className="bg-[#111827]/90 backdrop-blur-sm rounded-lg p-4 border border-blue-500/20 flex flex-col items-center justify-center">
            <div className="flex items-center gap-2">
              <img src="/ui/Stats_icon.png" alt="Stats" className="w-4 h-4" />
              <div className="text-blue-400">
                Level {latestPlayerStats?.level.toLocaleString()}
              </div>
            </div>
            <div className="text-sm text-gray-400 mt-1">
              {xpValue(latestPlayerStats!).toLocaleString()} XP
            </div>
          </div>
        </>
      )}
    </div>
  );
} 