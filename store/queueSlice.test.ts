import { describe, it, expect, beforeEach } from 'vitest';
import { create } from 'zustand';
import type { QueueEntry } from '@/types';

// Mock queue slice (simplified version)
interface QueueState {
  queueEntries: QueueEntry[];
  loading: boolean;
  error: string | null;
  addToQueue: (entry: Omit<QueueEntry, 'id' | 'position' | 'joined_at'>) => void;
  removeFromQueue: (id: string) => void;
  updatePosition: (id: string, newPosition: number) => void;
  setQueueEntries: (entries: QueueEntry[]) => void;
}

const createQueueStore = () => create<QueueState>((set) => ({
  queueEntries: [],
  loading: false,
  error: null,

  addToQueue: (entry) => set((state) => ({
    queueEntries: [
      ...state.queueEntries,
      {
        ...entry,
        id: `queue-${Date.now()}`,
        position: state.queueEntries.length + 1,
        joined_at: new Date().toISOString(),
      } as QueueEntry,
    ],
  })),

  removeFromQueue: (id) => set((state) => ({
    queueEntries: state.queueEntries
      .filter(e => e.id !== id)
      .map((e, index) => ({ ...e, position: index + 1 })),
  })),

  updatePosition: (id, newPosition) => set((state) => ({
    queueEntries: state.queueEntries.map(e =>
      e.id === id ? { ...e, position: newPosition } : e
    ),
  })),

  setQueueEntries: (entries) => set({ queueEntries: entries }),
}));

describe('Queue State Management', () => {
  let useStore: ReturnType<typeof createQueueStore>;

  beforeEach(() => {
    useStore = createQueueStore();
  });

  describe('addToQueue', () => {
    it('should add a player to the queue', () => {
      const { addToQueue, queueEntries } = useStore.getState();

      addToQueue({
        player_id: 'player-1',
        building: 'building_a',
        status: 'waiting',
        group_id: null,
        estimated_wait_minutes: 15,
      });

      const state = useStore.getState();
      expect(state.queueEntries).toHaveLength(1);
      expect(state.queueEntries[0].player_id).toBe('player-1');
    });

    it('should assign correct position to new entries', () => {
      const { addToQueue } = useStore.getState();

      addToQueue({
        player_id: 'player-1',
        building: 'building_a',
        status: 'waiting',
        group_id: null,
        estimated_wait_minutes: 15,
      });

      addToQueue({
        player_id: 'player-2',
        building: 'building_a',
        status: 'waiting',
        group_id: null,
        estimated_wait_minutes: 15,
      });

      const state = useStore.getState();
      expect(state.queueEntries[0].position).toBe(1);
      expect(state.queueEntries[1].position).toBe(2);
    });

    it('should assign unique IDs to queue entries', async () => {
      const { addToQueue } = useStore.getState();

      addToQueue({
        player_id: 'player-1',
        building: 'building_a',
        status: 'waiting',
        group_id: null,
        estimated_wait_minutes: 15,
      });

      // Small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 5));

      addToQueue({
        player_id: 'player-2',
        building: 'building_a',
        status: 'waiting',
        group_id: null,
        estimated_wait_minutes: 15,
      });

      const state = useStore.getState();
      expect(state.queueEntries[0].id).not.toBe(state.queueEntries[1].id);
    });
  });

  describe('removeFromQueue', () => {
    beforeEach(async () => {
      const { addToQueue } = useStore.getState();

      addToQueue({
        player_id: 'player-1',
        building: 'building_a',
        status: 'waiting',
        group_id: null,
        estimated_wait_minutes: 15,
      });

      await new Promise(resolve => setTimeout(resolve, 5));

      addToQueue({
        player_id: 'player-2',
        building: 'building_a',
        status: 'waiting',
        group_id: null,
        estimated_wait_minutes: 15,
      });

      await new Promise(resolve => setTimeout(resolve, 5));

      addToQueue({
        player_id: 'player-3',
        building: 'building_a',
        status: 'waiting',
        group_id: null,
        estimated_wait_minutes: 15,
      });
    });

    it('should remove a player from the queue', () => {
      let state = useStore.getState();
      expect(state.queueEntries).toHaveLength(3);
      const firstId = state.queueEntries[0].id;

      useStore.getState().removeFromQueue(firstId);

      state = useStore.getState();
      expect(state.queueEntries).toHaveLength(2);
      expect(state.queueEntries.find(e => e.id === firstId)).toBeUndefined();
    });

    it('should recalculate positions after removal', () => {
      let state = useStore.getState();
      expect(state.queueEntries).toHaveLength(3);
      const firstId = state.queueEntries[0].id;

      useStore.getState().removeFromQueue(firstId);

      state = useStore.getState();
      expect(state.queueEntries[0].position).toBe(1);
      expect(state.queueEntries[1].position).toBe(2);
    });
  });

  describe('updatePosition', () => {
    beforeEach(() => {
      const { addToQueue } = useStore.getState();

      addToQueue({
        player_id: 'player-1',
        building: 'building_a',
        status: 'waiting',
        group_id: null,
        estimated_wait_minutes: 15,
      });
    });

    it('should update a queue entry position', () => {
      const state = useStore.getState();
      const entryId = state.queueEntries[0].id;

      state.updatePosition(entryId, 5);

      const newState = useStore.getState();
      expect(newState.queueEntries[0].position).toBe(5);
    });
  });

  describe('setQueueEntries', () => {
    it('should replace all queue entries', () => {
      const { setQueueEntries } = useStore.getState();

      const mockEntries: QueueEntry[] = [
        {
          id: 'entry-1',
          player_id: 'player-1',
          building: 'building_a',
          status: 'waiting',
          position: 1,
          joined_at: new Date().toISOString(),
          group_id: null,
          estimated_wait_minutes: 15,
        },
        {
          id: 'entry-2',
          player_id: 'player-2',
          building: 'building_a',
          status: 'waiting',
          position: 2,
          joined_at: new Date().toISOString(),
          group_id: null,
          estimated_wait_minutes: 15,
        },
      ];

      setQueueEntries(mockEntries);

      const state = useStore.getState();
      expect(state.queueEntries).toEqual(mockEntries);
    });
  });
});
