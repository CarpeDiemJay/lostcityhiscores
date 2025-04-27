"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

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

/** Format a date as "X time ago" */
function timeAgo(date: Date) {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + " years ago";
  
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + " months ago";
  
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + " days ago";
  
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + " hours ago";
  
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + " minutes ago";
  
  return Math.floor(seconds) + " seconds ago";
}

export default function TrackingStats() {
  const [stats, setStats] = useState<TrackingStats | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch('/api/getTrackingStats');
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || 'Failed to fetch tracking stats');
        }
        const data = await res.json();
        
        if (!data.totalPlayers || !data.recentPlayers || data.recentPlayers.length === 0) {
          console.error('Invalid data format received:', data);
          throw new Error('Received invalid data format from tracking stats API');
        }
        
        setStats(data);
      } catch (err) {
        console.error('Error fetching tracking stats:', err);
        setError(err instanceof Error ? err.message : 'Failed to load tracking statistics');
      }
    }

    fetchStats();
    // Refresh every 5 minutes
    const interval = setInterval(fetchStats, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (error) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-red-400"
      >
        {error}
      </motion.div>
    );
  }

  if (!stats) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-gray-400"
      >
        Loading tracking statistics...
      </motion.div>
    );
  }

  // Get the most recent player
  const latestPlayer = stats.recentPlayers[0];
  const latestPlayerStats = latestPlayer?.stats.find(s => s.type === 0);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-7xl mx-auto"
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="bg-[#111827]/90 backdrop-blur-sm rounded-lg p-4 border border-blue-500/20 flex flex-col items-center justify-center"
      >
        <div className="text-3xl font-bold text-blue-400">{stats.totalPlayers}</div>
        <div className="text-sm text-gray-400">Players Tracked</div>
      </motion.div>

      {latestPlayer && (
        <>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="bg-[#111827]/90 backdrop-blur-sm rounded-lg p-4 border border-blue-500/20 flex flex-col items-center justify-center"
          >
            <div className="text-sm text-gray-400">Latest Player</div>
            <Link 
              href={`/user/${encodeURIComponent(latestPlayer.username)}`}
              onClick={(e) => {
                e.preventDefault(); // Prevent the default navigation
                // First set the username
                window.dispatchEvent(
                  new CustomEvent('search-player', { 
                    detail: { username: latestPlayer.username }
                  })
                );
                // Then trigger the search after a small delay to ensure state is updated
                setTimeout(() => {
                  window.dispatchEvent(
                    new CustomEvent('trigger-search', { 
                      detail: { username: latestPlayer.username }
                    })
                  );
                }, 0);
                // Update the URL without a full page reload
                window.history.pushState({}, '', `/user/${encodeURIComponent(latestPlayer.username)}`);
              }}
              className="text-lg font-semibold text-blue-400 hover:text-blue-300 transition-colors"
            >
              {latestPlayer.username}
            </Link>
            <div className="text-xs text-gray-500 mt-1">
              First tracked {timeAgo(new Date(latestPlayer.created_at))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.3 }}
            className="bg-[#111827]/90 backdrop-blur-sm rounded-lg p-4 border border-blue-500/20 flex flex-col items-center justify-center"
          >
            <div className="flex items-center gap-2">
              <img src="/ui/Stats_icon.png" alt="Stats" className="w-4 h-4" />
              <div className="text-blue-400">
                Level {latestPlayerStats?.level.toLocaleString()}
              </div>
            </div>
            <div className="text-sm text-gray-400 mt-1">
              {xpValue(latestPlayerStats!).toLocaleString()} XP
            </div>
          </motion.div>
        </>
      )}
    </motion.div>
  );
} 