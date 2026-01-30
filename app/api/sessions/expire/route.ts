import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

const FIVE_HOURS_MS = 5 * 60 * 60 * 1000;
const GRACE_PERIOD_MS = 15 * 60 * 1000; // 15 minute grace period
const TOTAL_ALLOWED_MS = FIVE_HOURS_MS + GRACE_PERIOD_MS;

/**
 * Check and expire sessions that have exceeded their time limit
 * Should be called periodically (every 1-5 minutes) from the frontend
 */
export async function POST() {
  try {
    // Find all active sessions with player info to check unlimited_time flag
    const { data: activeSessions, error: fetchError } = await supabaseServer
      .from('sessions')
      .select(`
        *,
        players!inner (
          unlimited_time
        )
      `)
      .eq('status', 'active');

    if (fetchError) throw fetchError;

    if (!activeSessions || activeSessions.length === 0) {
      return NextResponse.json(
        { message: 'No active sessions to check', expired: 0 },
        { status: 200 }
      );
    }

    const now = Date.now();
    const expiredSessionIds: string[] = [];
    const expiredPlayerIds: string[] = [];

    // Check each session for expiration
    for (const session of activeSessions) {
      // Skip players with unlimited time
      if ((session as any).players?.unlimited_time) {
        continue;
      }

      const startTime = new Date(session.start_time).getTime();
      const elapsed = now - startTime;

      // Check if beyond 5 hours + 15 minute grace period
      if (elapsed > TOTAL_ALLOWED_MS) {
        expiredSessionIds.push(session.id);
        expiredPlayerIds.push(session.player_id);
      }
    }

    if (expiredSessionIds.length === 0) {
      return NextResponse.json(
        { message: 'No expired sessions found', expired: 0 },
        { status: 200 }
      );
    }

    // Update expired sessions
    const { error: updateError } = await supabaseServer
      .from('sessions')
      .update({
        status: 'expired',
        end_time: new Date().toISOString(),
      })
      .in('id', expiredSessionIds);

    if (updateError) throw updateError;

    // Remove expired players from queue
    const { error: queueError } = await supabaseServer
      .from('queue')
      .delete()
      .in('player_id', expiredPlayerIds);

    if (queueError) {
      console.error('Error removing expired players from queue:', queueError);
      // Don't throw - session expiration is more important
    }

    // Get player names for logging
    const { data: players } = await supabaseServer
      .from('players')
      .select('name')
      .in('id', expiredPlayerIds);

    const playerNames = players?.map(p => p.name) || [];

    console.log(`[Session Expiration] Expired ${expiredSessionIds.length} session(s):`, playerNames);

    return NextResponse.json(
      {
        message: `${expiredSessionIds.length} session(s) expired`,
        expired: expiredSessionIds.length,
        players: playerNames,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Session expiration error:', error);
    return NextResponse.json(
      { error: 'Failed to expire sessions', message: (error as Error).message },
      { status: 500 }
    );
  }
}
