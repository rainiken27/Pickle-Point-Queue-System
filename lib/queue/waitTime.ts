import { supabase } from '@/lib/supabase/client';
import { BuildingType } from '@/types';

export async function calculateWaitTime(building: BuildingType, queueDepth: number): Promise<number> {
  // Get average session duration from last 20 completed sessions
  const { data: recentSessions } = await supabase
    .from('sessions')
    .select('duration_minutes')
    .eq('building', building)
    .eq('status', 'completed')
    .not('duration_minutes', 'is', null)
    .order('created_at', { ascending: false })
    .limit(20);

  const avgDuration = recentSessions && recentSessions.length > 0
    ? recentSessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0) / recentSessions.length
    : 15; // Default 15 minutes if no history

  // Get number of courts in this building
  const courtsPerBuilding = 4; // 4 courts per building

  // Formula: (queue_depth / courts_in_building) * avg_session_duration
  const waitTime = Math.round((queueDepth / courtsPerBuilding) * avgDuration);

  return waitTime;
}

export async function calculateEstimatedWaitTimes(): Promise<Record<BuildingType, number>> {
  const buildings: BuildingType[] = ['building_a', 'building_b', 'building_c'];
  const result: Record<BuildingType, number> = {} as Record<BuildingType, number>;

  for (const building of buildings) {
    const { data: queueData } = await supabase
      .from('queue')
      .select('id')
      .eq('building', building)
      .eq('status', 'waiting');

    const queueDepth = queueData?.length || 0;
    result[building] = await calculateWaitTime(building, queueDepth);
  }

  return result;
}
