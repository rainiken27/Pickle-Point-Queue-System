import { StateCreator } from 'zustand';
import { persist } from 'zustand/middleware';
import { ActiveSession } from '@/types';

export interface TimerSlice {
  activeSessions: Map<string, ActiveSession>;

  // Actions
  startTimer: (playerId: string, session: ActiveSession) => void;
  updateTimer: (playerId: string) => void;
  pauseTimer: (playerId: string) => void;
  expireTimer: (playerId: string) => void;
  getSession: (playerId: string) => ActiveSession | undefined;
  isTimeWarning: (playerId: string) => boolean;
  isUrgent: (playerId: string) => boolean;
}

export const createTimerSlice: StateCreator<
  TimerSlice,
  [],
  [],
  TimerSlice
> = (set, get) => ({
  activeSessions: new Map(),

  startTimer: (playerId, session) => {
    set((state) => {
      const newSessions = new Map(state.activeSessions);
      newSessions.set(playerId, session);
      return { activeSessions: newSessions };
    });
  },

  updateTimer: (playerId) => {
    const session = get().getSession(playerId);
    if (!session) return;

    const now = new Date();
    const startTime = new Date(session.start_time);
    const elapsedMinutes = Math.floor((now.getTime() - startTime.getTime()) / 60000);
    const remainingMinutes = 300 - elapsedMinutes; // 5 hours = 300 minutes

    set((state) => {
      const newSessions = new Map(state.activeSessions);
      newSessions.set(playerId, {
        ...session,
        elapsed_minutes: elapsedMinutes,
        remaining_minutes: remainingMinutes,
        is_time_warning: remainingMinutes <= 30,
        is_urgent: remainingMinutes <= 5,
      });
      return { activeSessions: newSessions };
    });
  },

  pauseTimer: (playerId) => {
    set((state) => {
      const newSessions = new Map(state.activeSessions);
      newSessions.delete(playerId);
      return { activeSessions: newSessions };
    });
  },

  expireTimer: (playerId) => {
    set((state) => {
      const newSessions = new Map(state.activeSessions);
      const session = newSessions.get(playerId);
      if (session) {
        newSessions.set(playerId, {
          ...session,
          status: 'expired',
        });
      }
      return { activeSessions: newSessions };
    });
  },

  getSession: (playerId) => {
    return get().activeSessions.get(playerId);
  },

  isTimeWarning: (playerId) => {
    const session = get().getSession(playerId);
    return session?.is_time_warning || false;
  },

  isUrgent: (playerId) => {
    const session = get().getSession(playerId);
    return session?.is_urgent || false;
  },
});
