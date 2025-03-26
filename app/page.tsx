"use client";

import React, { useState, useRef } from "react";
import { toPng } from "html-to-image";
import Navbar from "./components/Navbar"; // <--- ADJUST PATH IF NEEDED

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

  // Overall skill from the newly fetched data
  const overall = data?.find(s => s.type === 0);
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
    <div className="min-h-screen bg-gray-900 text-white">
      <Navbar username={username} />

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* If no data, no error, no loading => intro */}
        {!data && !error && !loading && (
          <section className="text-center my-12">
            <h2 className="text-2xl font-bold mb-4">
              Welcome to Lost City Player Stats!
            </h2>
            <p className="mb-2">
              Track your Lost City progress. Compare your stats from a previous snapshot
              using a real database, so you can easily share your gains at the end of the day!
            </p>
            <p className="mb-6">
              Lost City is a free, open-source, community-run project. (This site is not affiliated with Jagex.)
              Play the game at{" "}
              <a
                href="https://2004.lostcity.rs/title"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 underline"
              >
                2004.lostcity.rs
              </a>.
            </p>
          </section>
        )}

        {/* SEARCH BAR */}
        <div className="flex flex-col md:flex-row items-center gap-2 mb-6">
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchData()}
            placeholder="Search player..."
            className="w-full md:w-1/2 px-4 py-2 bg-gray-800 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-[#c6aa54]"
          />
          <button
            onClick={fetchData}
            className="px-4 py-2 bg-[#c6aa54] text-black font-semibold rounded hover:bg-yellow-400"
          >
            Search
          </button>
        </div>

        {loading && (
          <p className="text-center text-yellow-400 mb-4">
            Loading, please wait...
          </p>
        )}
        {error && (
          <p className="text-center text-red-500 mb-4">
            {error}
          </p>
        )}

        {/* OVERVIEW CARD */}
        {data && overall && (
          <div className="bg-[#2c2f33] p-6 rounded-lg border border-[#c6aa54] mb-6 relative">
            <div className="flex justify-between items-start">
              <h2 className="text-2xl font-bold text-[#c6aa54] mb-2">
                Overview
              </h2>
              {rankBadge && (
                <span className="bg-[#c6aa54] text-black font-semibold text-xs py-1 px-2 rounded">
                  {rankBadge}
                </span>
              )}
            </div>
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-lg mb-3 font-semibold">
                  Player Name: {username}
                </p>
                <p>
                  Total Level:{" "}
                  <span className="font-bold">{overall.level}</span>
                </p>
                <p>
                  Total XP:{" "}
                  <span className="font-bold">
                    {Math.floor(overall.value / 10).toLocaleString()}
                  </span>
                </p>
                <p>
                  Rank:{" "}
                  <span className="font-bold">
                    {overall.rank.toLocaleString()}
                  </span>
                </p>
                {highestXpSkill && (
                  <p>
                    Highest XP Skill:{" "}
                    <span className="font-bold">
                      {highestXpSkill.level} {skillMeta[highestXpSkill.type].name} (
                      {highestXpSkill.xp.toLocaleString()} XP)
                    </span>
                  </p>
                )}
              </div>
              <button
                onClick={startTracking}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10 3.5a6.5 6.5 0 0 0-6.5 6.5c0 3.59 2.91 6.5 6.5 6.5s6.5-2.91 6.5-6.5c0-3.59-2.91-6.5-6.5-6.5zm0 12a5.5 5.5 0 1 1 0-11 5.5 5.5 0 0 1 0 11zm.5-8.5h-1v4h3v-1h-2v-3z"/>
                </svg>
                Track Progress
              </button>
            </div>
            {apiLastUpdated && (
              <p className="text-sm text-gray-400">
                Last Updated (API):{" "}
                <span className="font-bold">{apiLastUpdated}</span>
              </p>
            )}
          </div>
        )}

        {/* SKILL CARDS */}
        {data && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {data
              .filter((skill) => skill.type !== 0) // skip Overall from these cards
              .map((skill) => {
                const meta = skillMeta[skill.type];
                if (!meta) return null;

                const level = skill.level;
                const xp = Math.floor(skill.value / 10);
                const progress = calculateProgress(level);

                return (
                  <div
                    key={skill.type}
                    className="bg-[#2c2f33] p-4 rounded-lg border border-[#c6aa54] hover:bg-[#3b3e44] transition-colors"
                  >
                    <div className="flex justify-between items-center mb-1">
                      <div className="flex items-center gap-1">
                        <img
                          src={meta.icon}
                          alt={meta.name}
                          className="w-5 h-5 mr-1"
                        />
                        <h3 className="font-bold text-[#c6aa54]">
                          {meta.name}
                        </h3>
                      </div>
                      <span className="text-sm">
                        Lv {level}/99
                      </span>
                    </div>
                    <div className="w-full h-2 bg-gray-700 rounded mb-2 overflow-hidden">
                      <div
                        className="h-full transition-[width] duration-300 ease-in-out"
                        style={{
                          width: `${progress.toFixed(2)}%`,
                          backgroundColor: meta.color,
                        }}
                      />
                    </div>
                    <p className="text-sm text-gray-300">
                      XP: {xp.toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-400">
                      Rank: {skill.rank.toLocaleString()}
                    </p>
                  </div>
                );
              })}
          </div>
        )}
      </main>
    </div>
  );
}
