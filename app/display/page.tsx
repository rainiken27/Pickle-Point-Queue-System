"use client";

import React, { useEffect, useState } from 'react';
import { useRealtime } from '@/hooks/useRealtime';
import { useQueue, useCourts, useBuildings } from '@/store';
import { Wifi, WifiOff, Clock, Users, Ban } from 'lucide-react';
import { BuildingType, Court, QueueEntryWithPlayer } from '@/types';
import { getSkillLevelLabel } from '@/lib/utils/skillLevel';
import Link from 'next/link';

interface BuildingColumnProps {
  building: BuildingType;
  buildingName: string;
  courts: Court[];
  queueEntries: QueueEntryWithPlayer[];
  isActive: boolean;
}

function BuildingColumn({ building, buildingName, courts, queueEntries, isActive }: BuildingColumnProps) {
  const availableCourts = courts.filter(c => c.status === 'available').length;
  const buildingQueue = queueEntries.filter(e => e.building === building && e.status === 'waiting');

  return (
    <div className="flex flex-col h-full">
      {/* Building Header with Link */}
      <Link
        href={`/display/${building.replace('_', '-')}`}
        className={`backdrop-blur-md p-4 rounded-t-lg shadow-lg flex-shrink-0 hover:bg-black/60 transition-colors group ${
          isActive ? 'bg-black/50' : 'bg-red-900/50'
        }`}
      >
        <h2 className={`text-4xl font-bold text-center tracking-wide group-hover:text-blue-300 transition-colors flex items-center justify-center gap-3 ${
          isActive ? 'text-white' : 'text-red-200'
        }`}>
          {!isActive && <Ban className="w-8 h-8" />}
          {buildingName}
          {!isActive && <span className="text-xl">(CLOSED)</span>}
        </h2>
        <div className={`flex justify-center gap-2 text-lg mt-2 ${
          isActive ? 'text-white/80' : 'text-red-200/80'
        }`}>
          <span className="font-medium">{availableCourts}/{courts.length} Available</span>
          <span>•</span>
          <span className="font-medium">{buildingQueue.length} Waiting</span>
        </div>
      </Link>

      {/* Courts - Single Row */}
      <div className="bg-black/25 backdrop-blur-md p-2 border-x border-white/10 flex-shrink-0">
        <div className="flex gap-3 justify-center">
          {courts.map(court => (
            <div
              key={court.id}
              className={`flex-1 p-2 rounded-lg ${
                court.status === 'available'
                  ? 'bg-green-600'
                  : 'bg-red-600'
              }`}
            >
              <div className="text-2xl font-bold text-white text-center">Court {court.court_number}</div>
              <div className="text-sm text-white/80 text-center">
                {court.status === 'available' ? 'Open' : 'In Use'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Queue */}
      <div className="bg-black/25 backdrop-blur-md p-3 rounded-b-lg border-x border-b border-white/10 flex-1 shadow-md flex flex-col min-h-0">
        <h3 className="text-lg font-semibold text-white/90 mb-3 flex items-center gap-2 tracking-wide flex-shrink-0">
          <Users className="w-8 h-8" />
          Queue ({buildingQueue.length})
        </h3>

        {buildingQueue.length === 0 ? (
          <div className="text-center py-6 flex-1 flex items-center justify-center">
            <p className="text-white/50 text-base font-medium">No players waiting</p>
          </div>
        ) : (
          <div className="space-y-2.5 overflow-y-auto flex-1 pr-1">
            {buildingQueue.map((entry, index) => (
              <div
                key={entry.id}
                className={`p-3 rounded-lg transition-all ${
                  index === 0
                    ? 'bg-yellow-500/30 border border-yellow-400/40'
                    : 'bg-white/5 border border-white/5'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="font-bold text-white text-lg w-8">#{index + 1}</span>
                  {/* Player Photo */}
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-white/10 flex-shrink-0 border border-white/20">
                    {entry.player.photo_url ? (
                      <img
                        src={entry.player.photo_url}
                        alt={entry.player.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white text-xl font-bold">
                        {entry.player.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-white truncate text-lg">{entry.player.name}</div>
                    <div className="text-sm text-white/60">
                      {getSkillLevelLabel(entry.player.skill_level)}
                    </div>
                  </div>
                  {entry.estimated_wait_minutes && (
                    <div className="text-sm text-white/70 flex-shrink-0">
                      <Clock className="w-4 h-4 inline mr-1" />
                      {entry.estimated_wait_minutes}m
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function TVDisplay() {
  const { connected, isStale } = useRealtime();
  const { queueEntries, fetchQueue, subscribeToQueue } = useQueue();
  const { courts, fetchCourts, subscribeToCourts } = useCourts();
  const { buildings, fetchBuildings, subscribeToBuildings } = useBuildings();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    fetchQueue();
    fetchCourts();
    fetchBuildings();

    const unsubQueue = subscribeToQueue();
    const unsubCourts = subscribeToCourts();
    const unsubBuildings = subscribeToBuildings();

    const timer = setInterval(() => setCurrentTime(new Date()), 1000);

    return () => {
      unsubQueue();
      unsubCourts();
      unsubBuildings();
      clearInterval(timer);
    };
  }, []);

  const courtsByBuilding = {
    building_a: courts.filter(c => c.building === 'building_a'),
    building_b: courts.filter(c => c.building === 'building_b'),
    building_c: courts.filter(c => c.building === 'building_c'),
  };

  const waitingQueue = queueEntries.filter(e => e.status === 'waiting');

  const getBuildingStatus = (buildingId: string) => {
    const building = buildings.find(b => b.id === buildingId);
    return building?.is_active ?? true; // Default to active if not found
  };

  return (
    <div
      className="h-screen overflow-hidden text-white p-4 flex flex-col"
      style={{
        backgroundImage: 'url(/background.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed'
      }}
    >
      {/* Header */}
      <div className="grid grid-cols-3 items-center mb-4 flex-shrink-0">
        <div className="justify-self-start">
          <img src="/logo.png" alt="PicklePoint Queue" className="h-28 w-auto" />
        </div>
        <div className="text-6xl font-bold justify-self-center" suppressHydrationWarning>
          {currentTime.toLocaleTimeString()}
        </div>
        <div className="flex items-center gap-4 justify-self-end">
          <div className="text-2xl" suppressHydrationWarning>
            {currentTime.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </div>
        </div>
      </div>

      {/* 3-Column Building Layout */}
      <div className="grid grid-cols-3 gap-4 flex-1 min-h-0">
        <BuildingColumn
          building="building_a"
          buildingName="Building A"
          courts={courtsByBuilding.building_a}
          queueEntries={queueEntries}
          isActive={getBuildingStatus('building_a')}
        />
        <BuildingColumn
          building="building_b"
          buildingName="Building B"
          courts={courtsByBuilding.building_b}
          queueEntries={queueEntries}
          isActive={getBuildingStatus('building_b')}
        />
        <BuildingColumn
          building="building_c"
          buildingName="Building C"
          courts={courtsByBuilding.building_c}
          queueEntries={queueEntries}
          isActive={getBuildingStatus('building_c')}
        />
      </div>

      {/* Stats Footer */}
      <div className="mt-4 grid grid-cols-3 gap-4 flex-shrink-0">
        <div className="bg-black/40 backdrop-blur-md rounded-lg p-4 text-center border border-white/15 shadow-md">
          <div className="text-sm font-medium text-white/70 uppercase tracking-wider mb-1">Available Courts</div>
          <div className="text-5xl font-bold text-green-400">
            {courts.filter(c => c.status === 'available').length}
          </div>
        </div>
        <div className="bg-black/40 backdrop-blur-md rounded-lg p-4 text-center border border-white/15 shadow-md">
          <div className="text-sm font-medium text-white/70 uppercase tracking-wider mb-1">Active Courts</div>
          <div className="text-5xl font-bold text-red-400">
            {courts.filter(c => c.status === 'occupied').length}
          </div>
        </div>
        <div className="bg-black/40 backdrop-blur-md rounded-lg p-4 text-center border border-white/15 shadow-md">
          <div className="text-sm font-medium text-white/70 uppercase tracking-wider mb-1">Total In Queue</div>
          <div className="text-5xl font-bold text-blue-400">
            {waitingQueue.length}
          </div>
        </div>
      </div>
    </div>
  );
}
