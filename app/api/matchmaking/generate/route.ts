import { NextRequest, NextResponse } from 'next/server';
import { matchmakingEngine } from '@/lib/matchmaking/algorithm';
import { supabaseServer } from '@/lib/supabase/server';
import { z } from 'zod';

const MatchmakingRequestSchema = z.object({
  court_id: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { court_id } = MatchmakingRequestSchema.parse(body);

    // Fetch current queue (single facility - no building filter)
    const { data: queueData, error: queueError } = await supabaseServer
      .from('queue')
      .select(`
        *,
        player:players(*)
      `)
      .eq('status', 'waiting')
      .order('position', { ascending: true });

    if (queueError) throw queueError;

    console.log(`[MATCHMAKING] ${queueData?.length || 0} waiting players in queue`);

    // Generate match using matchmaking engine (single facility)
    const match = await matchmakingEngine.generateMatch(
      court_id,
      queueData || []
    );

    if (!match) {
      return NextResponse.json(
        { match: null, reason: 'No suitable match found in queue' },
        { status: 200 }
      );
    }

    return NextResponse.json({ match }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to generate match', message: (error as Error).message },
      { status: 500 }
    );
  }
}
