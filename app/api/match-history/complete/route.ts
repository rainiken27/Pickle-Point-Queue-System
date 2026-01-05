import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { z } from 'zod';

const CompleteMatchHistorySchema = z.object({
  court_id: z.string().uuid(),
});

/**
 * Complete match history records when a match ends
 * Calculates and stores match duration
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { court_id } = CompleteMatchHistorySchema.parse(body);

    // Find all match_history records for players who were on this court
    // These are records with no end_time (ongoing matches)
    const { data: queueEntries } = await supabaseServer
      .from('queue')
      .select('player_id, session_id')
      .eq('court_id', court_id)
      .eq('status', 'playing');

    if (!queueEntries || queueEntries.length === 0) {
      return NextResponse.json(
        { message: 'No active match found on this court' },
        { status: 200 }
      );
    }

    const now = new Date();
    const updatedRecords = [];

    // Update match history for each player
    for (const entry of queueEntries) {
      // Find the most recent match_history record for this player with no end_time
      const { data: matchRecord } = await supabaseServer
        .from('match_history')
        .select('*')
        .eq('player_id', entry.player_id)
        .eq('session_id', entry.session_id)
        .is('end_time', null)
        .order('start_time', { ascending: false })
        .limit(1)
        .single();

      if (matchRecord) {
        // Calculate duration
        const startTime = new Date(matchRecord.start_time);
        const durationMs = now.getTime() - startTime.getTime();
        const durationMinutes = Math.round(durationMs / 60000);

        // Update the record
        const { data, error } = await supabaseServer
          .from('match_history')
          .update({
            end_time: now.toISOString(),
            duration_minutes: durationMinutes,
          })
          .eq('id', matchRecord.id)
          .select()
          .single();

        if (error) {
          console.error('[MATCH COMPLETE ERROR]', error);
        } else {
          console.log(`[MATCH COMPLETE] Player ${entry.player_id}: ${durationMinutes} minutes`);
          updatedRecords.push(data);
        }
      }
    }

    return NextResponse.json(
      {
        message: `Match completed. Updated ${updatedRecords.length} records.`,
        records: updatedRecords,
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
        error: 'Failed to complete match history',
        message: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
