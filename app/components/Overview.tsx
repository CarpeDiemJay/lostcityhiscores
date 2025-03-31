"use client";

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SearchInput from './SearchInput';
import TrackingStats from './TrackingStats';
import PlayerStats from './PlayerStats';
import SkillCard from './SkillCard';
import PlayerTracker from './PlayerTracker';
import XPComparisonGraph from './XPComparisonGraph';
import { calculateCombatLevel, getNextLevelXP, getCurrentLevelXP } from '@/lib/utils';
import { skillMeta } from '@/lib/constants';

interface OverviewProps {
  initialUsername?: string;
  initialCompareUsername?: string;
}

interface SkillData {
  type: number;
  level: number;
  rank: number;
  value: number;
  date?: string;
}

export function Overview({ initialUsername = '', initialCompareUsername = '' }: OverviewProps) {
  const [username, setUsername] = useState(initialUsername);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<SkillData[] | null>(null);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<'overview' | 'tracker' | 'compare'>(initialCompareUsername ? 'compare' : 'overview');
  const [compareUsername, setCompareUsername] = useState(initialCompareUsername);
  const [compareData, setCompareData] = useState<SkillData[] | null>(null);
  const [compareLoading, setCompareLoading] = useState(false);
  const [compareError, setCompareError] = useState("");
  const [mainPlayerHistory, setMainPlayerHistory] = useState<{ history: { date: string; xp: number }[]; weeklyGain: number; latestXp: number }>({ history: [], weeklyGain: 0, latestXp: 0 });
  const [comparePlayerHistory, setComparePlayerHistory] = useState<{ history: { date: string; xp: number }[]; weeklyGain: number; latestXp: number }>({ history: [], weeklyGain: 0, latestXp: 0 });

  // Update URL when usernames change
  useEffect(() => {
    const params = new URLSearchParams();
    if (username) params.set('username', username);
    if (compareUsername && activeTab === 'compare') params.set('compare', compareUsername);
    
    const newUrl = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`;
    window.history.replaceState({}, '', newUrl);
  }, [username, compareUsername, activeTab]);

  // Fetch data when initialUsername changes
  useEffect(() => {
    if (initialUsername && initialUsername === username) {
      fetchAndTrackPlayer();
    }
  }, [initialUsername]);

  // Fetch compare data when initialCompareUsername changes
  useEffect(() => {
    if (initialCompareUsername && initialCompareUsername === compareUsername) {
      fetchCompareData(initialCompareUsername);
    }
  }, [initialCompareUsername]);

  const fetchCompareData = async (username: string) => {
    if (!username) return;
    setCompareLoading(true);
    setCompareError("");
    try {
      const response = await fetch(`/api/hiscores?username=${encodeURIComponent(username)}`);
      if (!response.ok) throw new Error("Failed to fetch player data.");
      const json = await response.json();
      if (!Array.isArray(json) || json.length === 0) {
        setCompareError("Player not found or no data returned.");
        return;
      }
      setCompareData(json);
    } catch (err) {
      console.error(err);
      setCompareError("Something went wrong while fetching hiscores.");
    } finally {
      setCompareLoading(false);
    }
  };

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

  // Fetch historical data for both players
  useEffect(() => {
    if (username && data) {
      const fetchHistory = async () => {
        try {
          const response = await fetch(`/api/history?username=${encodeURIComponent(username)}`);
          if (response.ok) {
            const historyData = await response.json();
            setMainPlayerHistory(historyData);
          }
        } catch (err) {
          console.error('Error fetching main player history:', err);
        }
      };
      fetchHistory();
    }
  }, [username, data]);

  useEffect(() => {
    if (compareUsername && compareData) {
      const fetchHistory = async () => {
        try {
          const response = await fetch(`/api/history?username=${encodeURIComponent(compareUsername)}`);
          if (response.ok) {
            const historyData = await response.json();
            setComparePlayerHistory(historyData);
          }
        } catch (err) {
          console.error('Error fetching compare player history:', err);
        }
      };
      fetchHistory();
    }
  }, [compareUsername, compareData]);

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
                <motion.button
                  whileHover={{ backgroundColor: "rgba(59, 130, 246, 0.1)" }}
                  onClick={() => setActiveTab('compare')}
                  className={`px-6 py-3 text-sm font-medium rounded-t-lg transition-colors ${
                    activeTab === 'compare'
                      ? 'bg-blue-500/10 text-blue-400 border-b-2 border-blue-500'
                      : 'text-gray-400 hover:text-blue-400'
                  }`}
                >
                  Compare
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
              ) : activeTab === 'tracker' ? (
                <motion.div
                  key="tracker"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  <PlayerTracker username={username} playerData={data} />
                </motion.div>
              ) : activeTab === 'compare' ? (
                <motion.div
                  key="compare"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
                >
                  <div className="mb-8">
                    <div className="flex items-center gap-4 mb-4">
                      <SearchInput
                        value={compareUsername}
                        onChange={setCompareUsername}
                        onSearch={async () => {
                          if (!compareUsername) return;
                          setCompareLoading(true);
                          setCompareError("");
                          try {
                            const response = await fetch(`/api/hiscores?username=${encodeURIComponent(compareUsername)}`);
                            if (!response.ok) throw new Error("Failed to fetch player data.");
                            const json = await response.json();
                            if (!Array.isArray(json) || json.length === 0) {
                              setCompareError("Player not found or no data returned.");
                              return;
                            }
                            setCompareData(json);
                          } catch (err) {
                            console.error(err);
                            setCompareError("Something went wrong while fetching hiscores.");
                          } finally {
                            setCompareLoading(false);
                          }
                        }}
                        loading={compareLoading}
                        placeholder="Enter username to compare..."
                      />
                    </div>
                    {compareError && (
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-red-400"
                      >
                        {compareError}
                      </motion.p>
                    )}
                  </div>
                  <AnimatePresence mode="wait">
                    {compareLoading ? (
                      <motion.div
                        key="loading"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="space-y-6"
                      >
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-[#0F172A] rounded-xl p-6 animate-pulse">
                            <div className="h-6 w-32 bg-blue-500/20 rounded mb-4"></div>
                            <div className="space-y-4">
                              <div>
                                <div className="h-4 w-24 bg-gray-500/20 rounded mb-2"></div>
                                <div className="h-8 w-40 bg-gray-500/20 rounded"></div>
                              </div>
                              <div>
                                <div className="h-4 w-24 bg-gray-500/20 rounded mb-2"></div>
                                <div className="h-8 w-40 bg-gray-500/20 rounded"></div>
                              </div>
                              <div>
                                <div className="h-4 w-24 bg-gray-500/20 rounded mb-2"></div>
                                <div className="h-8 w-40 bg-gray-500/20 rounded"></div>
                              </div>
                            </div>
                          </div>
                          <div className="bg-[#0F172A] rounded-xl p-6 animate-pulse">
                            <div className="h-6 w-32 bg-blue-500/20 rounded mb-4"></div>
                            <div className="space-y-4">
                              <div>
                                <div className="h-4 w-24 bg-gray-500/20 rounded mb-2"></div>
                                <div className="h-8 w-40 bg-gray-500/20 rounded"></div>
                              </div>
                              <div>
                                <div className="h-4 w-24 bg-gray-500/20 rounded mb-2"></div>
                                <div className="h-8 w-40 bg-gray-500/20 rounded"></div>
                              </div>
                              <div>
                                <div className="h-4 w-24 bg-gray-500/20 rounded mb-2"></div>
                                <div className="h-8 w-40 bg-gray-500/20 rounded"></div>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="bg-[#0F172A] rounded-xl p-6 h-[400px] animate-pulse">
                          <div className="h-6 w-48 bg-blue-500/20 rounded mb-4"></div>
                          <div className="h-full bg-gray-500/20 rounded"></div>
                        </div>
                      </motion.div>
                    ) : compareData ? (
                      <motion.div
                        key="content"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="space-y-6"
                      >
                        <div className="grid grid-cols-2 gap-4">
                          <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2 }}
                            className="bg-[#0F172A] rounded-xl p-6"
                          >
                            {/* Main player stats */}
                            <h4 className="text-blue-400 text-lg font-medium mb-4">{username}</h4>
                            <div className="space-y-4">
                              <div>
                                <div className="text-gray-400 text-sm">Total Level</div>
                                <div className="text-2xl font-semibold text-white">{data?.find(skill => skill.type === 0)?.level || 0}</div>
                              </div>
                              <div>
                                <div className="text-gray-400 text-sm">Total XP</div>
                                <div className="text-2xl font-semibold text-white">{Math.floor((data?.find(skill => skill.type === 0)?.value || 0) / 10).toLocaleString()}</div>
                              </div>
                              <div>
                                <div className="text-gray-400 text-sm">Weekly Gain</div>
                                <div className={`text-2xl font-semibold ${mainPlayerHistory.weeklyGain > comparePlayerHistory.weeklyGain ? 'text-green-400' : mainPlayerHistory.weeklyGain < comparePlayerHistory.weeklyGain ? 'text-red-400' : 'text-white'}`}>
                                  {mainPlayerHistory.weeklyGain.toLocaleString()} XP
                                  {mainPlayerHistory.weeklyGain !== comparePlayerHistory.weeklyGain && (
                                    <span className={`text-sm ml-2 ${mainPlayerHistory.weeklyGain > comparePlayerHistory.weeklyGain ? 'text-green-400' : 'text-red-400'}`}>
                                      ({mainPlayerHistory.weeklyGain > comparePlayerHistory.weeklyGain ? '+' : ''}
                                      {(mainPlayerHistory.weeklyGain - comparePlayerHistory.weeklyGain).toLocaleString()})
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </motion.div>
                          <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2 }}
                            className="bg-[#0F172A] rounded-xl p-6"
                          >
                            {/* Compare player stats */}
                            <h4 className="text-blue-400 text-lg font-medium mb-4">{compareUsername}</h4>
                            <div className="space-y-4">
                              <div>
                                <div className="text-gray-400 text-sm">Total Level</div>
                                <div className="flex items-start">
                                  <div className="text-2xl font-semibold text-white">
                                    {compareData.find(skill => skill.type === 0)?.level || 0}
                                  </div>
                                  {(() => {
                                    const mainLevel = data?.find(skill => skill.type === 0)?.level || 0;
                                    const compareLevel = compareData.find(skill => skill.type === 0)?.level || 0;
                                    const diff = compareLevel - mainLevel;
                                    if (diff === 0) return null;
                                    return (
                                      <div className={`ml-2 mt-1.5 text-xs font-medium ${diff > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                        {diff > 0 ? '+' : ''}{diff}
                                      </div>
                                    );
                                  })()}
                                </div>
                              </div>
                              <div>
                                <div className="text-gray-400 text-sm">Total XP</div>
                                <div className="flex items-start">
                                  <div className="text-2xl font-semibold text-white">
                                    {Math.floor((compareData.find(skill => skill.type === 0)?.value || 0) / 10).toLocaleString()}
                                  </div>
                                  {(() => {
                                    const mainXP = Math.floor((data?.find(skill => skill.type === 0)?.value || 0) / 10);
                                    const compareXP = Math.floor((compareData.find(skill => skill.type === 0)?.value || 0) / 10);
                                    const diff = compareXP - mainXP;
                                    if (diff === 0) return null;
                                    return (
                                      <div className={`ml-2 mt-1.5 text-xs font-medium ${diff > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                        {diff > 0 ? '+' : ''}{diff.toLocaleString()}
                                      </div>
                                    );
                                  })()}
                                </div>
                              </div>
                              <div>
                                <div className="text-gray-400 text-sm">Weekly Gain</div>
                                <div className={`text-2xl font-semibold ${comparePlayerHistory.weeklyGain > mainPlayerHistory.weeklyGain ? 'text-green-400' : comparePlayerHistory.weeklyGain < mainPlayerHistory.weeklyGain ? 'text-red-400' : 'text-white'}`}>
                                  {comparePlayerHistory.weeklyGain.toLocaleString()} XP
                                  {mainPlayerHistory.weeklyGain !== comparePlayerHistory.weeklyGain && (
                                    <span className={`text-sm ml-2 ${comparePlayerHistory.weeklyGain > mainPlayerHistory.weeklyGain ? 'text-green-400' : 'text-red-400'}`}>
                                      ({comparePlayerHistory.weeklyGain > mainPlayerHistory.weeklyGain ? '+' : ''}
                                      {(comparePlayerHistory.weeklyGain - mainPlayerHistory.weeklyGain).toLocaleString()})
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        </div>
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.4 }}
                          className="bg-[#0F172A] rounded-xl"
                        >
                          {mainPlayerHistory.history.length > 0 && comparePlayerHistory.history.length > 0 ? (
                            <XPComparisonGraph
                              mainPlayerData={{
                                username,
                                xpGains: mainPlayerHistory.history,
                              }}
                              comparePlayerData={{
                                username: compareUsername,
                                xpGains: comparePlayerHistory.history,
                              }}
                            />
                          ) : (
                            <div className="text-center text-gray-400 p-6">
                              {!mainPlayerHistory.history.length && !comparePlayerHistory.history.length
                                ? "Loading historical data..."
                                : !mainPlayerHistory.history.length
                                ? `Waiting for ${username}'s data...`
                                : `Waiting for ${compareUsername}'s data...`}
                            </div>
                          )}
                        </motion.div>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </motion.div>
              ) : (
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
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
} 