import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { SessionCompleteSchema } from '@/lib/utils/validation';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = SessionCompleteSchema.parse(body);

    const endTime = new Date();

    // Fetch session to calculate duration
    const { data: session, error: fetchError } = await supabaseServer
      .from('sessions')
      .select('start_time')
      .eq('id', data.session_id)
      .single();

    if (fetchError) throw fetchError;

    const startTime = new Date(session.start_time);
    const durationMinutes = Math.floor((endTime.getTime() - startTime.getTime()) / 60000);

    // Update session
    const { error: updateError } = await supabaseServer
      .from('sessions')
      .update({
        end_time: endTime.toISOString(),
        duration_minutes: durationMinutes,
        status: 'completed',
        team1_score: data.team1_score || null,
        team2_score: data.team2_score || null,
      })
      .eq('id', data.session_id);

    if (updateError) throw updateError;

    return NextResponse.json(
      { message: 'Session completed successfully', duration_minutes: durationMinutes },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to complete session', message: (error as Error).message },
      { status: 500 }
    );
  }
}
