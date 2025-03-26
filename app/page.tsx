"use client";

import React, { useState, useRef } from "react";
import { toPng } from "html-to-image";
import Navbar from "./components/Navbar"; // <--- ADJUST PATH IF NEEDED
import TrackingStats from './components/TrackingStats';
import SearchInput from './components/SearchInput';
import TrackButton from './components/TrackButton';
import Link from 'next/link';
import PlayerOverview from './components/PlayerOverview';

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
    if (overall.rank <= 50)   return "Top 50 Player";
    if (overall.rank <= 100)  return "Top 100 Player";
    if (overall.rank <= 1000) return "Top 1000 Player";
    return null;
  })();

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl sm:text-5xl font-bold text-center mb-8 bg-gradient-to-r from-[#c6aa54] to-[#e9d5a0] text-transparent bg-clip-text">
            Lost City Tracker
          </h1>

          <div className="mb-8">
            <SearchInput
              value={username}
              onChange={setUsername}
              onSearch={fetchData}
              isLoading={loading}
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 mb-8 text-red-400">
              {error}
            </div>
          )}

          {data && overall && (
            <PlayerOverview
              username={username}
              rank={overall.rank}
              combatLevel={calculateCombatLevel(data)}
              totalLevel={overall.level}
              totalXp={Math.floor(overall.value / 10)}
              lastUpdated={apiLastUpdated}
              onTrack={startTracking}
            />
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {data?.filter(skill => skill.type !== 0).map(skill => {
              const meta = skillMeta[skill.type];
              if (!meta) return null;

              return (
                <div
                  key={skill.type}
                  className="bg-[#2c2f33]/90 backdrop-blur-sm rounded-lg p-4 border border-[#c6aa54]/50"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <img
                      src={meta.icon}
                      alt={meta.name}
                      className="w-4 h-4"
                    />
                    <h3 className="text-sm font-medium text-[#c6aa54]">
                      {meta.name}
                    </h3>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xl font-bold">{skill.level}</p>
                    <p className="text-sm text-gray-400">
                      Rank: #{skill.rank.toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-400">
                      XP: {Math.floor(skill.value / 10).toLocaleString()}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <TrackingStats />
        </div>
      </div>
    </main>
  );
}
