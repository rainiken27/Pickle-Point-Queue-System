import { StateCreator } from 'zustand';
import { Court, CourtWithSession } from '@/types';
import { supabase } from '@/lib/supabase/client';

export interface CourtSlice {
  courts: CourtWithSession[];
  loading: boolean;
  error: string | null;

  // Actions
  fetchCourts: () => Promise<void>;
  updateCourtStatus: (courtId: string, status: 'available' | 'occupied') => Promise<void>;
  assignSession: (courtId: string, players?: Array<{id: string, name: string, skill_level: number, photo_url: string | null}>) => Promise<void>;
  completeSession: (courtId: string) => Promise<void>;
  subscribeToCourts: () => () => void;
}

export const createCourtSlice: StateCreator<CourtSlice> = (set, get) => ({
  courts: [],
  loading: false,
  error: null,

  fetchCourts: async () => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('courts')
        .select('*')
        .order('court_number', { ascending: true });

      if (error) throw error;
      set({ courts: data || [], loading: false });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
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
      set({ error: (error as Error).message });
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
      set({ error: (error as Error).message });
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
      set({ error: (error as Error).message });
      throw error;
    }
  },

  subscribeToCourts: () => {
    console.log('[Court] Setting up real-time subscription...');

    const subscription = supabase
      .channel('court-changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'courts' },
        (payload) => {
          console.log('[Court] Real-time event received:', payload.eventType, payload);
          get().fetchCourts();
        }
      )
      .subscribe((status) => {
        console.log('[Court] Subscription status:', status);
      });

    // Fallback: Poll every 3 seconds if realtime doesn't work
    const pollInterval = setInterval(() => {
      console.log('[Court] Polling fallback...');
      get().fetchCourts();
    }, 3000);

    return () => {
      console.log('[Court] Unsubscribing...');
      clearInterval(pollInterval);
      subscription.unsubscribe();
    };
  },
});
