import { supabase } from '@/lib/supabase/client';

export async function calculateWaitTime(queueDepth: number): Promise<number> {
  // Get average session duration from last 20 completed sessions
  const { data: recentSessions } = await supabase
    .from('sessions')
    .select('duration_minutes')
    .eq('status', 'completed')
    .not('duration_minutes', 'is', null)
    .order('created_at', { ascending: false })
    .limit(20);

  const avgDuration = recentSessions && recentSessions.length > 0
    ? recentSessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0) / recentSessions.length
    : 15; // Default 15 minutes if no history

  // Single facility with 6 courts
  const totalCourts = 6;

  // Formula: (queue_depth / total_courts) * avg_session_duration
  const waitTime = Math.round((queueDepth / totalCourts) * avgDuration);

  return waitTime;
}

export async function calculateEstimatedWaitTime(): Promise<number> {
  const { data: queueData } = await supabase
    .from('queue')
    .select('id')
    .eq('status', 'waiting');

  const queueDepth = queueData?.length || 0;
  return await calculateWaitTime(queueDepth);
}
