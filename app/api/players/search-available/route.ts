import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

/**
 * Search for players who can be placed on a court as replacements.
 * Returns players with active sessions who are NOT currently playing on any court.
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('name');

    if (!query || query.trim().length < 2) {
      return NextResponse.json(
        { error: 'Search query must be at least 2 characters' },
        { status: 400 }
      );
    }

    // Find players matching the name with active sessions
    const { data: players, error: playerError } = await supabaseServer
      .from('players')
      .select('id, name, skill_level, photo_url')
      .ilike('name', `%${query}%`)
      .order('name', { ascending: true })
      .limit(20);

    if (playerError) throw playerError;
    if (!players || players.length === 0) {
      return NextResponse.json([], { status: 200 });
    }

    const playerIds = players.map(p => p.id);

    // Check which of these players have active sessions
    const { data: sessions, error: sessionError } = await supabaseServer
      .from('sessions')
      .select('player_id')
      .in('player_id', playerIds)
      .eq('status', 'active');

    if (sessionError) throw sessionError;

    const activeSessionPlayerIds = new Set((sessions || []).map(s => s.player_id));

    // Check which players are currently on a court (status = 'playing')
    const { data: playingEntries, error: queueError } = await supabaseServer
      .from('queue')
      .select('player_id, status, position')
      .in('player_id', playerIds)
      .in('status', ['playing', 'waiting']);

    if (queueError) throw queueError;

    const playingPlayerIds = new Set(
      (playingEntries || []).filter(e => e.status === 'playing').map(e => e.player_id)
    );
    const waitingMap = new Map(
      (playingEntries || []).filter(e => e.status === 'waiting').map(e => [e.player_id, e.position])
    );

    // Filter: must have active session, must NOT be playing on a court
    const results = players
      .filter(p => activeSessionPlayerIds.has(p.id) && !playingPlayerIds.has(p.id))
      .map(p => ({
        id: p.id,
        name: p.name,
        skill_level: p.skill_level,
        photo_url: p.photo_url,
        availability_status: waitingMap.has(p.id) ? 'in_queue' as const : 'on_break' as const,
        queue_position: waitingMap.get(p.id) ?? undefined,
      }))
      .slice(0, 10);

    return NextResponse.json(results, { status: 200 });
  } catch (error) {
    console.error('Search available error:', error);
    return NextResponse.json(
      { error: 'Failed to search players', message: (error as Error).message },
      { status: 500 }
    );
  }
}
