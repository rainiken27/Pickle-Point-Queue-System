import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { z } from 'zod';

const QRValidationSchema = z.object({
  qr_uuid: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { qr_uuid } = QRValidationSchema.parse(body);

    // Find player by QR UUID
    const { data: player, error } = await supabaseServer
      .from('players')
      .select(`
        *,
        preferences:player_preferences(*),
        sessions:sessions(*)
      `)
      .eq('qr_uuid', qr_uuid)
      .single();

    if (error || !player) {
      return NextResponse.json(
        { error: 'Invalid QR code' },
        { status: 404 }
      );
    }

    // Check for active session
    const activeSession = player.sessions?.find((s: any) => s.status === 'active');

    return NextResponse.json({
      player: {
        ...player,
        active_session: activeSession || null,
      },
    }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid QR code format', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to validate QR code', message: (error as Error).message },
      { status: 500 }
    );
  }
}
