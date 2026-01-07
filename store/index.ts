import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';
import { createQueueSlice, QueueSlice } from './queueSlice';
import { createCourtSlice, CourtSlice } from './courtSlice';
import { createTimerSlice, TimerSlice } from './timerSlice';

// Combined store type
type StoreState = QueueSlice & CourtSlice & TimerSlice;

export const useStore = create<StoreState>()(
  persist(
    (...a) => ({
      ...createQueueSlice(...a),
      ...createCourtSlice(...a),
      ...createTimerSlice(...a),
    }),
    {
      name: 'pickleball-queue-storage',
      storage: createJSONStorage(() => typeof window !== 'undefined' ? localStorage : {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {},
      }),
      // Only persist timer slice (session timers need to survive refresh)
      partialize: (state) => ({
        activeSessions: state.activeSessions,
      }),
      skipHydration: true, // Important for Next.js App Router
    }
  )
);

// Selectors for optimal re-rendering using useShallow
export const useQueue = () => useStore(useShallow((state) => ({
  queueEntries: state.queueEntries,
  loading: state.loading,
  error: state.error,
  fetchQueue: state.fetchQueue,
  addToQueue: state.addToQueue,
  removeFromQueue: state.removeFromQueue,
  subscribeToQueue: state.subscribeToQueue,
  updateQueuePositions: state.updateQueuePositions,
})));

export const useCourts = () => useStore(useShallow((state) => ({
  courts: state.courts,
  loading: state.loading,
  fetchCourts: state.fetchCourts,
  updateCourtStatus: state.updateCourtStatus,
  assignSession: state.assignSession,
  completeSession: state.completeSession,
  subscribeToCourts: state.subscribeToCourts,
})));

export const useTimers = () => useStore(useShallow((state) => ({
  activeSessions: state.activeSessions,
  startTimer: state.startTimer,
  updateTimer: state.updateTimer,
  pauseTimer: state.pauseTimer,
  expireTimer: state.expireTimer,
  getSession: state.getSession,
  isTimeWarning: state.isTimeWarning,
  isUrgent: state.isUrgent,
})));

// Buildings slice removed - single facility with 6 courts
