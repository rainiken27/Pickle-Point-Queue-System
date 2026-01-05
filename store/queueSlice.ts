import { StateCreator } from 'zustand';
import { QueueEntry, QueueEntryWithPlayer, BuildingType } from '@/types';
import { supabase } from '@/lib/supabase/client';

export interface QueueSlice {
  queueEntries: QueueEntryWithPlayer[];
  loading: boolean;
  error: string | null;

  // Actions
  fetchQueue: () => Promise<void>;
  addToQueue: (entry: { player_id: string; building: BuildingType; group_id?: string }) => Promise<void>;
  removeFromQueue: (queueId: string) => Promise<void>;
  updateQueuePosition: (queueId: string, newPosition: number) => Promise<void>;
  getQueueByBuilding: (building: BuildingType) => QueueEntryWithPlayer[];
  subscribeToQueue: () => () => void;
}

export const createQueueSlice: StateCreator<QueueSlice> = (set, get) => ({
  queueEntries: [],
  loading: false,
  error: null,

  fetchQueue: async () => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('queue')
        .select(`
          *,
          player:players(*)
        `)
        .eq('status', 'waiting')
        .order('joined_at', { ascending: true }); // First-come, first-served

      if (error) throw error;
      set({ queueEntries: data || [], loading: false });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  addToQueue: async ({ player_id, building, group_id }) => {
    try {
      // Calculate next position for this building by checking database
      const { data: existingQueue } = await supabase
        .from('queue')
        .select('position')
        .eq('building', building)
        .eq('status', 'waiting')
        .order('position', { ascending: false })
        .limit(1);

      const nextPosition = existingQueue && existingQueue.length > 0
        ? existingQueue[0].position + 1
        : 1;

      console.log(`[Queue] Adding player to ${building}, next position: ${nextPosition}`);

      const { error } = await supabase
        .from('queue')
        .insert({
          player_id,
          building,
          group_id: group_id || null,
          position: nextPosition,
          status: 'waiting',
        });

      if (error) throw error;
      await get().fetchQueue();
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  removeFromQueue: async (queueId) => {
    try {
      const { error } = await supabase
        .from('queue')
        .delete()
        .eq('id', queueId);

      if (error) throw error;
      await get().fetchQueue();
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  updateQueuePosition: async (queueId, newPosition) => {
    try {
      const { error } = await supabase
        .from('queue')
        .update({ position: newPosition })
        .eq('id', queueId);

      if (error) throw error;
      await get().fetchQueue();
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  getQueueByBuilding: (building) => {
    return get().queueEntries.filter(entry => entry.building === building);
  },

  subscribeToQueue: () => {
    console.log('[Queue] Setting up real-time subscription...');

    const subscription = supabase
      .channel('queue-changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'queue' },
        (payload) => {
          console.log('[Queue] Real-time event received:', payload.eventType, payload);
          get().fetchQueue();
        }
      )
      .subscribe((status) => {
        console.log('[Queue] Subscription status:', status);
      });

    // Fallback: Poll every 3 seconds if realtime doesn't work
    const pollInterval = setInterval(() => {
      console.log('[Queue] Polling fallback...');
      get().fetchQueue();
    }, 3000);

    return () => {
      console.log('[Queue] Unsubscribing...');
      clearInterval(pollInterval);
      subscription.unsubscribe();
    };
  },
});
