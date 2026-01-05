import { StateCreator } from 'zustand';
import { Building } from '@/types';
import { supabase } from '@/lib/supabase/client';

export interface BuildingSlice {
  buildings: Building[];
  loading: boolean;
  error: string | null;

  // Actions
  fetchBuildings: () => Promise<void>;
  toggleBuildingStatus: (buildingId: string, isActive: boolean) => Promise<void>;
  subscribeToBuildings: () => () => void;
}

export const createBuildingSlice: StateCreator<BuildingSlice> = (set, get) => ({
  buildings: [],
  loading: false,
  error: null,

  fetchBuildings: async () => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('buildings')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      set({ buildings: data || [], loading: false });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  toggleBuildingStatus: async (buildingId, isActive) => {
    try {
      const { error } = await supabase
        .from('buildings')
        .update({ is_active: isActive })
        .eq('id', buildingId);

      if (error) throw error;
      await get().fetchBuildings();
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  subscribeToBuildings: () => {
    const subscription = supabase
      .channel('building-changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'buildings' },
        () => {
          get().fetchBuildings();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  },
});
