import React, { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer
} from "recharts";

interface PlayerTrackerProps {
  username: string;
  playerData: SkillData[] | null;
}

interface SkillData {
  type: number;
  level: number;
  rank: number;
  value: number;
  date?: string;
}

interface Snapshot {
  id: number;
  username: string;
  created_at: string;
  stats: SkillData[];
}

interface SkillGain {
  skillType: number;
  oldXP: number;
  newXP: number;
  xpDiff: number;
  oldLevel: number;
  newLevel: number;
  levelDiff: number;
  rankDiff: number;
  currentRank: number;
}

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

function getMilliseconds(timeRange: string): number {
  const hours = {
    "1h": 1,
    "4h": 4,
    "8h": 8,
    "24h": 24,
    "7d": 24 * 7,
    "1m": 24 * 30,
    "3m": 24 * 90,
    "6m": 24 * 180,
    "1y": 24 * 365
  }[timeRange] || 1;

  return hours * 60 * 60 * 1000;
}

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

export default function PlayerTracker({ username, playerData }: PlayerTrackerProps) {
  const [timeRange, setTimeRange] = useState("24h");
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [xpGained, setXpGained] = useState(0);
  const [skillGains, setSkillGains] = useState<SkillGain[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [firstSnapshot, setFirstSnapshot] = useState<string>("");
  const [latestSnapshot, setLatestSnapshot] = useState<string>("");

  useEffect(() => {
    async function fetchHistory() {
      if (!username) return;
      
      try {
        setLoading(true);
        setError("");
        
        // Get all snapshots for this user
        const response = await fetch(`/api/getHistory?username=${encodeURIComponent(username)}`);
        const text = await response.text();
        console.log('Raw response from getHistory:', text); // Debug log
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status} ${response.statusText}`);
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

        // Debug log to see what snapshots we're getting
        console.log('Received snapshots:', json.snapshots.map((s: Snapshot) => ({
          id: s.id,
          created_at: s.created_at,
          overall_xp: s.stats.find((stat: SkillData) => stat.type === 0)?.value
        })));

        // Validate snapshot format
        for (const snapshot of json.snapshots) {
          if (!snapshot.stats || !Array.isArray(snapshot.stats)) {
            throw new Error('Invalid snapshot format: missing stats array');
          }
        }
        
        setSnapshots(json.snapshots);
        processSnapshots(json.snapshots);
      } catch (err) {
        console.error("Error in fetchHistory:", err);
        setError(err instanceof Error ? err.message : "Failed to fetch player history");
      } finally {
        setLoading(false);
      }
    }

    fetchHistory();
  }, [username, timeRange]); // Re-fetch when timeRange changes

  function processSnapshots(allSnapshots: Snapshot[]) {
    if (!allSnapshots.length) return;

    // Sort all snapshots by created_at timestamp
    const sortedSnapshots = [...allSnapshots].sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    // Calculate the target times for comparison
    const now = new Date();
    const cutoffTime = new Date(now.getTime() - getMilliseconds(timeRange));

    console.log('Time range targets:', {
      start: cutoffTime.toISOString(),
      end: now.toISOString(),
      timeRange
    });

    // Find the closest snapshots to our target times
    const findClosestSnapshot = (target: Date, snapshots: Snapshot[]): Snapshot => {
      return snapshots.reduce((prev, curr) => {
        const prevDiff = Math.abs(new Date(prev.created_at).getTime() - target.getTime());
        const currDiff = Math.abs(new Date(curr.created_at).getTime() - target.getTime());
        return currDiff < prevDiff ? curr : prev;
      });
    };

    const latest = findClosestSnapshot(now, sortedSnapshots);
    const earliest = findClosestSnapshot(cutoffTime, sortedSnapshots);

    console.log('Found snapshots:', {
      earliest: {
        id: earliest.id,
        created_at: earliest.created_at,
        target: cutoffTime.toISOString(),
        diff_minutes: Math.abs(new Date(earliest.created_at).getTime() - cutoffTime.getTime()) / (60 * 1000)
      },
      latest: {
        id: latest.id,
        created_at: latest.created_at,
        target: now.toISOString(),
        diff_minutes: Math.abs(new Date(latest.created_at).getTime() - now.getTime()) / (60 * 1000)
      }
    });

    // Format snapshot times
    setFirstSnapshot(new Date(earliest.created_at).toLocaleString());
    setLatestSnapshot(new Date(latest.created_at).toLocaleString());

    // Calculate gains for each skill
    const gains: SkillGain[] = [];
    let overallGain = 0;

    // Only calculate gains if we have different snapshots
    if (earliest.id !== latest.id) {
      latest.stats.forEach(newStat => {
        const oldStat = earliest.stats.find(s => s.type === newStat.type);
        if (!oldStat) return;

        const oldXP = Math.floor(oldStat.value / 10);
        const newXP = Math.floor(newStat.value / 10);
        const xpDiff = newXP - oldXP;
        const rankDiff = oldStat.rank - newStat.rank; // Positive means improved rank

        console.log(`Skill ${skillMeta[newStat.type]?.name}:`, {
          oldXP,
          newXP,
          xpDiff,
          oldRank: oldStat.rank,
          newRank: newStat.rank,
          rankDiff
        });

        // Include in gains if there's any XP gain or rank change
        if (xpDiff !== 0 || rankDiff !== 0) {
          gains.push({
            skillType: newStat.type,
            oldXP,
            newXP,
            xpDiff,
            oldLevel: oldStat.level,
            newLevel: newStat.level,
            levelDiff: newStat.level - oldStat.level,
            rankDiff,
            currentRank: newStat.rank
          });

          if (newStat.type === 0) {
            overallGain = xpDiff;
          }
        }
      });
    }

    gains.sort((a, b) => b.xpDiff - a.xpDiff);
    setSkillGains(gains);
    setXpGained(overallGain);

    // Generate chart data points
    const chartPoints = sortedSnapshots
      .filter(snap => {
        const time = new Date(snap.created_at).getTime();
        return time >= new Date(earliest.created_at).getTime() && 
               time <= new Date(latest.created_at).getTime();
      })
      .map(snapshot => {
        const overall = snapshot.stats.find(s => s.type === 0);
        return {
          time: new Date(snapshot.created_at).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: false 
          }),
          xp: overall ? Math.floor(overall.value / 10) : 0
        };
      });

    console.log('Chart data points:', chartPoints);
    setChartData(chartPoints);
  }

  // Time range filter component
  const TimeRangeFilter = () => (
    <select
      value={timeRange}
      onChange={(e) => setTimeRange(e.target.value)}
      className="w-32 bg-[#0A0F1A] text-[#3B82F6] border border-[#1F2937] rounded px-2 py-0.5 text-sm cursor-pointer focus:outline-none hover:border-[#3B82F6]/50 [&>option]:bg-[#0A0F1A] [&>option]:py-0"
      style={{ 
        WebkitAppearance: "none",
        MozAppearance: "none",
        appearance: "none",
        backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%233B82F6' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 0.25rem center",
        backgroundSize: "1em 1em",
        paddingRight: "1.75rem"
      }}
    >
      <option value="1h" className="py-0 px-1">1h</option>
      <option value="4h" className="py-0 px-1">4h</option>
      <option value="8h" className="py-0 px-1">8h</option>
      <option value="24h" className="py-0 px-1">24h</option>
      <option value="7d" className="py-0 px-1">7 days</option>
      <option value="1m" className="py-0 px-1">1 month</option>
      <option value="3m" className="py-0 px-1">3 months</option>
      <option value="6m" className="py-0 px-1">6 months</option>
      <option value="1y" className="py-0 px-1">1 year</option>
    </select>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-r-transparent" />
      </div>
    );
  }

  if (error) {
    return <div className="text-red-400 p-8">{error}</div>;
  }

  // Get overall stats for the header
  const overall = playerData?.find(s => s.type === 0);
  const combatLevel = playerData ? calculateCombatLevel(playerData) : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Auto-enrollment Info */}
      <div className="text-sm text-gray-400 bg-[#111827]/90 backdrop-blur-sm rounded-xl border border-blue-500/20 p-4">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Your account is automatically enrolled in hourly tracking once you search for your username.</span>
        </div>
      </div>

      {/* Skill Gains */}
      <div className="bg-[#111827]/90 backdrop-blur-sm rounded-xl border border-blue-500/20 p-2 sm:p-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-6 mb-4 px-2">
          <div>
            <h2 className="text-lg font-bold text-blue-400">Skill Gains</h2>
            <div className="text-sm text-gray-400 mt-1">
              {xpGained > 0 ? (
                <span>Gained {xpGained.toLocaleString()} Overall XP in the last {
                  timeRange === "1h" ? "hour" :
                  timeRange === "4h" ? "4 hours" :
                  timeRange === "8h" ? "8 hours" :
                  timeRange === "24h" ? "24 hours" :
                  timeRange === "7d" ? "7 days" :
                  timeRange === "1m" ? "month" :
                  timeRange === "3m" ? "3 months" :
                  timeRange === "6m" ? "6 months" :
                  timeRange === "1y" ? "year" : timeRange
                }</span>
              ) : (
                <span>No XP gains in the selected time period</span>
              )}
            </div>
          </div>
          <TimeRangeFilter />
        </div>
        <div className="overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="text-left text-gray-400 border-b border-blue-500/20 text-sm">
                <th className="py-1 px-2 font-medium">Skill</th>
                <th className="py-1 px-2 font-medium text-right">Exp.</th>
                <th className="py-1 px-2 font-medium text-right">Lvls</th>
                <th className="py-1 px-2 font-medium text-right">Rank</th>
              </tr>
            </thead>
            <tbody>
              {skillGains.map((gain) => {
                const meta = skillMeta[gain.skillType];
                if (!meta) return null;

                return (
                  <tr key={gain.skillType} className="border-b border-blue-500/10 text-sm hover:bg-blue-500/5">
                    <td className="py-1 px-2">
                      <div className="flex items-center gap-1.5">
                        <img
                          src={meta.icon}
                          alt={meta.name}
                          className="w-3.5 h-3.5"
                        />
                        <span className="text-blue-400 truncate">{meta.name}</span>
                      </div>
                    </td>
                    <td className="py-1 px-2 text-right tabular-nums">
                      {gain.xpDiff > 0 ? (
                        <span className="text-green-400">+{gain.xpDiff.toLocaleString()}</span>
                      ) : '0'}
                    </td>
                    <td className="py-1 px-2 text-right tabular-nums">
                      {gain.levelDiff > 0 ? (
                        <span className="text-green-400">+{gain.levelDiff}</span>
                      ) : (
                        '0'
                      )}
                    </td>
                    <td className="py-1 px-2 text-right tabular-nums">
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-gray-400">#{gain.currentRank.toLocaleString()}</span>
                        {gain.rankDiff > 0 ? (
                          <span className="text-green-400">+{gain.rankDiff}</span>
                        ) : gain.rankDiff < 0 ? (
                          <span className="text-red-400">{gain.rankDiff}</span>
                        ) : (
                          <span>0</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {skillGains.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center py-3 text-gray-400 text-sm">
                    No gains in the selected time period
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Experience Timeline */}
      <div className="bg-[#111827]/90 backdrop-blur-sm rounded-xl border border-blue-500/20 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-6 mb-6">
          <div>
            <h2 className="text-xl font-bold text-blue-400 mb-2">Experience Timeline</h2>
            <div className="text-sm text-gray-400">
              Track your progression over time with our detailed experience timeline. This chart visualizes your total XP gains, helping you monitor your growth and achievements.
            </div>
          </div>
          <TimeRangeFilter />
        </div>

        <div className="h-[250px] sm:h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="time"
                stroke="#9CA3AF"
                fontSize={12}
                tickMargin={10}
                angle={-45}
                textAnchor="end"
                height={50}
              />
              <YAxis
                stroke="#9CA3AF"
                fontSize={12}
                tickFormatter={(value) => value.toLocaleString()}
                domain={['dataMin', 'dataMax']}
                interval="preserveStartEnd"
                width={80}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1F2937",
                  border: "none",
                  borderRadius: "0.5rem",
                  padding: "1rem",
                }}
                labelStyle={{ color: "#9CA3AF" }}
                formatter={(value: number) => [
                  value.toLocaleString(),
                  "Total XP",
                ]}
              />
              <Line
                type="monotone"
                dataKey="xp"
                stroke="#3B82F6"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
} 