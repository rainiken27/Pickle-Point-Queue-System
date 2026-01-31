import { StateCreator } from 'zustand';
import { Court, CourtWithSession } from '@/types';
import { supabase } from '@/lib/supabase/client';

export interface CourtSlice {
  courts: CourtWithSession[];
  courtLoading: boolean;
  courtError: string | null;

  // Actions
  fetchCourts: () => Promise<void>;
  updateCourtStatus: (courtId: string, status: 'available' | 'occupied') => Promise<void>;
  assignSession: (courtId: string, players?: Array<{id: string, name: string, skill_level: number, photo_url: string | null}>) => Promise<void>;
  completeSession: (courtId: string) => Promise<void>;
  subscribeToCourts: () => () => void;
}

export const createCourtSlice: StateCreator<CourtSlice> = (set, get) => ({
  courts: [],
  courtLoading: false,
  courtError: null,

  fetchCourts: async () => {
    set({ courtLoading: true, courtError: null });
    try {
      const { data, error } = await supabase
        .from('courts')
        .select('*')
        .order('court_number', { ascending: true });

      if (error) throw error;
      set({ courts: data || [], courtLoading: false });
    } catch (error) {
      set({ courtError: (error as Error).message, courtLoading: false });
    }
  },

  updateCourtStatus: async (courtId, status) => {
    try {
      const { error } = await supabase
        .from('courts')
        .update({ status })
        .eq('id', courtId);

      if (error) throw error;
      await get().fetchCourts();
    } catch (error) {
      set({ courtError: (error as Error).message });
      throw error;
    }
  },

  assignSession: async (courtId, players) => {
    try {
      const updateData: any = {
        status: 'occupied',
        court_timer_started_at: new Date().toISOString(),
      };

      // Store player data if provided
      if (players && players.length > 0) {
        updateData.current_players = players;
      }

      const { error } = await supabase
        .from('courts')
        .update(updateData)
        .eq('id', courtId);

      if (error) throw error;
      await get().fetchCourts();
    } catch (error) {
      set({ courtError: (error as Error).message });
      throw error;
    }
  },

  completeSession: async (courtId) => {
    try {
      const { error } = await supabase
        .from('courts')
        .update({
          status: 'available',
          court_timer_started_at: null,
          current_players: null, // Clear player data when match ends
        })
        .eq('id', courtId);

      if (error) throw error;
      await get().fetchCourts();
    } catch (error) {
      set({ courtError: (error as Error).message });
      throw error;
    }
  },

  subscribeToCourts: () => {
    console.log('[Court] Setting up real-time subscription...');

    let pollInterval: ReturnType<typeof setInterval> | null = null;
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    let realtimeConnected = false;

    const debouncedFetch = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        get().fetchCourts();
      }, 500);
    };

    const startPolling = () => {
      if (pollInterval) return;
      console.log('[Court] Realtime failed, starting polling fallback...');
      pollInterval = setInterval(() => {
        get().fetchCourts();
      }, 15000);
    };

    const stopPolling = () => {
      if (pollInterval) {
        console.log('[Court] Realtime connected, stopping polling fallback.');
        clearInterval(pollInterval);
        pollInterval = null;
      }
    };

    const subscription = supabase
      .channel('court-changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'courts' },
        (payload) => {
          console.log('[Court] Real-time event received:', payload.eventType);
          debouncedFetch();
        }
      )
      .subscribe((status) => {
        console.log('[Court] Subscription status:', status);
        if (status === 'SUBSCRIBED') {
          realtimeConnected = true;
          stopPolling();
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          realtimeConnected = false;
          startPolling();
        }
      });

    // If realtime hasn't connected within 5 seconds, start polling as safety net
    const connectTimeout = setTimeout(() => {
      if (!realtimeConnected) {
        console.log('[Court] Realtime not connected after 5s, starting polling fallback...');
        startPolling();
      }
    }, 5000);

    return () => {
      console.log('[Court] Unsubscribing...');
      clearTimeout(connectTimeout);
      if (pollInterval) clearInterval(pollInterval);
      if (debounceTimer) clearTimeout(debounceTimer);
      supabase.removeChannel(subscription);
    };
  },
});
