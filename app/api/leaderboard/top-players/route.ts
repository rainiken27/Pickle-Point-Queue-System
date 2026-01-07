import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

/**
 * GET /api/leaderboard/top-players
 * Returns top 10 players sorted by lifetime wins
 * Uses deterministic tie-breaking: wins DESC, games_played ASC, then name ASC (client-side)
 */
export async function GET() {
  try {
    const { data, error } = await supabaseServer
      .from('player_stats')
      .select(`
        player_id,
        lifetime_wins,
        lifetime_games_played,
        player:players(name, photo_url)
      `)
      .order('lifetime_wins', { ascending: false })
      .order('lifetime_games_played', { ascending: true });

    if (error) {
      console.error('[LEADERBOARD ERROR]', error);
      throw error;
    }

    // Sort by name for final tie-breaking (can't do this in Supabase with joins)
    const sorted = (data || []).sort((a: any, b: any) => {
      if (a.lifetime_wins !== b.lifetime_wins) {
        return b.lifetime_wins - a.lifetime_wins;
      }
      if (a.lifetime_games_played !== b.lifetime_games_played) {
        return a.lifetime_games_played - b.lifetime_games_played;
      }
      const nameA = a.player?.name || '';
      const nameB = b.player?.name || '';
      return nameA.localeCompare(nameB);
    });

    // Transform data to include rank and limit to top 10
    const leaderboard = sorted.slice(0, 10).map((entry: any, index: number) => ({
      rank: index + 1,
      player_id: entry.player_id,
      player_name: entry.player?.name || 'Unknown',
      photo_url: entry.player?.photo_url || null,
      lifetime_wins: entry.lifetime_wins,
      lifetime_games_played: entry.lifetime_games_played,
    }));

    return NextResponse.json({ leaderboard }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to fetch leaderboard',
        message: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
