import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { z } from 'zod';

const CreateMatchHistorySchema = z.object({
  session_id: z.string().uuid(),
  player_ids: z.array(z.string().uuid()).length(4),
});

/**
 * Create match history records for all 4 players in a match
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { session_id, player_ids } = CreateMatchHistorySchema.parse(body);

    // Create a match history record for each player
    const matchHistoryRecords = player_ids.map(player_id => ({
      session_id,
      player_id,
      opponent_ids: player_ids.filter(id => id !== player_id), // All other players
      match_date: new Date().toISOString(),
    }));

    const { data, error } = await supabaseServer
      .from('match_history')
      .insert(matchHistoryRecords)
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
