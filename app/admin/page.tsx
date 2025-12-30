"use client";

import React, { useState, useEffect } from 'react';
import { Users, Plus, Edit2, Trash2, BarChart3, Clock, AlertCircle } from 'lucide-react';

// Types
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

interface NewGroup {
  name: string;
  players: number;
}

interface Notification {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
  duration?: number;
}

type ListenerCallback = () => void;

// Enhanced storage with localStorage persistence and multi-court support
let queueData: QueueGroup[] = [];
let logData: LogEntry[] = [];
let listeners: ListenerCallback[] = [];

// Simple notification system
let notifications: Notification[] = [];
let notificationListeners: ((notifications: Notification[]) => void)[] = [];

const notificationSystem = {
  show: (message: string, type: 'success' | 'error' | 'info' = 'info', duration = 3000) => {
    const notification: Notification = {
      id: Date.now(),
      message,
      type,
      duration
    };
    notifications.push(notification);
    notificationListeners.forEach(listener => listener([...notifications]));
    
    if (duration > 0) {
      setTimeout(() => {
        notifications = notifications.filter(n => n.id !== notification.id);
        notificationListeners.forEach(listener => listener([...notifications]));
      }, duration);
    }
  },
  
  subscribe: (callback: (notifications: Notification[]) => void) => {
    notificationListeners.push(callback);
    return () => {
      notificationListeners = notificationListeners.filter(l => l !== callback);
    };
  }
};

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
          }
        }
        if (savedLogs) {
          const parsedLogs = JSON.parse(savedLogs);
          if (JSON.stringify(logData) !== JSON.stringify(parsedLogs)) {
            logData = parsedLogs;
          }
        }
      } catch (error) {
        console.error('Error loading saved data:', error);
      }
    }
  },

  save: (): void => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEYS.QUEUE, JSON.stringify(queueData));
        localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(logData));
      } catch (error) {
        console.error('Error saving data:', error);
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
  
  addToQueue: (group: NewGroup): QueueGroup => {
    const newGroup: QueueGroup = {
      id: Date.now(),
      name: group.name,
      players: group.players,
      addedAt: new Date().toISOString(),
      status: 'waiting'
    };
    queueData.push(newGroup);
    storage.save();
    listeners.forEach(l => l());
    notificationSystem.show(`${group.name} added to queue`, 'success');
    return newGroup;
  },

  removeFromQueue: (id: number): void => {
    const group = queueData.find(g => g.id === id);
    queueData = queueData.filter(g => g.id !== id);
    storage.save();
    listeners.forEach(l => l());
    if (group) {
      notificationSystem.show(`${group.name} removed from queue`, 'info');
    }
  },

  editGroup: (id: number, updates: Partial<Pick<QueueGroup, 'name' | 'players'>>): void => {
    const group = queueData.find(g => g.id === id);
    if (group) {
      if (updates.name) group.name = updates.name;
      if (updates.players) group.players = updates.players;
      storage.save();
      listeners.forEach(l => l());
      notificationSystem.show(`${group.name} updated`, 'success');
    }
  },
  
  callNext: (courtId: number): QueueGroup | null => {
    const next = queueData.find(g => g.status === 'waiting');
    if (next) {
      next.status = 'called';
      next.calledAt = new Date().toISOString();
      next.courtId = courtId;
      storage.save();
      listeners.forEach(l => l());
      notificationSystem.show(`${next.name} called to Court ${courtId}!`, 'success');
      return next;
    } else {
      notificationSystem.show('No groups waiting in queue', 'info');
    }
    return null;
  },
  
  completeGroup: (id: number): void => {
    const group = queueData.find(g => g.id === id);
    if (group) {
      group.status = 'completed';
      group.completedAt = new Date().toISOString();
      const duration = group.calledAt ? 
        Math.round((new Date(group.completedAt).getTime() - new Date(group.calledAt).getTime()) / 60000) : 0;
      
      logData.push({
        ...group,
        duration
      });
      queueData = queueData.filter(g => g.id !== id);
      storage.save();
      listeners.forEach(l => l());
      notificationSystem.show(`${group.name} session completed (${duration} min)`, 'success');
    }
  },

  clearLogs: (): void => {
    logData = [];
    storage.save();
    listeners.forEach(l => l());
  },

  resetAllData: (): void => {
    queueData = [];
    logData = [];
    storage.save();
    listeners.forEach(l => l());
    notificationSystem.show('All data cleared successfully', 'success');
  },

  exportData: (): void => {
    const data = {
      queue: queueData,
      logs: logData,
      exportedAt: new Date().toISOString(),
      stats: storage.getStats()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pickleball-queue-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    notificationSystem.show('Data exported successfully', 'success');
  },

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

function NotificationContainer(): React.JSX.Element {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    const unsubscribe = notificationSystem.subscribe(setNotifications);
    return unsubscribe;
  }, []);

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`px-4 py-3 rounded-lg shadow-lg max-w-sm ${
            notification.type === 'success' ? 'bg-green-500 text-white' :
            notification.type === 'error' ? 'bg-red-500 text-white' :
            'bg-blue-500 text-white'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'success' && <span>✓</span>}
            {notification.type === 'error' && <AlertCircle size={16} />}
            {notification.type === 'info' && <span>ℹ</span>}
            <span className="text-sm">{notification.message}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AdminPage(): React.JSX.Element {
  const [queue, setQueue] = useState<QueueGroup[]>(storage.getQueue());
  const [logs, setLogs] = useState<LogEntry[]>(storage.getLogs());
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [groupName, setGroupName] = useState<string>('');
  const [playerCount, setPlayerCount] = useState<string>('4');
  const [editingGroup, setEditingGroup] = useState<number | null>(null);
  const [editName, setEditName] = useState<string>('');
  const [editPlayers, setEditPlayers] = useState<string>('4');
  const [showStats, setShowStats] = useState<boolean>(false);

  useEffect(() => {
    storage.init();
    // Set initial data immediately
    setQueue([...storage.getQueue()]);
    setLogs([...storage.getLogs()]);
    
    const unsubscribe = storage.subscribe(() => {
      setQueue([...storage.getQueue()]);
      setLogs([...storage.getLogs()]);
    });

    // Listen for localStorage changes from other tabs/windows
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'pickleball-queue-data' || e.key === 'pickleball-logs-data') {
        storage.init();
        setQueue([...storage.getQueue()]);
        setLogs([...storage.getLogs()]);
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // Keyboard shortcuts
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'n':
            e.preventDefault();
            setShowAddForm(true);
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    
    return () => {
      unsubscribe();
      window.removeEventListener('keydown', handleKeyPress);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const handleAddGroup = (): void => {
    if (groupName.trim()) {
      storage.addToQueue({
        name: groupName.trim(),
        players: parseInt(playerCount)
      });
      setGroupName('');
      setPlayerCount('4');
      setShowAddForm(false);
    }
  };

  const handleCallNext = (courtId: number): void => {
    storage.callNext(courtId);
  };

  const handleComplete = (id: number): void => {
    storage.completeGroup(id);
  };

  const handleRemoveGroup = (id: number): void => {
    if (confirm('Are you sure you want to remove this group from the queue?')) {
      storage.removeFromQueue(id);
    }
  };

  const handleEditGroup = (group: QueueGroup): void => {
    setEditingGroup(group.id);
    setEditName(group.name);
    setEditPlayers(group.players.toString());
  };

  const handleSaveEdit = (): void => {
    if (editingGroup && editName.trim()) {
      storage.editGroup(editingGroup, {
        name: editName.trim(),
        players: parseInt(editPlayers)
      });
      setEditingGroup(null);
      setEditName('');
      setEditPlayers('4');
    }
  };

  const handleCancelEdit = (): void => {
    setEditingGroup(null);
    setEditName('');
    setEditPlayers('4');
  };

  const waitingQueue = queue.filter(g => g.status === 'waiting');
  const courtGroups = storage.getCourtGroups();

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <NotificationContainer />
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Queue Management - Admin Panel</h1>
            <p className="text-sm text-gray-600 mt-1">
              Shortcuts: Ctrl+N (Add Group) | <a href="/display" target="_blank" className="text-blue-600 hover:underline">Open TV Display</a>
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                if (confirm('⚠️ This will delete ALL queue data and session logs. Are you sure?')) {
                  storage.resetAllData();
                }
              }}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
            >
              Reset All Data
            </button>
            <button
              onClick={() => storage.exportData()}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
            >
              Export Data
            </button>
            <a
              href="/display"
              target="_blank"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 inline-block"
            >
              Open TV Display
            </a>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 lg:grid-cols-2 gap-6">
          {/* Courts Status */}
          <div className="xl:col-span-2 lg:col-span-1 bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Courts Status</h2>
            <div className="grid grid-cols-2 gap-4 mb-6">
              {courtGroups.map(({ court, currentGroup, isAvailable }) => (
                <div key={court.id} className={`p-4 rounded-lg border-2 ${
                  isAvailable ? 'border-green-500 bg-green-50' : 'border-blue-500 bg-blue-50'
                }`}>
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-lg">{court.name}</h3>
                    {isAvailable && waitingQueue.length > 0 && (
                      <button
                        onClick={() => handleCallNext(court.id)}
                        className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                      >
                        Call Next
                      </button>
                    )}
                  </div>
                  {currentGroup ? (
                    <div>
                      <p className="font-bold text-gray-900">{currentGroup.name}</p>
                      <p className="text-sm text-gray-600">{currentGroup.players} players</p>
                      {currentGroup.calledAt && (
                        <p className="text-xs text-gray-500 mt-1">
                          Started: {new Date(currentGroup.calledAt).toLocaleTimeString()}
                        </p>
                      )}
                      <button
                        onClick={() => handleComplete(currentGroup.id)}
                        className="mt-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                      >
                        Complete Session
                      </button>
                    </div>
                  ) : (
                    <p className="text-gray-500">Available</p>
                  )}
                </div>
              ))}
            </div>

            {/* Waiting Queue */}
            <div className="mt-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Waiting Queue ({waitingQueue.length})</h2>
                <button
                  onClick={() => setShowAddForm(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                  <Plus size={20} />
                  Add Group
                </button>
              </div>

              {showAddForm && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Group Name
                      </label>
                      <input
                        type="text"
                        value={groupName}
                        onChange={(e) => setGroupName(e.target.value)}
                        placeholder="e.g., John's Group"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Players
                      </label>
                      <select
                        value={playerCount}
                        onChange={(e) => setPlayerCount(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="2">2</option>
                        <option value="3">3</option>
                        <option value="4">4</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={handleAddGroup}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Add to Queue
                    </button>
                    <button
                      onClick={() => {
                        setShowAddForm(false);
                        setGroupName('');
                        setPlayerCount('4');
                      }}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                {waitingQueue.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No groups waiting</p>
                ) : (
                  waitingQueue.map((group, index) => (
                    <div key={group.id} className="flex items-center gap-4 bg-gray-50 p-4 rounded-lg hover:bg-gray-100 transition-colors">
                      <span className="text-2xl font-bold text-gray-400">#{index + 1}</span>
                      {editingGroup === group.id ? (
                        <>
                          <div className="flex-1 flex gap-2">
                            <input
                              type="text"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="flex-1 px-3 py-1 border border-gray-300 rounded"
                              placeholder="Group name"
                            />
                            <select
                              value={editPlayers}
                              onChange={(e) => setEditPlayers(e.target.value)}
                              className="px-3 py-1 border border-gray-300 rounded"
                            >
                              <option value="2">2</option>
                              <option value="3">3</option>
                              <option value="4">4</option>
                            </select>
                          </div>
                          <button
                            onClick={handleSaveEdit}
                            className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                          >
                            Save
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="px-3 py-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 text-sm"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <div className="flex-1">
                            <p className="font-semibold text-gray-900">{group.name}</p>
                            <p className="text-sm text-gray-600">{group.players} players</p>
                          </div>
                          <p className="text-sm text-gray-500">
                            Added: {new Date(group.addedAt).toLocaleTimeString()}
                          </p>
                          <button
                            onClick={() => handleEditGroup(group)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                            title="Edit group"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            onClick={() => handleRemoveGroup(group.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded"
                            title="Remove group"
                          >
                            <Trash2 size={18} />
                          </button>
                        </>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Stats and Session Log */}
          <div className="space-y-6">
            {/* Stats Panel */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <BarChart3 size={20} />
                  Today's Stats
                </h2>
                <button
                  onClick={() => setShowStats(!showStats)}
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  {showStats ? 'Hide' : 'Show'}
                </button>
              </div>
              {showStats && (
                <div className="grid grid-cols-2 gap-4">
                  {(() => {
                    const stats = storage.getStats();
                    return (
                      <>
                        <div className="bg-blue-50 p-3 rounded-lg">
                          <p className="text-2xl font-bold text-blue-600">{stats.totalSessions}</p>
                          <p className="text-sm text-gray-600">Sessions</p>
                        </div>
                        <div className="bg-green-50 p-3 rounded-lg">
                          <p className="text-2xl font-bold text-green-600">{stats.totalPlayers}</p>
                          <p className="text-sm text-gray-600">Players</p>
                        </div>
                        <div className="bg-purple-50 p-3 rounded-lg">
                          <p className="text-2xl font-bold text-purple-600">{stats.averageDuration}</p>
                          <p className="text-sm text-gray-600">Avg Duration (min)</p>
                        </div>
                        <div className="bg-orange-50 p-3 rounded-lg">
                          <p className="text-2xl font-bold text-orange-600">{stats.currentWaiting}</p>
                          <p className="text-sm text-gray-600">Waiting</p>
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}
            </div>

            {/* Session Log */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <Clock size={20} />
                  Today's Log
                </h2>
                {logs.length > 0 && (
                  <button
                    onClick={() => {
                      if (confirm('Clear all session logs? This cannot be undone.')) {
                        storage.clearLogs();
                      }
                    }}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    Clear Log
                  </button>
                )}
              </div>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {logs.length === 0 ? (
                  <p className="text-gray-500 text-sm">No completed sessions yet</p>
                ) : (
                  logs.slice().reverse().map((log) => (
                    <div key={log.id} className="border-l-4 border-green-500 pl-3 py-2">
                      <p className="font-semibold text-sm text-gray-900">{log.name}</p>
                      <p className="text-xs text-gray-600">{log.players} players • Court {log.courtId}</p>
                      <p className="text-xs text-gray-500">
                        Duration: {log.duration} min
                      </p>
                      {log.completedAt && (
                        <p className="text-xs text-gray-400">
                          {new Date(log.completedAt).toLocaleTimeString()}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}