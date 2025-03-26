"use client";

import React, { useState, useEffect, Suspense } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer
} from "recharts";
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Popover } from '@headlessui/react';
import SearchInput from '../components/SearchInput';

/** Basic shape of skill data */
interface SkillData {
  type: number;   // 0=Overall, 1=Attack, etc.
  level: number;
  rank: number;
  value: number;  // XP * 10
  date?: string;  // optional
}

/** Each snapshot row from Supabase */
interface Snapshot {
  id: number;
  username: string;
  created_at: string; // e.g. "2025-03-25T06:06:17.123Z"
  stats: SkillData[];
}

/** Time range presets (you can add more if you like) */
const TIME_RANGES = [
  { label: "1h", days: 1/24 },
  { label: "4h", days: 4/24 },
  { label: "8h", days: 8/24 },
  { label: "12h", days: 12/24 },
  { label: "24h", days: 1 },
  { label: "7d", days: 7 },
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
  { label: "1y", days: 365 },
  { label: "All", days: 99999 },
];

/** For labeling each skill, color, etc. */
const skillMeta: Record<number, { name: string; icon: string }> = {
  0:  { name: "Overall",     icon: "/ui/Stats_icon.png"      },
  1:  { name: "Attack",      icon: "/ui/Attack_icon.png"     },
  2:  { name: "Defence",     icon: "/ui/Defence_icon.png"    },
  3:  { name: "Strength",    icon: "/ui/Strength_icon.png"   },
  4:  { name: "Hitpoints",   icon: "/ui/Hitpoints_icon.png"  },
  5:  { name: "Ranged",      icon: "/ui/Ranged_icon.png"     },
  6:  { name: "Prayer",      icon: "/ui/Prayer_icon.png"     },
  7:  { name: "Magic",       icon: "/ui/Magic_icon.png"      },
  8:  { name: "Cooking",     icon: "/ui/Cooking_icon.png"    },
  9:  { name: "Woodcutting", icon: "/ui/Woodcutting_icon.png"},
  10: { name: "Fletching",   icon: "/ui/Fletching_icon.png"  },
  11: { name: "Fishing",     icon: "/ui/Fishing_icon.png"    },
  12: { name: "Firemaking",  icon: "/ui/Firemaking_icon.png" },
  13: { name: "Crafting",    icon: "/ui/Crafting_icon.png"   },
  14: { name: "Smithing",    icon: "/ui/Smithing_icon.png"   },
  15: { name: "Mining",      icon: "/ui/Mining_icon.png"     },
  16: { name: "Herblore",    icon: "/ui/Herblore_icon.png"   },
  17: { name: "Agility",     icon: "/ui/Agility_icon.png"    },
  18: { name: "Thieving",    icon: "/ui/Thieving_icon.png"   },
  21: { name: "Runecrafting",icon: "/ui/Runecrafting_icon.png"},
};

/** A quick helper to do XP * 10 => real XP. */
function xpValue(s: SkillData) {
  return Math.floor(s.value / 10);
}

/** A quick time-ago function, if you want to show "2 hours ago" etc. */
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

function ParamsReader() {
  const searchParams = useSearchParams();
  const username = searchParams.get('username') || "";
  return <input type="hidden" id="username-param" value={username} />;
}

function getRankBadge(rank: number): { text: string; color: string } | null {
  if (rank === 1) return { text: 'Rank 1', color: 'from-purple-500 to-purple-700' };
  if (rank <= 5) return { text: 'Top 5', color: 'from-red-500 to-red-700' };
  if (rank <= 10) return { text: 'Top 10', color: 'from-orange-500 to-orange-700' };
  if (rank <= 25) return { text: 'Top 25', color: 'from-yellow-500 to-yellow-700' };
  if (rank <= 50) return { text: 'Top 50', color: 'from-green-500 to-green-700' };
  if (rank <= 100) return { text: 'Top 100', color: 'from-teal-500 to-teal-700' };
  if (rank <= 250) return { text: 'Top 250', color: 'from-blue-500 to-blue-700' };
  if (rank <= 500) return { text: 'Top 500', color: 'from-indigo-500 to-indigo-700' };
  if (rank <= 1000) return { text: 'Top 1000', color: 'from-violet-500 to-violet-700' };
  if (rank <= 2000) return { text: 'Top 2000', color: 'from-pink-500 to-pink-700' };
  if (rank <= 3000) return { text: 'Top 3000', color: 'from-rose-500 to-rose-700' };
  return null;
}

