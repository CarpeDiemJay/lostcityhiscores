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
import PlayerOverview from '../components/PlayerOverview';

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

function SearchParamsWrapper({ children }: { children: (params: URLSearchParams) => React.ReactNode }) {
  const searchParams = useSearchParams();
  return <>{children(searchParams)}</>;
}

function TrackerContent() {
  const searchParams = useSearchParams();
  const [username, setUsername] = useState(searchParams.get('username') || "");
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

  // Auto-load data when username is in URL
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
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <Link href="/" className="block mb-8">
            <h1 className="text-4xl sm:text-5xl font-bold text-center bg-gradient-to-r from-[#c6aa54] to-[#e9d5a0] text-transparent bg-clip-text">
              Lost City Tracker
            </h1>
          </Link>

          {error && (
            <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 mb-8 text-red-400">
              {error}
            </div>
          )}

          {snapshots.length > 0 && (
            <>
              <PlayerOverview
                username={username}
                rank={snapshots[snapshots.length - 1].stats.find(s => s.type === 0)?.rank || 0}
                combatLevel={calculateCombatLevel(snapshots[snapshots.length - 1].stats)}
                totalLevel={snapshots[snapshots.length - 1].stats.find(s => s.type === 0)?.level || 0}
                totalXp={Math.floor((snapshots[snapshots.length - 1].stats.find(s => s.type === 0)?.value || 0) / 10)}
                lastUpdated={snapshots[snapshots.length - 1].created_at}
              />

              <div className="bg-[#2c2f33]/90 backdrop-blur-sm rounded-xl border border-[#c6aa54]/50 p-4 sm:p-8 mb-8 shadow-lg">
                <div className="flex flex-wrap gap-4 mb-8">
                  <div className="flex-1">
                    <h2 className="text-xl font-bold text-[#c6aa54] mb-4">Time Range</h2>
                    <div className="flex flex-wrap gap-2">
                      {TIME_RANGES.map(range => (
                        <button
                          key={range.label}
                          onClick={() => setTimeRangeDays(range.days)}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                            timeRangeDays === range.days
                              ? 'bg-[#c6aa54] text-black'
                              : 'bg-gray-800/50 text-gray-300 hover:bg-gray-800'
                          }`}
                        >
                          {range.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-[#c6aa54] mb-4">Total XP Gained</h2>
                    <p className="text-2xl font-bold">{xpGained.toLocaleString()}</p>
                  </div>
                </div>

                <div className="h-[300px] mb-8">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis
                        dataKey="date"
                        stroke="#9CA3AF"
                        tick={{ fill: '#9CA3AF' }}
                        tickFormatter={(value) => new Date(value).toLocaleDateString()}
                      />
                      <YAxis
                        stroke="#9CA3AF"
                        tick={{ fill: '#9CA3AF' }}
                        tickFormatter={(value) => value.toLocaleString()}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1F2937',
                          border: '1px solid #374151',
                          borderRadius: '0.5rem',
                        }}
                        labelStyle={{ color: '#9CA3AF' }}
                        formatter={(value: any) => [value.toLocaleString(), 'XP']}
                        labelFormatter={(label) => new Date(label).toLocaleString()}
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

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-700/50">
                        <th className="text-left py-3 px-4 text-[#c6aa54] font-medium">Skill</th>
                        <th className="text-right py-3 px-4 text-[#c6aa54] font-medium">XP Gained</th>
                        <th className="text-right py-3 px-4 text-[#c6aa54] font-medium">Levels Gained</th>
                        <th className="text-right py-3 px-4 text-[#c6aa54] font-medium">Rank Change</th>
                      </tr>
                    </thead>
                    <tbody>
                      {skillGains.map(gain => {
                        const meta = skillMeta[gain.skillType];
                        if (!meta) return null;

                        return (
                          <tr key={gain.skillType} className="border-b border-gray-700/50">
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <img src={meta.icon} alt={meta.name} className="w-5 h-5" />
                                <span>{meta.name}</span>
                              </div>
                            </td>
                            <td className="text-right py-3 px-4">
                              {gain.xpDiff.toLocaleString()}
                            </td>
                            <td className="text-right py-3 px-4">
                              {gain.levelDiff > 0 && '+'}
                              {gain.levelDiff}
                            </td>
                            <td className="text-right py-3 px-4">
                              {gain.rankDiff > 0 && '+'}
                              {gain.rankDiff.toLocaleString()}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function TrackerPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-6xl mx-auto">
            <h1 className="text-4xl sm:text-5xl font-bold text-center mb-8 bg-gradient-to-r from-[#c6aa54] to-[#e9d5a0] text-transparent bg-clip-text">
              Lost City Tracker
            </h1>
            <div className="text-center text-gray-400">Loading...</div>
          </div>
        </div>
      </div>
    }>
      <TrackerContent />
    </Suspense>
  );
}