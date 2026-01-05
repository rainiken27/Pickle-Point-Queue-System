import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

// GET /api/players - List players with active sessions
export async function GET() {
  try {
    const { data: players, error } = await supabaseServer
      .from('players')
      .select(`
        *,
        sessions!inner(
          id,
          status,
          start_time,
          end_time,
          building
        )
      `)
      .eq('sessions.status', 'active')
      .order('name', { ascending: true });

    if (error) throw error;

    // Transform the data to flatten the session info
    const playersWithActiveSessions = players?.map(player => ({
      ...player,
      active_session: player.sessions?.[0] || null,
      sessions: undefined, // Remove the sessions array from response
    }));

    return NextResponse.json(playersWithActiveSessions || []);
  } catch (error) {
    console.error('Error fetching players with active sessions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch players' },
      { status: 500 }
    );
  }
}