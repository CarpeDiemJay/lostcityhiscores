"use client";

import React, { useState, useRef, useEffect } from "react";
import { toPng } from "html-to-image";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "./components/Navbar"; // <--- ADJUST PATH IF NEEDED
import TrackingStats from './components/TrackingStats';
import SearchInput from './components/SearchInput';
import Link from 'next/link';
import PlayerTracker from './components/PlayerTracker';
import SkillCard from './components/SkillCard';
import PlayerStats from './components/PlayerStats';

/**
 * Represents a single skill's data from the hiscores API.
 */
interface SkillData {
  type: number;   // 0 = Overall, 1 = Attack, 2 = Defence, etc.
  level: number;  // The player's skill level
  rank: number;   // The player's rank for this skill
  value: number;  // The skill's XP * 10
  date?: string;  // Optional: last-updated timestamp from the API
}

/**
 * Represents one snapshot row from your "snapshots" table in Supabase.
 */
interface Snapshot {
  id: number;
  username: string;
  created_at: string;  // e.g. "2025-03-25T06:06:17.123Z"
  stats: SkillData[];  // Full skill data array
}

/**
 * The structure of your summary data once you compare newly fetched stats to a previously saved snapshot.
 */
interface SummaryData {
  totalXPGained: number;
  changes: {
    skillType: number;
    oldXP: number;
    newXP: number;
    xpDiff: number;
    oldLevel: number;
    newLevel: number;
    levelDiff: number;
  }[];
  lastSnapshotTime: string;  // from the old snapshot's "created_at"
}

/**
 * Calculates how long ago (days/hours/minutes) a given date was,
 * returning a string like "7 hours, 32 minutes ago at 3/25/2025, 1:26:25 AM".
 */
function timeAgo(oldDate: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - oldDate.getTime();
  if (diffMs < 0) {
    return `in the future at ${oldDate.toLocaleString()}`;
  }

  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHrs = Math.floor((diffMs / (1000 * 60 * 60)) % 24);
  const diffMins = Math.floor((diffMs / (1000 * 60)) % 60);

  const parts: string[] = [];
  if (diffDays > 0) parts.push(`${diffDays} day${diffDays !== 1 ? "s" : ""}`);
  if (diffHrs > 0) parts.push(`${diffHrs} hour${diffHrs !== 1 ? "s" : ""}`);
  if (diffMins > 0) parts.push(`${diffMins} minute${diffMins !== 1 ? "s" : ""}`);

  if (parts.length === 0) {
    return `just now at ${oldDate.toLocaleString()}`;
  }

  const agoString = parts.join(", ") + " ago";
  return `${agoString} at ${oldDate.toLocaleString()}`;
}

/**
 * A map of skill "type" to name, color, and icon path.
 * This allows you to render skill icons and colors more easily.
 */
const skillMeta: Record<number, { name: string; color: string; icon: string }> = {
  0:  { name: "Overall",       color: "#4e73df", icon: "/ui/Stats_icon.png"      },
  1:  { name: "Attack",        color: "#e74c3c", icon: "/ui/Attack_icon.png"     },
  2:  { name: "Defence",       color: "#3498db", icon: "/ui/Defence_icon.png"    },
  3:  { name: "Strength",      color: "#2ecc71", icon: "/ui/Strength_icon.png"   },
  4:  { name: "Hitpoints",     color: "#e67e22", icon: "/ui/Hitpoints_icon.png"  },
  5:  { name: "Ranged",        color: "#27ae60", icon: "/ui/Ranged_icon.png"     },
  6:  { name: "Prayer",        color: "#f1c40f", icon: "/ui/Prayer_icon.png"     },
  7:  { name: "Magic",         color: "#9b59b6", icon: "/ui/Magic_icon.png"      },
  8:  { name: "Cooking",       color: "#e67e22", icon: "/ui/Cooking_icon.png"    },
  9:  { name: "Woodcutting",   color: "#795548", icon: "/ui/Woodcutting_icon.png"},
  10: { name: "Fletching",     color: "#607d8b", icon: "/ui/Fletching_icon.png"  },
  11: { name: "Fishing",       color: "#3498db", icon: "/ui/Fishing_icon.png"    },
  12: { name: "Firemaking",    color: "#e74c3c", icon: "/ui/Firemaking_icon.png" },
  13: { name: "Crafting",      color: "#9c27b0", icon: "/ui/Crafting_icon.png"   },
  14: { name: "Smithing",      color: "#607d8b", icon: "/ui/Smithing_icon.png"   },
  15: { name: "Mining",        color: "#795548", icon: "/ui/Mining_icon.png"     },
  16: { name: "Herblore",      color: "#2ecc71", icon: "/ui/Herblore_icon.png"   },
  17: { name: "Agility",       color: "#3498db", icon: "/ui/Agility_icon.png"    },
  18: { name: "Thieving",      color: "#9c27b0", icon: "/ui/Thieving_icon.png"   },
  21: { name: "Runecrafting",  color: "#f1c40f", icon: "/ui/Runecraft_icon.png"},
};

