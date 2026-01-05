import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

// POST /api/test-sessions - Create test active sessions for development
export async function POST() {
  try {
    // Get first 8 players
    const { data: players, error: playersError } = await supabaseServer
      .from('players')
      .select('id, name')
      .limit(8);

    if (playersError) throw playersError;

    if (!players || players.length === 0) {
      return NextResponse.json(
        { error: 'No players found. Please run seed data first.' },
        { status: 400 }
      );
    }

    // Clear any existing sessions for these players
    await supabaseServer
      .from('sessions')
      .delete()
      .in('player_id', players.map(p => p.id));

    // Create active sessions for these players
    const sessions = players.map((player, index) => ({
      player_id: player.id,
      building: index < 3 ? 'building_a' : index < 6 ? 'building_b' : 'building_c',
      status: 'active' as const,
      start_time: new Date().toISOString(),
    }));

    const { data: createdSessions, error: sessionsError } = await supabaseServer
      .from('sessions')
      .insert(sessions)
      .select();

    if (sessionsError) throw sessionsError;

    return NextResponse.json({
      message: `Created ${createdSessions?.length || 0} active sessions`,
      sessions: createdSessions?.map((session, index) => ({
        player_name: players[index]?.name,
        building: session.building,
        status: session.status,
      })),
    });
  } catch (error) {
    console.error('Error creating test sessions:', error);
    return NextResponse.json(
      { error: 'Failed to create test sessions' },
      { status: 500 }
    );
  }
}

// DELETE /api/test-sessions - Clean up test sessions
export async function DELETE() {
  try {
    const { error } = await supabaseServer
      .from('sessions')
      .delete()
      .eq('status', 'active');

    if (error) throw error;

    return NextResponse.json({
      message: 'Cleared all active sessions',
    });
  } catch (error) {
    console.error('Error clearing test sessions:', error);
    return NextResponse.json(
      { error: 'Failed to clear test sessions' },
      { status: 500 }
    );
  }
}