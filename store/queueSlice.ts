import { StateCreator } from 'zustand';
import { QueueEntry, QueueEntryWithPlayer } from '@/types';
import { supabase } from '@/lib/supabase/client';

export interface QueueSlice {
  queueEntries: QueueEntryWithPlayer[];
  loading: boolean;
  error: string | null;

  // Actions
  fetchQueue: () => Promise<void>;
  addToQueue: (entry: { player_id: string; group_id?: string }) => Promise<void>;
  removeFromQueue: (queueId: string) => Promise<void>;
  updateQueuePosition: (queueId: string, newPosition: number) => Promise<void>;
  updateQueuePositions: (updates: Array<{ id: string; position: number }>) => Promise<void>;
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
        .in('status', ['waiting', 'playing']) // Fetch both waiting and playing players
        .order('position', { ascending: true }); // Order by position to support manual reordering

      if (error) throw error;
      
      console.log('[Queue Fetch] Fetched queue data:', data?.map(e => ({ 
        id: e.id, 
        player_name: e.player?.name, 
        position: e.position, 
        status: e.status,
        court_id: e.court_id
      })));
      
      set({ queueEntries: data || [], loading: false });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  addToQueue: async ({ player_id, group_id }) => {
    try {
      // Calculate next position by checking database (single facility queue)
      const { data: existingQueue } = await supabase
        .from('queue')
        .select('position')
        .eq('status', 'waiting')
        .order('position', { ascending: false })
        .limit(1);

      const nextPosition = existingQueue && existingQueue.length > 0
        ? existingQueue[0].position + 1
        : 1;

      console.log(`[Queue] Adding player, next position: ${nextPosition}`);

      const { error } = await supabase
        .from('queue')
        .insert({
          player_id,
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

  updateQueuePositions: async (updates) => {
    try {
      // Update multiple queue positions atomically
      for (const update of updates) {
        const { error } = await supabase
          .from('queue')
          .update({ position: update.position })
          .eq('id', update.id);

        if (error) throw error;
      }
      await get().fetchQueue();
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
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
