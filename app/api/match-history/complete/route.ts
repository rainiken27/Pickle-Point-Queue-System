import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { z } from 'zod';

const CompleteMatchSchema = z.object({
  court_id: z.string().uuid(),
  match_type: z.enum(['singles', 'doubles']).optional().default('doubles'),
  team_a_player_1_id: z.string().uuid(),
  team_a_player_2_id: z.string().uuid().optional().nullable(),
  team_b_player_1_id: z.string().uuid(),
  team_b_player_2_id: z.string().uuid().optional().nullable(),
  team_a_score: z.number().int().min(0).nullable().optional(),
  team_b_score: z.number().int().min(0).nullable().optional(),
});

/**
 * Complete a match on a court with team scores and stats tracking
 * Creates match history and updates player stats atomically via RPC
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      court_id,
      match_type,
      team_a_player_1_id,
      team_a_player_2_id,
      team_b_player_1_id,
      team_b_player_2_id,
      team_a_score,
      team_b_score,
    } = CompleteMatchSchema.parse(body);

    // Validate player counts based on match type
    if (match_type === 'singles') {
      if (team_a_player_2_id || team_b_player_2_id) {
        return NextResponse.json(
          { error: 'Singles matches should only have 2 players total' },
          { status: 400 }
        );
      }
    } else {
      if (!team_a_player_2_id || !team_b_player_2_id) {
        return NextResponse.json(
          { error: 'Doubles matches require 4 players' },
          { status: 400 }
        );
      }
    }

    // Determine winning team based on scores
    let winning_team: 'team_a' | 'team_b' | 'tie' | 'incomplete' = 'incomplete';

    if (team_a_score !== null && team_a_score !== undefined &&
        team_b_score !== null && team_b_score !== undefined) {
      if (team_a_score > team_b_score) {
        winning_team = 'team_a';
      } else if (team_b_score > team_a_score) {
        winning_team = 'team_b';
      } else {
        winning_team = 'tie';
      }
    }

    // Call RPC function to atomically create match history and update stats
    const { data: result, error: rpcError } = await supabaseServer.rpc(
      'complete_match_with_stats',
      {
        p_court_id: court_id,
        p_team_a_player_1_id: team_a_player_1_id,
        p_team_a_player_2_id: team_a_player_2_id,
        p_team_b_player_1_id: team_b_player_1_id,
        p_team_b_player_2_id: team_b_player_2_id,
        p_team_a_score: team_a_score ?? null,
        p_team_b_score: team_b_score ?? null,
        p_winning_team: winning_team,
      }
    );

    if (rpcError) {
      console.error('[MATCH COMPLETE RPC ERROR]', rpcError);
      throw rpcError;
    }

    // Update court status back to available and clear timer
    const { error: courtError } = await supabaseServer
      .from('courts')
      .update({
        status: 'available',
        court_timer_started_at: null,
      })
      .eq('id', court_id);

    if (courtError) {
      console.error('[COURT UPDATE ERROR]', courtError);
    }

    // Queue entries are NOT deleted here — the rejoin endpoint handles
    // transitioning eligible players back to 'waiting' status.

    console.log(`[MATCH COMPLETE] Court ${court_id}: ${winning_team} wins (${team_a_score}-${team_b_score})`);

    const playerCount = [team_a_player_1_id, team_a_player_2_id, team_b_player_1_id, team_b_player_2_id].filter(Boolean).length;

    return NextResponse.json(
      {
        success: true,
        message: 'Match completed and stats updated',
        match_id: result?.match_id,
        winning_team,
        players_updated: playerCount,
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to complete match',
        message: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
