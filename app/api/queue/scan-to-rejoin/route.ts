import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { z } from 'zod';

const ScanToRejoinSchema = z.object({
  qr_uuid: z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, 'Invalid UUID format'),
});

/**
 * POST /api/queue/scan-to-rejoin
 * Manually add a player back to queue after scanning their QR code
 * Replaces auto-rejoin behavior - court officer must explicitly scan
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { qr_uuid } = ScanToRejoinSchema.parse(body);

    // Find player by QR UUID
    const { data: player, error: playerError } = await supabaseServer
      .from('players')
      .select('id')
      .eq('qr_uuid', qr_uuid)
      .single();

    if (playerError || !player) {
      return NextResponse.json(
        { error: 'Invalid QR code. Please scan a valid player badge.' },
        { status: 404 }
      );
    }

    // Check if player has an active session
    const { data: session, error: sessionError } = await supabaseServer
      .from('sessions')
      .select('id, status')
      .eq('player_id', player.id)
      .eq('status', 'active')
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Player does not have an active session. Please check in at cashier first.' },
        { status: 400 }
      );
    }

    // Check if player is already in queue
    const { data: existingEntry } = await supabaseServer
      .from('queue')
      .select('id, status')
      .eq('player_id', player.id)
      .single();

    if (existingEntry) {
      return NextResponse.json(
        { error: 'Player is already in queue', status: existingEntry.status },
        { status: 400 }
      );
    }

    // Get next position in queue
    const { data: maxPosition } = await supabaseServer
      .from('queue')
      .select('position')
      .order('position', { ascending: false })
      .limit(1)
      .single();

    const nextPosition = (maxPosition?.position || 0) + 1;

    // Add player to queue
    const { data: newEntry, error: insertError } = await supabaseServer
      .from('queue')
      .insert({
        player_id: player.id,
        position: nextPosition,
        status: 'waiting',
      })
      .select()
      .single();

    if (insertError) {
      console.error('[QUEUE REJOIN ERROR]', insertError);
      throw insertError;
    }

    console.log(`[QUEUE REJOIN] Player ${player.id} rejoined at position ${nextPosition}`);

    return NextResponse.json(
      {
        success: true,
        message: `Player added to queue at position ${nextPosition}`,
        queue_position: nextPosition,
        queue_entry_id: newEntry.id,
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
        error: 'Failed to rejoin queue',
        message: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
