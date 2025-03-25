"use client";

import { useState, useRef } from "react";
import { toPng } from "html-to-image";

interface SkillData {
  type: number; // 0=Overall, 1=Attack, etc.
  level: number; // skill level
  rank: number; // rank
  value: number; // XP * 10
  date?: string; // optional last-updated
}

// Simple level-based progress
function calculateProgress(level: number): number {
  if (level >= 99) return 100;
  return (level / 99) * 100;
}

// All icons are local. We reuse Stats_icon.png for Overall (type=0).
const skillMeta: Record<
  number,
  { name: string; color: string; icon: string }
> = {
  0: {
    name: "Overall",
    color: "#4e73df",
    icon: "/ui/Stats_icon.png",
  },
  1: {
    name: "Attack",
    color: "#e74c3c",
    icon: "/ui/Attack_icon.png",
  },
  2: {
    name: "Defence",
    color: "#3498db",
    icon: "/ui/Defence_icon.png",
  },
  3: {
    name: "Strength",
    color: "#2ecc71",
    icon: "/ui/Strength_icon.png",
  },
  4: {
    name: "Hitpoints",
    color: "#e67e22",
    icon: "/ui/Hitpoints_icon.png",
  },
  5: {
    name: "Ranged",
    color: "#27ae60",
    icon: "/ui/Ranged_icon.png",
  },
  6: {
    name: "Prayer",
    color: "#f1c40f",
    icon: "/ui/Prayer_icon.png",
  },
  7: {
    name: "Magic",
    color: "#9b59b6",
    icon: "/ui/Magic_icon.png",
  },
  8: {
    name: "Cooking",
    color: "#e67e22",
    icon: "/ui/Cooking_icon.png",
  },
  9: {
    name: "Woodcutting",
    color: "#795548",
    icon: "/ui/Woodcutting_icon.png",
  },
  10: {
    name: "Fletching",
    color: "#607d8b",
    icon: "/ui/Fletching_icon.png",
  },
  11: {
    name: "Fishing",
    color: "#3498db",
    icon: "/ui/Fishing_icon.png",
  },
  12: {
    name: "Firemaking",
    color: "#e74c3c",
    icon: "/ui/Firemaking_icon.png",
  },
  13: {
    name: "Crafting",
    color: "#9c27b0",
    icon: "/ui/Crafting_icon.png",
  },
  14: {
    name: "Smithing",
    color: "#607d8b",
    icon: "/ui/Smithing_icon.png",
  },
  15: {
    name: "Mining",
    color: "#795548",
    icon: "/ui/Mining_icon.png",
  },
  16: {
    name: "Herblore",
    color: "#2ecc71",
    icon: "/ui/Herblore_icon.png",
  },
  17: {
    name: "Agility",
    color: "#3498db",
    icon: "/ui/Agility_icon.png",
  },
  18: {
    name: "Thieving",
    color: "#9c27b0",
    icon: "/ui/Thieving_icon.png",
  },
  21: {
    name: "Runecrafting",
    color: "#f1c40f",
    icon: "/ui/Runecrafting_icon.png",
  },
};

