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
  assignSession: (courtId: string) => Promise<void>;
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

  assignSession: async (courtId) => {
    try {
      const { error } = await supabase
        .from('courts')
        .update({
          status: 'occupied',
          court_timer_started_at: new Date().toISOString(),
        })
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
    const subscription = supabase
      .channel('court-changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'courts' },
        () => {
          get().fetchCourts();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  },
});
