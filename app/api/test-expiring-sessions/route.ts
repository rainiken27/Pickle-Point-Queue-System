import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    console.log('[Test API] Setting up expiring sessions with existing players...');

    // Get first 4 players with active sessions
    const { data: activeSessions, error: sessionError } = await supabaseServer
      .from('sessions')
      .select(`
        id,
        player_id,
        players!inner(id, name, skill_level)
      `)
      .eq('status', 'active')
      .limit(4);

    if (sessionError) {
      throw sessionError;
    }

    if (!activeSessions || activeSessions.length < 4) {
      return NextResponse.json({
        error: 'Need at least 4 players with active sessions',
        found: activeSessions?.length || 0,
        suggestion: 'Go to /cashier and check in some players first, or run the seed data'
      }, { status: 400 });
    }

    // Update their sessions to expire in 1 minute (started 4 hours 59 minutes ago)
    const sessionStartTime = new Date();
    sessionStartTime.setHours(sessionStartTime.getHours() - 4);
    sessionStartTime.setMinutes(sessionStartTime.getMinutes() - 59);

    const updatedSessions = [];

    for (const session of activeSessions) {
      const { error: updateError } = await supabaseServer
        .from('sessions')
        .update({
          start_time: sessionStartTime.toISOString(),
        })
        .eq('id', session.id);

      if (updateError) {
        console.error('Error updating session:', updateError);
        continue;
      }

      // Make sure they're in the queue
      const { data: existingQueue } = await supabaseServer
        .from('queue')
        .select('id')
        .eq('player_id', session.player_id)
        .single();

      if (!existingQueue) {
        // Add to queue if not already there
        const { error: queueError } = await supabaseServer
          .from('queue')
          .insert({
            player_id: session.player_id,
            status: 'waiting',
            position: updatedSessions.length + 1,
          });

        if (queueError) {
          console.error('Error adding to queue:', queueError);
        }
      }

      updatedSessions.push({
        session_id: session.id,
        player: (session as any).players,
        remainingMinutes: 1,
      });

      console.log(`[Test API] Updated ${(session as any).players.name} session to expire in 1 minute`);
    }

    return NextResponse.json({
      success: true,
      message: `Updated ${updatedSessions.length} existing players' sessions to expire in 1 minute`,
      players: updatedSessions,
      instructions: [
        '1. Go to /admin',
        '2. Click "Call Next" to start a match with these players',
        '3. Wait 30 seconds for court timer to expire (auto-complete)',
        '4. Wait 1 minute for sessions to expire',
        '5. Try to complete the match - it should work using stored court data!'
      ]
    });

  } catch (error) {
    console.error('[Test API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to setup test scenario', details: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    console.log('[Test API] Resetting sessions to normal timing...');

    // Reset all sessions to have started recently (so they have ~5 hours left)
    const normalStartTime = new Date();
    normalStartTime.setMinutes(normalStartTime.getMinutes() - 30); // Started 30 minutes ago

    const { error } = await supabaseServer
      .from('sessions')
      .update({
        start_time: normalStartTime.toISOString(),
      })
      .eq('status', 'active');

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      message: 'All active sessions reset to normal timing (4.5 hours remaining)'
    });

  } catch (error) {
    console.error('[Test API] Reset error:', error);
    return NextResponse.json(
      { error: 'Failed to reset sessions', details: (error as Error).message },
      { status: 500 }
    );
  }
}