function TrackerContent() {
  const [username, setUsername] = useState("");
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [timeRangeDays, setTimeRangeDays] = useState<number>(7);
  const [xpGained, setXpGained] = useState<number>(0);
  const [earliestSnapshotTime, setEarliestSnapshotTime] = useState<string>("");
  const [latestSnapshotTime, setLatestSnapshotTime] = useState<string>("");
  const [skillGains, setSkillGains] = useState<{
    skillType: number;
    xpDiff: number;
    levelDiff: number;
    rankDiff: number;
  }[]>([]);
  const [chartData, setChartData] = useState<{ date: string; xp: number }[]>([]);

  // Read username from URL params
  useEffect(() => {
    const param = document.getElementById('username-param') as HTMLInputElement;
    if (param) {
      setUsername(param.value);
    }
  }, []);

  // Auto-load data when username changes
  useEffect(() => {
    if (username) {
      fetchHistory();
    }
  }, [username]);

  /**
   * Fetch snapshots from /api/getHistory for the given username
   */
  async function fetchHistory() {
    if (!username) return;
    setLoading(true);
    setError("");
    setSnapshots([]);

    try {
      const res = await fetch(`/api/getHistory?username=${encodeURIComponent(username)}`);
      const text = await res.text();
      console.log('Raw response from getHistory:', text); // Debug log
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status} ${res.statusText}`);
      }
      
      let json;
      try {
        json = JSON.parse(text);
      } catch (e) {
        console.error('JSON parse error:', e, 'Raw text:', text);
        throw new Error('Failed to parse server response as JSON');
      }

      if (!json) {
        throw new Error('Empty response from server');
      }
      
      if (json.error) {
        setError(json.error);
        return;
      }
      
      if (!json.snapshots || !Array.isArray(json.snapshots)) {
        throw new Error('Invalid response format: missing snapshots array');
      }
      
      if (json.snapshots.length === 0) {
        setError("No tracking data found for this player. Try clicking 'Track Progress' on the homepage first.");
        return;
      }

      // Validate snapshot format
      for (const snapshot of json.snapshots) {
        if (!snapshot.stats || !Array.isArray(snapshot.stats)) {
          throw new Error('Invalid snapshot format: missing stats array');
        }
      }
      
      setSnapshots(json.snapshots);
    } catch (err) {
      console.error("Error in fetchHistory:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch player history");
    } finally {
      setLoading(false);
    }
  }

  /**
   * Whenever snapshots or timeRangeDays changes, filter snapshots,
   * compute Gains, earliest/latest times, skill-by-skill Gains, and chart data.
   */
  useEffect(() => {
    if (snapshots.length === 0) {
      // Reset everything
      setXpGained(0);
      setChartData([]);
      setSkillGains([]);
      setEarliestSnapshotTime("");
      setLatestSnapshotTime("");
      return;
    }

    // 1) Filter by time range
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - timeRangeDays);

    let filtered = snapshots;
    if (timeRangeDays < 99999) {
      filtered = snapshots.filter((snap) => {
        const snapDate = new Date(snap.created_at);
        return snapDate >= cutoff;
      });
    }

    if (filtered.length === 0) {
      setXpGained(0);
      setChartData([]);
      setSkillGains([]);
      setEarliestSnapshotTime("");
      setLatestSnapshotTime("");
      return;
    }

    // 2) earliest & latest
    const earliest = filtered[0];
    const latest = filtered[filtered.length - 1];

    // Show them in "time ago" format
    setEarliestSnapshotTime(timeAgo(new Date(earliest.created_at)));
    setLatestSnapshotTime(timeAgo(new Date(latest.created_at)));

    // 3) Gains: Compare Overall XP
    const oldOverall = earliest.stats.find(s => s.type === 0);
    const newOverall = latest.stats.find(s => s.type === 0);
    const oldXP = oldOverall ? xpValue(oldOverall) : 0;
    const newXP = newOverall ? xpValue(newOverall) : 0;
    const gained = newXP - oldXP;
    setXpGained(gained);

    // 4) Build skill-by-skill Gains
    const skillDiffs: {
      skillType: number;
      xpDiff: number;
      levelDiff: number;
      rankDiff: number;
    }[] = [];

    for (const newSkill of latest.stats) {
      if (newSkill.type === 0) continue; // skip Overall
      const oldSkill = earliest.stats.find(s => s.type === newSkill.type);
      if (!oldSkill) continue;

      const newXpVal = xpValue(newSkill);
      const oldXpVal = xpValue(oldSkill);
      const xpDiff = newXpVal - oldXpVal;

      const levelDiff = newSkill.level - oldSkill.level;
      const rankDiff = newSkill.rank - oldSkill.rank;
      // negative rankDiff means improvement in rank

      if (xpDiff !== 0 || levelDiff !== 0 || rankDiff !== 0) {
        skillDiffs.push({
          skillType: newSkill.type,
          xpDiff,
          levelDiff,
          rankDiff,
        });
      }
    }
    // Sort by xpDiff descending
    skillDiffs.sort((a, b) => b.xpDiff - a.xpDiff);
    setSkillGains(skillDiffs);

    // 5) Build chart data for Recharts (Overall XP)
    const cData = filtered.map((snap) => {
      const overallSkill = snap.stats.find(s => s.type === 0);
      const xpVal = overallSkill ? xpValue(overallSkill) : 0;
      return {
        date: snap.created_at,
        xp: xpVal,
      };
    });
    setChartData(cData);

  }, [snapshots, timeRangeDays]);

  // Get the latest stats for combat level calculation
  const latestStats = snapshots.length > 0 ? snapshots[snapshots.length - 1].stats : [];
  const combatLevel = calculateCombatLevel(latestStats);

  // Get the latest overall stats
  const latestOverall = latestStats.find(s => s.type === 0);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-[#1a1b26] text-white">
      <div className="max-w-6xl mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center mb-20">
          <Link href="/" className="inline-block">
            <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-[#c6aa54] to-[#e9d5a0] text-transparent bg-clip-text hover:scale-[1.01] transition-transform">
              Lost City Tracker
            </h1>
          </Link>
          <p className="text-xl text-gray-300 mb-12 max-w-2xl mx-auto">
            Track your Lost City progress. Compare your stats and share your gains!
          </p>
          <div className="max-w-2xl mx-auto">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <div className="relative flex-1 min-w-[300px]">
                <input
                  type="text"
                  value={username}
                  disabled
                  className="w-full px-4 py-3 bg-gray-800 rounded-lg text-white border border-gray-700 focus:outline-none focus:border-[#c6aa54]"
                  placeholder="Enter username..."
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="group relative">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#c6aa54] cursor-help" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <div className="invisible group-hover:visible absolute right-0 bottom-full mb-2 w-48 p-2 bg-gray-800 text-sm text-white rounded shadow-lg">
                      Stats are automatically updated every hour
                    </div>
                  </div>
                </div>
              </div>
              <Popover className="relative">
                <Popover.Button
                  disabled
                  className="px-6 py-3 bg-[#c6aa54] text-black font-semibold rounded-lg hover:bg-[#d4b75f] transition-colors disabled:opacity-50"
                >
                  Tracked
                </Popover.Button>
                <Popover.Panel className="absolute z-10 px-3 py-2 mt-2 text-sm bg-gray-800 text-white rounded shadow-lg border border-[#c6aa54]">
                  Player is being tracked
                </Popover.Panel>
              </Popover>
            </div>
          </div>
        </div>

        {error && <p className="text-red-400 mb-6">{error}</p>}

        {/* Player Stats Overview */}
        {latestOverall && (
          <div className="bg-[#2c2f33]/90 backdrop-blur-sm rounded-xl border border-[#c6aa54]/50 p-8 mb-8 shadow-lg">
            <div className="flex flex-col sm:flex-row justify-between items-start gap-6 mb-8">
              <div>
                <div className="flex items-center gap-4 mb-3">
                  <h2 className="text-3xl font-bold text-[#c6aa54]">{username}</h2>
                  {getRankBadge(latestOverall.rank) && (
                    <div className={`px-3 py-1 rounded-full text-sm font-medium text-white bg-gradient-to-r ${getRankBadge(latestOverall.rank)?.color}`}>
                      {getRankBadge(latestOverall.rank)?.text}
                    </div>
                  )}
                </div>
                <p className="text-gray-400">Last updated {latestSnapshotTime}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-gray-700/50 relative group hover:border-[#c6aa54]/30 transition-colors">
                <p className="text-sm text-[#c6aa54] font-medium mb-2">Rank</p>
                <p className="text-3xl font-bold">#{latestOverall.rank.toLocaleString()}</p>
              </div>
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-gray-700/50 group hover:border-[#c6aa54]/30 transition-colors">
                <p className="text-sm text-[#c6aa54] font-medium mb-2">Combat Level</p>
                <p className="text-3xl font-bold">{combatLevel}</p>
              </div>
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-gray-700/50 group hover:border-[#c6aa54]/30 transition-colors">
                <p className="text-sm text-[#c6aa54] font-medium mb-2">Total Level</p>
                <p className="text-3xl font-bold">{latestOverall.level}</p>
              </div>
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-gray-700/50 group hover:border-[#c6aa54]/30 transition-colors">
                <p className="text-sm text-[#c6aa54] font-medium mb-2">Total XP</p>
                <p className="text-3xl font-bold">{Math.floor(latestOverall.value / 10).toLocaleString()}</p>
              </div>
            </div>
          </div>
        )}

        {/* Combined Gains Overview and Skill Gains */}
        <div className="bg-[#2c2f33]/90 backdrop-blur-sm rounded-xl border border-[#c6aa54]/50 p-8 mb-8 shadow-lg">
          <div className="flex flex-col sm:flex-row justify-between items-start gap-6 mb-8">
            <div>
              <h2 className="text-2xl font-bold text-[#c6aa54] mb-2">Progress Overview</h2>
              {snapshots.length === 0 ? (
                <p className="text-gray-400">No snapshots loaded yet.</p>
              ) : (
                <>
                  {xpGained === 0 ? (
                    <p className="text-yellow-400">
                      No XP gained in this timeframe (or insufficient data).
                    </p>
                  ) : (
                    <p className="text-white">
                      Gained{" "}
                      <span className="font-bold text-[#c6aa54]">{xpGained.toLocaleString()}</span>{" "}
                      Overall XP in the last{" "}
                      {timeRangeDays === 99999 ? "All Time" : `${timeRangeDays} days`}.
                    </p>
                  )}
                  <div className="flex gap-4 mt-2 text-sm text-gray-300">
                    {earliestSnapshotTime && (
                      <span>From: <span className="font-bold">{earliestSnapshotTime}</span></span>
                    )}
                    {latestSnapshotTime && (
                      <span>To: <span className="font-bold">{latestSnapshotTime}</span></span>
                    )}
                  </div>
                </>
              )}
            </div>
            <div className="flex items-center gap-3">
              <label htmlFor="timeRange" className="font-medium text-[#c6aa54]">
                Time Range:
              </label>
              <select
                id="timeRange"
                value={timeRangeDays}
                onChange={(e) => setTimeRangeDays(Number(e.target.value))}
                className="bg-gray-800 rounded-lg px-4 py-2 text-white border border-gray-700 focus:outline-none focus:border-[#c6aa54]"
              >
                {TIME_RANGES.map(tr => (
                  <option key={tr.label} value={tr.days}>
                    {tr.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* XP Chart */}
          <div className="mb-8">
            {chartData.length === 0 ? (
              <p className="text-gray-400">No data to display for this timeframe.</p>
            ) : (
              <div style={{ width: "100%", height: 300 }}>
                <ResponsiveContainer>
                  <LineChart data={chartData}>
                    <CartesianGrid stroke="#444" strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: "#fff" }}
                      tickFormatter={(val) => {
                        const d = new Date(val);
                        return d.toLocaleDateString();
                      }}
                    />
                    <YAxis
                      tick={{ fill: "#fff" }}
                      tickFormatter={(val) => val.toLocaleString()}
                    />
                    <Tooltip
                      labelFormatter={(label) => {
                        const d = new Date(label);
                        return d.toLocaleString();
                      }}
                      formatter={(value: number) => `${value.toLocaleString()} XP`}
                      contentStyle={{ backgroundColor: "#2c2f33", borderColor: "#c6aa54" }}
                      labelStyle={{ color: "#fff" }}
                    />
                    <Line
                      type="monotone"
                      dataKey="xp"
                      stroke="#c6aa54"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Skill Gains Table */}
          {skillGains.length > 0 && (
            <div className="overflow-x-auto">
              <h3 className="text-xl font-bold text-[#c6aa54] mb-4">Skill Gains</h3>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700/50">
                    <th className="px-4 py-3 text-left text-[#c6aa54]">Skill</th>
                    <th className="px-4 py-3 text-right text-[#c6aa54]">XP Gained</th>
                    <th className="px-4 py-3 text-right text-[#c6aa54]">Levels Gained</th>
                    <th className="px-4 py-3 text-right text-[#c6aa54]">Rank Change</th>
                  </tr>
                </thead>
                <tbody>
                  {skillGains.map((row) => {
                    const meta = skillMeta[row.skillType];
                    const arrow = row.rankDiff < 0 ? "↑" : (row.rankDiff > 0 ? "↓" : "");
                    const rankColor =
                      row.rankDiff < 0 ? "text-green-400" :
                      (row.rankDiff > 0 ? "text-red-400" : "text-gray-300");
                    const rankDiffAbs = Math.abs(row.rankDiff).toLocaleString();

                    return (
                      <tr key={row.skillType} className="border-b border-gray-700/50 last:border-0 hover:bg-gray-800/20 transition-colors">
                        <td className="px-4 py-4 text-left">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 flex items-center justify-center rounded bg-gray-800/50 p-1.5 group-hover:bg-gray-800 transition-colors">
                              <img
                                src={meta.icon}
                                alt={meta.name}
                                className="w-full h-full"
                              />
                            </div>
                            <span className="font-semibold text-white">{meta.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-right font-medium">
                          {row.xpDiff.toLocaleString()}
                        </td>
                        <td className="px-4 py-4 text-right font-medium">
                          {row.levelDiff > 0 ? `+${row.levelDiff}` : row.levelDiff}
                        </td>
                        <td className={`px-4 py-4 text-right font-semibold ${rankColor}`}>
                          {arrow}{rankDiffAbs || 0}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function TrackerPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-[#1a1b26] text-white">
      <Suspense>
        <ParamsReader />
      </Suspense>
      <div className="max-w-6xl mx-auto px-4 py-16">
        <Suspense fallback={
          <div className="text-center py-12">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#c6aa54] border-r-transparent"></div>
            <p className="mt-4 text-gray-400">Loading player data...</p>
          </div>
        }>
          <TrackerContent />
        </Suspense>
      </div>
    </div>
  );
}