/**
 * Calculates a percentage for a progress bar, assuming 99 is max level.
 */
function calculateProgress(level: number): number {
  if (level >= 99) return 100;
  return (level / 99) * 100;
}

/**
 * Calculates combat level using the 2004-era formula (no Summoning)
 */
function calculateCombatLevel(stats: SkillData[]): number {
  const attack = stats.find(s => s.type === 1)?.level || 1;
  const strength = stats.find(s => s.type === 3)?.level || 1;
  const defence = stats.find(s => s.type === 2)?.level || 1;
  const hitpoints = stats.find(s => s.type === 4)?.level || 10;
  const prayer = stats.find(s => s.type === 6)?.level || 1;
  const ranged = stats.find(s => s.type === 5)?.level || 1;
  const magic = stats.find(s => s.type === 7)?.level || 1;

  const base = 0.25 * (defence + hitpoints + Math.floor(prayer / 2));
  const melee = 0.325 * (attack + strength);
  const range = 0.325 * (Math.floor(ranged * 3 / 2));
  const mage = 0.325 * (Math.floor(magic * 3 / 2));

  return Math.floor(base + Math.max(melee, range, mage));
}

/** Get XP required for a specific level */
function getXPForLevel(level: number): number {
  let points = 0;
  let output = 0;
  for (let lvl = 1; lvl <= level; lvl++) {
    points += Math.floor(lvl + 300 * Math.pow(2, lvl / 7));
    if (lvl >= level) {
      return output;
    }
    output = Math.floor(points / 4);
  }
  return output;
}

/** Get XP required for next level */
function getNextLevelXP(level: number): number {
  return getXPForLevel(level + 1);
}

/** Get XP required for current level */
function getCurrentLevelXP(level: number): number {
  return getXPForLevel(level);
}

/**
 * This is your main page component, which fetches data from /api/hiscores,
 * saves snapshots to Supabase (/api/saveStats), retrieves them (/api/getHistory),
 * and compares to a chosen snapshot (/api/getLastSnapshot or a local selection).
 */
export default function Home() {
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<SkillData[] | null>(null);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<'overview' | 'tracker'>('overview');

  useEffect(() => {
    const handleSearch = (event: CustomEvent<{ username: string }>) => {
      const searchUsername = event.detail.username;
      setUsername(searchUsername);
      if (searchUsername) {
        setLoading(true);
        setError("");
        setData(null);
        
        fetch(`/api/hiscores?username=${encodeURIComponent(searchUsername)}`)
          .then(response => {
            if (!response.ok) {
              throw new Error("Failed to fetch player data.");
            }
            return response.json() as Promise<SkillData[]>;
          })
          .then((json: SkillData[]) => {
            if (!Array.isArray(json) || json.length === 0) {
              setError("Player not found or no data returned.");
              return Promise.reject("No data returned");
            }
            
            // Save stats automatically
            return fetch('/api/saveStats', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ username: searchUsername, stats: json })
            }).then(() => json);
          })
          .then((json: SkillData[]) => {
            setData(json);
            setError("");
          })
          .catch(err => {
            console.error(err);
            setError("Something went wrong while fetching hiscores.");
          })
          .finally(() => {
            setLoading(false);
          });
      }
    };

    window.addEventListener('search-player', handleSearch as EventListener);
    return () => window.removeEventListener('search-player', handleSearch as EventListener);
  }, []);

  async function fetchAndTrackPlayer() {
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
        body: JSON.stringify({ username, stats: json })
      });

      setData(json);
    } catch (err) {
      console.error(err);
      setError("Something went wrong while fetching hiscores.");
    } finally {
      setLoading(false);
    }
  }

  // Find overall stats if data exists
  const overall = data?.find(skill => skill.type === 0);
  const apiLastUpdated = overall?.date || null;

  // Highest XP skill
  const highestXpSkill = (() => {
    if (!data) return null;
    const nonOverall = data.filter(s => s.type !== 0);
    if (nonOverall.length === 0) return null;
    return nonOverall.reduce(
      (acc, s) => {
        const xp = Math.floor(s.value / 10);
        return xp > acc.xp ? { type: s.type, xp, level: s.level } : acc;
      },
      { type: 1, xp: 0, level: 1 }
    );
  })();

  return (
    <div className="min-h-screen bg-[#0A0B0F] text-white">
      <div className="max-w-6xl mx-auto px-4 py-8 md:py-16">
        {/* Title - Always visible */}
        <a href="/" className="block text-center mb-12">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-[#3B82F6] via-[#60A5FA] to-[#3B82F6] text-transparent bg-clip-text">
            Lost City Tracker
          </h1>
        </a>

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
    </div>
  );
}
