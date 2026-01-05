"use client";

import React, { useEffect, useState } from 'react';
import { useRealtime } from '@/hooks/useRealtime';
import { useQueue, useCourts } from '@/store';
import { Wifi, WifiOff, Clock, Users, ArrowLeft } from 'lucide-react';
import { QueueEntryWithPlayer } from '@/types';
import { getSkillLevelLabel } from '@/lib/utils/skillLevel';
import Link from 'next/link';

export default function BuildingBDisplay() {
  const { connected, isStale } = useRealtime();
  const { queueEntries, fetchQueue, subscribeToQueue } = useQueue();
  const { courts, fetchCourts, subscribeToCourts } = useCourts();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    fetchQueue();
    fetchCourts();

    const unsubQueue = subscribeToQueue();
    const unsubCourts = subscribeToCourts();

    const timer = setInterval(() => setCurrentTime(new Date()), 1000);

    return () => {
      unsubQueue();
      unsubCourts();
      clearInterval(timer);
    };
  }, []);

  const buildingCourts = courts.filter(c => c.building === 'building_b');
  const buildingQueue = queueEntries.filter(e => e.building === 'building_b' && e.status === 'waiting');
  const availableCourts = buildingCourts.filter(c => c.status === 'available').length;
  const activeCourts = buildingCourts.filter(c => c.status === 'occupied').length;

  return (
    <div
      className="h-screen overflow-hidden text-white p-6 flex flex-col"
      style={{
        backgroundImage: 'url(/background.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed'
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-shrink-0">
        <div className="flex items-center gap-4">
          <Link
            href="/display"
            className="bg-black/40 backdrop-blur-md p-3 rounded-lg hover:bg-black/60 transition-colors border border-white/20"
          >
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-6xl font-bold">Building B</h1>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right">
            <div className="text-4xl font-bold" suppressHydrationWarning>
              {currentTime.toLocaleTimeString()}
            </div>
            <div className="text-lg text-gray-400" suppressHydrationWarning>
              {currentTime.toLocaleDateString()}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {connected && !isStale ? (
              <Wifi className="w-6 h-6 text-green-400" />
            ) : (
              <WifiOff className="w-6 h-6 text-red-400" />
            )}
          </div>
        </div>
      </div>

      {/* Courts Grid */}
      <div className="bg-black/40 backdrop-blur-md rounded-2xl p-2 mb-2 border border-white/20 shadow-2xl flex-shrink-0">        <div className="grid grid-cols-3 gap-4">
          {buildingCourts.map(court => (
            <div
              key={court.id}
              className={`p-6 rounded-xl shadow-lg transition-all ${
                court.status === 'available'
                  ? 'bg-green-600 hover:bg-green-500'
                  : 'bg-red-600 hover:bg-red-500'
              }`}
            >
              <div className="text-3xl font-bold text-white mb-2">Court {court.court_number}</div>
              <div className="text-lg text-white/90 font-medium">
                {court.status === 'available' ? 'Open' : 'In Use'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Queue */}
      <div className="bg-black/40 backdrop-blur-md rounded-2xl p-6 border border-white/20 shadow-2xl flex-1 flex flex-col min-h-0">
        <h3 className="text-2xl font-semibold text-white/90 mb-4 flex items-center gap-3 tracking-wide flex-shrink-0">
          <Users className="w-7 h-7" />
          Queue ({buildingQueue.length})
        </h3>

        {buildingQueue.length === 0 ? (
          <div className="text-center py-16 flex-1 flex items-center justify-center">
            <p className="text-white/50 text-2xl font-medium">No players waiting</p>
          </div>
        ) : (
          <div className="space-y-3 overflow-y-auto flex-1 pr-2">
            {buildingQueue.map((entry, index) => (
              <div
                key={entry.id}
                className={`p-5 rounded-xl transition-all shadow-lg ${
                  index === 0
                    ? 'bg-yellow-500/30 border-2 border-yellow-400/60'
                    : 'bg-white/10 border border-white/10'
                }`}
              >
                <div className="flex items-center gap-4">
                  <span className="font-bold text-white text-3xl w-12">#{index + 1}</span>

                  {/* Player Photo */}
                  <div className="w-16 h-16 rounded-full overflow-hidden bg-white/10 flex-shrink-0 border-2 border-white/30">
                    {entry.player.photo_url ? (
                      <img
                        src={entry.player.photo_url}
                        alt={entry.player.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white text-2xl font-bold">
                        {entry.player.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-white truncate text-2xl">{entry.player.name}</div>
                    <div className="text-lg text-white/70">
                      {getSkillLevelLabel(entry.player.skill_level)}
                    </div>
                  </div>

                  {entry.estimated_wait_minutes && (
                    <div className="text-xl text-white/80 flex-shrink-0 flex items-center gap-2">
                      <Clock className="w-6 h-6" />
                      <span className="font-semibold">{entry.estimated_wait_minutes}m</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Stats Footer */}
      <div className="mt-2 grid grid-cols-3 gap-2 flex-shrink-0">
        <div className="bg-black/40 backdrop-blur-md rounded-lg p-4 text-center border border-white/15 shadow-md">
          <div className="text-sm font-medium text-white/70 uppercase tracking-wider mb-1">Available Courts</div>
          <div className="text-5xl font-bold text-green-400">
            {availableCourts}
          </div>
        </div>
        <div className="bg-black/40 backdrop-blur-md rounded-lg p-4 text-center border border-white/15 shadow-md">
          <div className="text-sm font-medium text-white/70 uppercase tracking-wider mb-1">Active Courts</div>
          <div className="text-5xl font-bold text-red-400">
            {activeCourts}
          </div>
        </div>
        <div className="bg-black/40 backdrop-blur-md rounded-lg p-4 text-center border border-white/15 shadow-md">
          <div className="text-sm font-medium text-white/70 uppercase tracking-wider mb-1">In Queue</div>
          <div className="text-5xl font-bold text-blue-400">
            {buildingQueue.length}
          </div>
        </div>
      </div>
    </div>
  );
}
