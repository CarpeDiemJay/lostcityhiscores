"use client";

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SearchInput from './SearchInput';
import TrackingStats from './TrackingStats';
import PlayerStats from './PlayerStats';
import SkillCard from './SkillCard';
import PlayerTracker from './PlayerTracker';
import { calculateCombatLevel, getNextLevelXP, getCurrentLevelXP } from '@/lib/utils';
import { skillMeta } from '@/lib/constants';

interface OverviewProps {
  initialUsername?: string;
}

interface SkillData {
  type: number;
  level: number;
  rank: number;
  value: number;
  date?: string;
}

export function Overview({ initialUsername = '' }: OverviewProps) {
  const [username, setUsername] = useState(initialUsername);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<SkillData[] | null>(null);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<'overview' | 'tracker'>('overview');

  const fetchAndTrackPlayer = useCallback(async () => {
    if (!username) return;
    setLoading(true);
    setError("");
    setData(null);

    try {
      // Fetch current stats
      const response = await fetch(`/api/hiscores?username=${encodeURIComponent(username)}`);
      if (!response.ok) {
        throw new Error("Failed to fetch player data.");
      }
      const json = await response.json();

      if (!Array.isArray(json) || json.length === 0) {
        setError("Player not found or no data returned.");
        return;
      }

      // Save stats automatically
      await fetch('/api/saveStats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, stats: json, isAutomatedUpdate: false })
      });

      setData(json);
    } catch (err) {
      console.error(err);
      setError("Something went wrong while fetching hiscores.");
    } finally {
      setLoading(false);
    }
  }, [username]);

  // Fetch data when initialUsername changes
  useEffect(() => {
    if (initialUsername) {
      fetchAndTrackPlayer();
    }
  }, [initialUsername, fetchAndTrackPlayer]);

  useEffect(() => {
    const handleSearch = (event: CustomEvent<{ username: string }>) => {
      const searchUsername = event.detail.username;
      setUsername(searchUsername);
    };

    const handleTriggerSearch = () => {
      fetchAndTrackPlayer();
    };

    window.addEventListener('search-player', handleSearch as EventListener);
    window.addEventListener('trigger-search', handleTriggerSearch as EventListener);
    
    return () => {
      window.removeEventListener('search-player', handleSearch as EventListener);
      window.removeEventListener('trigger-search', handleTriggerSearch as EventListener);
    };
  }, [fetchAndTrackPlayer]);

  // Find overall stats if data exists
  const overall = data?.find(skill => skill.type === 0);

  return (
    <div className="w-full max-w-6xl">
      <AnimatePresence mode="wait">
        {!data || !overall ? (
          /* Initial Search View */
          <motion.div
            key="search"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="text-center"
          >
            <p className="text-xl text-gray-300 mb-12 max-w-2xl mx-auto">
              Track your Lost City progress. Compare your stats and share your gains!
            </p>
            <div className="max-w-2xl mx-auto">
              <SearchInput
                value={username}
                onChange={setUsername}
                onSearch={fetchAndTrackPlayer}
                loading={loading}
              />
            </div>
            {error && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-4 text-red-400"
              >
                {error}
              </motion.p>
            )}
            {!data && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-2xl mx-auto mt-16"
              >
                <TrackingStats />
              </motion.div>
            )}
          </motion.div>
        ) : (
          /* Player Data View */
          <motion.div
            key="player-data"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Tabs with Player Name */}
            <div className="flex items-center justify-between mb-8 border-b border-blue-500/20">
              <div className="flex space-x-1">
                <motion.button
                  whileHover={{ backgroundColor: "rgba(59, 130, 246, 0.1)" }}
                  onClick={() => setActiveTab('overview')}
                  className={`px-6 py-3 text-sm font-medium rounded-t-lg transition-colors ${
                    activeTab === 'overview'
                      ? 'bg-blue-500/10 text-blue-400 border-b-2 border-blue-500'
                      : 'text-gray-400 hover:text-blue-400'
                  }`}
                >
                  Overview
                </motion.button>
                <motion.button
                  whileHover={{ backgroundColor: "rgba(59, 130, 246, 0.1)" }}
                  onClick={() => setActiveTab('tracker')}
                  className={`px-6 py-3 text-sm font-medium rounded-t-lg transition-colors ${
                    activeTab === 'tracker'
                      ? 'bg-blue-500/10 text-blue-400 border-b-2 border-blue-500'
                      : 'text-gray-400 hover:text-blue-400'
                  }`}
                >
                  Tracker
                </motion.button>
              </div>
              <div className="px-6 py-3">
                <h2 className="text-lg font-bold text-blue-400">{username}</h2>
              </div>
            </div>

            {/* Tab Content */}
            <AnimatePresence mode="wait">
              {activeTab === 'overview' ? (
                <motion.div
                  key="overview"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col gap-8"
                >
                  <PlayerStats
                    rank={overall.rank}
                    combatLevel={calculateCombatLevel(data)}
                    totalLevel={overall.level}
                    totalXP={Math.floor(overall.value / 10)}
                  />

                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3"
                  >
                    {data?.map((skill, index) => {
                      const meta = skillMeta[skill.type];
                      if (!meta) return null;

                      const currentXP = Math.floor(skill.value / 10);
                      const nextLevelXP = getNextLevelXP(skill.level);
                      const currentLevelXP = getCurrentLevelXP(skill.level);
                      const xpProgress = (skill.level / 99) * 100;

                      return (
                        <motion.div
                          key={skill.type}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                        >
                          <SkillCard
                            name={meta.name}
                            icon={meta.icon}
                            level={skill.level}
                            xp={currentXP}
                            rank={skill.rank}
                            xpProgress={xpProgress}
                          />
                        </motion.div>
                      );
                    })}
                  </motion.div>
                </motion.div>
              ) : (
                <motion.div
                  key="tracker"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  <PlayerTracker username={username} playerData={data} />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
} 