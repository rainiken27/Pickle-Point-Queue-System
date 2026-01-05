import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

/**
 * Manually remove a player from the queue
 * Used when player leaves unexpectedly or doesn't show up
 */
export async function POST(request: NextRequest) {
  try {
    const { queue_id, reason, end_session } = await request.json();

    if (!queue_id) {
      return NextResponse.json(
        { error: 'queue_id is required' },
        { status: 400 }
      );
    }

    // Get queue entry details before deletion
    const { data: queueEntry, error: fetchError } = await supabaseServer
      .from('queue')
      .select(`
        *,
        player:players(name)
      `)
      .eq('id', queue_id)
      .single();

    if (fetchError || !queueEntry) {
      return NextResponse.json(
        { error: 'Queue entry not found' },
        { status: 404 }
      );
    }

    // Complete the player's session ONLY if explicitly requested
    // end_session = true: Player left facility / no-show (complete session)
    // end_session = false/undefined: Temporary break (keep session active)
    const shouldEndSession = end_session === true;

    if (shouldEndSession) {
      const { error: sessionError } = await supabaseServer
        .from('sessions')
        .update({
          status: 'completed',
          end_time: new Date().toISOString(),
        })
        .eq('player_id', queueEntry.player_id)
        .eq('status', 'active');

      if (sessionError) {
        console.warn(`[Queue Removal] Could not complete session for ${queueEntry.player.name}:`, sessionError);
        // Don't throw - queue removal is more important
      }
    }

    // Delete from queue
    const { error: deleteError } = await supabaseServer
      .from('queue')
      .delete()
      .eq('id', queue_id);

    if (deleteError) throw deleteError;

    // Log the removal (optional - for analytics/tracking)
    const removalReason = reason || 'manual_removal';
    console.log(`[Queue Removal] Player "${queueEntry.player.name}" removed from queue and session completed. Reason: ${removalReason}`);

    // You could also log this to a separate table for tracking no-shows:
    // await supabaseServer.from('queue_removals').insert({
    //   player_id: queueEntry.player_id,
    //   queue_id: queue_id,
    //   reason: removalReason,
    //   removed_at: new Date().toISOString(),
    // });

    return NextResponse.json(
      {
        message: `${queueEntry.player.name} removed from queue`,
        player_name: queueEntry.player.name,
        reason: removalReason,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Queue removal error:', error);
    return NextResponse.json(
      { error: 'Failed to remove from queue', message: (error as Error).message },
      { status: 500 }
    );
  }
}
