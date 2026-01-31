import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { z } from 'zod';

const CreateMatchHistorySchema = z.object({
  court_id: z.string().uuid(),
  player_ids: z.array(z.string().uuid()).min(2).max(4),
});

/**
 * Create a match history record when a match starts
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { court_id, player_ids } = CreateMatchHistorySchema.parse(body);

    // Only record doubles matches — the table schema requires 4 unique players
    // (unique_team_members constraint), so singles matches are skipped
    if (player_ids.length < 4) {
      return NextResponse.json(
        { message: 'Singles match history not recorded (table requires 4 players)' },
        { status: 200 }
      );
    }

    const record = {
      court_id,
      team_a_player_1_id: player_ids[0],
      team_a_player_2_id: player_ids[1],
      team_b_player_1_id: player_ids[2],
      team_b_player_2_id: player_ids[3],
    };

    const { data, error } = await supabaseServer
      .from('match_history')
      .insert(record)
      .select();

    if (error) {
      console.error('Error creating match history:', error);
      throw error;
    }

    return NextResponse.json(
      {
        message: 'Match history created successfully',
        records: data,
      },
      { status: 201 }
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
        error: 'Failed to create match history',
        message: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
