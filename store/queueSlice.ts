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
      // First, fetch queue entries with player and group data
      const { data: queueData, error: queueError } = await supabase
        .from('queue')
        .select(`
          *,
          player:players(*),
          group:groups(id, name)
        `)
        .in('status', ['waiting', 'playing']) // Fetch both waiting and playing players
        .order('position', { ascending: true }); // Order by position to support manual reordering

      if (queueError) throw queueError;

      // Then fetch sessions separately for those players
      if (queueData && queueData.length > 0) {
        const playerIds = queueData.map(q => q.player_id);
        const { data: sessionsData } = await supabase
          .from('sessions')
          .select('player_id, display_photo')
          .in('player_id', playerIds)
          .eq('status', 'active');

        // Create a map of player_id to session
        const sessionMap = new Map();
        if (sessionsData) {
          sessionsData.forEach(s => sessionMap.set(s.player_id, s));
        }

        // Manually attach session data to queue entries
        const enrichedData = queueData.map(q => ({
          ...q,
          session: sessionMap.get(q.player_id) || null
        }));

        console.log('[Queue Fetch] Fetched queue data:', enrichedData.map(e => ({
          id: e.id,
          player_name: e.player?.name,
          position: e.position,
          status: e.status,
          court_id: e.court_id,
          display_photo: (e as any).session?.display_photo
        })));

        set({ queueEntries: enrichedData, loading: false });
      } else {
        set({ queueEntries: [], loading: false });
      }
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  addToQueue: async ({ player_id, group_id }) => {
    try {
      // If no group_id provided, check if player is member of a permanent group
      let finalGroupId = group_id;
      if (!finalGroupId) {
        console.log(`[Queue] Checking group membership for player ${player_id}`);
        const { data: groupMembership, error: groupError } = await supabase
          .from('group_members')
          .select('group_id')
          .eq('player_id', player_id)
          .single();

        if (groupError) {
          console.log(`[Queue] No group membership found for player ${player_id}:`, groupError);
        } else if (groupMembership) {
          finalGroupId = groupMembership.group_id;
          console.log(`[Queue] Player ${player_id} is member of group ${finalGroupId}`);
        } else {
          console.log(`[Queue] Player ${player_id} is not in any group`);
        }
      } else {
        console.log(`[Queue] Player ${player_id} added with explicit group_id: ${finalGroupId}`);
      }

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
          group_id: finalGroupId || null,
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
