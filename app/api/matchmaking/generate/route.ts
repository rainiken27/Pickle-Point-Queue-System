import { NextRequest, NextResponse } from 'next/server';
import { matchmakingEngine } from '@/lib/matchmaking/algorithm';
import { supabaseServer } from '@/lib/supabase/server';
import { z } from 'zod';

const MatchmakingRequestSchema = z.object({
  court_id: z.string().uuid(),
  building: z.enum(['building_a', 'building_b', 'building_c']),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { court_id, building } = MatchmakingRequestSchema.parse(body);

    // Fetch current queue
    const { data: queueData, error: queueError } = await supabaseServer
      .from('queue')
      .select(`
        *,
        player:players(*)
      `)
      .eq('status', 'waiting')
      .order('position', { ascending: true });

    if (queueError) throw queueError;

    // Debug logging
    const buildingQueue = queueData?.filter(e => e.building === building) || [];
    console.log(`[MATCHMAKING] ${building}: ${buildingQueue.length} waiting players`,
      buildingQueue.map(e => ({ name: e.player?.name, status: e.status, position: e.position }))
    );

    // Generate match using matchmaking engine
    const match = await matchmakingEngine.generateMatch(
      court_id,
      building,
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
