"use client";

import React, { useState, useEffect } from 'react';
import { Users, ChevronRight, Clock } from 'lucide-react';

// Types (same as admin page)
interface QueueGroup {
  id: number;
  name: string;
  players: number;
  addedAt: string;
  status: 'waiting' | 'called' | 'completed';
  calledAt?: string;
  completedAt?: string;
  courtId?: number;
}

interface LogEntry extends QueueGroup {
  duration: number;
}

type ListenerCallback = () => void;

// Storage system (same as admin page)
let queueData: QueueGroup[] = [];
let logData: LogEntry[] = [];
let listeners: ListenerCallback[] = [];

const STORAGE_KEYS = {
  QUEUE: 'pickleball-queue-data',
  LOGS: 'pickleball-logs-data'
};

const COURTS = [
  { id: 1, name: 'Court 1' },
  { id: 2, name: 'Court 2' },
  { id: 3, name: 'Court 3' },
  { id: 4, name: 'Court 4' }
];

const storage = {
  init: (): void => {
    if (typeof window !== 'undefined') {
      try {
        const savedQueue = localStorage.getItem(STORAGE_KEYS.QUEUE);
        const savedLogs = localStorage.getItem(STORAGE_KEYS.LOGS);
        
        if (savedQueue) {
          const parsedQueue = JSON.parse(savedQueue);
          // Only update if data has actually changed
          if (JSON.stringify(queueData) !== JSON.stringify(parsedQueue)) {
            queueData = parsedQueue;
            listeners.forEach(l => l());
          }
        }
        if (savedLogs) {
          const parsedLogs = JSON.parse(savedLogs);
          if (JSON.stringify(logData) !== JSON.stringify(parsedLogs)) {
            logData = parsedLogs;
            listeners.forEach(l => l());
          }
        }
      } catch (error) {
        console.error('Error loading saved data:', error);
      }
    }
  },

  subscribe: (callback: ListenerCallback): (() => void) => {
    listeners.push(callback);
    return () => {
      listeners = listeners.filter(l => l !== callback);
    };
  },
  
  getQueue: (): QueueGroup[] => queueData,
  
  getLogs: (): LogEntry[] => logData,

  getStats: () => {
    const today = new Date().toDateString();
    const todayLogs = logData.filter(log => 
      new Date(log.completedAt || '').toDateString() === today
    );
    
    return {
      totalSessions: todayLogs.length,
      totalPlayers: todayLogs.reduce((sum, log) => sum + log.players, 0),
      averageDuration: todayLogs.length > 0 
        ? Math.round(todayLogs.reduce((sum, log) => sum + log.duration, 0) / todayLogs.length)
        : 0,
      currentWaiting: queueData.filter(g => g.status === 'waiting').length
    };
  },

  getCourtGroups: () => {
    return COURTS.map(court => ({
      court,
      currentGroup: queueData.find(g => g.status === 'called' && g.courtId === court.id),
      isAvailable: !queueData.find(g => g.status === 'called' && g.courtId === court.id)
    }));
  }
};

