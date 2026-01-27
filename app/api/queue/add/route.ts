import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { playerId } = body;

    if (!playerId) {
      return NextResponse.json(
        { error: 'Player ID is required' },
        { status: 400 }
      );
    }

    // Check if player exists and has an active session
    const { data: player, error: playerError } = await supabaseServer
      .from('players')
      .select('id, name, skill_level, photo_url')
      .eq('id', playerId)
      .single();

    if (playerError || !player) {
      return NextResponse.json(
        { error: 'Player not found' },
        { status: 404 }
      );
    }

    // Check if player has an active session
    const { data: activeSession, error: sessionError } = await supabaseServer
      .from('sessions')
      .select('id')
      .eq('player_id', playerId)
      .eq('status', 'active')
      .single();

    if (sessionError || !activeSession) {
      return NextResponse.json(
        { error: 'Player does not have an active session. Please check in at the cashier first.' },
        { status: 400 }
      );
    }

    // Check if player is already in queue
    const { data: existingQueueEntry, error: queueCheckError } = await supabaseServer
      .from('queue')
      .select('*')
      .eq('player_id', playerId)
      .in('status', ['waiting', 'playing'])
      .single();

    if (existingQueueEntry) {
      return NextResponse.json(
        { error: 'Player is already in queue or playing' },
        { status: 400 }
      );
    }

    // Calculate next position
    const { data: lastQueueEntry, error: positionError } = await supabaseServer
      .from('queue')
      .select('position')
      .eq('status', 'waiting')
      .order('position', { ascending: false })
      .limit(1)
      .single();

    const nextPosition = lastQueueEntry?.position ? lastQueueEntry.position + 1 : 1;

    // Add player to queue
    const { data: newQueueEntry, error: insertError } = await supabaseServer
      .from('queue')
      .insert({
        player_id: playerId,
        position: nextPosition,
        status: 'waiting',
      })
      .select(`
        *,
        player:players(*)
      `)
      .single();

    if (insertError) {
      console.error('Error adding player to queue:', insertError);
      return NextResponse.json(
        { error: 'Failed to add player to queue' },
        { status: 500 }
      );
    }

    return NextResponse.json(newQueueEntry, { status: 201 });
  } catch (error) {
    console.error('Unexpected error adding player to queue:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
