import { NextRequest, NextResponse } from 'next/server';
import { matchmakingEngine } from '@/lib/matchmaking/algorithm';
import { supabaseServer } from '@/lib/supabase/server';
import { z } from 'zod';

const MatchmakingRequestSchema = z.object({
  court_id: z.string().uuid(),
  match_type: z.enum(['singles', 'doubles']).optional().default('doubles'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { court_id, match_type } = MatchmakingRequestSchema.parse(body);

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

    console.log(`[MATCHMAKING] ${queueData?.length || 0} waiting players in queue, match_type: ${match_type}`);

    let match;

    if (match_type === 'singles') {
      // Generate singles (1v1) match
      match = await matchmakingEngine.generateSinglesMatch(court_id, queueData || []);
    } else {
      // Generate doubles (2v2) match using multi-court algorithm
      // Fetch available courts to enable multi-court optimization
      const { data: courtsData, error: courtsError } = await supabaseServer
        .from('courts')
        .select('id')
        .eq('status', 'available')
        .order('court_number', { ascending: true });

      if (courtsError) throw courtsError;

      const availableCourts = courtsData?.map(c => c.id) || [];
      console.log(`[MATCHMAKING] ${availableCourts.length} available courts`);

      // Use new multi-court algorithm for better group efficiency
      const matches = await matchmakingEngine.generateMatches(
        availableCourts,
        queueData || []
      );

      // Find the match for the requested court (or return the first match)
      match = matches.find(m => m.court_id === court_id) || matches[0] || null;
    }

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
