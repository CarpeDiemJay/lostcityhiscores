"use client";

import React, { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer
} from "recharts";

// Basic shape of a snapshot
interface SkillData {
  type: number;
  level: number;
  rank: number;
  value: number;  // XP * 10
  date?: string;
}

interface Snapshot {
  id: number;
  username: string;
  created_at: string; // e.g. "2025-03-25T06:06:17.123Z"
  stats: SkillData[];
}

// We'll define a few time range presets
const TIME_RANGES = [
  { label: "24h", days: 1 },
  { label: "7d", days: 7 },
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
  { label: "1y", days: 365 },
  { label: "All", days: 99999 }, // effectively no limit
];

export default function TrackerPage() {
  const [username, setUsername] = useState("");
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // The chosen timeframe (default 7d)
  const [timeRangeDays, setTimeRangeDays] = useState<number>(7);

  // Gains info
  const [xpGained, setXpGained] = useState<number>(0);

  // Data for Recharts
  const [chartData, setChartData] = useState<{ date: string; xp: number }[]>([]);

  // 1) Fetch snapshots from /api/getHistory
  async function fetchHistory() {
    if (!username) return;
    setLoading(true);
    setError("");
    setSnapshots([]);

    try {
      const res = await fetch(`/api/getHistory?username=${encodeURIComponent(username)}`);
      const json = await res.json();
      if (json.error) {
        setError(json.error);
      } else {
        // We expect snapshots to be sorted ascending by created_at
        setSnapshots(json.snapshots || []);
      }
    } catch (err) {
      console.error(err);
      setError("Something went wrong while fetching history.");
    } finally {
      setLoading(false);
    }
  }

  /**
   * 2) Recompute Gains & chart data whenever snapshots or timeRangeDays changes.
   * This effect is crucial for the filter to work.
   */
  useEffect(() => {
    // If no snapshots, reset everything
    if (snapshots.length === 0) {
      setXpGained(0);
      setChartData([]);
      return;
    }

    // 2a) Filter by time range
    // We'll create a cutoff date: "Now - timeRangeDays"
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - timeRangeDays);

    let filtered = snapshots;

    // Only filter if timeRangeDays < 99999 (which means "All")
    if (timeRangeDays < 99999) {
      filtered = snapshots.filter((snap) => {
        const snapDate = new Date(snap.created_at);
        // If snapDate >= cutoff, it's within the timeframe
        return snapDate >= cutoff;
      });
    }

    // If the filter results in zero snapshots, just reset
    if (filtered.length === 0) {
      setXpGained(0);
      setChartData([]);
      return;
    }

    // 2b) Identify earliest vs. latest in filtered
    // Because our /api/getHistory route sorts ascending,
    // the earliest is filtered[0], the latest is filtered[filtered.length - 1]
    const earliest = filtered[0];
    const latest = filtered[filtered.length - 1];

    // 2c) Gains: compare Overall XP
    const oldOverall = earliest.stats.find(s => s.type === 0);
    const newOverall = latest.stats.find(s => s.type === 0);
    const oldXP = oldOverall ? Math.floor(oldOverall.value / 10) : 0;
    const newXP = newOverall ? Math.floor(newOverall.value / 10) : 0;
    const gained = newXP - oldXP;
    setXpGained(gained);

    // 2d) Build chart data for each snapshot in "filtered"
    // We'll just store (date, xp)
    const cData = filtered.map((snap) => {
      const overall = snap.stats.find(s => s.type === 0);
      const xpVal = overall ? Math.floor(overall.value / 10) : 0;
      return {
        date: snap.created_at,
        xp: xpVal,
      };
    });
    setChartData(cData);

  }, [snapshots, timeRangeDays]); // triggers on any change to snapshots or timeRangeDays

  return (
    <div className="min-h-screen bg-gray-900 text-white py-8">
      <div className="max-w-5xl mx-auto px-4">
        <h1 className="text-3xl font-bold mb-6">Tracker (Gains & Graph)</h1>

        {/* USERNAME + LOAD */}
        <div className="flex items-center gap-2 mb-6">
          <input
            type="text"
            placeholder="Enter username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="px-3 py-2 rounded bg-gray-800 text-white focus:outline-none"
          />
          <button
            onClick={fetchHistory}
            className="px-4 py-2 bg-blue-500 text-white font-semibold rounded hover:bg-blue-600"
          >
            Load History
          </button>
        </div>

        {loading && <p className="text-yellow-400">Loading snapshots...</p>}
        {error && <p className="text-red-500">{error}</p>}

        {/* TIME RANGE SELECT */}
        <div className="flex items-center gap-2 mb-4">
          <label htmlFor="timeRange" className="text-white">Time Range:</label>
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

        {/* GAINS BOX */}
        <div className="bg-[#2c2f33] p-4 rounded mb-4 border border-[#c6aa54]">
          <h2 className="text-xl font-bold text-[#c6aa54] mb-2">Gains</h2>
          {xpGained > 0 ? (
            <p>
              You have gained <span className="font-bold">{xpGained.toLocaleString()}</span> Overall XP in
              the last {timeRangeDays === 99999 ? "All Time" : `${timeRangeDays} days`}.
            </p>
          ) : (
            <p className="text-yellow-400">
              No XP gained in this timeframe (or insufficient data).
            </p>
          )}
        </div>

        {/* CHART */}
        <div className="bg-[#2c2f33] p-4 rounded border border-[#c6aa54]">
          <h2 className="text-xl font-bold text-[#c6aa54] mb-2">Overall XP Graph</h2>
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
      </div>
    </div>
  );
}
