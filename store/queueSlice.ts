import { StateCreator } from 'zustand';
import { QueueEntry, QueueEntryWithPlayer } from '@/types';
import { supabase } from '@/lib/supabase/client';

export interface QueueSlice {
  queueEntries: QueueEntryWithPlayer[];
  queueLoading: boolean;
  queueError: string | null;

  // Actions
  fetchQueue: () => Promise<void>;
  addToQueue: (entry: { player_id: string; group_id?: string }) => Promise<void>;
  removeFromQueue: (queueId: string) => Promise<void>;
  updateQueuePosition: (queueId: string, newPosition: number) => Promise<void>;
  updateQueuePositions: (updates: Array<{ id: string; position: number }>) => Promise<void>;
  subscribeToQueue: () => () => void;
  
  // Waitlist actions
  moveToWaitlist: (queueEntryIds: string[]) => Promise<void>;
  moveToQueue: (queueEntryIds: string[]) => Promise<void>;
  moveGroupToQueue: (groupId: string) => Promise<void>;
}

export const createQueueSlice: StateCreator<QueueSlice> = (set, get) => ({
  queueEntries: [],
  queueLoading: false,
  queueError: null,

  fetchQueue: async () => {
    set({ queueLoading: true, queueError: null });
    try {
      // First, fetch queue entries with player and group data
      const { data: queueData, error: queueError } = await supabase
        .from('queue')
        .select(`
          *,
          player:players(*),
          group:groups(id, name)
        `)
        .in('status', ['waiting', 'playing', 'waitlist']) // Fetch waiting, playing, and waitlist players
        .order('position', { ascending: true }); // Order by position to support manual reordering

      if (queueError) throw queueError;

      // Then fetch sessions separately for those players
      if (queueData && queueData.length > 0) {
        const playerIds = queueData.map(q => q.player_id);
        const { data: sessionsData } = await supabase
          .from('sessions')
          .select('player_id, display_photo, start_time, end_time')
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

        set({ queueEntries: enrichedData, queueLoading: false });
      } else {
        set({ queueEntries: [], queueLoading: false });
      }
    } catch (error) {
      set({ queueError: (error as Error).message, queueLoading: false });
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
      set({ queueError: (error as Error).message });
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
      set({ queueError: (error as Error).message });
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
      set({ queueError: (error as Error).message });
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
      set({ queueError: (error as Error).message });
      throw error;
    }
  },

  subscribeToQueue: () => {
    console.log('[Queue] Setting up real-time subscription...');

    let pollInterval: ReturnType<typeof setInterval> | null = null;
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    let realtimeConnected = false;

    const debouncedFetch = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        get().fetchQueue();
      }, 500);
    };

    const startPolling = () => {
      if (pollInterval) return;
      console.log('[Queue] Realtime failed, starting polling fallback...');
      pollInterval = setInterval(() => {
        get().fetchQueue();
      }, 15000);
    };

    const stopPolling = () => {
      if (pollInterval) {
        console.log('[Queue] Realtime connected, stopping polling fallback.');
        clearInterval(pollInterval);
        pollInterval = null;
      }
    };

    const subscription = supabase
      .channel('queue-changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'queue' },
        (payload) => {
          console.log('[Queue] Real-time event received:', payload.eventType);
          debouncedFetch();
        }
      )
      .subscribe((status) => {
        console.log('[Queue] Subscription status:', status);
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
        console.log('[Queue] Realtime not connected after 5s, starting polling fallback...');
        startPolling();
      }
    }, 5000);

    return () => {
      console.log('[Queue] Unsubscribing...');
      clearTimeout(connectTimeout);
      if (pollInterval) clearInterval(pollInterval);
      if (debounceTimer) clearTimeout(debounceTimer);
      supabase.removeChannel(subscription);
    };
  },

  // Waitlist actions
  moveToWaitlist: async (queueEntryIds: string[]) => {
    try {
      console.log('[Queue Store] Moving to waitlist:', queueEntryIds);
      const response = await fetch('/api/queue/move-to-waitlist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ queue_entry_ids: queueEntryIds }),
      });

      console.log('[Queue Store] Response status:', response.status);
      console.log('[Queue Store] Response ok:', response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Queue Store] Error response:', errorText);
        let error;
        try {
          error = JSON.parse(errorText);
        } catch {
          error = { error: errorText };
        }
        throw new Error(error.error || 'Failed to move to waitlist');
      }

      const result = await response.json();
      console.log('[Queue Store] Success response:', result);
      await get().fetchQueue();
    } catch (error) {
      console.error('[Queue Store] Error in moveToWaitlist:', error);
      set({ queueError: (error as Error).message });
      throw error;
    }
  },

  moveToQueue: async (queueEntryIds: string[]) => {
    try {
      console.log('[Queue Store] Moving to queue:', queueEntryIds);
      const response = await fetch('/api/queue/move-to-queue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ queue_entry_ids: queueEntryIds }),
      });

      console.log('[Queue Store] Response status:', response.status);
      console.log('[Queue Store] Response ok:', response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Queue Store] Error response:', errorText);
        let error;
        try {
          error = JSON.parse(errorText);
        } catch {
          error = { error: errorText };
        }
        throw new Error(error.error || 'Failed to move to queue');
      }

      const result = await response.json();
      console.log('[Queue Store] Success response:', result);
      await get().fetchQueue();
    } catch (error) {
      console.error('[Queue Store] Error in moveToQueue:', error);
      set({ queueError: (error as Error).message });
      throw error;
    }
  },

  moveGroupToQueue: async (groupId: string) => {
    try {
      const response = await fetch('/api/queue/move-group-to-queue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ group_id: groupId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to move group to queue');
      }

      await get().fetchQueue();
    } catch (error) {
      console.error('[Queue Store] Error in moveGroupToQueue:', error);
      set({ queueError: (error as Error).message });
      throw error;
    }
  },
});
