'use client';

import { useState, useEffect } from 'react';
import { Listbox } from '@headlessui/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Fragment } from 'react';
import { Transition } from '@headlessui/react';

interface Competition {
  id: string;
  name: string;
  type: 'total_xp' | 'total_level';
  start_date: string;
  end_date: string;
  status: 'active' | 'completed';
}

interface Entry {
  username: string;
  gain: number;
  rank: number;
}

export default function CompetitionsPage() {
  const [competitionType, setCompetitionType] = useState<'total_xp' | 'total_level'>('total_xp');
  const [loading, setLoading] = useState(true);
  const [currentCompetition, setCurrentCompetition] = useState<Competition | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);

  useEffect(() => {
    // Simulated data loading
    setTimeout(() => {
      setCurrentCompetition({
        id: '1',
        name: 'Weekly XP Race',
        type: 'total_xp',
        start_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'active'
      });
      setEntries([
        { username: "Player1", gain: 1000000, rank: 1 },
        { username: "Player2", gain: 800000, rank: 2 },
        { username: "Player3", gain: 600000, rank: 3 },
        { username: "Player4", gain: 400000, rank: 4 },
        { username: "Player5", gain: 200000, rank: 5 },
      ]);
      setLoading(false);
    }, 1000);
  }, []);

  const formatValue = (value: number) => {
    return value.toLocaleString();
  };

  return (
    <div className="min-h-screen pt-8 pb-8 px-4">
      <div className="max-w-6xl mx-auto">
        <a href="/" className="block text-center mb-12">
          <h1 className="text-[2.75rem] font-bold bg-gradient-to-r from-[#3B82F6] via-[#60A5FA] to-[#3B82F6] text-transparent bg-clip-text whitespace-nowrap">
            Lost City Tracker
          </h1>
        </a>

        <AnimatePresence mode="wait">
          <motion.div
            key="competition-content"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="text-center mb-12">
              <p className="text-xl text-gray-300 mb-2">
                Your Stats. Their Stats. One Winner!
              </p>
              <p className="text-blue-400 text-sm">Weekly XP competitions - coming soon!</p>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="mt-8 border-b border-gray-800"
            >
              <div className="flex items-center justify-center">
                <div className="px-4 py-2 text-blue-500 border-b-2 border-blue-500">
                  Competition Overview
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6 pb-8"
            >
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.2 }}
                className="bg-[#0f1923] rounded-xl p-4"
              >
                <h3 className="text-blue-400 mb-4">About</h3>
                <div className="space-y-6">
                  <div className="bg-gray-800/30 rounded-lg p-3">
                    <p className="text-gray-300">Compete like it's 2004. Track raw XP gains over time and see who rises to the top. Limit it to your clan or throw open the gates—your grind, your rules.</p>
                  </div>

                  <div className="bg-gray-800/30 rounded-lg p-3">
                    <div className="text-center text-gray-400">
                      Competition leaderboards will be available when the first competition starts
                    </div>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.3 }}
                className="bg-[#0f1923] rounded-xl p-4"
              >
                <h3 className="text-blue-400 mb-4">Competition Stats</h3>
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-800/30 rounded-lg p-3">
                      <div className="text-sm text-gray-400">Time Remaining</div>
                      <div className="text-lg text-gray-200">Coming Soon</div>
                    </div>
                    <div className="bg-gray-800/30 rounded-lg p-3">
                      <div className="text-sm text-gray-400">Participants</div>
                      <div className="text-lg text-gray-200">Coming Soon</div>
                    </div>
                  </div>
                  
                  <div className="bg-gray-800/30 rounded-lg p-3">
                    <h4 className="text-sm font-medium text-gray-400 mb-2">Your Progress</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <div className="text-gray-400">Current Rank</div>
                        <div className="text-gray-200">Coming Soon</div>
                      </div>
                      <div>
                        <div className="text-gray-400">XP Gained</div>
                        <div className="text-gray-200">Coming Soon</div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
} 