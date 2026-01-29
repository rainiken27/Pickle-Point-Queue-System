import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { z } from 'zod';

const ReplacePlayerSchema = z.object({
  court_id: z.string().uuid(),
  old_player_id: z.string().uuid(),
  new_player_id: z.string().uuid(),
});

/**
 * Replace a player on an occupied court.
 * The old player gets a temporary break (session stays active).
 * The new player takes their spot on the court.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { court_id, old_player_id, new_player_id } = ReplacePlayerSchema.parse(body);

    if (old_player_id === new_player_id) {
      return NextResponse.json(
        { error: 'Cannot replace a player with themselves' },
        { status: 400 }
      );
    }

    // 1. Validate court is occupied and old player is on it
    const { data: court, error: courtError } = await supabaseServer
      .from('courts')
      .select('*')
      .eq('id', court_id)
      .single();

    if (courtError || !court) {
      return NextResponse.json({ error: 'Court not found' }, { status: 404 });
    }
    if (court.status !== 'occupied') {
      return NextResponse.json({ error: 'Court is not occupied' }, { status: 400 });
    }

    const currentPlayers: Array<{ id: string; name: string; skill_level: number; photo_url: string | null }> =
      court.current_players || [];
    const oldPlayerIndex = currentPlayers.findIndex(p => p.id === old_player_id);
    if (oldPlayerIndex === -1) {
      return NextResponse.json({ error: 'Player is not on this court' }, { status: 400 });
    }

    // 2. Validate new player has an active session and is not on a court
    const { data: newSession, error: sessionError } = await supabaseServer
      .from('sessions')
      .select('id')
      .eq('player_id', new_player_id)
      .eq('status', 'active')
      .limit(1)
      .single();

    if (sessionError || !newSession) {
      return NextResponse.json(
        { error: 'Replacement player does not have an active session' },
        { status: 400 }
      );
    }

    const { data: playingEntry } = await supabaseServer
      .from('queue')
      .select('id')
      .eq('player_id', new_player_id)
      .eq('status', 'playing')
      .limit(1)
      .maybeSingle();

    if (playingEntry) {
      return NextResponse.json(
        { error: 'Replacement player is already playing on a court' },
        { status: 400 }
      );
    }

    // 3. Fetch new player data for the court JSONB
    const { data: newPlayer, error: playerError } = await supabaseServer
      .from('players')
      .select('id, name, skill_level, photo_url')
      .eq('id', new_player_id)
      .single();

    if (playerError || !newPlayer) {
      return NextResponse.json({ error: 'Replacement player not found' }, { status: 404 });
    }

    // 4. Swap player in court's current_players JSONB
    const oldPlayerName = currentPlayers[oldPlayerIndex].name;
    const updatedPlayers = [...currentPlayers];
    updatedPlayers[oldPlayerIndex] = {
      id: newPlayer.id,
      name: newPlayer.name,
      skill_level: newPlayer.skill_level,
      photo_url: newPlayer.photo_url,
    };

    const { error: courtUpdateError } = await supabaseServer
      .from('courts')
      .update({ current_players: updatedPlayers })
      .eq('id', court_id);

    if (courtUpdateError) throw courtUpdateError;

    // 5. Remove old player's queue entry (temporary break — session stays active)
    const { error: oldQueueError } = await supabaseServer
      .from('queue')
      .delete()
      .eq('player_id', old_player_id)
      .eq('status', 'playing')
      .eq('court_id', court_id);

    if (oldQueueError) {
      console.error('[REPLACE] Error removing old player queue entry:', oldQueueError);
    }

    // 6. Handle new player's queue entry
    const { data: existingEntry } = await supabaseServer
      .from('queue')
      .select('id')
      .eq('player_id', new_player_id)
      .eq('status', 'waiting')
      .maybeSingle();

    if (existingEntry) {
      // Player was in the waiting queue — update to playing
      const { error: updateError } = await supabaseServer
        .from('queue')
        .update({ status: 'playing', court_id: court_id })
        .eq('id', existingEntry.id);
      if (updateError) console.error('[REPLACE] Error updating queue entry:', updateError);
    } else {
      // Player was on break (not in queue) — insert a playing entry
      const { error: insertError } = await supabaseServer
        .from('queue')
        .insert({
          player_id: new_player_id,
          status: 'playing',
          court_id: court_id,
          position: 0,
          joined_at: new Date().toISOString(),
        });
      if (insertError) console.error('[REPLACE] Error inserting queue entry:', insertError);
    }

    // 7. Recalculate queue positions if replacement came from the waiting queue
    if (existingEntry) {
      await recalculateQueuePositions();
    }

    console.log(`[REPLACE] Replaced ${oldPlayerName} with ${newPlayer.name} on court ${court.court_number}`);

    return NextResponse.json({
      success: true,
      message: `Replaced ${oldPlayerName} with ${newPlayer.name}`,
      old_player: { id: old_player_id, name: oldPlayerName },
      new_player: { id: newPlayer.id, name: newPlayer.name },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }
    console.error('[REPLACE] Error:', error);
    return NextResponse.json(
      { error: 'Failed to replace player', message: (error as Error).message },
      { status: 500 }
    );
  }
}

async function recalculateQueuePositions() {
  const { data: queueEntries, error } = await supabaseServer
    .from('queue')
    .select('id, position')
    .eq('status', 'waiting')
    .order('position', { ascending: true });

  if (error || !queueEntries || queueEntries.length === 0) return;

  for (let i = 0; i < queueEntries.length; i++) {
    const expected = i + 1;
    if (queueEntries[i].position !== expected) {
      await supabaseServer
        .from('queue')
        .update({ position: expected })
        .eq('id', queueEntries[i].id);
    }
  }
}
