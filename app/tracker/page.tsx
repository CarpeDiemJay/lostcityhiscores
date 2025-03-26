"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer
} from "recharts";

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
  created_at: string;
  stats: SkillData[];
}

/** Time range presets */
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

/** For labeling each skill, icon, etc. */
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

/** Convert XP * 10 to real XP. */
function xpValue(s: SkillData) {
  return Math.floor(s.value / 10);
}

/** Quick time-ago function for earliest/latest lines. */
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

export default function TrackerPage() {
  // We'll read ?username= from the URL automatically
  const searchParams = useSearchParams();
  const initialUsername = searchParams.get("username") || "";

  const [username, setUsername] = useState(initialUsername);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // The chosen timeframe
  const [timeRangeDays, setTimeRangeDays] = useState<number>(7); // default 7d

  const [xpGained, setXpGained] = useState<number>(0);
  const [earliestSnapshotTime, setEarliestSnapshotTime] = useState("");
  const [latestSnapshotTime, setLatestSnapshotTime] = useState("");
  const [skillGains, setSkillGains] = useState<{
    skillType: number;
    xpDiff: number;
    levelDiff: number;
    rankDiff: number;
  }[]>([]);
  const [chartData, setChartData] = useState<{ date: string; xp: number }[]>([]);

  /** Auto-fetch snapshots if we have a username from the query. */
  useEffect(() => {
    if (username) {
      fetchHistory(username);
    }
  }, [username]);

  async function fetchHistory(player: string) {
    setLoading(true);
    setError("");
    setSnapshots([]);

    try {
      const res = await fetch(`/api/getHistory?username=${encodeURIComponent(player)}`);
      const json = await res.json();
      if (json.error) {
        setError(json.error);
      } else {
        setSnapshots(json.snapshots || []);
      }
    } catch (err) {
      console.error(err);
      setError("Something went wrong while fetching history.");
    } finally {
      setLoading(false);
    }
  }

  /** Filter snapshots by timeframe, compute Gains & chart data. */
  useEffect(() => {
    if (snapshots.length === 0) {
      setXpGained(0);
      setChartData([]);
      setSkillGains([]);
      setEarliestSnapshotTime("");
      setLatestSnapshotTime("");
      return;
    }

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - timeRangeDays);

    let filtered = snapshots;
    if (timeRangeDays < 99999) {
      filtered = snapshots.filter(snap => {
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

    const earliest = filtered[0];
    const latest = filtered[filtered.length - 1];

    setEarliestSnapshotTime(timeAgo(new Date(earliest.created_at)));
    setLatestSnapshotTime(timeAgo(new Date(latest.created_at)));

    const oldOverall = earliest.stats.find(s => s.type === 0);
    const newOverall = latest.stats.find(s => s.type === 0);
    const oldXP = oldOverall ? xpValue(oldOverall) : 0;
    const newXP = newOverall ? xpValue(newOverall) : 0;
    const gained = newXP - oldXP;
    setXpGained(gained);

    // skill-by-skill Gains
    const diffs: {
      skillType: number;
      xpDiff: number;
      levelDiff: number;
      rankDiff: number;
    }[] = [];
    for (const newSkill of latest.stats) {
      if (newSkill.type === 0) continue; // skip Overall in the table
      const oldSkill = earliest.stats.find(s => s.type === newSkill.type);
      if (!oldSkill) continue;

      const xpDiff = xpValue(newSkill) - xpValue(oldSkill);
      const levelDiff = newSkill.level - oldSkill.level;
      const rankDiff = newSkill.rank - oldSkill.rank;

      if (xpDiff !== 0 || levelDiff !== 0 || rankDiff !== 0) {
        diffs.push({ skillType: newSkill.type, xpDiff, levelDiff, rankDiff });
      }
    }
    diffs.sort((a, b) => b.xpDiff - a.xpDiff);
    setSkillGains(diffs);

    // Build chart data for Overall XP
    const cData = filtered.map(snap => {
      const ov = snap.stats.find(s => s.type === 0);
      return {
        date: snap.created_at,
        xp: ov ? xpValue(ov) : 0,
      };
    });
    setChartData(cData);

  }, [snapshots, timeRangeDays]);

  return (
    <div className="min-h-screen bg-gray-900 text-white py-8">
      {/* HEADER */}
      <header className="max-w-5xl mx-auto px-4 mb-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center">
            <img
              src="/ui/IMG_1296.png"
              alt="Home Icon"
              className="h-10 w-auto mr-3"
            />
            <h1 className="text-3xl font-bold text-[#c6aa54]">
              Lost City Gains
            </h1>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4">
        {/* We only show the search bar in case the user wants to change username. */}
        <div className="flex items-center gap-2 mb-6">
          <input
            type="text"
            placeholder="Enter username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="px-3 py-2 rounded bg-gray-800 text-white focus:outline-none"
          />
          {/* No explicit "Load" button; auto loads if username is present */}
        </div>

        {loading && <p className="text-yellow-400 mb-4">Loading snapshots...</p>}
        {error && <p className="text-red-500 mb-4">{error}</p>}

        {/* TIME RANGE DROPDOWN */}
        <div className="flex items-center gap-2 mb-4">
          <label htmlFor="timeRange" className="font-semibold">
            Time Range:
          </label>
          <select
            id="timeRange"
            value={timeRangeDays}
            onChange={(e) => setTimeRangeDays(Number(e.target.value))}
            className="bg-gray-800 text-white rounded px-2 py-1"
          >
            {TIME_RANGES.map(tr => (
              <option key={tr.label} value={tr.days}>
                {tr.label}
              </option>
            ))}
          </select>
        </div>

        {/* Gains Info */}
        <div className="bg-[#2c2f33] p-4 rounded mb-4 border border-[#c6aa54]">
          <h2 className="text-xl font-bold text-[#c6aa54] mb-2">Gains Overview</h2>
          {snapshots.length === 0 ? (
            <p className="text-gray-400">No snapshots loaded yet.</p>
          ) : (
            <>
              {xpGained === 0 ? (
                <p className="text-yellow-400 mb-2">
                  No XP gained in this timeframe (or insufficient data).
                </p>
              ) : (
                <p className="text-white mb-2">
                  You have gained{" "}
                  <span className="font-bold">{xpGained.toLocaleString()}</span>{" "}
                  Overall XP in the last{" "}
                  {timeRangeDays === 99999 ? "All Time" : `${timeRangeDays} days`}.
                </p>
              )}
              {earliestSnapshotTime && (
                <p className="text-sm text-gray-300">
                  Earliest snapshot in period: <span className="font-bold">{earliestSnapshotTime}</span>
                </p>
              )}
              {latestSnapshotTime && (
                <p className="text-sm text-gray-300">
                  Last updated: <span className="font-bold">{latestSnapshotTime}</span>
                </p>
              )}
            </>
          )}
        </div>

        {/* Skill Gains Table */}
        {skillGains.length > 0 && (
          <div className="bg-[#2c2f33] p-4 rounded mb-4 border border-[#c6aa54] overflow-x-auto">
            <h2 className="text-xl font-bold text-[#c6aa54] mb-2">Skill Gains</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-300 border-b border-gray-600">
                  <th className="px-2 py-1 text-left">Skill</th>
                  <th className="px-2 py-1 text-right">XP Gained</th>
                  <th className="px-2 py-1 text-right">Levels Gained</th>
                  <th className="px-2 py-1 text-right">Rank Change</th>
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
                    <tr key={row.skillType} className="border-b border-gray-700 last:border-0">
                      <td className="px-2 py-1 text-left">
                        <div className="flex items-center gap-1">
                          <img
                            src={meta.icon}
                            alt={meta.name}
                            className="w-4 h-4"
                          />
                          <span className="text-white font-semibold">{meta.name}</span>
                        </div>
                      </td>
                      <td className="px-2 py-1 text-right text-white">
                        {row.xpDiff.toLocaleString()}
                      </td>
                      <td className="px-2 py-1 text-right text-white">
                        {row.levelDiff > 0 ? `+${row.levelDiff}` : row.levelDiff}
                      </td>
                      <td className={`px-2 py-1 text-right font-semibold ${rankColor}`}>
                        {arrow}{rankDiffAbs || 0}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Overall XP Chart */}
        <div className="bg-[#2c2f33] p-6 rounded-lg border border-[#c6aa54] mb-6">
          <h2 className="text-2xl font-bold text-[#c6aa54] mb-2">Overall XP Graph</h2>
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
      </main>
    </div>
  );
}