export default function Home() {
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<SkillData[] | null>(null);
  const [error, setError] = useState("");

  // Summary data from local snapshot
  const [summary, setSummary] = useState<null | {
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
    lastSnapshotTime: string;
  }>(null);

  // Expand/collapse details
  const [showDetails, setShowDetails] = useState(false);

  // For capturing screenshot
  const summaryRef = useRef<HTMLDivElement>(null);

  // Fetch from your Lost City API
  const fetchData = async () => {
    if (!username) return;
    setLoading(true);
    setError("");
    setData(null);
    setSummary(null);

    try {
      const res = await fetch(
        `/api/hiscores?username=${encodeURIComponent(username)}`
      );
      const json = await res.json();

      if (!Array.isArray(json) || json.length === 0) {
        setError("Player not found.");
        setLoading(false);
        return;
      }
      setData(json);
    } catch (err) {
      console.error(err);
      setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  // Save current stats to localStorage
  const saveCurrentStats = () => {
    if (!data || !username) return;
    const snapshot = {
      timestamp: new Date().toISOString(),
      stats: data,
    };
    localStorage.setItem(`lostCity_${username}`, JSON.stringify(snapshot));
    alert(`Saved current stats for ${username}!`);
  };

  // Generate summary from local snapshot
  const generateSummary = () => {
    if (!data || !username) {
      setSummary(null);
      return;
    }
    const stored = localStorage.getItem(`lostCity_${username}`);
    if (!stored) {
      alert(
        `No previous snapshot found for "${username}". Please save your current stats first.`
      );
      return;
    }

    const oldSnapshot = JSON.parse(stored) as {
      timestamp: string;
      stats: SkillData[];
    };

    const oldData = oldSnapshot.stats;
    const newData = data;

    const oldOverall = oldData.find((s) => s.type === 0);
    const newOverall = newData.find((s) => s.type === 0);

    const oldTotalXP = oldOverall ? Math.floor(oldOverall.value / 10) : 0;
    const newTotalXP = newOverall ? Math.floor(newOverall.value / 10) : 0;
    const totalXPGained = newTotalXP - oldTotalXP;

    const changes = [];
    for (const skill of newData) {
      const oldSkill = oldData.find((os) => os.type === skill.type);
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
      lastSnapshotTime: oldSnapshot.timestamp,
    });
    setShowDetails(false);
  };

  // Share summary
  const shareSummary = async () => {
    if (!summaryRef.current) return;
    try {
      const dataUrl = await toPng(summaryRef.current);
      const res = await fetch(dataUrl);
      const blob = await res.blob();
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
      alert("Sorry, unable to share. Check console for details.");
    }
  };

  // Overall & last updated
  const overall = data?.find((s) => s.type === 0);
  const apiLastUpdated = overall?.date || null;

  // Determine if top 1000 / 100 / 50
  const rankBadge = (() => {
    if (!overall) return null;
    const r = overall.rank;
    if (r <= 50) return "Top 50 Player";
    if (r <= 100) return "Top 100 Player";
    if (r <= 1000) return "Top 1000 Player";
    return null;
  })();

  // Highest XP skill
  let highestXpSkill: { type: number; xp: number; level: number } | null = null;
  if (data) {
    const nonOverall = data.filter((s) => s.type !== 0);
    highestXpSkill = nonOverall.reduce(
      (acc, s) => {
        const xp = Math.floor(s.value / 10);
        return xp > acc.xp ? { type: s.type, xp, level: s.level } : acc;
      },
      { type: 1, xp: 0, level: 1 }
    );
  }

  // Re-check rank in summary data for a badge as well
  const summaryRankBadge = (() => {
    if (!data) return null;
    const newOverall = data.find((s) => s.type === 0);
    if (!newOverall) return null;
    const r = newOverall.rank;
    if (r <= 50) return "Top 50 Player";
    if (r <= 100) return "Top 100 Player";
    if (r <= 1000) return "Top 1000 Player";
    return null;
  })();

  return (
    <div className="min-h-screen bg-gray-900 text-white py-8">
      {/* HEADER */}
      <header className="max-w-5xl mx-auto px-4 mb-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center">
            {/* Local homepage icon */}
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

      {/* MAIN CONTENT */}
      <main className="max-w-5xl mx-auto px-4">
        {/* Intro if no data */}
        {!data && !error && !loading && (
          <section className="text-center my-12">
            <h2 className="text-2xl font-bold mb-4">
              Welcome to Lost City Player Stats!
            </h2>
            <p className="mb-2">
              Track your Lost City progress. Compare your stats from a previous
              snapshot using local storage, so you can easily share your gains at
              the end of the day!
            </p>
            <p className="mb-6">
              Lost City is a free, open-source, community-run project. Play the
              game at{" "}
              <a
                href="https://2004.lostcity.rs/title"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 underline"
              >
                2004.lostcity.rs/
              </a>
              .
            </p>
          </section>
        )}

        {loading && (
          <p className="text-center text-yellow-400 mb-4">Loading...</p>
        )}
        {error && (
          <p className="text-center text-red-500 mb-4">{error}</p>
        )}

        {/* OVERVIEW CARD */}
        {data && overall && (
          <div className="bg-[#2c2f33] p-6 rounded-lg border border-[#c6aa54] mb-6 relative">
            <div className="flex justify-between items-start">
              <h2 className="text-2xl font-bold text-[#c6aa54] mb-2">Overview</h2>
              {/* Rank badge in top-right */}
              {rankBadge && (
                <span className="bg-[#c6aa54] text-black font-semibold text-xs py-1 px-2 rounded">
                  {rankBadge}
                </span>
              )}
            </div>
            <p className="text-lg mb-3 font-semibold">Player Name: {username}</p>
            <p>
              Total Level: <span className="font-bold">{overall.level}</span>
            </p>
            <p>
              Total XP:{" "}
              <span className="font-bold">
                {Math.floor(overall.value / 10).toLocaleString()}
              </span>
            </p>
            <p>
              Rank:{" "}
              <span className="font-bold">{overall.rank.toLocaleString()}</span>
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

        {/* SUMMARY CARD */}
        {data && (
          <div className="bg-[#2c2f33] p-6 rounded-lg border border-[#c6aa54] mb-6 flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-2xl font-bold text-[#c6aa54]">Summary</h2>
              {/* If summary rank badge is available, show it here too */}
              {summary && summaryRankBadge && (
                <span className="bg-[#c6aa54] text-black font-semibold text-xs py-1 px-2 rounded">
                  {summaryRankBadge}
                </span>
              )}
            </div>

            <div className="flex gap-2 mb-4">
              <button
                onClick={saveCurrentStats}
                className="px-3 py-2 bg-[#c6aa54] text-black font-semibold rounded hover:bg-yellow-400 flex items-center justify-center"
                title="Save Current Stats"
              >
                {/* Floppy disk emoji */}
                <span role="img" aria-label="Save icon">
                  💾
                </span>
              </button>
              <button
                onClick={generateSummary}
                className="px-4 py-2 bg-blue-500 text-white font-semibold rounded hover:bg-blue-600"
              >
                Generate Summary
              </button>
              {/* We'll only show share if summary exists AND XP gained > 0 */}
              {summary && summary.totalXPGained > 0 && (
                <button
                  onClick={shareSummary}
                  className="px-3 py-2 bg-green-600 text-white font-semibold rounded hover:bg-green-700 flex items-center justify-center"
                  title="Share Summary"
                >
                  {/* A nicer share SVG icon */}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="1.5"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M7.5 8.25V4.5A1.5 1.5 0 019 3h6a1.5 1.5 0 011.5 1.5v3.75M7.5 15.75V19.5A1.5 1.5 0 009 21h6a1.5 1.5 0 001.5-1.5v-3.75M12 8.25v7.5"
                    />
                  </svg>
                </button>
              )}
            </div>

            {!summary && (
              <p className="text-sm text-gray-400">
                No summary yet. Save your current stats, then generate a summary
                to see your gains.
              </p>
            )}

            {summary && (
              <div className="bg-gray-800 p-4 rounded relative" ref={summaryRef}>
                {/* Branding in bottom-right */}
                <span className="absolute bottom-2 right-2 text-xs text-gray-500">
                  Lost City Hiscores Tracker
                </span>

                {/* Basic info */}
                <div className="mb-3">
                  <p className="font-semibold text-[#c6aa54] text-lg mb-1">
                    {username}'s Progress
                  </p>
                  {/* If totalXPGained > 0, show XP. If 0, show waiting message */}
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
                      {new Date(summary.lastSnapshotTime).toLocaleString()}
                    </span>
                  </p>
                </div>

                {/* Expand/collapse details */}
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
                        No skill gains detected.
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {summary.changes.map((change) => {
                          const meta = skillMeta[change.skillType];
                          return (
                            <div
                              key={change.skillType}
                              className="p-2 rounded bg-[#3b3e44]"
                            >
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
                                +{change.levelDiff} levels (from{" "}
                                {change.oldLevel} to {change.newLevel})
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

                {/* Advertise share feature if XP > 0 */}
                {summary.totalXPGained > 0 && (
                  <p className="text-xs text-green-400 mt-3">
                    Don’t forget you can Share this summary to Discord, YouTube
                    videos, or forum posts by clicking the share button above!
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
                      <span className="text-sm">Lv {level}/99</span>
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
