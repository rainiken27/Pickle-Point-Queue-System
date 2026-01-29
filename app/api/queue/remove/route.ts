import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

/**
 * Manually remove a player from the queue or move them to the bottom
 * Used when player leaves unexpectedly or doesn't show up
 *
 * Options:
 * - move_to_bottom: true = move player to last position instead of removing
 * - end_session: true = also end their session (only for removals)
 */
export async function POST(request: NextRequest) {
  console.log('[Queue Removal API] Starting queue removal request');

  try {
    const { queue_id, reason, end_session, move_to_bottom } = await request.json();
    console.log('[Queue Removal API] Request data:', { queue_id, reason, end_session, move_to_bottom });

    if (!queue_id) {
      console.log('[Queue Removal API] Missing queue_id');
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

    console.log(`[Queue Removal API] Found queue entry:`, {
      id: queueEntry.id,
      player_name: queueEntry.player.name,
      position: queueEntry.position,
      status: queueEntry.status
    });

    // If move_to_bottom is true, move player to last position instead of removing
    if (move_to_bottom === true) {
      // Get the highest current position
      const { data: lastEntry } = await supabaseServer
        .from('queue')
        .select('position')
        .eq('status', 'waiting')
        .order('position', { ascending: false })
        .limit(1)
        .single();

      const newPosition = (lastEntry?.position || 0) + 1;

      // Update the player's position to the end
      const { error: updateError } = await supabaseServer
        .from('queue')
        .update({ position: newPosition })
        .eq('id', queue_id);

      if (updateError) throw updateError;

      console.log(`[Queue Removal API] Moved ${queueEntry.player.name} to bottom of queue (position ${newPosition})`);

      // Recalculate positions to fill any gaps
      await recalculateQueuePositions();

      return NextResponse.json(
        {
          message: `${queueEntry.player.name} moved to bottom of queue`,
          player_name: queueEntry.player.name,
          new_position: newPosition,
          action: 'moved_to_bottom',
        },
        { status: 200 }
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
    console.log(`[Queue Removal API] Successfully deleted queue entry ${queue_id}`);

    // Recalculate positions for remaining players (facility-wide)
    console.log(`[Queue Removal] About to recalculate positions for facility`);
    await recalculateQueuePositions();
    console.log(`[Queue Removal] Finished recalculating positions for facility`);

    // Log the removal (optional - for analytics/tracking)
    const removalReason = reason || 'manual_removal';
    console.log(`[Queue Removal] Player "${queueEntry.player.name}" removed from queue. Reason: ${removalReason}`);

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

/**
 * Recalculate and update queue positions for the entire facility
 * This ensures there are no gaps in position numbers after removals
 */
async function recalculateQueuePositions() {
  try {
    console.log(`[Queue Positions] Starting recalculation for facility`);
    
    // Get all waiting players in the facility, ordered by their current position
    const { data: queueEntries, error: fetchError } = await supabaseServer
      .from('queue')
      .select('id, position, player_id')
      .eq('status', 'waiting')
      .order('position', { ascending: true });

    if (fetchError) {
      console.error('Error fetching queue for position recalculation:', fetchError);
      return;
    }

    if (!queueEntries || queueEntries.length === 0) {
      console.log(`[Queue Positions] No players to reposition in facility`);
      return; // No players to reposition
    }

    console.log(`[Queue Positions] Found ${queueEntries.length} players in facility:`, 
      queueEntries.map(e => ({ id: e.id, current_position: e.position, player_id: e.player_id }))
    );

    // Check if positions need updating (if there are gaps)
    let needsUpdate = false;
    const updates = [];
    
    for (let i = 0; i < queueEntries.length; i++) {
      const entry = queueEntries[i];
      const expectedPosition = i + 1;
      
      if (entry.position !== expectedPosition) {
        needsUpdate = true;
        updates.push({
          id: entry.id,
          oldPosition: entry.position,
          newPosition: expectedPosition
        });
      }
    }

    if (!needsUpdate) {
      console.log(`[Queue Positions] Positions are already correct for facility`);
      return;
    }

    console.log(`[Queue Positions] Need to update ${updates.length} positions:`, updates);

    // Update positions to be sequential (1, 2, 3, ...)
    for (const update of updates) {
      const { error: updateError } = await supabaseServer
        .from('queue')
        .update({ position: update.newPosition })
        .eq('id', update.id);

      if (updateError) {
        console.error(`Error updating position for queue entry ${update.id}:`, updateError);
      } else {
        console.log(`[Queue Positions] Updated queue entry ${update.id}: ${update.oldPosition} → ${update.newPosition}`);
      }
    }

    console.log(`[Queue Positions] Successfully recalculated positions for ${queueEntries.length} players in facility`);
  } catch (error) {
    console.error('Error recalculating queue positions:', error);
  }
}