export default function DisplayPage(): React.JSX.Element {
  const [queue, setQueue] = useState<QueueGroup[]>([]);
  const [currentTime, setCurrentTime] = useState<string>(new Date().toLocaleTimeString());
  const [isLoaded, setIsLoaded] = useState<boolean>(false);

  const refreshData = () => {
    storage.init();
    setQueue([...storage.getQueue()]);
    setIsLoaded(true);
  };

  useEffect(() => {
    // Initial load
    refreshData();
    
    const unsubscribe = storage.subscribe(() => {
      setQueue([...storage.getQueue()]);
    });
    
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString());
    }, 1000);

    // Listen for localStorage changes from other tabs/windows
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'pickleball-queue-data' || e.key === 'pickleball-logs-data') {
        refreshData();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // Also set up a polling mechanism to ensure data stays in sync
    const pollInterval = setInterval(() => {
      refreshData();
    }, 3000); // Poll every 3 seconds

    return () => {
      unsubscribe();
      clearInterval(timeInterval);
      clearInterval(pollInterval);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const nextGroups = queue.filter(g => g.status === 'waiting').slice(0, 8);
  const stats = storage.getStats();
  const courtGroups = storage.getCourtGroups();
  
  const getEstimatedWaitTime = (position: number): string => {
    const avgDuration = stats.averageDuration || 20; // Default 20 min if no data
    const estimatedMinutes = position * avgDuration;
    if (estimatedMinutes < 60) {
      return `~${estimatedMinutes} min`;
    }
    const hours = Math.floor(estimatedMinutes / 60);
    const minutes = estimatedMinutes % 60;
    return `~${hours}h ${minutes}m`;
  };

  const getSessionDuration = (calledAt: string): string => {
    const duration = Math.floor((new Date().getTime() - new Date(calledAt).getTime()) / 60000);
    return `${duration} min`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-blue-700 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6 relative">
          <button
            onClick={refreshData}
            className="absolute top-0 right-0 px-3 py-1 bg-white/20 text-white rounded-lg hover:bg-white/30 text-sm"
          >
            Refresh
          </button>
          <h1 className="text-4xl font-bold text-white mb-2">Pickleball Courts</h1>
          <div className="flex justify-center items-center gap-8 text-blue-200">
            <p className="text-lg">{new Date().toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}</p>
            <p className="text-lg font-mono">{currentTime}</p>
            <p className="text-base">Sessions Today: {stats.totalSessions}</p>
            <p className="text-base">Waiting: {stats.currentWaiting}</p>
            {!isLoaded && <p className="text-yellow-300 text-sm">Loading...</p>}
          </div>
        </div>

        {/* Courts Grid */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {courtGroups.map(({ court, currentGroup, isAvailable }) => (
            <div key={court.id} className="bg-white/95 rounded-2xl shadow-xl p-6 min-h-[300px]">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">{court.name}</h2>
                
                {currentGroup ? (
                  <div className="bg-green-50 border-2 border-green-500 rounded-xl p-6">
                    <div className="mb-4">
                      <div className="inline-block bg-green-500 text-white px-3 py-1 rounded-full text-sm font-semibold mb-3">
                        NOW PLAYING
                      </div>
                    </div>
                    <p className="text-3xl font-bold text-green-700 mb-2">{currentGroup.name}</p>
                    <p className="text-lg text-gray-600 mb-3">{currentGroup.players} Players</p>
                    {currentGroup.calledAt && (
                      <div className="text-sm text-gray-500">
                        <p>Started: {new Date(currentGroup.calledAt).toLocaleTimeString()}</p>
                        <p className="font-semibold text-green-600">
                          Playing: {getSessionDuration(currentGroup.calledAt)}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-blue-50 border-2 border-dashed border-blue-300 rounded-xl p-6 flex flex-col items-center justify-center min-h-[200px]">
                    <Users size={48} className="text-blue-400 mb-4" />
                    <p className="text-2xl font-bold text-blue-600 mb-2">Available</p>
                    <p className="text-gray-600">Ready for next group</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Queue Section */}
        {nextGroups.length > 0 && (
          <div className="bg-white/95 rounded-2xl shadow-xl p-6">
            <div className="text-center mb-6">
              <h2 className="text-3xl font-bold text-gray-800 mb-2">Up Next</h2>
              <p className="text-lg text-gray-600">{nextGroups.length} groups waiting</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {nextGroups.map((group, index) => (
                <div key={group.id} className="flex items-center gap-4 bg-blue-50 p-4 rounded-xl hover:bg-blue-100 transition-colors">
                  <span className="text-2xl font-bold text-blue-600 w-12">#{index + 1}</span>
                  <div className="flex-1">
                    <p className="text-xl font-bold text-gray-900">{group.name}</p>
                    <p className="text-sm text-gray-600">{group.players} Players</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-orange-600">
                      {getEstimatedWaitTime(index + 1)}
                    </p>
                    <p className="text-xs text-gray-500">est. wait</p>
                  </div>
                  <ChevronRight size={24} className="text-blue-400" />
                </div>
              ))}
            </div>
            
            {queue.filter(g => g.status === 'waiting').length > 8 && (
              <div className="mt-4 text-center">
                <p className="text-lg text-gray-600">
                  + {queue.filter(g => g.status === 'waiting').length - 8} more groups waiting
                </p>
              </div>
            )}
          </div>
        )}

        {nextGroups.length === 0 && courtGroups.every(c => c.isAvailable) && (
          <div className="bg-white/95 rounded-2xl shadow-xl p-12 text-center">
            <Users size={64} className="mx-auto text-gray-400 mb-4" />
            <p className="text-3xl font-bold text-gray-600 mb-2">All Courts Available</p>
            <p className="text-xl text-gray-500">No groups in queue</p>
          </div>
        )}

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-blue-200 text-sm">
            Average session time: {stats.averageDuration} minutes | 
            Total players today: {stats.totalPlayers}
          </p>
        </div>
      </div>
    </div>
  );
}