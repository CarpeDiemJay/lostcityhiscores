"use client";

import React, { useState, useRef } from "react";
import { toPng } from "html-to-image";
import Navbar from "./components/Navbar"; // <--- ADJUST PATH IF NEEDED
import TrackingStats from './components/TrackingStats';
import SearchInput from './components/SearchInput';
import TrackButton from './components/TrackButton';
import Link from 'next/link';

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
  21: { name: "Runecrafting",  color: "#f1c40f", icon: "/ui/Runecrafting_icon.png"},
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

/**
 * This is your main page component, which fetches data from /api/hiscores,
 * saves snapshots to Supabase (/api/saveStats), retrieves them (/api/getHistory),
 * and compares to a chosen snapshot (/api/getLastSnapshot or a local selection).
 */
export default function Home() {
  // Basic states for searching a player
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<SkillData[] | null>(null);
  const [error, setError] = useState("");

  /**
   * Fetch from /api/hiscores to get the player's current stats
   */
  async function fetchData() {
    if (!username) return;
    setLoading(true);
    setError("");
    setData(null);

    try {
      const response = await fetch(`/api/hiscores?username=${encodeURIComponent(username)}`);
      if (!response.ok) {
        throw new Error("Failed to fetch player data.");
      }
      const json = await response.json();

      if (!Array.isArray(json) || json.length === 0) {
        setError("Player not found or no data returned.");
        return;
      }
      setData(json);
    } catch (err) {
      console.error(err);
      setError("Something went wrong while fetching hiscores.");
    } finally {
      setLoading(false);
    }
  }

  /**
   * Redirects to the tracker page with the current username
   */
  async function startTracking() {
    if (!username) return;
    
    try {
      // First try to save the current stats
      const response = await fetch('/api/saveStats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, stats: data })
      });
      
      // Redirect to tracker page with username
      window.location.href = `/tracker?username=${encodeURIComponent(username)}`;
    } catch (error) {
      console.error('Error starting tracking:', error);
      // Still redirect even if save fails
      window.location.href = `/tracker?username=${encodeURIComponent(username)}`;
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

  // Basic rank badge
  const rankBadge = (() => {
    if (!overall) return null;
    if (overall.rank === 1) return { text: 'Rank 1', color: 'from-purple-500 to-purple-700' };
    if (overall.rank <= 5) return { text: 'Top 5', color: 'from-red-500 to-red-700' };
    if (overall.rank <= 10) return { text: 'Top 10', color: 'from-orange-500 to-orange-700' };
    if (overall.rank <= 25) return { text: 'Top 25', color: 'from-yellow-500 to-yellow-700' };
    if (overall.rank <= 50) return { text: 'Top 50', color: 'from-green-500 to-green-700' };
    if (overall.rank <= 100) return { text: 'Top 100', color: 'from-teal-500 to-teal-700' };
    if (overall.rank <= 250) return { text: 'Top 250', color: 'from-blue-500 to-blue-700' };
    if (overall.rank <= 500) return { text: 'Top 500', color: 'from-indigo-500 to-indigo-700' };
    if (overall.rank <= 1000) return { text: 'Top 1000', color: 'from-violet-500 to-violet-700' };
    if (overall.rank <= 2000) return { text: 'Top 2000', color: 'from-pink-500 to-pink-700' };
    if (overall.rank <= 3000) return { text: 'Top 3000', color: 'from-rose-500 to-rose-700' };
    return null;
  })();

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-[#1a1b26] text-white">
      <div className="max-w-6xl mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center mb-20">
          <Link href="/" className="inline-block">
            <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-[#c6aa54] to-[#e9d5a0] text-transparent bg-clip-text">
              Lost City Tracker
            </h1>
          </Link>
          <p className="text-xl text-gray-300 mb-12 max-w-2xl mx-auto">
            Track your Lost City progress. Compare your stats and share your gains!
          </p>
          <div className="max-w-2xl mx-auto">
            <div className="flex flex-col sm:flex-row gap-4 items-center">
              <div className="relative flex-1 w-full">
                <input
                  type="text"
                  placeholder="Enter username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && fetchData()}
                  className="w-full px-4 py-3 bg-gray-800 rounded-lg text-white border border-gray-700 focus:outline-none focus:border-[#c6aa54]"
                />
                {loading && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-[#c6aa54] border-t-transparent"></div>
                  </div>
                )}
              </div>
              <button
                onClick={fetchData}
                disabled={loading}
                className="w-full sm:w-auto px-6 py-3 bg-[#c6aa54] text-black font-semibold rounded-lg hover:bg-[#d4b75f] transition-colors disabled:opacity-50"
              >
                Search
              </button>
            </div>
          </div>
          {error && <p className="mt-4 text-red-400">{error}</p>}
        </div>

        {/* Default View: Tracking Statistics */}
        {!data && (
          <div className="max-w-2xl mx-auto">
            <TrackingStats />
          </div>
        )}

        {/* Stats Display */}
        {data && overall && (
          <>
            {/* Player Overview */}
            <div className="bg-[#2c2f33]/90 backdrop-blur-sm rounded-xl border border-[#c6aa54]/50 p-8 mb-8 shadow-lg">
              <div className="flex flex-col sm:flex-row justify-between items-start gap-6 mb-8">
                <div>
                  <div className="flex items-center gap-4 mb-3">
                    <h2 className="text-3xl font-bold text-[#c6aa54]">{username}</h2>
                    {rankBadge && (
                      <div className={`px-3 py-1 rounded-full text-sm font-medium text-white bg-gradient-to-r ${rankBadge.color}`}>
                        {rankBadge.text}
                      </div>
                    )}
                    <TrackButton onClick={startTracking} />
                  </div>
                  <p className="text-gray-400">Last updated {timeAgo(new Date(overall.date || Date.now()))}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-4 border border-gray-700/50 relative group hover:border-[#c6aa54]/30 transition-colors">
                  <p className="text-sm text-[#c6aa54] font-medium mb-1">Rank</p>
                  <p className="text-2xl font-bold">#{overall.rank.toLocaleString()}</p>
                </div>
                <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-4 border border-gray-700/50 group hover:border-[#c6aa54]/30 transition-colors">
                  <p className="text-sm text-[#c6aa54] font-medium mb-1">Combat Level</p>
                  <p className="text-2xl font-bold">{calculateCombatLevel(data)}</p>
                </div>
                <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-4 border border-gray-700/50 group hover:border-[#c6aa54]/30 transition-colors">
                  <p className="text-sm text-[#c6aa54] font-medium mb-1">Total Level</p>
                  <p className="text-2xl font-bold">{overall.level}</p>
                </div>
                <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-4 border border-gray-700/50 group hover:border-[#c6aa54]/30 transition-colors">
                  <p className="text-sm text-[#c6aa54] font-medium mb-1">Total XP</p>
                  <p className="text-2xl font-bold">{Math.floor(overall.value / 10).toLocaleString()}</p>
                </div>
              </div>
            </div>

            {/* Skill Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {data
                .filter((skill) => skill.type !== 0)
                .map((skill) => {
                  const meta = skillMeta[skill.type];
                  if (!meta) return null;

                  const level = skill.level;
                  const xp = Math.floor(skill.value / 10);
                  const progress = calculateProgress(level);

                  return (
                    <div
                      key={skill.type}
                      className="group bg-[#2c2f33]/90 backdrop-blur-sm p-5 rounded-lg border border-[#c6aa54]/30 hover:border-[#c6aa54]/60 transition-all duration-300"
                    >
                      <div className="flex justify-between items-center mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 flex items-center justify-center rounded bg-gray-800/50 p-1.5 group-hover:bg-gray-800 transition-colors">
                            <img
                              src={meta.icon}
                              alt={meta.name}
                              className="w-full h-full"
                            />
                          </div>
                          <h3 className="font-bold text-[#c6aa54] group-hover:text-[#e9d5a0] transition-colors">
                            {meta.name}
                          </h3>
                        </div>
                        <span className="text-sm font-medium bg-gray-800/50 px-2 py-1 rounded">
                          {level}/99
                        </span>
                      </div>
                      <div className="w-full h-2 bg-gray-800/50 rounded-full overflow-hidden mb-3">
                        <div
                          className="h-full transition-all duration-300 ease-out group-hover:opacity-90"
                          style={{
                            width: `${progress.toFixed(2)}%`,
                            backgroundColor: meta.color || "#c6aa54",
                          }}
                        />
                      </div>
                      <div className="flex justify-between text-sm text-gray-400">
                        <span>XP: {xp.toLocaleString()}</span>
                        <span>#{skill.rank.toLocaleString()}</span>
                      </div>
                    </div>
                  );
                })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
