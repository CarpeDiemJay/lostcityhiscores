"use client";

import React, { useState, useRef } from "react";
import { toPng } from "html-to-image";

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

  // Summary states
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  // Save button logic
  const [saveDisabled, setSaveDisabled] = useState(true);
  const [showSaveTooltip, setShowSaveTooltip] = useState(false);

  // Snapshot history
  const [snapshotHistory, setSnapshotHistory] = useState<Snapshot[]>([]);
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<number | "latest" | "">("");

  // For screenshot sharing
  const summaryRef = useRef<HTMLDivElement>(null);

  /**
   * 1) Fetch from /api/hiscores to get the player's current stats,
   * then fetch DB snapshots (so we can compare).
   */
  async function fetchData() {
    if (!username) return;
    setLoading(true);
    setError("");
    setData(null);
    setSummary(null);

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

      // Re-enable the Save button since we have fresh data
      setSaveDisabled(false);

      // Also fetch the player's snapshot history from DB
      await fetchHistory(username);
    } catch (err) {
      console.error(err);
      setError("Something went wrong while fetching hiscores.");
    } finally {
      setLoading(false);
    }
  }

  /**
   * 2) Fetch all snapshots for this user from /api/getHistory,
   * so we can display them in a dropdown.
   */
  async function fetchHistory(player: string) {
    try {
      const response = await fetch(`/api/getHistory?username=${encodeURIComponent(player)}`);
      const { snapshots, error } = await response.json();
      if (error) {
        console.error("Error fetching snapshot history:", error);
        return;
      }
      setSnapshotHistory(snapshots || []);
      setSelectedSnapshotId(""); // reset selection
    } catch (err) {
      console.error("Failed to fetch snapshot history:", err);
    }
  }

  /**
   * 3) Save current stats to Supabase by calling /api/saveStats,
   * then show a tooltip, disable the Save button, and re-fetch history.
   */
  async function saveCurrentStats() {
    if (!data || !username) {
      alert("No data or username to save.");
      return;
    }
    try {
      const response = await fetch("/api/saveStats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, stats: data }),
      });
      const result = await response.json();
      if (result.error) {
        alert(`Error saving stats: ${result.error}`);
      } else {
        // Show tooltip
        setShowSaveTooltip(true);
        setTimeout(() => setShowSaveTooltip(false), 3000);

        // Disable save button until fresh data is fetched again
        setSaveDisabled(true);

        // Re-fetch history to see the newly inserted snapshot
        await fetchHistory(username);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to save stats.");
    }
  }

  /**
   * 4) Generate a summary by comparing the newly fetched data
   * to either the "latest" snapshot or a user-chosen snapshot from the dropdown.
   */
  async function generateSummary() {
    if (!data || !username) {
      alert("No data or username to compare.");
      return;
    }

    if (!selectedSnapshotId || selectedSnapshotId === "latest") {
      // fetch /api/getLastSnapshot
      try {
        const response = await fetch(`/api/getLastSnapshot?username=${encodeURIComponent(username)}`);
        const { snapshot, error } = await response.json();
        if (error) {
          alert(`Error fetching latest snapshot: ${error}`);
          return;
        }
        if (!snapshot) {
          alert(`No previous snapshot found for "${username}". Please save your current stats first.`);
          return;
        }
        compareDataToSnapshot(snapshot);
      } catch (err) {
        console.error(err);
        alert("Something went wrong generating summary.");
      }
    } else {
      // find the chosen snapshot in snapshotHistory
      const snap = snapshotHistory.find(s => s.id === Number(selectedSnapshotId));
      if (!snap) {
        alert("Snapshot not found in local history.");
        return;
      }
      compareDataToSnapshot(snap);
    }
  }

  /**
   * Actually do the comparison between the new data (Lost City) and old snapshot (DB).
   */
  function compareDataToSnapshot(oldSnapshot: Snapshot) {
    if (!data) return;

    const oldData = oldSnapshot.stats;
    const newData = data;

    const oldOverall = oldData.find(s => s.type === 0);
    const newOverall = newData.find(s => s.type === 0);
    const oldTotalXP = oldOverall ? Math.floor(oldOverall.value / 10) : 0;
    const newTotalXP = newOverall ? Math.floor(newOverall.value / 10) : 0;
    const totalXPGained = newTotalXP - oldTotalXP;

    const changes: SummaryData["changes"] = [];
    for (const skill of newData) {
      const oldSkill = oldData.find(os => os.type === skill.type);
      if (!oldSkill) continue;

      const newXP = Math.floor(skill.value / 10);
      const oldXP = Math.floor(oldSkill.value / 10);
      const xpDiff = newXP - oldXP;

      const newLevel = skill.level;
      const oldLevel = oldSkill.level;
      const levelDiff = newLevel - oldLevel;

      if (xpDiff > 0 || levelDiff > 0) {
        changes.push({
          skillType: skill.type,
          oldXP,
          newXP,
          xpDiff,
          oldLevel,
          newLevel,
          levelDiff,
        });
      }
    }
    changes.sort((a, b) => b.xpDiff - a.xpDiff);

    setSummary({
      totalXPGained,
      changes,
      lastSnapshotTime: oldSnapshot.created_at,
    });
    setShowDetails(false);
  }

  /**
   * 5) Share summary by capturing a screenshot with html-to-image,
   * then either use the Web Share API or fallback to a new window.
   */
  async function shareSummary() {
    if (!summaryRef.current) return;
    try {
      const dataUrl = await toPng(summaryRef.current);
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], "summary.png", { type: "image/png" });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          text: "Check out my Lost City summary! Great for YouTube, Discord, or forum posts!",
          files: [file],
        });
      } else {
        const w = window.open("", "_blank");
        w?.document.write(`<img src="${dataUrl}" />`);
      }
    } catch (err) {
      console.error("Sharing failed:", err);
      alert("Sorry, unable to share. Please check the console for details.");
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
              Lost City Hiscores Tracker
            </h1>
          </div>
          <div className="flex w-full md:w-1/2 relative">
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchData()}
              placeholder="Search player..."
              className="w-full py-2 px-4 bg-gray-800 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-[#c6aa54]"
            />
            <button
              onClick={fetchData}
              className="px-4 py-2 bg-[#c6aa54] text-black font-semibold rounded-r-lg hover:bg-yellow-400"
            >
              Search
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4">
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
            {apiLastUpdated && (
              <p className="mt-2 text-sm text-gray-400">
                Last Updated (API):{" "}
                <span className="font-bold">{apiLastUpdated}</span>
              </p>
            )}
          </div>
        )}

        {/* SUMMARY (TRACKER) CARD */}
        {data && (
          <div className="bg-[#2c2f33] p-6 rounded-lg border border-[#c6aa54] mb-6 flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-2xl font-bold text-[#c6aa54]">Summary</h2>

              {/* Snapshot dropdown */}
              <select
                className="bg-gray-800 text-white rounded px-2 py-1 text-sm"
                value={selectedSnapshotId || ""}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "latest") {
                    setSelectedSnapshotId("latest");
                  } else if (val === "") {
                    setSelectedSnapshotId("");
                  } else {
                    setSelectedSnapshotId(Number(val));
                  }
                }}
              >
                <option value="">-- Select a snapshot --</option>
                <option value="latest">Latest</option>
                {snapshotHistory.map((snap) => (
                  <option key={snap.id} value={snap.id}>
                    {new Date(snap.created_at).toLocaleString()}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-2 mb-4">
              {/* SAVE BUTTON with tooltip */}
              <div className="relative">
                <button
                  onClick={saveCurrentStats}
                  disabled={saveDisabled}
                  className={`px-3 py-2 bg-[#c6aa54] text-black font-semibold rounded hover:bg-yellow-400 flex items-center justify-center
                    ${saveDisabled ? "opacity-50 cursor-not-allowed" : ""}`}
                  title="Save Current Stats"
                >
                  💾
                </button>
                {showSaveTooltip && (
                  <div className="absolute top-full mt-1 left-1/2 -translate-x-1/2 bg-black text-white px-3 py-1 rounded text-sm">
                    Your character’s data has been saved!
                  </div>
                )}
              </div>

              <button
                onClick={generateSummary}
                className="px-4 py-2 bg-blue-500 text-white font-semibold rounded hover:bg-blue-600"
              >
                Generate Summary
              </button>

              {/* Always show Share button; disable if no summary */}
              <button
                onClick={shareSummary}
                disabled={!summary}
                className={`px-3 py-2 text-white font-semibold rounded flex items-center justify-center
                  ${summary ? "bg-green-600 hover:bg-green-700" : "bg-gray-600 cursor-not-allowed"}`}
                title="Share Summary"
              >
                {/* A share icon (arrow) */}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8 12h8m0 0l-4 4m4-4-4-4"
                  />
                </svg>
              </button>
            </div>

            {!summary && (
              <p className="text-sm text-gray-400">
                No summary yet. Please save your current stats, then generate a summary to see your gains.
              </p>
            )}

            {summary && (
              <div className="bg-gray-800 p-4 rounded relative" ref={summaryRef}>
                {/* Branding / Watermark */}
                <span className="absolute bottom-2 right-2 text-xs text-gray-500">
                  Lost City Hiscores Tracker
                </span>

                <div className="mb-3">
                  <p className="font-semibold text-[#c6aa54] text-lg mb-1">
                    {username}'s Progress
                  </p>
                  {summary.totalXPGained > 0 ? (
                    <p className="text-sm text-gray-300">
                      Gained{" "}
                      <span className="font-bold">
                        {summary.totalXPGained.toLocaleString()}
                      </span>{" "}
                      XP since last snapshot
                    </p>
                  ) : (
                    <p className="text-sm text-yellow-400">
                      Waiting for hiscores API to update...
                    </p>
                  )}
                  <p className="text-xs text-gray-400">
                    Snapshot taken:{" "}
                    <span className="font-bold">
                      {timeAgo(new Date(summary.lastSnapshotTime))}
                    </span>
                  </p>
                </div>

                {!showDetails && (
                  <button
                    onClick={() => setShowDetails(true)}
                    className="px-3 py-2 bg-[#3b3e44] text-sm text-white rounded hover:bg-gray-600"
                  >
                    Expand Details
                  </button>
                )}
                {showDetails && (
                  <>
                    <button
                      onClick={() => setShowDetails(false)}
                      className="px-3 py-2 bg-[#3b3e44] text-sm text-white rounded hover:bg-gray-600 mb-3"
                    >
                      Collapse Details
                    </button>
                    {summary.changes.length === 0 ? (
                      <p className="text-sm text-gray-300">
                        No skill gains detected since the last snapshot.
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {summary.changes.map((change) => {
                          const meta = skillMeta[change.skillType];
                          return (
                            <div key={change.skillType} className="p-2 rounded bg-[#3b3e44]">
                              <div className="flex items-center gap-2 mb-1">
                                <img
                                  src={meta.icon}
                                  alt={meta.name}
                                  className="w-5 h-5"
                                />
                                <p className="font-bold text-[#c6aa54]">
                                  {meta.name}
                                </p>
                              </div>
                              <p className="text-sm text-gray-300">
                                +{change.levelDiff} levels (from {change.oldLevel} to {change.newLevel})
                              </p>
                              <p className="text-sm text-gray-400">
                                +{change.xpDiff.toLocaleString()} XP
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}

                {summary.totalXPGained > 0 && (
                  <p className="text-xs text-green-400 mt-3">
                    Don’t forget: you can share this summary on Discord, YouTube, or forums by clicking the share button above!
                  </p>
                )}
              </div>
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
